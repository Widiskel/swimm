import { NextRequest, NextResponse } from "next/server";

import { fetchBinanceTradablePairs } from "@/features/market/exchanges/binance";
import { fetchBybitTradablePairs } from "@/features/market/exchanges/bybit";
import { DEFAULT_PROVIDER, isCexProvider } from "@/features/market/exchanges";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const providerParam = searchParams.get("provider")?.toLowerCase() ?? DEFAULT_PROVIDER;
  const provider = isCexProvider(providerParam) ? providerParam : DEFAULT_PROVIDER;

  try {
    const pairs =
      provider === "bybit" ? await fetchBybitTradablePairs() : await fetchBinanceTradablePairs();
    const symbols = pairs.map(({ symbol, label }) => ({ symbol, label }));
    return NextResponse.json({ symbols, provider });
  } catch (error) {
    console.error("Failed to load tradable pairs", error);
    return NextResponse.json(
      { error: "Gagal memuat daftar pair dari provider." },
      { status: 500 }
    );
  }
}
