import type {
  CandlestickData,
  IChartApi,
  IPriceLine,
  ISeriesApi,
  LineData,
  LineStyle,
  LineWidth,
} from "lightweight-charts";
import type { BinanceMarketSummary } from "@/lib/binance";

export type IndicatorKey =
  | "sma20"
  | "sma50"
  | "sma100"
  | "sma200"
  | "ema20"
  | "ema50"
  | "ema200"
  | "bollinger";

export type OverlayLevel = {
  price: number;
  label: string;
  color: string;
  lineWidth?: LineWidth;
  lineStyle?: LineStyle;
};

export type BollingerData = {
  basis: LineData[];
  upper: LineData[];
  lower: LineData[];
};

export type IndicatorSeriesMap = Partial<
  Record<IndicatorKey, ISeriesApi<"Line"> | BollingerSeriesRefs>
>;

export type BollingerSeriesRefs = {
  basis: ISeriesApi<"Line">;
  upper: ISeriesApi<"Line">;
  lower: ISeriesApi<"Line">;
};

export type IndicatorDataMap = Partial<Record<IndicatorKey, LineData[] | BollingerData>>;

export type IndicatorConfigItem = {
  key: IndicatorKey;
  label: string;
  defaultVisible: boolean;
  description?: string;
  type: "sma" | "ema" | "bollinger";
  length: number;
  multiplier?: number;
  colors: string[];
};

export type MarketCandle = {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
};

export type OrderBookEntry = {
  price: number;
  quantity: number;
};

export type MarketSnapshot = {
  symbol: string;
  interval: string;
  candles: MarketCandle[];
  orderBook: {
    bids: OrderBookEntry[];
    asks: OrderBookEntry[];
  };
  summary: string;
  summaryStats: BinanceMarketSummary | null;
  updatedAt: string;
};

export type MarketSummary = {
  priceFormatter: Intl.NumberFormat;
  summaryStats: BinanceMarketSummary | null;
  baseAssetSymbol: string;
  priceChangePct: number | null;
  changeBadgeClass: string;
  priceChangeLabel: string;
  volumeLabelBase: string;
  volumeLabelQuote: string;
  highLowLabel: string;
};

export type ChartLifecycleRefs = {
  chartRef: IChartApi | null;
  candleSeries: ISeriesApi<"Candlestick"> | null;
  indicatorSeries: IndicatorSeriesMap;
  overlayPriceLines: IPriceLine[];
};

export type HoverData = {
  timeLabel: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type LiveChartCallbacks = {
  onCandlesChange?: (candles: CandlestickData[]) => void;
  onHoverChange?: (hover: HoverData | null) => void;
};

// Re-export Binance types locally to avoid circular imports.
