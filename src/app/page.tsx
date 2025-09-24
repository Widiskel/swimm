"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  type CandlestickData,
  type IChartApi,
  type LineData,
  type ISeriesApi,
  type MouseEventParams,
} from "lightweight-charts";
import type { BinanceMarketSummary } from "@/lib/binance";

type DataMode = "scrape" | "upload" | "manual";

type ChartPoint = {
  time: string;
  close: number;
};

type AgentResponse = {
  summary: string;
  decision: {
    action: "buy" | "sell" | "hold";
    confidence: number;
    timeframe: string;
    rationale: string;
  };
  highlights: string[];
  nextSteps: string[];
  market: {
    pair: string;
    chart: {
      interval: string;
      points: ChartPoint[];
      narrative: string;
      forecast: string;
    };
    technical: string[];
    fundamental: string[];
  };
  tradePlan: {
    bias: "long" | "short" | "neutral";
    entries: number[];
    entry: number | null;
    stopLoss: number | null;
    takeProfits: number[];
    executionWindow: string;
    sizingNotes: string;
    rationale: string;
  };
};

type MarketCandle = {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
};

type OrderBookEntry = {
  price: number;
  quantity: number;
};

type MarketSnapshot = {
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

const TRADING_PAIRS = [
  { label: "BTC/USDT", symbol: "BTCUSDT" },
  { label: "ETH/USDT", symbol: "ETHUSDT" },
  { label: "SOL/USDT", symbol: "SOLUSDT" },
] as const;

const TIMEFRAME_OPTIONS = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;

type IndicatorKey =
  | "sma20"
  | "sma50"
  | "sma100"
  | "sma200"
  | "ema20"
  | "ema50"
  | "ema200"
  | "bollinger";

type IndicatorConfigItem = {
  key: IndicatorKey;
  label: string;
  defaultVisible: boolean;
  description?: string;
  type: "sma" | "ema" | "bollinger";
  length: number;
  multiplier?: number;
  colors: string[];
};

const INDICATOR_CONFIG: IndicatorConfigItem[] = [
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

const TARGET_LABELS = ["TP1", "TP2", "TP3", "TP4", "TP5"] as const;
const DEFAULT_PAIR_SYMBOL = "BTCUSDT" as const;

const withAlpha = (hex: string, alpha: number) => {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!match) {
    return hex;
  }
  const r = Number.parseInt(match[1], 16);
  const g = Number.parseInt(match[2], 16);
  const b = Number.parseInt(match[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const formatPairLabel = (symbol: string) => {
  const upper = symbol.toUpperCase();
  if (upper.includes("/")) {
    return upper;
  }
  if (upper.endsWith("USDT")) {
    return `${upper.slice(0, -4)}/USDT`;
  }
  if (upper.length >= 6) {
    return `${upper.slice(0, upper.length / 2)}/${upper.slice(
      upper.length / 2
    )}`;
  }
  return upper;
};

export default function Home() {
  const [selectedPair, setSelectedPair] = useState<string>(
    TRADING_PAIRS[0].symbol
  );
  const [timeframe, setTimeframe] =
    useState<(typeof TIMEFRAME_OPTIONS)[number]>("1h");
  const [isChartActive, setIsChartActive] = useState(false);
  const [chartData, setChartData] = useState<MarketSnapshot | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [response, setResponse] = useState<AgentResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartApiRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const indicatorSeriesRef = useRef<
    Partial<
      Record<
        IndicatorKey,
        | ISeriesApi<"Line">
        | {
            basis: ISeriesApi<"Line">;
            upper: ISeriesApi<"Line">;
            lower: ISeriesApi<"Line">;
          }
      >
    >
  >({});
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const crosshairHandlerRef = useRef<
    ((param: MouseEventParams) => void) | null
  >(null);
  const [isChartVisible, setIsChartVisible] = useState(false);
  const hoverDataRef = useRef<{
    timeLabel: string;
    open: number;
    high: number;
    low: number;
    close: number;
  } | null>(null);
  const [hoverData, setHoverData] = useState<{
    timeLabel: string;
    open: number;
    high: number;
    low: number;
    close: number;
  } | null>(null);
  const setHoverState = useCallback(
    (
      value: {
        timeLabel: string;
        open: number;
        high: number;
        low: number;
        close: number;
      } | null
    ) => {
      hoverDataRef.current = value;
      setHoverData(value);
    },
    []
  );
  const [indicatorVisibility, setIndicatorVisibility] = useState<
    Record<IndicatorKey, boolean>
  >(() => {
    const initial: Record<IndicatorKey, boolean> = {} as Record<
      IndicatorKey,
      boolean
    >;
    for (const item of INDICATOR_CONFIG) {
      initial[item.key] = item.defaultVisible;
    }
    return initial;
  });

  const priceFormatter = useMemo(
    () =>
      new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );
  const simpleNumberFormatter = useMemo(
    () =>
      new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );
  const formatPrice = (value: number | null) =>
    typeof value === "number" && Number.isFinite(value)
      ? `${priceFormatter.format(value)} USDT`
      : "-";

  const formatDateTime = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleString("id-ID", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

  const tradeEntries = useMemo(() => {
    if (!response) {
      return [] as number[];
    }
    if (response.tradePlan?.entries && response.tradePlan.entries.length > 0) {
      return response.tradePlan.entries;
    }
    return response?.tradePlan?.entry !== null &&
      response?.tradePlan?.entry !== undefined
      ? [response.tradePlan.entry]
      : [];
  }, [response]);

  const tradeTargets = useMemo(
    () => response?.tradePlan?.takeProfits ?? [],
    [response]
  );
  const paddedTargets = useMemo(
    () =>
      Array.from({ length: TARGET_LABELS.length }, (_, index) =>
        tradeTargets[index] !== undefined ? tradeTargets[index] : null
      ),
    [tradeTargets]
  );

  const entryZoneValues = useMemo(() => {
    if (!tradeEntries.length) {
      return [] as number[];
    }
    const sorted = [...tradeEntries].sort((a, b) => a - b);
    return sorted;
  }, [tradeEntries]);

  const tradeStopLoss = response?.tradePlan?.stopLoss ?? null;
  const tradeExecutionWindow = response?.tradePlan?.executionWindow ?? "-";
  const tradeSizingNotes = response?.tradePlan?.sizingNotes ?? "-";
  const tradeRationale = response?.tradePlan?.rationale ?? "-";

  const rawPairSymbol =
    response?.market?.pair ?? selectedPair ?? DEFAULT_PAIR_SYMBOL;
  const formattedPair = useMemo(
    () => formatPairLabel(rawPairSymbol),
    [rawPairSymbol]
  );

  const tradingNarrative =
    tradeRationale !== "-" && tradeRationale.trim().length > 0
      ? tradeRationale
      : response?.decision?.rationale ?? response?.summary ?? "";

  const supportiveHighlights = useMemo(() => {
    if (!response?.highlights) {
      return [] as string[];
    }
    const blockedKeywords = [
      "PAIR:",
      "TYPE:",
      "ENTRY ZONE:",
      "TARGETS:",
      "STOP LOSS:",
      "PARSE_WARNING",
    ];
    return response.highlights.filter((item) => {
      const normalized = item.trim().toUpperCase();
      return !blockedKeywords.some((keyword) => normalized.startsWith(keyword));
    });
  }, [response]);

  const summaryStats = chartData?.summaryStats ?? null;
  const baseAssetSymbol = summaryStats
    ? summaryStats.symbol.replace(/USDT$/i, "")
    : formatPairLabel(selectedPair).split("/")[0] ?? "";
  const priceChangePct = summaryStats?.priceChangePercent ?? null;
  const changeBadgeClass =
    priceChangePct === null
      ? "border-slate-700 bg-slate-900 text-slate-200"
      : priceChangePct >= 0
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
      : "border-rose-500/40 bg-rose-500/10 text-rose-200";
  const priceChangeLabel =
    priceChangePct !== null
      ? `${priceChangePct >= 0 ? "+" : ""}${priceChangePct.toFixed(2)}%`
      : "-";
  const volumeLabelBase = summaryStats
    ? `${simpleNumberFormatter.format(summaryStats.volume)} ${
        baseAssetSymbol || summaryStats.symbol
      }`
    : "-";
  const volumeLabelQuote = summaryStats
    ? `${simpleNumberFormatter.format(summaryStats.quoteVolume)} USDT`
    : "-";
  const highLowLabel = summaryStats
    ? `${simpleNumberFormatter.format(
        summaryStats.highPrice
      )} / ${simpleNumberFormatter.format(summaryStats.lowPrice)}`
    : "-";

  const chartPoints = useMemo(
    () => response?.market?.chart?.points ?? [],
    [response]
  );

  const chartStart = chartPoints[0]?.time;
  const chartEnd =
    chartPoints.length > 0
      ? chartPoints[chartPoints.length - 1].time
      : undefined;

  const cleanUpChart = useCallback(() => {
    if (chartApiRef.current && crosshairHandlerRef.current) {
      chartApiRef.current.unsubscribeCrosshairMove(crosshairHandlerRef.current);
    }
    if (chartApiRef.current) {
      chartApiRef.current.remove();
    }
    chartApiRef.current = null;
    candleSeriesRef.current = null;
    indicatorSeriesRef.current = {};
    crosshairHandlerRef.current = null;
    setHoverState(null);
  }, [setHoverState]);

  useEffect(() => {
    if (
      !isChartActive ||
      !chartContainerRef.current ||
      !chartData?.candles?.length
    ) {
      cleanUpChart();
      setIsChartVisible(false);
      return;
    }

    setIsChartVisible(true);

    if (!chartApiRef.current) {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { color: "#020617" },
          textColor: "#cbd5f5",
        },
        grid: {
          vertLines: { color: "#0f172a" },
          horzLines: { color: "#0f172a" },
        },
        crosshair: {
          mode: 1,
        },
        rightPriceScale: {
          borderColor: "#1e293b",
        },
        timeScale: {
          borderColor: "#1e293b",
          secondsVisible: false,
        },
        autoSize: true,
      });

      const candleSeries = chart.addCandlestickSeries({
        upColor: "#22c55e",
        borderUpColor: "#22c55e",
        wickUpColor: "#22c55e",
        downColor: "#ef4444",
        borderDownColor: "#ef4444",
        wickDownColor: "#ef4444",
      });

      indicatorSeriesRef.current = {};
      for (const indicator of INDICATOR_CONFIG) {
        if (indicator.type === "bollinger") {
          const [basisColor, upperColor = basisColor, lowerColor = basisColor] =
            indicator.colors;
          const basis = chart.addLineSeries({
            color: basisColor,
            lineWidth: 1,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
            visible: indicatorVisibility[indicator.key],
          });
          const upper = chart.addLineSeries({
            color: upperColor,
            lineWidth: 1,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
            lineStyle: 2,
            visible: indicatorVisibility[indicator.key],
          });
          const lower = chart.addLineSeries({
            color: lowerColor,
            lineWidth: 1,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
            lineStyle: 2,
            visible: indicatorVisibility[indicator.key],
          });
          indicatorSeriesRef.current[indicator.key] = { basis, upper, lower };
        } else {
          const [color] = indicator.colors;
          const series = chart.addLineSeries({
            color,
            lineWidth: 2,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
            visible: indicatorVisibility[indicator.key],
          });
          indicatorSeriesRef.current[indicator.key] = series;
        }
      }

      chartApiRef.current = chart;
      candleSeriesRef.current = candleSeries;

      const handler = (param: MouseEventParams) => {
        if (!param || !param.time || !candleSeriesRef.current) {
          setHoverState(null);
          return;
        }
        const candleData = param.seriesData.get(candleSeriesRef.current) as
          | CandlestickData
          | undefined;
        if (!candleData) {
          setHoverState(null);
          return;
        }
        const timeValue =
          typeof param.time === "number"
            ? param.time * 1000
            : param.time instanceof Date
            ? param.time.getTime()
            : Date.parse(String(param.time));
        setHoverState({
          timeLabel: new Date(timeValue).toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }),
          open: candleData.open,
          high: candleData.high,
          low: candleData.low,
          close: candleData.close,
        });
      };
      chart.subscribeCrosshairMove(handler);
      crosshairHandlerRef.current = handler;
    }

    if (!chartApiRef.current || !candleSeriesRef.current) {
      return;
    }

    const candlestickData: CandlestickData[] = chartData.candles.map(
      (candle) => ({
        time: (candle.openTime / 1000) as CandlestickData["time"],
        open: Number(candle.open.toFixed(2)),
        high: Number(candle.high.toFixed(2)),
        low: Number(candle.low.toFixed(2)),
        close: Number(candle.close.toFixed(2)),
      })
    );
    candleSeriesRef.current.setData(candlestickData);

    const latest = candlestickData[candlestickData.length - 1];
    if (latest && !hoverDataRef.current) {
      setHoverState({
        timeLabel: new Date((latest.time as number) * 1000).toLocaleString(
          "id-ID",
          {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }
        ),
        open: latest.open,
        high: latest.high,
        low: latest.low,
        close: latest.close,
      });
    }

    const applyLineSeries = (
      series: ISeriesApi<"Line">,
      visible: boolean,
      data: LineData[]
    ) => {
      series.applyOptions({ visible });
      series.setData(visible ? data : []);
    };

    const closeValues = candlestickData.map((item) => item.close);
    const timeValues = candlestickData.map((item) => item.time);

    const smaCache = new Map<number, LineData[]>();
    const emaCache = new Map<number, LineData[]>();
    const bollingerCache = new Map<
      number,
      { basis: LineData[]; upper: LineData[]; lower: LineData[] }
    >();

    const computeSMA = (length: number) => {
      if (smaCache.has(length)) {
        return smaCache.get(length)!;
      }
      const result: LineData[] = [];
      let sum = 0;
      const queue: number[] = [];
      closeValues.forEach((value, index) => {
        queue.push(value);
        sum += value;
        if (queue.length > length) {
          sum -= queue.shift() ?? 0;
        }
        if (queue.length === length) {
          result.push({
            time: timeValues[index],
            value: Number((sum / length).toFixed(2)),
          });
        }
      });
      smaCache.set(length, result);
      return result;
    };

    const computeEMA = (length: number) => {
      if (emaCache.has(length)) {
        return emaCache.get(length)!;
      }
      const result: LineData[] = [];
      if (!closeValues.length) {
        emaCache.set(length, result);
        return result;
      }
      const multiplier = 2 / (length + 1);
      let ema: number | null = null;
      closeValues.forEach((value, index) => {
        if (ema === null) {
          if (index + 1 < length) {
            return;
          }
          const seed = closeValues.slice(index + 1 - length, index + 1);
          ema = seed.reduce((acc, curr) => acc + curr, 0) / length;
        } else {
          ema = value * multiplier + ema * (1 - multiplier);
        }
        if (ema !== null) {
          result.push({
            time: timeValues[index],
            value: Number(ema.toFixed(2)),
          });
        }
      });
      emaCache.set(length, result);
      return result;
    };

    const computeBollinger = (length: number, multiplier: number) => {
      if (bollingerCache.has(length)) {
        return bollingerCache.get(length)!;
      }
      const basis: LineData[] = [];
      const upper: LineData[] = [];
      const lower: LineData[] = [];
      for (let index = length - 1; index < closeValues.length; index += 1) {
        const window = closeValues.slice(index + 1 - length, index + 1);
        const mean = window.reduce((acc, value) => acc + value, 0) / length;
        const variance =
          window.reduce((acc, value) => acc + (value - mean) ** 2, 0) /
          window.length;
        const stdDev = Math.sqrt(variance);
        const time = timeValues[index];
        basis.push({ time, value: Number(mean.toFixed(2)) });
        upper.push({
          time,
          value: Number((mean + multiplier * stdDev).toFixed(2)),
        });
        lower.push({
          time,
          value: Number((mean - multiplier * stdDev).toFixed(2)),
        });
      }
      const payload = { basis, upper, lower };
      bollingerCache.set(length, payload);
      return payload;
    };

    for (const indicator of INDICATOR_CONFIG) {
      const visible = indicatorVisibility[indicator.key];
      const seriesEntry = indicatorSeriesRef.current[indicator.key];
      if (!seriesEntry) {
        continue;
      }
      if (
        indicator.type === "sma" &&
        "setData" in (seriesEntry as ISeriesApi<"Line">)
      ) {
        const data = computeSMA(indicator.length);
        applyLineSeries(seriesEntry as ISeriesApi<"Line">, visible, data);
        continue;
      }
      if (
        indicator.type === "ema" &&
        "setData" in (seriesEntry as ISeriesApi<"Line">)
      ) {
        const data = computeEMA(indicator.length);
        applyLineSeries(seriesEntry as ISeriesApi<"Line">, visible, data);
        continue;
      }
      if (indicator.type === "bollinger") {
        const seriesGroup = seriesEntry as {
          basis: ISeriesApi<"Line">;
          upper: ISeriesApi<"Line">;
          lower: ISeriesApi<"Line">;
        };
        const data = computeBollinger(
          indicator.length,
          indicator.multiplier ?? 2
        );
        applyLineSeries(seriesGroup.basis, visible, data.basis);
        applyLineSeries(seriesGroup.upper, visible, data.upper);
        applyLineSeries(seriesGroup.lower, visible, data.lower);
      }
    }

    chartApiRef.current.timeScale().fitContent();

    const handleResize = () => {
      if (!chartContainerRef.current || !chartApiRef.current) {
        return;
      }
      const { width, height } =
        chartContainerRef.current.getBoundingClientRect();
      chartApiRef.current.applyOptions({ width, height });
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [
    chartData,
    cleanUpChart,
    indicatorVisibility,
    isChartActive,
    setHoverState,
  ]);

  useEffect(
    () => () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      cleanUpChart();
    },
    [cleanUpChart]
  );

  const fetchMarketSnapshot = useCallback(
    async (
      options: {
        silent?: boolean;
        symbol?: string;
        interval?: (typeof TIMEFRAME_OPTIONS)[number];
      } = {}
    ) => {
      if (!options.silent) {
        setIsChartLoading(true);
      }
      try {
        const symbol = options.symbol ?? selectedPair;
        const interval = options.interval ?? timeframe;

        const params = new URLSearchParams({
          symbol,
          interval,
          limit: "500",
        });
        const res = await fetch(`/api/market?${params.toString()}`);
        if (!res.ok) {
          throw new Error("Gagal mengambil data pasar Binance");
        }
        const payload = (await res.json()) as MarketSnapshot;
        setChartData(payload);
        setChartError(null);
        setIsChartActive(true);
      } catch (chartFetchError) {
        setChartError(
          chartFetchError instanceof Error
            ? chartFetchError.message
            : "Gagal menampilkan chart. Coba lagi."
        );
      } finally {
        setIsChartLoading(false);
      }
    },
    [selectedPair, timeframe]
  );

  const startChartPolling = useCallback(
    (options?: {
      symbol?: string;
      interval?: (typeof TIMEFRAME_OPTIONS)[number];
    }) => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }

      setIsChartActive(false);
      setIsChartVisible(false);
      setHoverState(null);

      fetchMarketSnapshot({
        symbol: options?.symbol,
        interval: options?.interval,
      })
        .catch(() => undefined)
        .finally(() => {
          if (refreshTimerRef.current) {
            clearInterval(refreshTimerRef.current);
            refreshTimerRef.current = null;
          }
          refreshTimerRef.current = setInterval(() => {
            fetchMarketSnapshot({
              silent: true,
              symbol: options?.symbol,
              interval: options?.interval,
            }).catch(() => undefined);
          }, 30_000);
        });
    },
    [fetchMarketSnapshot, setHoverState]
  );

  const handleShowChart = () => {
    startChartPolling();
  };

  const handleAnalyze = async () => {
    if (!chartData) {
      return;
    }
    const objective = `Analisa trading pair ${formatPairLabel(
      selectedPair
    )} pada timeframe ${timeframe}`;

    setIsRunning(true);
    setError(null);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objective,
          pairSymbol: selectedPair,
          timeframe,
          dataMode: "manual" satisfies DataMode,
          urls: [],
          manualNotes: "",
          datasetPreview: "",
        }),
      });

      if (!res.ok) {
        let message = "Agent gagal merespon";
        try {
          const errorPayload = (await res.json()) as { error?: unknown };
          if (errorPayload && typeof errorPayload.error === "string") {
            message = errorPayload.error;
          }
        } catch (parseError) {
          console.warn("Gagal membaca pesan error agent", parseError);
        }
        throw new Error(message);
      }

      const payload: AgentResponse = await res.json();
      setResponse(payload);
    } catch (runError) {
      console.error(runError);
      if (runError instanceof Error) {
        setError(runError.message);
      } else {
        setError("Terjadi masalah saat menjalankan agent. Coba ulangi.");
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handlePairChange = (symbol: string) => {
    setSelectedPair(symbol);
    setIsChartActive(false);
    setIsChartVisible(false);
    setChartData(null);
    setResponse(null);
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    setHoverState(null);
  };

  const handleTimeframeChange = (
    nextTimeframe: (typeof TIMEFRAME_OPTIONS)[number]
  ) => {
    setTimeframe(nextTimeframe);
    setResponse(null);
    if (chartData) {
      startChartPolling({ interval: nextTimeframe });
    }
    setHoverState(null);
  };

  const canRunAnalysis = Boolean(chartData) && !isRunning;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-lg font-semibold text-slate-950">
              WA
            </div>
            <div>
              <div className="text-sm uppercase tracking-[0.3em] text-slate-400">
                Web Analytic AI
              </div>
              <h1 className="text-xl font-semibold text-slate-100">
                Crypto Pair Intelligence Suite
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12 space-y-10">
        <section className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-8 shadow-2xl shadow-sky-500/10">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/50 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-sky-300">
              Live Market Intelligence
            </span>
            <h2 className="mt-6 text-3xl font-semibold leading-tight text-slate-50 md:text-4xl">
              Pilih pair crypto favorit Anda, pantau chart real-time, dan
              dapatkan analisa agen instan.
            </h2>
            <p className="mt-4 text-base text-slate-300">
              Web Analytic AI menggabungkan harga live Binance, order flow,
              serta pencarian berita terbaru dari Tavily untuk menghasilkan
              rekomendasi trading yang terstruktur dan mudah dieksekusi.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-sm font-semibold text-slate-200">
                  Streaming Chart
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Candlestick live + order book Binance dengan pembaruan
                  otomatis setiap 30 detik.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-sm font-semibold text-slate-200">
                  LLM Market Reasoning
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Agen AI menyintesis sinyal teknikal, fundamental, dan headline
                  terbaru.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-sm font-semibold text-slate-200">
                  Trade Plan Siap Eksekusi
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Entry zone, 5 target TP, stop loss, sizing, dan catatan
                  pendukung tersedia sekaligus.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8">
            <div>
              <h3 className="text-lg font-semibold text-slate-50">
                Pilih trading pair
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Tentukan pair lalu klik{" "}
                <span className="text-sky-300">Tampilkan chart</span> untuk
                memuat candlestick live. Timeframe dapat diganti langsung di
                kartu chart.
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Trading pair
                </label>
                <select
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
                  value={selectedPair}
                  onChange={(event) => handlePairChange(event.target.value)}
                >
                  {TRADING_PAIRS.map((pair) => (
                    <option key={pair.symbol} value={pair.symbol}>
                      {pair.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleShowChart}
                className="inline-flex items-center justify-center rounded-full border border-sky-500 bg-sky-500/20 px-6 py-3 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/30"
              >
                Tampilkan chart
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Chart live
                    </div>
                    <div className="flex flex-wrap items-baseline gap-3">
                      <h3 className="text-2xl font-semibold text-slate-100">
                        {formatPairLabel(selectedPair)}
                      </h3>
                      <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase text-slate-300">
                        {timeframe.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                      <span className="text-lg font-semibold text-slate-100">
                        {summaryStats
                          ? simpleNumberFormatter.format(summaryStats.lastPrice)
                          : "-"}
                      </span>
                      {priceChangePct !== null && (
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${changeBadgeClass}`}
                        >
                          {priceChangeLabel}
                        </span>
                      )}
                      <span className="text-xs text-slate-500">
                        Candlestick diperbarui setiap 30 detik
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-2 text-xs text-slate-400 md:items-end">
                    <div>
                      Volume 24 jam:
                      <span className="ml-1 text-slate-200">
                        {volumeLabelBase}
                      </span>
                      {summaryStats && (
                        <span className="ml-2 text-slate-500">
                          ({volumeLabelQuote})
                        </span>
                      )}
                    </div>
                    <div>
                      High/Low 24 jam:
                      <span className="ml-1 text-slate-200">
                        {highLowLabel}
                      </span>
                    </div>
                    <div>
                      Update terakhir:
                      <span className="ml-1 text-slate-200">
                        {formatDateTime(chartData?.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {TIMEFRAME_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleTimeframeChange(option)}
                      className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                        timeframe === option
                          ? "border-sky-500 bg-sky-500/20 text-sky-200"
                          : "border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-600 hover:text-slate-100"
                      }`}
                    >
                      {option.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-xs text-slate-300">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Indicators
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {INDICATOR_CONFIG.map((indicator) => {
                        const active = indicatorVisibility[indicator.key];
                        const baseColor = indicator.colors[0];
                        const activeStyle = active
                          ? {
                              borderColor: baseColor,
                              backgroundColor: withAlpha(baseColor, 0.18),
                              color: baseColor,
                            }
                          : undefined;
                        return (
                          <button
                            key={indicator.key}
                            type="button"
                            onClick={() =>
                              setIndicatorVisibility((prev) => ({
                                ...prev,
                                [indicator.key]: !prev[indicator.key],
                              }))
                            }
                            className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                              active
                                ? "bg-slate-950 shadow-inner"
                                : "border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-600 hover:text-slate-100"
                            }`}
                            style={activeStyle}
                          >
                            {indicator.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-xs text-slate-300 sm:grid-cols-2">
                  {hoverData ? (
                    <>
                      <div className="font-semibold text-slate-200">
                        {hoverData.timeLabel}
                      </div>
                      <div className="text-right text-slate-400">
                        Close: {priceFormatter.format(hoverData.close)}
                      </div>
                      <div>Open: {priceFormatter.format(hoverData.open)}</div>
                      <div className="text-right">
                        High: {priceFormatter.format(hoverData.high)}
                      </div>
                      <div>Low: {priceFormatter.format(hoverData.low)}</div>
                      <div className="text-right text-slate-500">
                        Indikator overlays terlihat di chart
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-semibold text-slate-500">
                        Arahkan kursor ke candlestick
                      </div>
                      <div className="text-right text-slate-600">Close: -</div>
                      <div>Open: -</div>
                      <div className="text-right">High: -</div>
                      <div>Low: -</div>
                      <div className="text-right text-slate-600">
                        Indikator overlays terlihat di chart
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {chartError && (
              <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {chartError}
              </div>
            )}

            <div className="mt-4 grid gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div
                  className={`relative h-96 w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 transition-all duration-500 ${
                    isChartVisible
                      ? "opacity-100 translate-y-0"
                      : "pointer-events-none opacity-0 -translate-y-4"
                  }`}
                >
                  <div ref={chartContainerRef} className="h-full w-full" />
                  {isChartLoading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-950/80 text-sm text-slate-400">
                      Memuat chart...
                    </div>
                  )}
                </div>
                {!isChartVisible && !isChartLoading && (
                  <div className="flex h-96 items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-sm text-slate-500">
                    Pilih pair lalu klik &quot;Tampilkan chart&quot; untuk
                    melihat candlestick.
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div
                  className={`h-96 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition-all duration-500 overflow-scroll ${
                    isChartVisible
                      ? "opacity-100 translate-y-0"
                      : "pointer-events-none opacity-0 -translate-y-4"
                  }`}
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Order book
                  </div>
                  <div className="mt-3 grid flex-1 grid-cols-2 gap-3 overflow-hidden text-xs text-slate-300">
                    <div className="flex flex-col overflow-hidden">
                      <div className="text-slate-400">Bids</div>
                      <ul className="mt-2 flex-1 space-y-1 overflow-y-auto pr-1">
                        {(chartData?.orderBook?.bids ?? [])
                          .slice(0, 50)
                          .map((bid, index) => (
                            <li
                              key={`bid-${bid.price}-${index}`}
                              className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2"
                            >
                              <span>
                                {simpleNumberFormatter.format(bid.price)}
                              </span>
                              <span className="text-emerald-300">
                                {bid.quantity.toFixed(4)}
                              </span>
                            </li>
                          ))}
                      </ul>
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <div className="text-slate-400">Asks</div>
                      <ul className="mt-2 flex-1 space-y-1 overflow-y-auto pl-1">
                        {(chartData?.orderBook?.asks ?? [])
                          .slice(0, 50)
                          .map((ask, index) => (
                            <li
                              key={`ask-${ask.price}-${index}`}
                              className="flex items-center justify-between rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2"
                            >
                              <span>
                                {simpleNumberFormatter.format(ask.price)}
                              </span>
                              <span className="text-rose-300">
                                {ask.quantity.toFixed(4)}
                              </span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-slate-500">
                Analisa akan menggunakan pair {formatPairLabel(selectedPair)}{" "}
                dengan timeframe {timeframe.toUpperCase()}.
              </div>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!canRunAnalysis}
                className="inline-flex items-center justify-center rounded-full border border-sky-500 bg-sky-500/20 px-6 py-3 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800/60 disabled:text-slate-500"
              >
                {isRunning ? "Analisis berjalan..." : "Analys"}
              </button>
            </div>
            {error && (
              <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            )}
          </div>

          {response && (
            <div
              id="insights"
              className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8"
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-slate-100">
                    Analisa agen untuk {formattedPair} (
                    {timeframe.toUpperCase()})
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Confidence {Math.round(response.decision.confidence * 100)}%
                    · Aksi {response.decision.action.toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Ringkasan Agen
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${
                        response.decision.action === "buy"
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                          : response.decision.action === "sell"
                          ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                          : "border-amber-500/40 bg-amber-500/10 text-amber-200"
                      }`}
                    >
                      {response.decision.action}
                    </span>
                  </div>
                  <p className="mt-4 text-sm text-slate-300">
                    {response.summary}
                  </p>
                  <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-xs text-slate-400">
                    {response.decision.rationale}
                  </p>

                  <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Chart insight
                    </div>
                    <p className="mt-3 text-xs text-slate-300">
                      {response.market.chart.narrative}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      Forecast: {response.market.chart.forecast}
                    </p>
                    <div className="mt-4 grid gap-2 text-[11px] text-slate-400 sm:grid-cols-2">
                      <div>Mulai: {formatDateTime(chartStart)}</div>
                      <div>Selesai: {formatDateTime(chartEnd)}</div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Teknikal pendukung
                      </div>
                      {response.market.technical.length ? (
                        <ul className="mt-3 space-y-2 text-xs text-slate-300">
                          {response.market.technical.map((item) => (
                            <li
                              key={item}
                              className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2"
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-xs text-slate-500">
                          Ringkasan teknikal belum tersedia.
                        </p>
                      )}
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Fundamental pendukung
                      </div>
                      {response.market.fundamental.length ? (
                        <ul className="mt-3 space-y-2 text-xs text-slate-300">
                          {response.market.fundamental.map((item) => (
                            <li
                              key={item}
                              className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2"
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-xs text-slate-500">
                          Ringkasan fundamental belum tersedia.
                        </p>
                      )}
                    </div>
                  </div>

                  {supportiveHighlights.length > 0 && (
                    <div className="mt-6 space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Catatan pendukung
                      </div>
                      <ul className="space-y-2 text-sm text-slate-300">
                        {supportiveHighlights.map((highlight) => (
                          <li
                            key={highlight}
                            className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                          >
                            {highlight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
                    <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Trade plan
                    </div>
                    <div className="mt-4 space-y-5 text-sm text-slate-300">
                      <div className="grid gap-2 text-xs text-slate-400 sm:grid-cols-3">
                        <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
                          <span>Pair</span>
                          <span className="text-sm font-semibold text-slate-100">
                            {formattedPair}
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
                          <span>Type</span>
                          <span className="text-sm font-semibold capitalize text-slate-100">
                            {response.decision.action}
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
                          <span>Bias</span>
                          <span className="uppercase text-slate-100">
                            {response.tradePlan.bias.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Entry zone
                        </div>
                        {entryZoneValues.length ? (
                          <ul className="mt-2 space-y-1 text-xs text-slate-300">
                            {entryZoneValues.map((priceValue, index) => (
                              <li
                                key={`entry-zone-plan-${priceValue}-${index}`}
                                className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2"
                              >
                                {formatPrice(priceValue)}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-xs text-slate-500">
                            Zona entry belum tersedia.
                          </p>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Targets
                        </div>
                        <ul className="mt-2 space-y-1 text-xs text-slate-300">
                          {paddedTargets.map((target, index) => (
                            <li
                              key={`plan-target-${index}`}
                              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2"
                            >
                              <span>{TARGET_LABELS[index]}</span>
                              <span>
                                {target !== null ? formatPrice(target) : "-"}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {paddedTargets.every((target) => target === null) && (
                          <p className="mt-2 text-xs text-slate-500">
                            Target profit belum tersedia.
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Stop loss</span>
                        <span className="text-slate-200">
                          {formatPrice(tradeStopLoss)}
                        </span>
                      </div>
                      <div className="grid gap-3 text-xs text-slate-400 sm:grid-cols-2">
                        <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-3">
                          <div className="font-semibold text-slate-300">
                            Execution window
                          </div>
                          <div className="mt-1 text-[11px] text-slate-400">
                            {tradeExecutionWindow}
                          </div>
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-3">
                          <div className="font-semibold text-slate-300">
                            Sizing notes
                          </div>
                          <div className="mt-1 text-[11px] text-slate-400">
                            {tradeSizingNotes}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Analisa pendukung
                        </div>
                        <p className="mt-2 whitespace-pre-line text-xs text-slate-300">
                          {tradingNarrative ||
                            "Analisa pendukung belum tersedia."}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
                    <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Next steps
                    </div>
                    <ul className="mt-4 space-y-3 text-sm text-slate-300">
                      {response.nextSteps.map((step) => (
                        <li
                          key={step}
                          className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3"
                        >
                          <span className="mt-1 h-2 w-2 rounded-full bg-sky-400" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 text-sm text-slate-400">
                    <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Integrasi lanjut
                    </div>
                    <p className="mt-3">
                      Hubungkan endpoint scraping Anda sendiri, streaming data
                      on-chain, atau model LLM favorit (OpenAI, Claude, dsb)
                      melalui API route{" "}
                      <code className="rounded bg-slate-800 px-1 py-0.5 text-[11px] text-slate-200">
                        /api/agent
                      </code>
                      .
                    </p>
                    <p className="mt-2">
                      Tambahkan automation ke exchange pilihan untuk eksekusi
                      trading berbasis rekomendasi.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
