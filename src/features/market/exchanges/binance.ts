import { Agent } from "undici";

import { translate } from "@/i18n/translate";
import type { Locale } from "@/i18n/messages";
import type { MarketMode } from "@/features/market/constants";

const BINANCE_PROXY_URL = process.env.BINANCE_PROXY_URL?.trim();

const buildRequestUrl = (base: string, path: string) => {
  const baseUrl = new URL(base);
  const prefix = baseUrl.pathname.replace(/\/$/, "");
  if (prefix.length > 0) {
    const joined = `${prefix}${path.startsWith("/") ? path : `/${path}`}`;
    return new URL(`${baseUrl.origin}${joined}`);
  }
  return new URL(path, baseUrl);
};

const FALLBACK_SPOT_HOSTS = [
  "https://api.binance.com",
  "https://api-gcp.binance.com",
  "https://api1.binance.com",
  "https://api2.binance.com",
  "https://api3.binance.com",
  "https://api4.binance.com",
  "https://data-api.binance.vision",
];

const FALLBACK_FUTURES_HOSTS = [
  "https://fapi.binance.com",
  "https://futures-api.binance.com",
  "https://dapi.binance.com",
];

const DEFAULT_SYMBOL = "BTCUSDT";
const DEFAULT_FUTURES_SYMBOL = "BTCUSDT";

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
  "GBP",
]);

const EXCLUDED_BASE_SUFFIXES = ["UP", "DOWN", "BULL", "BEAR", "HEDGE"];
const PAIR_CACHE_TTL_MS = 5 * 60 * 1000;

const pairCache: Record<MarketMode, BinanceTradingPair[] | null> = {
  spot: null,
  futures: null,
};
const pairCacheExpiresAt: Record<MarketMode, number> = {
  spot: 0,
  futures: 0,
};

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

type BinanceFuturesExchangeInfoSymbol = BinanceExchangeInfoSymbol & {
  contractType?: string;
  marginAsset?: string;
};

type BinanceFuturesExchangeInfoResponse = {
  symbols: BinanceFuturesExchangeInfoSymbol[];
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

type BinanceHostMode = "spot" | "futures";

const getHostList = (mode: BinanceHostMode): string[] => {
  if (BINANCE_PROXY_URL) {
    return [BINANCE_PROXY_URL];
  }
  const defaults =
    mode === "futures" ? FALLBACK_FUTURES_HOSTS : FALLBACK_SPOT_HOSTS;
  return defaults;
};

const shouldRetryError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }
  const code = (error as { code?: string }).code;
  if (!code) {
    return false;
  }
  const retryableCodes = new Set([
    "CERT_HAS_EXPIRED",
    "ERR_TLS_CERT_ALTNAME_INVALID",
    "ECONNRESET",
    "ECONNREFUSED",
    "ETIMEDOUT",
  ]);
  return retryableCodes.has(code);
};

const shouldRetryResponse = (response: Response) =>
  response.status >= 500 || response.status === 451 || response.status === 403;

const insecureAgent = new Agent({
  connect: {
    rejectUnauthorized: false,
  },
});

const isCertificateError = (error: unknown) =>
  Boolean(
    error &&
      typeof error === "object" &&
      ("code" in error
        ? (error as { code?: string }).code === "CERT_HAS_EXPIRED"
        : false)
  );

const requestBinance = async (
  path: string,
  {
    searchParams,
    auth,
    mode = "spot",
    init,
  }: {
    searchParams?: Record<string, string>;
    auth?: BinanceRequestAuth;
    mode?: MarketMode;
    init?: RequestInit;
  }
): Promise<Response> => {
  const hosts = getHostList(mode === "futures" ? "futures" : "spot");
  let lastError: unknown = null;

  for (const host of hosts) {
    try {
      const url = buildRequestUrl(host, path);
      if (searchParams) {
        for (const [key, value] of Object.entries(searchParams)) {
          url.searchParams.set(key, value);
        }
      }

      const response = await fetch(url, {
        method: "GET",
        headers: withHeaders(auth),
        cache: "no-store",
        ...init,
      });

      if (response.ok) {
        return response;
      }

      if (response.status === 404) {
        lastError = new Error(`Binance responded with 404 for ${url.href}`);
        continue;
      }

      if (!shouldRetryResponse(response)) {
        return response;
      }

      lastError = new Error(`Binance responded with ${response.status}`);
    } catch (error) {
      lastError = error;

      if (isCertificateError(error)) {
        try {
          const url = buildRequestUrl(host, path);
          if (searchParams) {
            for (const [key, value] of Object.entries(searchParams)) {
              url.searchParams.set(key, value);
            }
          }

          const insecureInit: RequestInit = {
            method: "GET",
            headers: withHeaders(auth),
            cache: "no-store",
            ...init,
          };
          (insecureInit as unknown as { dispatcher: Agent }).dispatcher = insecureAgent;

          const insecureResponse = await fetch(url, insecureInit);

          if (insecureResponse.ok) {
            return insecureResponse;
          }

          if (!shouldRetryResponse(insecureResponse)) {
            return insecureResponse;
          }

          lastError = new Error(
            `Binance responded with ${insecureResponse.status}`
          );
        } catch (secondaryError) {
          lastError = secondaryError;
        }
      }

      if (!shouldRetryError(error)) {
        break;
      }
      continue;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to fetch from Binance");
};

const shouldIncludeSpotSymbol = (item: BinanceExchangeInfoSymbol) => {
  if (!item) {
    return false;
  }
  if (item.status !== "TRADING") {
    return false;
  }
  if (item.isSpotTradingAllowed === false) {
    return false;
  }
  if (
    Array.isArray(item.permissions) &&
    item.permissions.length > 0 &&
    !item.permissions.includes("SPOT")
  ) {
    return false;
  }
  const base = normalise(item.baseAsset);
  const quote = normalise(item.quoteAsset);
  if (!base || !quote) {
    return false;
  }
  if (base.length < 2) {
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

const shouldIncludeFuturesSymbol = (item: BinanceFuturesExchangeInfoSymbol) => {
  if (!item) {
    return false;
  }
  if (item.status !== "TRADING") {
    return false;
  }
  const contractType = normalise(item.contractType);
  if (contractType && contractType !== "PERPETUAL") {
    return false;
  }
  const base = normalise(item.baseAsset);
  const quote = normalise(item.quoteAsset);
  if (!base || !quote) {
    return false;
  }
  if (base.length < 2) {
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
  const quote = Array.from(QUOTE_ASSET_ALLOW_LIST).find((item) =>
    upper.endsWith(item)
  );
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

const ensureDefaultPair = (
  pairs: BinanceTradingPair[],
  mode: MarketMode
): BinanceTradingPair[] => {
  const fallbackSymbol =
    mode === "futures" ? DEFAULT_FUTURES_SYMBOL : DEFAULT_SYMBOL;
  const symbol = resolveSymbol(fallbackSymbol);
  if (pairs.some((pair) => pair.symbol === symbol)) {
    return pairs;
  }
  return [derivePairFromSymbol(symbol), ...pairs];
};

const fetchSpotSymbols = async (
  auth?: BinanceRequestAuth
): Promise<BinanceTradingPair[]> => {
  const response = await requestBinance("/api/v3/exchangeInfo", {
    auth,
    mode: "spot",
  });

  if (!response.ok) {
    throw new Error(`Binance exchange info responded with ${response.status}`);
  }

  const payload = (await response.json()) as BinanceExchangeInfoResponse;
  const pairs = payload.symbols.filter(shouldIncludeSpotSymbol).map((item) => {
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

  return dedupePairs(pairs).sort((a, b) => {
    if (a.baseAsset === b.baseAsset) {
      return a.quoteAsset.localeCompare(b.quoteAsset);
    }
    return a.baseAsset.localeCompare(b.baseAsset);
  });
};

const fetchFuturesSymbols = async (
  auth?: BinanceRequestAuth
): Promise<BinanceTradingPair[]> => {
  const response = await requestBinance("/fapi/v1/exchangeInfo", {
    auth,
    mode: "futures",
  });

  if (!response.ok) {
    throw new Error(
      `Binance futures exchange info responded with ${response.status}`
    );
  }

  const payload = (await response.json()) as BinanceFuturesExchangeInfoResponse;
  const pairs = payload.symbols
    .filter(shouldIncludeFuturesSymbol)
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

  return dedupePairs(pairs).sort((a, b) => {
    if (a.baseAsset === b.baseAsset) {
      return a.quoteAsset.localeCompare(b.quoteAsset);
    }
    return a.baseAsset.localeCompare(b.baseAsset);
  });
};

export const fetchBinanceTradablePairs = async (
  auth?: BinanceRequestAuth,
  mode: MarketMode = "spot"
): Promise<BinanceTradingPair[]> => {
  const now = Date.now();
  if (pairCache[mode] && now < pairCacheExpiresAt[mode]) {
    return pairCache[mode] ?? [];
  }

  try {
    const symbols =
      mode === "futures"
        ? await fetchFuturesSymbols(auth)
        : await fetchSpotSymbols(auth);
    const finalPairs = ensureDefaultPair(symbols, mode);
    pairCache[mode] = finalPairs;
    pairCacheExpiresAt[mode] = now + PAIR_CACHE_TTL_MS;
    return finalPairs;
  } catch (error) {
    console.error(`Failed to fetch Binance ${mode} symbols`, error);
    const fallback = ensureDefaultPair(pairCache[mode] ?? [], mode);
    pairCache[mode] = fallback;
    pairCacheExpiresAt[mode] = now + PAIR_CACHE_TTL_MS;
    return fallback;
  }
};

export const isPairTradable = async (
  symbol: string,
  auth?: BinanceRequestAuth,
  mode: MarketMode = "spot"
): Promise<boolean> => {
  if (!symbol) {
    return false;
  }
  const target = resolveSymbol(symbol);
  const pairs = await fetchBinanceTradablePairs(auth, mode);
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

const INTERVAL_MS_MAP: Record<string, number> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

export type BinanceCandleQueryOptions = {
  limit?: number;
  startTime?: number;
  endTime?: number;
};

const getIntervalMs = (value: string) => INTERVAL_MS_MAP[value] ?? INTERVAL_MS_MAP["1h"];

export const fetchBinanceCandles = async (
  symbol: string = DEFAULT_SYMBOL,
  interval: string = "5m",
  options: BinanceCandleQueryOptions = {},
  auth?: BinanceRequestAuth,
  mode: MarketMode = "spot"
): Promise<BinanceCandle[]> => {
  try {
    const fallbackSymbol =
      mode === "futures" ? DEFAULT_FUTURES_SYMBOL : DEFAULT_SYMBOL;
    const resolvedSymbol = resolveSymbol(symbol || fallbackSymbol);
    const endpoint = mode === "futures" ? "/fapi/v1/klines" : "/api/v3/klines";
    const intervalMs = getIntervalMs(interval);
    const maxPerRequest = 1000;
    const startTimeMs = options.startTime ?? null;
    const endTimeMs = options.endTime ?? null;
    const targetLimit = (() => {
      if (options.limit && options.limit > 0) {
        return options.limit;
      }
      if (startTimeMs !== null && endTimeMs !== null) {
        const estimated = Math.ceil((endTimeMs - startTimeMs) / intervalMs) + 2;
        return Math.max(estimated, 100);
      }
      if (startTimeMs !== null && endTimeMs === null) {
        const estimated = Math.ceil((Date.now() - startTimeMs) / intervalMs) + 2;
        return Math.max(estimated, 120);
      }
      return 120;
    })();

    const candles: BinanceCandle[] = [];
    let nextStart = startTimeMs;
    let safety = 0;

    while (candles.length < targetLimit && safety < 20) {
      safety += 1;
      const remaining = targetLimit - candles.length;
      const requestLimit = Math.min(Math.max(remaining, 1), maxPerRequest);
      const searchParams: Record<string, string> = {
        symbol: resolvedSymbol,
        interval,
        limit: String(requestLimit),
      };
      if (nextStart !== null && Number.isFinite(nextStart)) {
        searchParams.startTime = String(nextStart);
      }
      if (endTimeMs !== null && Number.isFinite(endTimeMs)) {
        searchParams.endTime = String(endTimeMs);
      }

      const response = await requestBinance(endpoint, {
        auth,
        mode,
        searchParams,
      });

      if (!response.ok) {
        throw new Error(`Binance API responded with ${response.status}`);
      }

      const payload = (await response.json()) as unknown[];
      const batch = (payload as (readonly unknown[])[]).map((row) => ({
        openTime: Number(row[0]),
        open: Number.parseFloat(String(row[1])),
        high: Number.parseFloat(String(row[2])),
        low: Number.parseFloat(String(row[3])),
        close: Number.parseFloat(String(row[4])),
        volume: Number.parseFloat(String(row[5])),
        closeTime: Number(row[6]),
      }));

      if (!batch.length) {
        break;
      }

      candles.push(...batch);

      if (nextStart === null || !Number.isFinite(nextStart)) {
        break;
      }

      const last = batch[batch.length - 1];
      const nextCandidate = last.closeTime + 1;
      if (
        (endTimeMs !== null && nextCandidate >= endTimeMs) ||
        batch.length < requestLimit
      ) {
        break;
      }
      nextStart = nextCandidate;
    }

    const filtered = candles.filter((item) => {
      const afterStart = startTimeMs === null || item.openTime >= startTimeMs;
      const beforeEnd = endTimeMs === null || item.openTime <= endTimeMs;
      return afterStart && beforeEnd;
    });

    return filtered.slice(-targetLimit);
  } catch (error) {
    console.error("Failed to fetch Binance candles", error);
    return [];
  }
};

export const fetchBinanceMarketSummary = async (
  symbol: string = DEFAULT_SYMBOL,
  auth?: BinanceRequestAuth,
  mode: MarketMode = "spot"
): Promise<BinanceMarketSummary | null> => {
  try {
    const fallbackSymbol =
      mode === "futures" ? DEFAULT_FUTURES_SYMBOL : DEFAULT_SYMBOL;
    const resolvedSymbol = resolveSymbol(symbol || fallbackSymbol);
    const endpoint =
      mode === "futures" ? "/fapi/v1/ticker/24hr" : "/api/v3/ticker/24hr";
    const response = await requestBinance(endpoint, {
      auth,
      mode,
      searchParams: {
        symbol: resolvedSymbol,
      },
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
  auth?: BinanceRequestAuth,
  mode: MarketMode = "spot"
): Promise<{ bids: BinanceOrderBookSide[]; asks: BinanceOrderBookSide[] }> => {
  try {
    const fallbackSymbol =
      mode === "futures" ? DEFAULT_FUTURES_SYMBOL : DEFAULT_SYMBOL;
    const resolvedSymbol = resolveSymbol(symbol || fallbackSymbol);
    const endpoint = mode === "futures" ? "/fapi/v1/depth" : "/api/v3/depth";
    const response = await requestBinance(endpoint, {
      auth,
      mode,
      searchParams: {
        symbol: resolvedSymbol,
        limit: String(limit),
      },
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
  locale: Locale = "en",
  mode: MarketMode = "spot"
): string => {
  const providerLabel = translate(
    locale,
    "market.summary.providerLabel.binance"
  );
  if (!summary) {
    return translate(locale, "market.summary.unavailable", {
      provider: providerLabel,
    });
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

  const baseAsset = symbol
    .replace(/USDT$/i, "")
    .replace(/USDC$/i, "")
    .replace(/BUSD$/i, "");

  return [
    translate(locale, `market.summary.modeTitle.${mode}`, {
      symbol,
      provider: providerLabel,
    }),
    translate(locale, "market.summary.lastPrice", {
      value: lastPrice.toFixed(2),
    }),
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
