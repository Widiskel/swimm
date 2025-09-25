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
import { getSessionFromCookie } from "@/lib/session";
import { getUserSettings } from "@/lib/user-settings";

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

  const [candles, summary, orderBook] = await Promise.all(
    provider === "bybit"
      ? [
          fetchBybitCandles(symbolParam, intervalParam, limit, bybitAuth),
          fetchBybitMarketSummary(symbolParam, bybitAuth),
          fetchBybitOrderBook(symbolParam, 50, bybitAuth),
        ]
      : [
          fetchBinanceCandles(symbolParam, intervalParam, limit, binanceAuth),
          fetchBinanceMarketSummary(symbolParam, binanceAuth),
          fetchBinanceOrderBook(symbolParam, 50, binanceAuth),
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




