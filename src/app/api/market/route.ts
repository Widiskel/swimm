import { NextRequest, NextResponse } from "next/server";
import {
  fetchBinanceCandles,
  fetchBinanceMarketSummary,
  fetchBinanceOrderBook,
  formatBinanceSummary,
} from "@/lib/binance";

const ALLOWED_SYMBOLS = new Set(["BTCUSDT", "ETHUSDT", "SOLUSDT", "HYPEUSDT"]);
const ALLOWED_INTERVALS = new Set(["1m", "5m", "15m", "1h", "4h", "1d"]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbolParam = searchParams.get("symbol")?.toUpperCase() ?? "BTCUSDT";
  const intervalParam = searchParams.get("interval")?.toLowerCase() ?? "15m";
  const limitParam = Number.parseInt(searchParams.get("limit") ?? "500", 10);

  if (!ALLOWED_SYMBOLS.has(symbolParam)) {
    return NextResponse.json(
      { error: "Symbol tidak didukung. Pilih salah satu dari BTCUSDT, ETHUSDT, SOLUSDT, HYPEUSDT." },
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
