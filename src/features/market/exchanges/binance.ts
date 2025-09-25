import { translate } from "@/i18n/translate";
import type { Locale } from "@/i18n/messages";

const BINANCE_REST_URL = process.env.BINANCE_API_URL ?? "https://api.binance.com";
const DEFAULT_SYMBOL = process.env.BINANCE_SYMBOL ?? "BTCUSDT";

const QUOTE_ASSET_ALLOW_LIST = new Set([
  "USDT",
  "USDC",
  "FDUSD",
  "BUSD",
  "TUSD",
  "BTC",
  "ETH",
  "EUR",
  "TRY",
  "GBP"
]);

const EXCLUDED_BASE_SUFFIXES = ["UP", "DOWN", "BULL", "BEAR", "HEDGE"];
const PAIR_CACHE_TTL_MS = 5 * 60 * 1000;

let pairCache: BinanceTradingPair[] | null = null;
let pairCacheExpiresAt = 0;

export type BinanceMarketSummary = {
  symbol: string;
  lastPrice: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
  weightedAvgPrice: number;
  openTime: string;
  closeTime: string;
};

type BinanceTicker24hResponse = {
  symbol: string;
  priceChangePercent: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  weightedAvgPrice: string;
  openTime: number;
  closeTime: number;
};

export type BinanceCandle = {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
};

type BinanceDepthResponse = {
  lastUpdateId: number;
  bids: [string, string][];
  asks: [string, string][];
};

export type BinanceOrderBookSide = {
  price: number;
  quantity: number;
};

type BinanceExchangeInfoSymbol = {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  isSpotTradingAllowed?: boolean;
  permissions?: string[];
};

type BinanceExchangeInfoResponse = {
  symbols: BinanceExchangeInfoSymbol[];
};

export type BinanceTradingPair = {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  label: string;
};

export type BinanceRequestAuth = {
  apiKey?: string | null;
};

const resolveApiKey = (override?: string | null) => {
  const cleaned = override?.trim();
  if (cleaned && cleaned.length > 0) {
    return cleaned;
  }
  return process.env.BINANCE_API_KEY ?? null;
};

const withHeaders = (auth?: BinanceRequestAuth) => {
  const headers = new Headers({ "Content-Type": "application/json" });
  const apiKey = resolveApiKey(auth?.apiKey);

  if (apiKey) {
    headers.set("X-MBX-APIKEY", apiKey);
  }

  return headers;
};

const normalise = (value: string | undefined | null): string =>
  value ? value.toString().trim().toUpperCase() : "";

const compressSymbol = (value: string | undefined | null): string =>
  normalise(value).replace(/[^A-Z0-9]/g, "");

const resolveSymbol = (value?: string): string => {
  const cleaned = compressSymbol(value);
  if (cleaned) {
    return cleaned;
  }
  const fallback = compressSymbol(DEFAULT_SYMBOL);
  return fallback || "BTCUSDT";
};

const buildPairLabel = (base: string, quote: string) => `${base} / ${quote}`;

const shouldIncludeSymbol = (item: BinanceExchangeInfoSymbol) => {
  if (!item) {
    return false;
  }
  if (item.status !== "TRADING") {
    return false;
  }
  if (item.isSpotTradingAllowed === false) {
    return false;
  }
  if (Array.isArray(item.permissions) && item.permissions.length > 0 && !item.permissions.includes("SPOT")) {
    return false;
  }
  const base = normalise(item.baseAsset);
  const quote = normalise(item.quoteAsset);
  if (!base || !quote) {
    return false;
  }
  if (!QUOTE_ASSET_ALLOW_LIST.has(quote)) {
    return false;
  }
  if (EXCLUDED_BASE_SUFFIXES.some((suffix) => base.endsWith(suffix))) {
    return false;
  }
  return true;
};

const dedupePairs = (pairs: BinanceTradingPair[]): BinanceTradingPair[] => {
  const seen = new Map<string, BinanceTradingPair>();
  for (const pair of pairs) {
    if (!seen.has(pair.symbol)) {
      seen.set(pair.symbol, pair);
    }
  }
  return Array.from(seen.values());
};

const derivePairFromSymbol = (symbol: string): BinanceTradingPair => {
  const upper = resolveSymbol(symbol);
  const quote = Array.from(QUOTE_ASSET_ALLOW_LIST).find((item) => upper.endsWith(item));
  const base = quote ? upper.slice(0, upper.length - quote.length) : upper;
  const resolvedBase = base || upper;
  const resolvedQuote = quote || "USDT";
  return {
    symbol: upper,
    baseAsset: resolvedBase,
    quoteAsset: resolvedQuote,
    label: buildPairLabel(resolvedBase, resolvedQuote),
  };
};

const ensureDefaultPair = (pairs: BinanceTradingPair[]): BinanceTradingPair[] => {
  const symbol = resolveSymbol(DEFAULT_SYMBOL);
  if (pairs.some((pair) => pair.symbol === symbol)) {
    return pairs;
  }
  return [derivePairFromSymbol(symbol), ...pairs];
};

export const fetchBinanceTradablePairs = async (auth?: BinanceRequestAuth): Promise<BinanceTradingPair[]> => {
  const now = Date.now();
  if (pairCache && now < pairCacheExpiresAt) {
    return pairCache;
  }

  try {
    const url = new URL("/api/v3/exchangeInfo", BINANCE_REST_URL);
    const response = await fetch(url, {
      method: "GET",
      headers: withHeaders(auth),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Binance exchange info responded with ${response.status}`);
    }

    const payload = (await response.json()) as BinanceExchangeInfoResponse;
    const pairs = payload.symbols
      .filter(shouldIncludeSymbol)
      .map((item) => {
        const symbol = resolveSymbol(item.symbol);
        const base = normalise(item.baseAsset);
        const quote = normalise(item.quoteAsset);
        return {
          symbol,
          baseAsset: base,
          quoteAsset: quote,
          label: buildPairLabel(base, quote),
        };
      });

    const sortedPairs = dedupePairs(pairs).sort((a, b) => {
      if (a.baseAsset === b.baseAsset) {
        return a.quoteAsset.localeCompare(b.quoteAsset);
      }
      return a.baseAsset.localeCompare(b.baseAsset);
    });

    const finalPairs = ensureDefaultPair(sortedPairs);
    pairCache = finalPairs;
    pairCacheExpiresAt = now + PAIR_CACHE_TTL_MS;
    return finalPairs;
  } catch (error) {
    console.error("Failed to fetch Binance symbols", error);
    const fallback = ensureDefaultPair(pairCache ?? []);
    pairCache = fallback;
    pairCacheExpiresAt = now + PAIR_CACHE_TTL_MS;
    return pairCache;
  }
};

export const isPairTradable = async (
  symbol: string,
  auth?: BinanceRequestAuth
): Promise<boolean> => {
  if (!symbol) {
    return false;
  }
  const target = resolveSymbol(symbol);
  const pairs = await fetchBinanceTradablePairs(auth);
  return pairs.some((pair) => pair.symbol === target);
};

const parseTicker = (data: BinanceTicker24hResponse): BinanceMarketSummary => ({
  symbol: resolveSymbol(data.symbol),
  lastPrice: Number.parseFloat(data.lastPrice),
  priceChangePercent: Number.parseFloat(data.priceChangePercent),
  highPrice: Number.parseFloat(data.highPrice),
  lowPrice: Number.parseFloat(data.lowPrice),
  volume: Number.parseFloat(data.volume),
  quoteVolume: Number.parseFloat(data.quoteVolume),
  weightedAvgPrice: Number.parseFloat(data.weightedAvgPrice),
  openTime: new Date(data.openTime).toISOString(),
  closeTime: new Date(data.closeTime).toISOString(),
});

export const fetchBinanceCandles = async (
  symbol: string = DEFAULT_SYMBOL,
  interval: string = "5m",
  limit = 120,
  auth?: BinanceRequestAuth
): Promise<BinanceCandle[]> => {
  try {
    const resolvedSymbol = resolveSymbol(symbol);
    const url = new URL("/api/v3/klines", BINANCE_REST_URL);
    url.searchParams.set("symbol", resolvedSymbol);
    url.searchParams.set("interval", interval);
    url.searchParams.set("limit", String(limit));

    const response = await fetch(url, {
      method: "GET",
      headers: withHeaders(auth),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Binance API responded with ${response.status}`);
    }

    const payload = (await response.json()) as unknown[];
    return (payload as (readonly unknown[])[]).map((row) => ({
      openTime: Number(row[0]),
      open: Number.parseFloat(String(row[1])),
      high: Number.parseFloat(String(row[2])),
      low: Number.parseFloat(String(row[3])),
      close: Number.parseFloat(String(row[4])),
      volume: Number.parseFloat(String(row[5])),
      closeTime: Number(row[6]),
    }));
  } catch (error) {
    console.error("Failed to fetch Binance candles", error);
    return [];
  }
};

export const fetchBinanceMarketSummary = async (
  symbol: string = DEFAULT_SYMBOL,
  auth?: BinanceRequestAuth
): Promise<BinanceMarketSummary | null> => {
  try {
    const resolvedSymbol = resolveSymbol(symbol);
    const url = new URL("/api/v3/ticker/24hr", BINANCE_REST_URL);
    url.searchParams.set("symbol", resolvedSymbol);

    const response = await fetch(url, {
      method: "GET",
      headers: withHeaders(auth),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Binance API responded with ${response.status}`);
    }

    const payload = (await response.json()) as BinanceTicker24hResponse;
    return parseTicker(payload);
  } catch (error) {
    console.error("Failed to fetch Binance market summary", error);
    return null;
  }
};

export const fetchBinanceOrderBook = async (
  symbol: string = DEFAULT_SYMBOL,
  limit = 20,
  auth?: BinanceRequestAuth
): Promise<{ bids: BinanceOrderBookSide[]; asks: BinanceOrderBookSide[] }> => {
  try {
    const resolvedSymbol = resolveSymbol(symbol);
    const url = new URL("/api/v3/depth", BINANCE_REST_URL);
    url.searchParams.set("symbol", resolvedSymbol);
    url.searchParams.set("limit", String(limit));

    const response = await fetch(url, {
      method: "GET",
      headers: withHeaders(auth),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Binance depth API responded with ${response.status}`);
    }

    const payload = (await response.json()) as BinanceDepthResponse;
    const mapSide = (side: [string, string][]) =>
      side.map(([price, qty]) => ({
        price: Number.parseFloat(price),
        quantity: Number.parseFloat(qty),
      }));

    return {
      bids: mapSide(payload.bids),
      asks: mapSide(payload.asks),
    };
  } catch (error) {
    console.error("Failed to fetch Binance order book", error);
    return { bids: [], asks: [] };
  }
};

export const formatBinanceSummary = (
  summary: BinanceMarketSummary | null,
  locale: Locale = "en"
): string => {
  const providerLabel = translate(locale, "market.summary.providerLabel.binance");
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

  const baseAsset = symbol.replace(/USDT$/i, "").replace(/USDC$/i, "").replace(/BUSD$/i, "");

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




















