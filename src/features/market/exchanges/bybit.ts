import type {
  BinanceCandle as MarketCandle,
  BinanceMarketSummary as MarketSummary,
  BinanceOrderBookSide as OrderBookSide,
  BinanceTradingPair as TradingPair,
} from "./binance";
import { translate } from "@/i18n/translate";
import type { Locale } from "@/i18n/messages";

const BYBIT_REST_URL = process.env.BYBIT_API_URL ?? "https://api.bybit.com";
const DEFAULT_SYMBOL = process.env.BYBIT_SYMBOL ?? "BTCUSDT";

const QUOTE_ASSET_ALLOW_LIST = new Set([
  "USDT",
  "USDC",
  "USDD",
  "DAI",
  "BTC",
  "ETH",
  "EUR",
  "TRY",
  "GBP",
]);

const PAIR_CACHE_TTL_MS = 5 * 60 * 1000;

let pairCache: TradingPair[] | null = null;
let pairCacheExpiresAt = 0;

export type BybitRequestAuth = {
  apiKey?: string | null;
};

const resolveApiKey = (override?: string | null) => {
  const cleaned = override?.trim();
  if (cleaned && cleaned.length > 0) {
    return cleaned;
  }
  return process.env.BYBIT_API_KEY ?? null;
};

const withHeaders = (auth?: BybitRequestAuth) => {
  const headers = new Headers({ "Content-Type": "application/json" });
  const apiKey = resolveApiKey(auth?.apiKey);
  if (apiKey) {
    headers.set("X-BAPI-API-KEY", apiKey);
  }
  return headers;
};

const normalise = (value: string | undefined | null) => (value ? value.toString().trim().toUpperCase() : "");

const resolveSymbol = (value?: string) => {
  const cleaned = normalise(value);
  if (cleaned) {
    return cleaned.replace(/[^A-Z0-9]/g, "");
  }
  const fallback = normalise(DEFAULT_SYMBOL);
  return fallback || "BTCUSDT";
};

const buildPairLabel = (base: string, quote: string) => `${base} / ${quote}`;

const shouldIncludeSymbol = (item: BybitInstrumentInfo) => {
  if (!item) {
    return false;
  }
  if (item.status?.toUpperCase() !== "TRADING") {
    return false;
  }
  const base = normalise(item.baseCoin);
  const quote = normalise(item.quoteCoin);
  if (!base || !quote) {
    return false;
  }
  if (!QUOTE_ASSET_ALLOW_LIST.has(quote)) {
    return false;
  }
  return true;
};

const ensureDefaultPair = (pairs: TradingPair[]): TradingPair[] => {
  const symbol = resolveSymbol(DEFAULT_SYMBOL);
  if (pairs.some((pair) => pair.symbol === symbol)) {
    return pairs;
  }
  const base = symbol.replace(/USDT$/i, "");
  const quote = symbol.slice(base.length) || "USDT";
  return [
    {
      symbol,
      baseAsset: base,
      quoteAsset: quote,
      label: buildPairLabel(base, quote),
    },
    ...pairs,
  ];
};

type BybitInstrumentInfo = {
  symbol: string;
  baseCoin: string;
  quoteCoin: string;
  status: string;
};

type BybitInstrumentsResponse = {
  retCode: number;
  result?: {
    list?: BybitInstrumentInfo[];
  };
};

const fetchInstruments = async (auth?: BybitRequestAuth): Promise<BybitInstrumentInfo[]> => {
  const url = new URL("/v5/market/instruments-info", BYBIT_REST_URL);
  url.searchParams.set("category", "spot");
  const response = await fetch(url, {
    method: "GET",
    headers: withHeaders(auth),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Bybit instruments responded with ${response.status}`);
  }
  const payload = (await response.json()) as BybitInstrumentsResponse;
  return payload.result?.list ?? [];
};

export const fetchBybitTradablePairs = async (auth?: BybitRequestAuth): Promise<TradingPair[]> => {
  const now = Date.now();
  if (pairCache && now < pairCacheExpiresAt) {
    return pairCache;
  }

  try {
    const instruments = await fetchInstruments(auth);
    const pairs = instruments
      .filter(shouldIncludeSymbol)
      .map((instrument) => {
        const base = normalise(instrument.baseCoin);
        const quote = normalise(instrument.quoteCoin);
        const symbol = resolveSymbol(instrument.symbol);
        return {
          symbol,
          baseAsset: base,
          quoteAsset: quote,
          label: buildPairLabel(base, quote),
        } satisfies TradingPair;
      });
    const deduped = Array.from(new Map(pairs.map((pair) => [pair.symbol, pair])).values());
    const result = ensureDefaultPair(deduped).sort((a, b) => a.symbol.localeCompare(b.symbol));
    pairCache = result;
    pairCacheExpiresAt = now + PAIR_CACHE_TTL_MS;
    return result;
  } catch (error) {
    console.error("Failed to fetch Bybit tradable pairs", error);
    return ensureDefaultPair(pairCache ?? []);
  }
};

export const isBybitPairTradable = async (symbol: string) => {
  const normalized = resolveSymbol(symbol);
  const pairs = await fetchBybitTradablePairs();
  if (pairs.some((pair) => pair.symbol === normalized)) {
    return true;
  }
  // If we only have a fallback/default list, allow querying the API directly.
  if (pairs.length <= 1) {
    return true;
  }
  return false;
};

type BybitKlineResponse = {
  retCode: number;
  result?: {
    list?: string[][];
  };
};

const mapTimeframeToBybitInterval = (interval: string): string => {
  switch (interval) {
    case "1m":
      return "1";
    case "5m":
      return "5";
    case "15m":
      return "15";
    case "1h":
      return "60";
    case "4h":
      return "240";
    case "1d":
      return "D";
    default:
      return "60";
  }
};

const intervalToMs = (interval: string): number => {
  switch (interval) {
    case "1":
      return 60_000;
    case "5":
      return 5 * 60_000;
    case "15":
      return 15 * 60_000;
    case "60":
      return 60 * 60_000;
    case "240":
      return 4 * 60 * 60_000;
    case "D":
      return 24 * 60 * 60_000;
    default:
      return 60 * 60_000;
  }
};

export const fetchBybitCandles = async (
  symbol: string,
  interval: string,
  limit: number,
  auth?: BybitRequestAuth
): Promise<MarketCandle[]> => {
  try {
    const resolvedSymbol = resolveSymbol(symbol);
    const bybitInterval = mapTimeframeToBybitInterval(interval);
    const url = new URL("/v5/market/kline", BYBIT_REST_URL);
    url.searchParams.set("category", "spot");
    url.searchParams.set("symbol", resolvedSymbol);
    url.searchParams.set("interval", bybitInterval);
    url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 1000)));

    const response = await fetch(url, {
      method: "GET",
      headers: withHeaders(auth),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Bybit kline responded with ${response.status}`);
    }

    const payload = (await response.json()) as BybitKlineResponse;
    const list = payload.result?.list ?? [];
    const duration = intervalToMs(bybitInterval);

    const candles = list
      .map((entry) => {
        const [openTime, open, high, low, close, volume] = entry;
        const parsedOpen = Number.parseFloat(open ?? "0");
        const parsedHigh = Number.parseFloat(high ?? "0");
        const parsedLow = Number.parseFloat(low ?? "0");
        const parsedClose = Number.parseFloat(close ?? "0");
        const parsedVolume = Number.parseFloat(volume ?? "0");
        const start = Number.parseInt(openTime ?? "0", 10);
        if (!Number.isFinite(start)) {
          return null;
        }
        return {
          openTime: start,
          open: parsedOpen,
          high: parsedHigh,
          low: parsedLow,
          close: parsedClose,
          volume: parsedVolume,
          closeTime: start + duration,
        } satisfies MarketCandle;
      })
      .filter((item): item is MarketCandle => Boolean(item))
      .sort((a, b) => a.openTime - b.openTime);

    return candles;
  } catch (error) {
    console.error("Failed to fetch Bybit candles", error);
    return [];
  }
};

type BybitTickerResponse = {
  retCode: number;
  result?: {
    list?: Array<{
      symbol: string;
      lastPrice: string;
      price24hPcnt?: string;
      highPrice24h?: string;
      lowPrice24h?: string;
      turnover24h?: string;
      volume24h?: string;
      updatedTime?: string;
    }>;
  };
};

export const fetchBybitMarketSummary = async (symbol: string): Promise<MarketSummary | null> => {
  try {
    const resolvedSymbol = resolveSymbol(symbol);
    const url = new URL("/v5/market/tickers", BYBIT_REST_URL);
    url.searchParams.set("category", "spot");
    url.searchParams.set("symbol", resolvedSymbol);

    const response = await fetch(url, {
      method: "GET",
      headers: withHeaders(auth),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Bybit tickers responded with ${response.status}`);
    }

    const payload = (await response.json()) as BybitTickerResponse;
    const ticker = payload.result?.list?.[0];
    if (!ticker) {
      return null;
    }

    const lastPrice = Number.parseFloat(ticker.lastPrice ?? "0");
    const priceChangePercent = Number.parseFloat(ticker.price24hPcnt ?? "0") * 100;
    const highPrice = Number.parseFloat(ticker.highPrice24h ?? ticker.lastPrice ?? "0");
    const lowPrice = Number.parseFloat(ticker.lowPrice24h ?? ticker.lastPrice ?? "0");
    const volume = Number.parseFloat(ticker.volume24h ?? "0");
    const quoteVolume = Number.parseFloat(ticker.turnover24h ?? "0");
    const weightedAvgPrice =
      volume > 0 && quoteVolume > 0 ? quoteVolume / volume : Number.isFinite(lastPrice) ? lastPrice : 0;
    const timestamp = ticker.updatedTime ? Number.parseInt(ticker.updatedTime, 10) : Date.now();

    return {
      symbol: resolvedSymbol,
      lastPrice,
      priceChangePercent,
      highPrice,
      lowPrice,
      volume,
      quoteVolume,
      weightedAvgPrice,
      openTime: new Date(timestamp - 24 * 60 * 60 * 1000).toISOString(),
      closeTime: new Date(timestamp).toISOString(),
    } satisfies MarketSummary;
  } catch (error) {
    console.error("Failed to fetch Bybit market summary", error);
    return null;
  }
};

type BybitOrderBookResponse = {
  retCode: number;
  result?: {
    b?: string[][];
    a?: string[][];
  };
};

export const fetchBybitOrderBook = async (
  symbol: string,
  limit: number,
  auth?: BybitRequestAuth
): Promise<{ bids: OrderBookSide[]; asks: OrderBookSide[] }> => {
  try {
    const resolvedSymbol = resolveSymbol(symbol);
    const url = new URL("/v5/market/orderbook", BYBIT_REST_URL);
    url.searchParams.set("category", "spot");
    url.searchParams.set("symbol", resolvedSymbol);
    url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 200)));

    const response = await fetch(url, {
      method: "GET",
      headers: withHeaders(auth),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Bybit orderbook responded with ${response.status}`);
    }

    const payload = (await response.json()) as BybitOrderBookResponse;
    const bidsRaw = payload.result?.b ?? [];
    const asksRaw = payload.result?.a ?? [];

    const mapSide = (side: string[][]): OrderBookSide[] =>
      side.map(([price, qty]) => ({
        price: Number.parseFloat(price ?? "0"),
        quantity: Number.parseFloat(qty ?? "0"),
      }));

    return {
      bids: mapSide(bidsRaw),
      asks: mapSide(asksRaw),
    };
  } catch (error) {
    console.error("Failed to fetch Bybit order book", error);
    return { bids: [], asks: [] };
  }
};

export const formatBybitSummary = (
  summary: MarketSummary | null,
  locale: Locale = "en"
): string => {
  const providerLabel = translate(locale, "market.summary.providerLabel.bybit");
  if (!summary) {
    return translate(locale, "market.summary.unavailable", { provider: providerLabel });
  }

  const {
    symbol,
    lastPrice,
    priceChangePercent,
    highPrice,
    lowPrice,
    volume,
    quoteVolume,
    weightedAvgPrice,
    closeTime,
  } = summary;

  const baseAsset = symbol.replace(/USDT$/i, "");

  return [
    translate(locale, "market.summary.spotTitle", {
      symbol,
      provider: providerLabel,
    }),
    translate(locale, "market.summary.lastPrice", { value: lastPrice.toFixed(2) }),
    translate(locale, "market.summary.change24h", {
      value: priceChangePercent.toFixed(2),
    }),
    translate(locale, "market.summary.highLow24h", {
      high: highPrice.toFixed(2),
      low: lowPrice.toFixed(2),
    }),
    translate(locale, "market.summary.volume24hBase", {
      value: volume.toFixed(2),
      asset: baseAsset || symbol,
    }),
    translate(locale, "market.summary.volume24hQuote", {
      value: quoteVolume.toFixed(2),
    }),
    translate(locale, "market.summary.weightedAverage", {
      value: weightedAvgPrice.toFixed(2),
    }),
    translate(locale, "market.summary.lastUpdate", { value: closeTime }),
  ].join("\n");
};

export const mapTimeframeToBybitIntervalSymbol = mapTimeframeToBybitInterval;













