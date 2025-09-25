import Image from "next/image";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from "react";
import { motion } from "framer-motion";
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
import { INDICATOR_CONFIG, PROVIDER_ICON_MAP, TIMEFRAME_OPTIONS } from "../constants";
import type { CexProvider } from "../exchanges";
import { useLanguage } from "@/providers/language-provider";

const REFRESH_INTERVAL = 30_000;
const ORDERBOOK_LIMIT = 50;

export type LiveMarketHandle = {
  startChart: () => void;
  reset: () => void;
};

export type LiveMarketSectionProps = {
  provider: CexProvider;
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
  sectionRef?: RefObject<HTMLElement> | MutableRefObject<HTMLElement | null> | null;
};

export const LiveMarketSection = forwardRef<
  LiveMarketHandle,
  LiveMarketSectionProps
>(function LiveMarketSection(
  {
    provider,
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
    sectionRef,
  },
  ref
) {
  const { messages, languageTag, __, locale } = useLanguage();
  const liveCopy = messages.live;
  const providerLabel = useMemo(() => __("pairSelection.providerOptions." + provider), [__, provider]);

  const handleSectionRef = useCallback(
    (node: HTMLElement | null) => {
      if (sectionRef && "current" in sectionRef) {
        (sectionRef as MutableRefObject<HTMLElement | null>).current = node;
      }
    },
    [sectionRef]
  );

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
        provider?: CexProvider;
      } = {}
    ) => {
      if (!options.silent) {
        setIsChartLoading(true);
      }
      try {
        const symbol = options.symbol ?? selectedPair;
        const interval = options.interval ?? timeframe;
        const providerValue = options.provider ?? provider;

        const params = new URLSearchParams({
          symbol,
          interval,
          limit: "500",
          provider: providerValue,
          locale,
        });
        const res = await fetch(`/api/market?${params.toString()}`);
        if (!res.ok) {
          throw new Error(__("live.errors.fetchSnapshot"));
        }
        const payload = (await res.json()) as MarketSnapshot;
        setChartData(payload);
        setChartError(null);
        setIsChartActive(true);
      } catch (error) {
        setChartError(
          error instanceof Error
            ? error.message
            : __("live.errors.renderChart")
        );
      } finally {
        setIsChartLoading(false);
      }
    },
    [provider, selectedPair, timeframe, __, locale]
  );

  const startChartPolling = useCallback(
    (options?: {
      symbol?: string;
      interval?: (typeof TIMEFRAME_OPTIONS)[number];
      provider?: CexProvider;
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
        provider,
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
              provider,
            }).catch(() => undefined);
          }, REFRESH_INTERVAL);
        });
    },
    [fetchMarketSnapshot, provider, setHoverState]
  );

  useImperativeHandle(
    ref,
    () => ({
      startChart: () => startChartPolling({ provider }),
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
    [provider, resetChart, setHoverState, startChartPolling]
  );

  useEffect(
    () => () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      resetChart();
    },
    [resetChart]
  );

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
      ? "border-[var(--swimm-neutral-300)] bg-white text-[var(--swimm-neutral-500)]"
      : priceChangePct >= 0
      ? "border-[var(--swimm-up)]/40 bg-[var(--swimm-up)]/10 text-[var(--swimm-up)]"
      : "border-[var(--swimm-down)]/40 bg-[var(--swimm-down)]/10 text-[var(--swimm-down)]";
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
    <motion.section
      ref={handleSectionRef}
      className="space-y-6"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div
        className="rounded-3xl border border-[var(--swimm-neutral-300)] bg-white p-6 shadow"
        data-aos="fade-up"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--swimm-neutral-300)] bg-white/85 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--swimm-neutral-500)]">
                  {liveCopy.card.title}
                </div>
                <div className="flex flex-wrap items-baseline gap-3">
                  <h3 className="text-2xl font-semibold text-[var(--swimm-navy-900)]">
                    {formatPairLabel(selectedPair)}
                  </h3>
                  <span className="rounded-full border border-[var(--swimm-primary-700)]/40 bg-[var(--swimm-primary-500)]/15 px-3 py-1 text-xs font-semibold uppercase text-[var(--swimm-primary-700)]">
                    {timeframe.toUpperCase()}
                  </span>
                  <span className="flex items-center gap-2 rounded-full border border-[var(--swimm-neutral-300)] bg-white px-3 py-1">
                    <Image
                      src={PROVIDER_ICON_MAP[provider]}
                      alt={providerLabel}
                      width={18}
                      height={18}
                      className="h-4 w-4"
                    />
                    <span className="sr-only">
                      {__("live.card.providerBadge", { provider: providerLabel })}
                    </span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--swimm-neutral-500)]">
                  <span className="text-lg font-semibold text-[var(--swimm-navy-900)]">
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
                  <div className="ml-auto flex flex-wrap items-center gap-2 text-xs text-[var(--swimm-neutral-500)]">
                    <span>
                      {liveCopy.stats.volumeBase}:
                      <span className="ml-1 text-[var(--swimm-navy-900)]">
                        {volumeLabelBase}
                      </span>
                    </span>
                    {summaryStats && (
                      <span className="ml-2 text-[var(--swimm-neutral-300)]">
                        ({volumeLabelQuote})
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  {liveCopy.stats.highLow}:
                  <span className="ml-1 text-[var(--swimm-navy-900)]">
                    {highLowLabel}
                  </span>
                </div>
                <div>
                  {liveCopy.stats.lastUpdate}:
                  <span className="ml-1 text-[var(--swimm-navy-900)]">
                    {formattedUpdatedAt}
                  </span>
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
                      ? "border-[var(--swimm-primary-700)] bg-[var(--swimm-primary-500)]/20 text-[var(--swimm-primary-700)]"
                      : "border-[var(--swimm-neutral-300)] bg-white text-[var(--swimm-neutral-500)] hover:border-[var(--swimm-primary-500)] hover:text-[var(--swimm-primary-700)]"
                  }`}
                >
                  {option.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="rounded-xl border border-[var(--swimm-neutral-300)] bg-white px-4 py-3 text-xs text-[var(--swimm-neutral-500)]">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--swimm-neutral-500)]">
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
                            ? "bg-transparent"
                            : "border-[var(--swimm-neutral-300)] bg-white text-[var(--swimm-neutral-500)] hover:border-[var(--swimm-primary-500)] hover:text-[var(--swimm-primary-700)]"
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
            <div className="mt-4 grid gap-2 rounded-xl border border-[var(--swimm-neutral-300)] bg-[var(--swimm-neutral-100)] px-4 py-3 text-xs text-[var(--swimm-neutral-500)] sm:grid-cols-2">
              {hoverData ? (
                <>
                  <div className="font-semibold text-[var(--swimm-navy-900)]">
                    {hoverData.timeLabel}
                  </div>
                  <div className="text-right">
                    {liveCopy.card.hoverClose}:{" "}
                    {priceFormatter.format(hoverData.close)}
                  </div>
                  <div>
                    {liveCopy.card.hoverOpen}:{" "}
                    {priceFormatter.format(hoverData.open)}
                  </div>
                  <div className="text-right">
                    {liveCopy.card.hoverHigh}:{" "}
                    {priceFormatter.format(hoverData.high)}
                  </div>
                  <div>
                    {liveCopy.card.hoverLow}:{" "}
                    {priceFormatter.format(hoverData.low)}
                  </div>
                  <div className="text-right text-[var(--swimm-neutral-300)]">
                    {liveCopy.card.indicatorHint}
                  </div>
                </>
              ) : (
                <>
                  <div className="font-semibold text-[var(--swimm-neutral-500)]">
                    {liveCopy.card.hoverPrompt}
                  </div>
                  <div className="text-right text-[var(--swimm-neutral-300)]">
                    {liveCopy.card.hoverClose}: -
                  </div>
                  <div>{liveCopy.card.hoverOpen}: -</div>
                  <div className="text-right">{liveCopy.card.hoverHigh}: -</div>
                  <div>{liveCopy.card.hoverLow}: -</div>
                  <div className="text-right text-[var(--swimm-neutral-300)]">
                    {liveCopy.card.indicatorHint}
                  </div>
                </>
              )}
            </div>
          </div>

          {chartError && (
            <div className="mt-4 rounded-2xl border border-[var(--swimm-down)]/30 bg-[var(--swimm-down)]/10 px-4 py-3 text-sm text-[var(--swimm-down)]">
              {chartError}
            </div>
          )}

      <div className="mt-4 grid gap-6 lg:grid-cols-[2fr_1fr] lg:items-stretch">
        <div className="relative h-full min-h-[20rem] md:min-h-[26rem]">
          <div
            className={`absolute inset-0 overflow-hidden rounded-3xl border border-[var(--swimm-neutral-300)] bg-white transition-all duration-500 ${
              isChartVisible
                ? "opacity-100 translate-y-0"
                : "pointer-events-none opacity-0 -translate-y-4"
            }`}
          >
            <div ref={chartContainerRef} className="h-full w-full" />
            {isChartLoading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-[var(--swimm-neutral-100)]/80 text-sm text-[var(--swimm-neutral-500)]">
                {liveCopy.card.loading}
              </div>
            )}
          </div>
          {!isChartVisible && !isChartLoading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-3xl border border-dashed border-[var(--swimm-neutral-300)] bg-white text-sm text-[var(--swimm-neutral-500)]">
              {liveCopy.card.emptyState}
            </div>
          )}
        </div>

        <div className="space-y-4 lg:flex lg:h-full lg:flex-col">
              <div
                className={`flex h-full min-h-[20rem] md:h-[26rem] flex-col overflow-hidden rounded-2xl border border-[var(--swimm-neutral-300)] bg-white p-4 transition-all duration-500 ${
                  isChartVisible
                    ? "opacity-100 translate-y-0"
                    : "pointer-events-none opacity-0 -translate-y-4"
                }`}
              >
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--swimm-neutral-500)]">
              {liveCopy.orderBook.title}
            </div>
                <div className="mt-3 grid flex-1 grid-cols-2 gap-3 overflow-hidden text-xs text-[var(--swimm-neutral-500)]">
                  <div className="flex flex-col overflow-hidden">
                    <div>{liveCopy.orderBook.bids}</div>
                    <ul className="mt-2 flex-1 space-y-1 overflow-y-auto pr-1">
                      {(chartData?.orderBook?.bids ?? [])
                        .slice(0, ORDERBOOK_LIMIT)
                        .map((bid, index) => (
                          <li
                            key={`bid-${bid.price}-${index}`}
                            className="flex items-center justify-between gap-3 rounded-lg border border-[var(--swimm-up)]/30 bg-[var(--swimm-up)]/10 px-3 py-2"
                          >
                            <span className="min-w-0 flex-1 truncate font-mono text-[0.75rem] tabular-nums text-[var(--swimm-navy-900)]">
                              {simpleNumberFormatter.format(bid.price)}
                            </span>
                            <span className="flex-shrink-0 font-mono text-[0.75rem] tabular-nums text-[var(--swimm-up)]">
                              {bid.quantity.toFixed(4)}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <div>{liveCopy.orderBook.asks}</div>
                    <ul className="mt-2 flex-1 space-y-1 overflow-y-auto pl-1">
                      {(chartData?.orderBook?.asks ?? [])
                        .slice(0, ORDERBOOK_LIMIT)
                        .map((ask, index) => (
                          <li
                            key={`ask-${ask.price}-${index}`}
                            className="flex items-center justify-between gap-3 rounded-lg border border-[var(--swimm-down)]/30 bg-[var(--swimm-down)]/10 px-3 py-2"
                          >
                            <span className="min-w-0 flex-1 truncate font-mono text-[0.75rem] tabular-nums text-[var(--swimm-navy-900)]">
                              {simpleNumberFormatter.format(ask.price)}
                            </span>
                            <span className="flex-shrink-0 font-mono text-[0.75rem] tabular-nums text-[var(--swimm-down)]">
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

          <div className="mt-6 flex flex-col gap-3 border-t border-[var(--swimm-neutral-300)] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-[var(--swimm-neutral-500)]">
              {__("live.analysisNote", {
                pair: formatPairLabel(selectedPair),
                timeframe: timeframe.toUpperCase(),
                provider: providerLabel,
              })}
            </div>
            <button
              type="button"
              onClick={onAnalyze}
              disabled={!canRunAnalysis}
              className="inline-flex items-center justify-center rounded-full border border-[var(--swimm-primary-500)] bg-[var(--swimm-primary-500)] px-6 py-3 text-sm font-semibold text-[var(--swimm-navy-900)] shadow-[var(--swimm-glow)] transition hover:bg-[var(--swimm-primary-700)] hover:text-white disabled:cursor-not-allowed disabled:border-[var(--swimm-neutral-300)] disabled:bg-[var(--swimm-neutral-300)]/40 disabled:text-[var(--swimm-neutral-500)]"
            >
              {isRunningAnalysis
                ? liveCopy.analyzingButton
                : liveCopy.analyzeButton}
            </button>
          </div>
          {analysisError && (
            <div className="mt-4 rounded-2xl border border-[var(--swimm-down)]/30 bg-[var(--swimm-down)]/10 px-4 py-3 text-sm text-[var(--swimm-down)]">
              {analysisError}
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
});
