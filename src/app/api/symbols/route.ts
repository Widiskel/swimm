import { NextResponse } from "next/server";

import { fetchBinanceTradablePairs } from "@/lib/binance";

export async function GET() {
  try {
    const symbols = await fetchBinanceTradablePairs();
    return NextResponse.json({ symbols });
  } catch (error) {
    console.error("Failed to load Binance tradable pairs", error);
    return NextResponse.json(
      { error: "Gagal memuat daftar pair Binance." },
      { status: 500 }
    );
  }
}
