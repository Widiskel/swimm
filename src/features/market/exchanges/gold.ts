import type { Locale } from "@/i18n/messages";
import { translate } from "@/i18n/translate";

const TWELVE_BASE = "https://api.twelvedata.com";
const GOLD_DEFAULT_SYMBOL = "XAUUSD";

const mapInterval = (interval: string): string => {
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

const sanitizeSymbol = (symbol?: string) => {
  const s = (symbol ?? GOLD_DEFAULT_SYMBOL).toUpperCase().replace(/[^A-Z]/g, "");
  return s === "XAUUSD" ? "XAUUSD" : GOLD_DEFAULT_SYMBOL;
};

const toProviderSymbol = (symbol?: string) => {
  // Twelve Data expects XAU/USD format
  const s = sanitizeSymbol(symbol);
  return s === "XAUUSD" ? "XAU/USD" : s;
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
  provider: "twelvedata";
  closeTime: string;
};

export const fetchGoldCandles = async (
  symbol: string,
  interval: string,
  limit: number
): Promise<GoldCandle[]> => {
  try {
    const key = process.env.GOLD_API_KEY;
    if (!key) {
      throw new Error("GOLD_API_KEY not configured");
    }
    const providerSymbol = toProviderSymbol(symbol);
    const i = mapInterval(interval);
    const url = new URL("/time_series", TWELVE_BASE);
    url.searchParams.set("symbol", providerSymbol);
    url.searchParams.set("interval", i);
    url.searchParams.set("outputsize", String(Math.min(Math.max(limit, 50), 1000)));
    url.searchParams.set("apikey", key);

    const res = await fetch(url, { method: "GET", cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Twelve Data responded ${res.status}`);
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
    console.error("Failed to fetch gold candles", e);
    return [];
  }
};

export const fetchGoldMarketSummary = async (
  symbol: string,
  locale: Locale = "en"
): Promise<{ summary: string; stats: GoldMarketSummary | null }> => {
  try {
    const candles = await fetchGoldCandles(symbol, "1h", 2);
    if (!candles.length) {
      return {
        summary: translate(locale, "market.summary.unavailable", { provider: "Twelve Data" }),
        stats: null,
      };
    }
    const last = candles[candles.length - 1];
    const s: GoldMarketSummary = {
      symbol: sanitizeSymbol(symbol),
      lastPrice: last.close,
      provider: "twelvedata",
      closeTime: new Date(last.closeTime).toISOString(),
    };
    const summary = [
      translate(locale, "market.summary.spotTitle", { symbol: s.symbol, provider: "Twelve Data" }),
      translate(locale, "market.summary.lastPrice", { value: s.lastPrice.toFixed(2) }),
      translate(locale, "market.summary.lastUpdate", { value: s.closeTime }),
    ].join("\n");
    return { summary, stats: s };
  } catch (e) {
    console.error("Failed to build gold summary", e);
    return {
      summary: translate(locale, "market.summary.unavailable", { provider: "Twelve Data" }),
      stats: null,
    };
  }
};

export const GOLD_SYMBOLS = [{ symbol: "XAUUSD", label: "XAU / USD" }] as const;
