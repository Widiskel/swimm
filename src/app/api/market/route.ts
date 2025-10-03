import { NextRequest, NextResponse } from "next/server";
import {
  fetchBinanceCandles,
  fetchBinanceMarketSummary,
  fetchBinanceOrderBook,
  fetchBinanceTradablePairs,
  formatBinanceSummary,
  isPairTradable,
  type BinanceMarketSummary,
} from "@/features/market/exchanges/binance";
import {
  fetchBybitCandles,
  fetchBybitMarketSummary,
  fetchBybitOrderBook,
  formatBybitSummary,
} from "@/features/market/exchanges/bybit";
import { DEFAULT_PROVIDER, isCexProvider } from "@/features/market/exchanges";
import {
  DEFAULT_MARKET_MODE,
  isMarketMode,
  type MarketMode,
} from "@/features/market/constants";
import { fetchGoldCandles, fetchGoldMarketSummary } from "@/features/market/exchanges/twelvedata";
import { isLocale, type Locale } from "@/i18n/messages";
import { translate } from "@/i18n/translate";
import { getSessionFromCookie } from "@/lib/session";
import { getUserSettings } from "@/lib/user-settings";

const ALLOWED_INTERVALS = new Set(["1m", "5m", "15m", "1h", "4h", "1d"]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const providerParam = searchParams.get("provider")?.toLowerCase() ?? DEFAULT_PROVIDER;
  const provider = isCexProvider(providerParam) ? providerParam : DEFAULT_PROVIDER;
  const symbolParamRaw = searchParams.get("symbol")?.toUpperCase();
  const modeParam = searchParams.get("mode")?.toLowerCase() ?? DEFAULT_MARKET_MODE;
  const mode: MarketMode = isMarketMode(modeParam) ? modeParam : DEFAULT_MARKET_MODE;
  const defaultSymbol = "BTCUSDT";
  const symbolParam = symbolParamRaw
    ? symbolParamRaw.replace(/[^A-Z0-9]/g, "")
    : provider === "bybit"
    ? (process.env.BYBIT_SYMBOL ?? "BTCUSDT")
    : provider === "twelvedata"
    ? "XAUUSD"
    : (process.env.BINANCE_SYMBOL ?? "BTCUSDT");
  const intervalParam = searchParams.get("interval")?.toLowerCase() ?? "15m";
  const limitParam = Number.parseInt(searchParams.get("limit") ?? "500", 10);
  const startParamRaw = searchParams.get("start");
  const endParamRaw = searchParams.get("end");
  const localeParam = searchParams.get("locale") ?? "";
  const locale: Locale = localeParam && isLocale(localeParam) ? localeParam : "en";

  const session = await getSessionFromCookie();
  const settings = session ? await getUserSettings(session.userId) : null;

  const binanceAuth = settings?.binanceApiKey ? { apiKey: settings.binanceApiKey } : undefined;
  const bybitAuth = settings?.bybitApiKey ? { apiKey: settings.bybitApiKey } : undefined;

  if (provider === "binance") {
    const isSupported = await isPairTradable(symbolParam, binanceAuth, mode);
    if (!isSupported) {
      const pairs = await fetchBinanceTradablePairs(binanceAuth, mode);
      const topSamples = pairs.slice(0, 20).map((item) => item.label).join(", ");
      return NextResponse.json(
        {
          error: translate(locale, "market.errors.unsupportedPair", {
            samples: topSamples,
          }),
        },
        { status: 400 }
      );
    }
  }

  if (!ALLOWED_INTERVALS.has(intervalParam)) {
    return NextResponse.json(
      { error: translate(locale, "market.errors.invalidInterval") },
      { status: 400 }
    );
  }

  const limit = Number.isFinite(limitParam) ? Math.max(50, Math.min(limitParam, 5000)) : 500;

  const parseTimestamp = (value: string | null) => {
    if (!value) {
      return null;
    }
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric > 10_000_000_000 ? numeric : numeric * 1000;
    }
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
    return null;
  };

  const startTimeMs = parseTimestamp(startParamRaw);
  const endTimeMs = parseTimestamp(endParamRaw);

  const intervalMsMap: Record<string, number> = {
    "1m": 60_000,
    "5m": 5 * 60_000,
    "15m": 15 * 60_000,
    "1h": 60 * 60_000,
    "4h": 4 * 60 * 60_000,
    "1d": 24 * 60 * 60_000,
  };

  const intervalMs = intervalMsMap[intervalParam] ?? intervalMsMap["1h"];

  const computedLimit = (() => {
    if (startTimeMs !== null) {
      const effectiveEnd = endTimeMs ?? Date.now();
      const diff = Math.max(effectiveEnd - startTimeMs, intervalMs);
      const estimate = Math.ceil(diff / intervalMs) + 5;
      return Math.min(Math.max(estimate, limit), 5000);
    }
    return limit;
  })();

  const buildGoldOrderBook = (lastPrice: number, levels = 50) => {
    if (!Number.isFinite(lastPrice) || lastPrice <= 0) {
      return { bids: [], asks: [] } as { bids: { price: number; quantity: number }[]; asks: { price: number; quantity: number }[] };
    }
    const bids: { price: number; quantity: number }[] = [];
    const asks: { price: number; quantity: number }[] = [];
    const stepPct = 0.0005;
    const baseQty = 1.0;
    for (let i = 1; i <= levels; i += 1) {
      const bidPrice = Number((lastPrice * (1 - stepPct * i)).toFixed(2));
      const askPrice = Number((lastPrice * (1 + stepPct * i)).toFixed(2));
      const scale = Math.max(0.2, Math.exp(-i / 20));
      bids.push({ price: bidPrice, quantity: Number((baseQty * scale).toFixed(4)) });
      asks.push({ price: askPrice, quantity: Number((baseQty * scale).toFixed(4)) });
    }
    return { bids, asks };
  };

  const [candles, summary, rawOrderBook] = await Promise.all(
    provider === "bybit"
      ? [
          fetchBybitCandles(symbolParam, intervalParam, { limit }),
          fetchBybitMarketSummary(symbolParam),
          fetchBybitOrderBook(symbolParam, 50),
        ]
      : provider === "twelvedata"
      ? [
          fetchGoldCandles(symbolParam, intervalParam, limit),
          fetchGoldMarketSummary(symbolParam, locale),
          Promise.resolve({ bids: [], asks: [] }),
        ]
      : [
          fetchBinanceCandles(symbolParam, intervalParam, { limit }),
          fetchBinanceMarketSummary(symbolParam),
          fetchBinanceOrderBook(symbolParam, 50),
        ]
  );

  const computedOrderBook = provider === "twelvedata"
    ? (() => {
        const list = candles as unknown as Array<{ close: number }>;
        const last = list && list.length ? list[list.length - 1] : null;
        const lastClose = last ? Number(last.close ?? 0) : 0;
        return buildGoldOrderBook(lastClose, 50);
      })()
    : rawOrderBook;

  return NextResponse.json({
    symbol: symbolParam,
    interval: intervalParam,
    provider,
    mode,
    candles,
    orderBook: computedOrderBook,
    summary:
      provider === "bybit"
        ? formatBybitSummary(summary as BinanceMarketSummary | null, locale)
        : provider === "twelvedata"
        ? (summary as { summary: string; stats: unknown }).summary
        : formatBinanceSummary(summary as BinanceMarketSummary | null, locale),
    summaryStats: provider === "twelvedata" ? (summary as { summary: string; stats: unknown }).stats : summary,
    updatedAt: new Date().toISOString(),
  });
}
