import { NextRequest, NextResponse } from "next/server";
import {
  fetchBinanceCandles,
  fetchBinanceMarketSummary,
  fetchBinanceOrderBook,
  fetchBinanceTradablePairs,
  formatBinanceSummary,
  isPairTradable,
} from "@/lib/binance";

const ALLOWED_INTERVALS = new Set(["1m", "5m", "15m", "1h", "4h", "1d"]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbolParam = searchParams.get("symbol")?.toUpperCase() ?? "BTCUSDT";
  const intervalParam = searchParams.get("interval")?.toLowerCase() ?? "15m";
  const limitParam = Number.parseInt(searchParams.get("limit") ?? "500", 10);

  const isSupported = await isPairTradable(symbolParam);
  if (!isSupported) {
    const pairs = await fetchBinanceTradablePairs();
    const topSamples = pairs.slice(0, 20).map((item) => item.label).join(", ");
    return NextResponse.json(
      { error: `Pair tidak didukung. Contoh pair: ${topSamples}` },
      { status: 400 }
    );
  }

  if (!ALLOWED_INTERVALS.has(intervalParam)) {
    return NextResponse.json(
      { error: "Interval chart tidak valid." },
      { status: 400 }
    );
  }

  const limit = Number.isFinite(limitParam) ? Math.max(50, Math.min(limitParam, 1000)) : 500;

  const [candles, summary, orderBook] = await Promise.all([
    fetchBinanceCandles(symbolParam, intervalParam, limit),
    fetchBinanceMarketSummary(symbolParam),
    fetchBinanceOrderBook(symbolParam, 50),
  ]);

  return NextResponse.json({
    symbol: symbolParam,
    interval: intervalParam,
    candles,
    orderBook,
    summary: formatBinanceSummary(summary),
    summaryStats: summary,
    updatedAt: new Date().toISOString(),
  });
}
