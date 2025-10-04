import { NextRequest, NextResponse } from "next/server";

import { fetchBinanceTradablePairs } from "@/features/market/exchanges/binance";
import { fetchBybitTradablePairs } from "@/features/market/exchanges/bybit";
import { isCexProvider } from "@/features/market/exchanges";
import {
  DEFAULT_MARKET_MODE,
  isMarketMode,
  type MarketMode,
  CATEGORY_PROVIDER_MAP,
  DEFAULT_ASSET_CATEGORY,
  type AssetCategory,
} from "@/features/market/constants";
import { isLocale, type Locale } from "@/i18n/messages";
import { translate } from "@/i18n/translate";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryParam = searchParams.get("category")?.toLowerCase() ?? DEFAULT_ASSET_CATEGORY;
  const category: AssetCategory = categoryParam === "gold" ? "gold" : "crypto";
  const allowedProviders = CATEGORY_PROVIDER_MAP[category];
  const providerParam = searchParams.get("provider")?.toLowerCase() ?? allowedProviders[0];
  const provider = isCexProvider(providerParam) && allowedProviders.includes(providerParam)
    ? (providerParam as typeof allowedProviders[number])
    : allowedProviders[0];
  const localeParam = searchParams.get("locale") ?? "";
  const locale: Locale = localeParam && isLocale(localeParam) ? localeParam : "en";
  const modeParam = searchParams.get("mode")?.toLowerCase() ?? DEFAULT_MARKET_MODE;
  const mode: MarketMode = isMarketMode(modeParam) ? modeParam : DEFAULT_MARKET_MODE;

  try {
    if (provider === "twelvedata") {
      return NextResponse.json({
        symbols: [{ symbol: "XAUUSD", label: "XAU / USD" }],
        provider,
        category,
      });
    }
    const pairs = provider === "bybit" ? await fetchBybitTradablePairs() : await fetchBinanceTradablePairs();
    const symbols = pairs.map(({ symbol, label }) => ({ symbol, label }));
    return NextResponse.json({ symbols, provider, mode, category });
  } catch (error) {
    console.error("Failed to load tradable pairs", error);
    return NextResponse.json(
      { error: translate(locale, "market.errors.loadPairs") },
      { status: 500 }
    );
  }
}
