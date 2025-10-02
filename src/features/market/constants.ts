import type { IndicatorConfigItem } from "./types";
import type { CexProvider } from "@/features/market/exchanges";
export { CEX_PROVIDERS, DEFAULT_PROVIDER } from "@/features/market/exchanges";
export const PROVIDER_ICON_MAP: Record<CexProvider, string> = {
  binance: "/cex/binance.png",
  bybit: "/cex/bybit.webp",
  gold: "/logo/branding.png",
};

export const MARKET_MODES = ["spot", "futures"] as const;
export type MarketMode = (typeof MARKET_MODES)[number];
export const DEFAULT_MARKET_MODE: MarketMode = "spot";
export const isMarketMode = (
  value: string | null | undefined
): value is MarketMode => value === "spot" || value === "futures";

export const TIMEFRAME_OPTIONS = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;

export const INDICATOR_CONFIG: IndicatorConfigItem[] = [
  {
    key: "sma20",
    label: "MA 20",
    defaultVisible: true,
    type: "sma",
    length: 20,
    colors: ["#38bdf8"],
  },
  {
    key: "sma50",
    label: "MA 50",
    defaultVisible: true,
    type: "sma",
    length: 50,
    colors: ["#a855f7"],
  },
  {
    key: "sma100",
    label: "MA 100",
    defaultVisible: false,
    type: "sma",
    length: 100,
    colors: ["#f97316"],
  },
  {
    key: "sma200",
    label: "MA 200",
    defaultVisible: false,
    type: "sma",
    length: 200,
    colors: ["#22d3ee"],
  },
  {
    key: "ema20",
    label: "EMA 20",
    defaultVisible: false,
    type: "ema",
    length: 20,
    colors: ["#facc15"],
  },
  {
    key: "ema50",
    label: "EMA 50",
    defaultVisible: false,
    type: "ema",
    length: 50,
    colors: ["#fb7185"],
  },
  {
    key: "ema200",
    label: "EMA 200",
    defaultVisible: false,
    type: "ema",
    length: 200,
    colors: ["#34d399"],
  },
  {
    key: "bollinger",
    label: "Bollinger Bands",
    defaultVisible: false,
    type: "bollinger",
    length: 20,
    multiplier: 2,
    colors: ["#fbbf24", "#fbbf24", "#fbbf24"],
  },
];

export const TARGET_LABELS = ["TP1", "TP2", "TP3", "TP4", "TP5"] as const;

export const DEFAULT_PAIR_SYMBOL = process.env.BINANCE_SYMBOL ?? "BTCUSDT";



