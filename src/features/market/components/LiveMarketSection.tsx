import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
} from "lightweight-charts";

import { formatPairLabel, withAlpha } from "../utils/format";
import {
  buildIndicatorData,
  createIndicatorSeries,
  updateIndicatorSeries,
} from "../utils/indicators";
import {
  type HoverData,
  type IndicatorKey,
  type IndicatorSeriesMap,
  type MarketSnapshot,
} from "../types";
import {
  INDICATOR_CONFIG,
  TIMEFRAME_OPTIONS,
} from "../constants";
import { useLanguage } from "@/providers/language-provider";

const REFRESH_INTERVAL = 30_000;
const ORDERBOOK_LIMIT = 50;

export type LiveMarketHandle = {
  startChart: () => void;
  reset: () => void;
};

export type LiveMarketSectionProps = {
  selectedPair: string;
  timeframe: (typeof TIMEFRAME_OPTIONS)[number];
  onTimeframeChange: (timeframe: (typeof TIMEFRAME_OPTIONS)[number]) => void;
  indicatorVisibility: Record<IndicatorKey, boolean>;
  onToggleIndicator: (key: IndicatorKey) => void;
  onCandlesChange: (candles: CandlestickData[]) => void;
  canRunAnalysis: boolean;
  onAnalyze: () => void;
  isRunningAnalysis: boolean;
  analysisError: string | null;
};

export const LiveMarketSection = forwardRef<
  LiveMarketHandle,
  LiveMarketSectionProps
>(function LiveMarketSection(
  {
    selectedPair,
    timeframe,
    onTimeframeChange,
    indicatorVisibility,
    onToggleIndicator,
    onCandlesChange,
    canRunAnalysis,
    onAnalyze,
    isRunningAnalysis,
    analysisError,
  },
  ref
) {
  const { messages, languageTag, __ } = useLanguage();
  const liveCopy = messages.live;

  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartApiRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const indicatorSeriesRef = useRef<IndicatorSeriesMap>({});
  const crosshairHandlerRef = useRef<
    ((param: MouseEventParams) => void) | null
  >(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [chartData, setChartData] = useState<MarketSnapshot | null>(null);
  const [isChartActive, setIsChartActive] = useState(false);
  const [isChartVisible, setIsChartVisible] = useState(false);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [hoverData, setHoverData] = useState<HoverData | null>(null);
  const hoverDataRef = useRef<HoverData | null>(null);

  const hoverDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(languageTag, {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [languageTag]
  );

  const priceFormatter = useMemo(
    () =>
      new Intl.NumberFormat(languageTag, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [languageTag]
  );

  const simpleNumberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(languageTag, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [languageTag]
  );

  const setHoverState = useCallback((value: HoverData | null) => {
    hoverDataRef.current = value;
    setHoverData(value);
  }, []);

  const candlestickSeriesData = useMemo<CandlestickData[]>(() => {
    if (!chartData?.candles?.length) {
      return [];
    }
    return chartData.candles.map((candle) => ({
      time: (candle.openTime / 1000) as CandlestickData["time"],
      open: Number(candle.open.toFixed(2)),
      high: Number(candle.high.toFixed(2)),
      low: Number(candle.low.toFixed(2)),
      close: Number(candle.close.toFixed(2)),
    }));
  }, [chartData]);

  useEffect(() => {
    onCandlesChange(candlestickSeriesData);
  }, [candlestickSeriesData, onCandlesChange]);

  const resetChart = useCallback(() => {
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
      } catch (error) {
        setChartError(
          error instanceof Error ? error.message : "Gagal menampilkan chart. Coba lagi."
        );
      } finally {
        setIsChartLoading(false);
      }
    },
    [selectedPair, timeframe]
  );

  const startChartPolling = useCallback(
    (
      options?: {
        symbol?: string;
        interval?: (typeof TIMEFRAME_OPTIONS)[number];
      }
    ) => {
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
          }, REFRESH_INTERVAL);
        });
    },
    [fetchMarketSnapshot, setHoverState]
  );

  useImperativeHandle(
    ref,
    () => ({
      startChart: () => startChartPolling(),
      reset: () => {
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current);
          refreshTimerRef.current = null;
        }
        setChartData(null);
        setIsChartActive(false);
        setIsChartVisible(false);
        setHoverState(null);
        resetChart();
      },
    }),
    [resetChart, setHoverState, startChartPolling]
  );

  useEffect(() => () => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    resetChart();
  }, [resetChart]);

  useEffect(() => {
    if (!isChartActive || !chartContainerRef.current) {
      resetChart();
      setIsChartVisible(false);
      return;
    }

    if (!candlestickSeriesData.length) {
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

      indicatorSeriesRef.current = createIndicatorSeries(
        chart,
        indicatorVisibility,
        INDICATOR_CONFIG
      );

      chartApiRef.current = chart;
      candleSeriesRef.current = candleSeries;

      const handler = (param: MouseEventParams) => {
        const targetSeries = candleSeriesRef.current;
        if (!param?.time || !targetSeries) {
          setHoverState(null);
          return;
        }
        const candleData = param.seriesData.get(targetSeries) as
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
          timeLabel: hoverDateFormatter.format(new Date(timeValue)),
          open: candleData.open,
          high: candleData.high,
          low: candleData.low,
          close: candleData.close,
        });
      };
      chart.subscribeCrosshairMove(handler);
      crosshairHandlerRef.current = handler;
    }

    const chartInstance = chartApiRef.current;
    const candleSeries = candleSeriesRef.current;

    if (!chartInstance || !candleSeries) {
      return;
    }

    candleSeries.setData(candlestickSeriesData);

    const indicatorData = buildIndicatorData(
      candlestickSeriesData,
      INDICATOR_CONFIG
    );
    updateIndicatorSeries(
      indicatorSeriesRef.current,
      indicatorData,
      indicatorVisibility,
      INDICATOR_CONFIG
    );

    const latest = candlestickSeriesData[candlestickSeriesData.length - 1];
    if (latest && !hoverDataRef.current) {
      setHoverState({
        timeLabel: hoverDateFormatter.format(
          new Date((latest.time as number) * 1000)
        ),
        open: latest.open,
        high: latest.high,
        low: latest.low,
        close: latest.close,
      });
    }

    chartInstance.timeScale().fitContent();

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
    candlestickSeriesData,
    indicatorVisibility,
    isChartActive,
    hoverDateFormatter,
    resetChart,
    setHoverState,
  ]);

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
  const formattedUpdatedAt = chartData?.updatedAt
    ? hoverDateFormatter.format(new Date(chartData.updatedAt))
    : "-";

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {liveCopy.card.title}
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
                  <div className="ml-auto flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span>
                      {liveCopy.stats.volumeBase}:
                      <span className="ml-1 text-slate-200">{volumeLabelBase}</span>
                    </span>
                    {summaryStats && (
                      <span className="ml-2 text-slate-500">
                        ({volumeLabelQuote})
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  {liveCopy.stats.highLow}:
                  <span className="ml-1 text-slate-200">{highLowLabel}</span>
                </div>
                <div>
                  {liveCopy.stats.lastUpdate}:
                  <span className="ml-1 text-slate-200">{formattedUpdatedAt}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {TIMEFRAME_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onTimeframeChange(option)}
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
                  {liveCopy.card.indicatorsTitle}
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
                        onClick={() => onToggleIndicator(indicator.key)}
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
                        {liveCopy.card.hoverClose}: {priceFormatter.format(hoverData.close)}
                      </div>
                      <div>
                        {liveCopy.card.hoverOpen}: {priceFormatter.format(hoverData.open)}
                      </div>
                      <div className="text-right">
                        {liveCopy.card.hoverHigh}: {priceFormatter.format(hoverData.high)}
                      </div>
                      <div>
                        {liveCopy.card.hoverLow}: {priceFormatter.format(hoverData.low)}
                      </div>
                      <div className="text-right text-slate-600">
                        {liveCopy.card.indicatorHint}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-semibold text-slate-500">
                        {liveCopy.card.hoverPrompt}
                      </div>
                      <div className="text-right text-slate-600">
                        {liveCopy.card.hoverClose}: -
                      </div>
                      <div>{liveCopy.card.hoverOpen}: -</div>
                      <div className="text-right">{liveCopy.card.hoverHigh}: -</div>
                      <div>{liveCopy.card.hoverLow}: -</div>
                      <div className="text-right text-slate-600">
                        {liveCopy.card.indicatorHint}
                      </div>
                    </>
                  )}
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
                    {liveCopy.card.loading}
                  </div>
                )}
              </div>
              {!isChartVisible && !isChartLoading && (
                <div className="flex h-96 items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-sm text-slate-500">
                  {liveCopy.card.emptyState}
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
                  {liveCopy.orderBook.title}
                </div>
                <div className="mt-3 grid flex-1 grid-cols-2 gap-3 overflow-hidden text-xs text-slate-300">
                  <div className="flex flex-col overflow-hidden">
                    <div className="text-slate-400">{liveCopy.orderBook.bids}</div>
                    <ul className="mt-2 flex-1 space-y-1 overflow-y-auto pr-1">
                      {(chartData?.orderBook?.bids ?? [])
                        .slice(0, ORDERBOOK_LIMIT)
                        .map((bid, index) => (
                          <li
                            key={`bid-${bid.price}-${index}`}
                            className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2"
                          >
                            <span>{simpleNumberFormatter.format(bid.price)}</span>
                            <span className="text-emerald-300">
                              {bid.quantity.toFixed(4)}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <div className="text-slate-400">{liveCopy.orderBook.asks}</div>
                    <ul className="mt-2 flex-1 space-y-1 overflow-y-auto pl-1">
                      {(chartData?.orderBook?.asks ?? [])
                        .slice(0, ORDERBOOK_LIMIT)
                        .map((ask, index) => (
                          <li
                            key={`ask-${ask.price}-${index}`}
                            className="flex items-center justify-between rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2"
                          >
                            <span>{simpleNumberFormatter.format(ask.price)}</span>
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
              {__("live.analysisNote", {
                pair: formatPairLabel(selectedPair),
                timeframe: timeframe.toUpperCase(),
              })}
            </div>
            <button
              type="button"
              onClick={onAnalyze}
              disabled={!canRunAnalysis}
              className="inline-flex items-center justify-center rounded-full border border-sky-500 bg-sky-500/20 px-6 py-3 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800/60 disabled:text-slate-500"
            >
              {isRunningAnalysis
                ? liveCopy.analyzingButton
                : liveCopy.analyzeButton}
            </button>
          </div>
          {analysisError && (
            <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {analysisError}
            </div>
          )}
        </div>
      </div>
    </section>
  );
});
