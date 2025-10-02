import { NextRequest, NextResponse } from "next/server";

import { fetchBinanceTradablePairs } from "@/features/market/exchanges/binance";
import { fetchBybitTradablePairs } from "@/features/market/exchanges/bybit";
import { DEFAULT_PROVIDER, isCexProvider } from "@/features/market/exchanges";
import {
  DEFAULT_MARKET_MODE,
  isMarketMode,
  type MarketMode,
} from "@/features/market/constants";
import { isLocale, type Locale } from "@/i18n/messages";
import { translate } from "@/i18n/translate";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const providerParam = searchParams.get("provider")?.toLowerCase() ?? DEFAULT_PROVIDER;
  const provider = isCexProvider(providerParam) ? providerParam : providerParam === "gold" ? "gold" : (DEFAULT_PROVIDER as "binance" | "bybit" | "gold");
  const localeParam = searchParams.get("locale") ?? "";
  const locale: Locale = localeParam && isLocale(localeParam) ? localeParam : "en";
  const modeParam = searchParams.get("mode")?.toLowerCase() ?? DEFAULT_MARKET_MODE;
  const mode: MarketMode = isMarketMode(modeParam) ? modeParam : DEFAULT_MARKET_MODE;

  try {
    if (provider === "gold") {
      return NextResponse.json({ symbols: [{ symbol: "XAUUSD", label: "XAU / USD" }], provider });
    }
    const pairs = provider === "bybit" ? await fetchBybitTradablePairs() : await fetchBinanceTradablePairs();
    const symbols = pairs.map(({ symbol, label }) => ({ symbol, label }));
    return NextResponse.json({ symbols, provider, mode });
  } catch (error) {
    console.error("Failed to load tradable pairs", error);
    return NextResponse.json(
      { error: translate(locale, "market.errors.loadPairs") },
      { status: 500 }
    );
  }
}


