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
import { isLocale, type Locale } from "@/i18n/messages";
import { translate } from "@/i18n/translate";

const ALLOWED_INTERVALS = new Set(["1m", "5m", "15m", "1h", "4h", "1d"]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const providerParam = searchParams.get("provider")?.toLowerCase() ?? DEFAULT_PROVIDER;
  const provider = isCexProvider(providerParam) ? providerParam : DEFAULT_PROVIDER;
  const symbolParamRaw = searchParams.get("symbol")?.toUpperCase();
  const symbolParam = symbolParamRaw
    ? symbolParamRaw.replace(/[^A-Z0-9]/g, "")
    : provider === "bybit"
    ? (process.env.BYBIT_SYMBOL ?? "BTCUSDT")
    : (process.env.BINANCE_SYMBOL ?? "BTCUSDT");
  const intervalParam = searchParams.get("interval")?.toLowerCase() ?? "15m";
  const limitParam = Number.parseInt(searchParams.get("limit") ?? "500", 10);
  const localeParam = searchParams.get("locale") ?? "";
  const locale: Locale = localeParam && isLocale(localeParam) ? localeParam : "en";

  if (provider === "binance") {
    const isSupported = await isPairTradable(symbolParam);
    if (!isSupported) {
      const pairs = await fetchBinanceTradablePairs();
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

  const [candles, summary, orderBook] = await Promise.all(
    provider === "bybit"
      ? [
          fetchBybitCandles(symbolParam, intervalParam, limit),
          fetchBybitMarketSummary(symbolParam),
          fetchBybitOrderBook(symbolParam, 50),
        ]
      : [
          fetchBinanceCandles(symbolParam, intervalParam, limit),
          fetchBinanceMarketSummary(symbolParam),
          fetchBinanceOrderBook(symbolParam, 50),
        ]
  );

  return NextResponse.json({
    symbol: symbolParam,
    interval: intervalParam,
    provider,
    candles,
    orderBook,
    summary:
      provider === "bybit"
        ? formatBybitSummary(summary, locale)
        : formatBinanceSummary(summary, locale),
    summaryStats: summary,
    updatedAt: new Date().toISOString(),
  });
}
