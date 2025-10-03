import type { Locale } from "@/i18n/messages";
import { translate } from "@/i18n/translate";

const mapIntervalForTwelvedata = (interval: string) => {
  switch (interval) {
    case "1m":
      return "1min";
    case "5m":
      return "5min";
    case "15m":
      return "15min";
    case "1h":
      return "1h";
    case "4h":
      return "4h"; // some providers also accept 240min
    case "1d":
      return "1day";
    default:
      return "5min";
  }
};

const sanitizeSymbolForTwelvedata = (symbol?: string) => {
  const fallback = "XAUUSD";
  const normalized = (symbol ?? fallback).toUpperCase().replace(/[^A-Z]/g, "");
  return normalized === "XAUUSD" ? "XAUUSD" : fallback;
};

const toProviderSymbolForTwelvedata = (symbol?: string) => {
  const sanitized = sanitizeSymbolForTwelvedata(symbol);
  return sanitized === "XAUUSD" ? "XAU/USD" : sanitized;
};

const GOLD_PROVIDER_CONFIG = {
  twelvedata: {
    baseUrl: process.env.TWELVEDATA_API_URL ?? "https://api.twelvedata.com",
    apiKeyEnv: "TWELVEDATA_API_KEY" as const,
    defaultSymbol: "XAUUSD",
    mapInterval: mapIntervalForTwelvedata,
    sanitizeSymbol: sanitizeSymbolForTwelvedata,
    toProviderSymbol: toProviderSymbolForTwelvedata,
  },
} as const;

type GoldProvider = keyof typeof GOLD_PROVIDER_CONFIG;

export const GOLD_PROVIDERS = Object.keys(GOLD_PROVIDER_CONFIG) as GoldProvider[];

export const DEFAULT_GOLD_PROVIDER: GoldProvider = "twelvedata";

const resolveGoldProviderConfig = (provider: GoldProvider = DEFAULT_GOLD_PROVIDER) =>
  GOLD_PROVIDER_CONFIG[provider] ?? GOLD_PROVIDER_CONFIG[DEFAULT_GOLD_PROVIDER];

const resolveLabelForProvider = (locale: Locale, provider: GoldProvider) => {
  const path = `market.summary.providerLabel.${provider}`;
  const label = translate(locale, path);
  return label === path ? provider : label;
};

export type GoldCandle = {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
};

export type GoldMarketSummary = {
  symbol: string;
  lastPrice: number;
  provider: GoldProvider;
  closeTime: string;
};

export const fetchGoldCandles = async (
  symbol: string,
  interval: string,
  limit: number,
  provider: GoldProvider = DEFAULT_GOLD_PROVIDER
): Promise<GoldCandle[]> => {
  try {
    const config = resolveGoldProviderConfig(provider);
    const key = process.env[config.apiKeyEnv as keyof NodeJS.ProcessEnv];
    if (!key) {
      throw new Error(`${config.apiKeyEnv} not configured`);
    }
    const providerSymbol = config.toProviderSymbol(symbol);
    const resolvedInterval = config.mapInterval(interval);
    const url = new URL("/time_series", config.baseUrl);
    url.searchParams.set("symbol", providerSymbol);
    url.searchParams.set("interval", resolvedInterval);
    url.searchParams.set("outputsize", String(Math.min(Math.max(limit, 50), 1000)));
    url.searchParams.set("apikey", key);

    const res = await fetch(url, { method: "GET", cache: "no-store" });
    if (!res.ok) {
      throw new Error(`${provider} responded ${res.status}`);
    }
    const data = (await res.json()) as {
      values?: Array<{
        datetime: string;
        open: string;
        high: string;
        low: string;
        close: string;
        volume?: string;
      }>;
      status?: string;
    };
    const list = data.values ?? [];
    // Twelve Data returns newest first; reverse to ascending
    const asc = [...list].reverse();
    const candles: GoldCandle[] = asc.map((v) => {
      const t = new Date(v.datetime).getTime();
      const open = Number.parseFloat(v.open ?? "0");
      const high = Number.parseFloat(v.high ?? "0");
      const low = Number.parseFloat(v.low ?? "0");
      const close = Number.parseFloat(v.close ?? "0");
      const volume = Number.parseFloat(v.volume ?? "0");
      return {
        openTime: t,
        open,
        high,
        low,
        close,
        volume,
        closeTime: t,
      };
    });
    return candles;
  } catch (e) {
    console.error(`Failed to fetch gold candles from ${provider}`, e);
    return [];
  }
};

export const fetchGoldMarketSummary = async (
  symbol: string,
  locale: Locale = "en",
  provider: GoldProvider = DEFAULT_GOLD_PROVIDER
): Promise<{ summary: string; stats: GoldMarketSummary | null }> => {
  const config = resolveGoldProviderConfig(provider);
  const providerLabel = resolveLabelForProvider(locale, provider);
  try {
    const candles = await fetchGoldCandles(symbol, "1h", 2, provider);
    if (!candles.length) {
      return {
        summary: translate(locale, "market.summary.unavailable", { provider: providerLabel }),
        stats: null,
      };
    }
    const last = candles[candles.length - 1];
    const s: GoldMarketSummary = {
      symbol: config.sanitizeSymbol(symbol),
      lastPrice: last.close,
      provider,
      closeTime: new Date(last.closeTime).toISOString(),
    };
    const summary = [
      translate(locale, "market.summary.modeTitle.spot", {
        symbol: s.symbol,
        provider: providerLabel,
      }),
      translate(locale, "market.summary.lastPrice", { value: s.lastPrice.toFixed(2) }),
      translate(locale, "market.summary.lastUpdate", { value: s.closeTime }),
    ].join("\n");
    return { summary, stats: s };
  } catch (e) {
    console.error(`Failed to build gold summary from ${provider}`, e);
    return {
      summary: translate(locale, "market.summary.unavailable", { provider: providerLabel }),
      stats: null,
    };
  }
};

const buildSymbolLabel = (value: string) => {
  const normalized = value.toUpperCase();
  if (normalized.length === 6) {
    return `${normalized.slice(0, 3)} / ${normalized.slice(3)}`;
  }
  return normalized;
};

const DEFAULT_GOLD_SYMBOL = resolveGoldProviderConfig().defaultSymbol;

export const GOLD_SYMBOLS = [
  {
    symbol: DEFAULT_GOLD_SYMBOL,
    label: buildSymbolLabel(DEFAULT_GOLD_SYMBOL),
  },
] as const;

export type { GoldProvider };
