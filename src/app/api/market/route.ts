import { NextRequest, NextResponse } from "next/server";
import {
  fetchBinanceCandles,
  fetchBinanceMarketSummary,
  fetchBinanceOrderBook,
  fetchBinanceTradablePairs,
  formatBinanceSummary,
  isPairTradable,
} from "@/features/market/exchanges/binance";
import {
  fetchBybitCandles,
  fetchBybitMarketSummary,
  fetchBybitOrderBook,
  formatBybitSummary,
} from "@/features/market/exchanges/bybit";
import { DEFAULT_PROVIDER, isCexProvider } from "@/features/market/exchanges";
import { fetchGoldCandles, fetchGoldMarketSummary } from "@/features/market/exchanges/gold";
import { isLocale, type Locale } from "@/i18n/messages";
import { translate } from "@/i18n/translate";
import { getSessionFromCookie } from "@/lib/session";
import { getUserSettings } from "@/lib/user-settings";

const ALLOWED_INTERVALS = new Set(["1m", "5m", "15m", "1h", "4h", "1d"]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const providerParam = searchParams.get("provider")?.toLowerCase() ?? DEFAULT_PROVIDER;
  const provider = isCexProvider(providerParam) ? providerParam : providerParam === "gold" ? "gold" : DEFAULT_PROVIDER;
  const symbolParamRaw = searchParams.get("symbol")?.toUpperCase();
  const symbolParam = symbolParamRaw
    ? symbolParamRaw.replace(/[^A-Z0-9]/g, "")
    : provider === "bybit"
    ? (process.env.BYBIT_SYMBOL ?? "BTCUSDT")
    : provider === "gold"
    ? "XAUUSD"
    : (process.env.BINANCE_SYMBOL ?? "BTCUSDT");
  const intervalParam = searchParams.get("interval")?.toLowerCase() ?? "15m";
  const limitParam = Number.parseInt(searchParams.get("limit") ?? "500", 10);
  const localeParam = searchParams.get("locale") ?? "";
  const locale: Locale = localeParam && isLocale(localeParam) ? localeParam : "en";

  const session = await getSessionFromCookie();
  const settings = session ? await getUserSettings(session.userId) : null;

  const binanceAuth = settings?.binanceApiKey ? { apiKey: settings.binanceApiKey } : undefined;
  const bybitAuth = settings?.bybitApiKey ? { apiKey: settings.bybitApiKey } : undefined;

  if (provider === "binance") {
    const isSupported = await isPairTradable(symbolParam, binanceAuth);
    if (!isSupported) {
      const pairs = await fetchBinanceTradablePairs(binanceAuth);
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

  const limit = Number.isFinite(limitParam) ? Math.max(50, Math.min(limitParam, 1000)) : 500;

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
          fetchBybitCandles(symbolParam, intervalParam, limit),
          fetchBybitMarketSummary(symbolParam),
          fetchBybitOrderBook(symbolParam, 50),
        ]
      : provider === "gold"
      ? [
          fetchGoldCandles(symbolParam, intervalParam, limit),
          fetchGoldMarketSummary(symbolParam, locale),
          Promise.resolve({ bids: [], asks: [] }),
        ]
      : [
          fetchBinanceCandles(symbolParam, intervalParam, limit),
          fetchBinanceMarketSummary(symbolParam),
          fetchBinanceOrderBook(symbolParam, 50),
        ]
  );

  const computedOrderBook = provider === "gold"
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
    candles,
    orderBook: computedOrderBook,
    summary:
      provider === "bybit"
        ? formatBybitSummary(summary, locale)
        : provider === "gold"
        ? (summary as { summary: string; stats: unknown }).summary
        : formatBinanceSummary(summary, locale),
    summaryStats: provider === "gold" ? (summary as { summary: string; stats: unknown }).stats : summary,
    updatedAt: new Date().toISOString(),
  });
}
