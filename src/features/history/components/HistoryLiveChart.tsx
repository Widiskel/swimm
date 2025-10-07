"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type LogicalRange,
  type MouseEventParams,
} from "lightweight-charts";

import type { AgentResponse } from "@/features/analysis/types";
import type { CexProvider } from "@/features/market/exchanges";
import type {
  HoverData,
  IndicatorKey,
  IndicatorSeriesMap,
  MarketSnapshot,
  OrderBookEntry,
} from "@/features/market/types";
import {
  DEFAULT_MARKET_MODE,
  INDICATOR_CONFIG,
  PROVIDER_ICON_MAP,
  TIMEFRAME_OPTIONS,
  type MarketMode,
} from "@/features/market/constants";
import {
  buildIndicatorData,
  createIndicatorSeries,
  updateIndicatorSeries,
} from "@/features/market/utils/indicators";
import { formatPairLabel, withAlpha } from "@/features/market/utils/format";
import { useLanguage } from "@/providers/language-provider";

const REFRESH_INTERVAL_MS = 60_000;
const ORDERBOOK_LIMIT = 50;

const mapTimeframeToInterval = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  const allowed = new Set(["1m", "5m", "15m", "1h", "4h", "1d"]);
  if (allowed.has(normalized)) {
    return normalized;
  }
  const sanitized = normalized.replace(/[^0-9a-z]/g, "");
  if (allowed.has(sanitized)) {
    return sanitized;
  }
  if (normalized === "1day") {
    return "1d";
  }
  return "1h";
};

const FALLBACK_PROGRESS_COPY = {
  tpHit: "TP {number} hit",
  stopHit: "Stop loss hit",
  summary: "{hit}/{total} targets hit",
  targetLabel: "TP {number}",
  statusLive: "Live hit",
  statusSnapshot: "Snapshot hit",
  statusPending: "Pending",
};

const computePlanProgress = (
  candles: CandlestickData[],
  direction: "long" | "short",
  plan: AgentResponse["tradePlan"]
): { hitTargets: number[]; stopHit: boolean } => {
  if (!candles.length) {
    return { hitTargets: [], stopHit: false };
  }

  const stopLoss =
    typeof plan.stopLoss === "number" && Number.isFinite(plan.stopLoss)
      ? plan.stopLoss
      : null;
  const targets = Array.isArray(plan.takeProfits)
    ? plan.takeProfits.filter(
        (value): value is number =>
          typeof value === "number" && Number.isFinite(value)
      )
    : [];

  if (!targets.length && stopLoss === null) {
    return { hitTargets: [], stopHit: false };
  }

  const hitTargets = new Set<number>();
  let stopHit = false;

  for (const candle of candles) {
    const { high, low } = candle;

    if (!stopHit && stopLoss !== null) {
      const stopCondition =
        direction === "short"
          ? low <= stopLoss || high >= stopLoss
          : low <= stopLoss;
      if (stopCondition) {
        stopHit = true;
      }
    }

    targets.forEach((target, index) => {
      const targetHit =
        direction === "short" ? low <= target : high >= target;
      if (targetHit) {
        hitTargets.add(index);
      }
    });

    if (stopHit && hitTargets.size === targets.length) {
      break;
    }
  }

  return {
    hitTargets: Array.from(hitTargets).sort((a, b) => a - b),
    stopHit,
  };
};

export type HistoryLiveChartProps = {
  symbol: string;
  provider: CexProvider;
  mode?: MarketMode | null;
  timeframe: string;
  snapshotCapturedAt?: string | null;
  snapshotCandles?: CandlestickData[];
  tradePlan?: AgentResponse["tradePlan"] | null;
  direction?: "long" | "short" | null;
  variant?: "default" | "chartOnly";
};

export function HistoryLiveChart({
  symbol,
  provider,
  mode,
  timeframe,
  snapshotCapturedAt,
  snapshotCandles,
  tradePlan,
  direction,
  variant = "default",
}: HistoryLiveChartProps) {
  const { languageTag, messages, __, locale } = useLanguage();
  const historyCopy = messages.history.liveComparison;
  const progressCopy = historyCopy.progress ?? FALLBACK_PROGRESS_COPY;
  const liveCopy = messages.live;
  const chartOnly = variant === "chartOnly";

  const providerLabel = useMemo(
    () => __("pairSelection.providerOptions." + provider),
    [__, provider]
  );
  const formattedPair = useMemo(() => formatPairLabel(symbol), [symbol]);

  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartApiRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const snapshotSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const indicatorSeriesRef = useRef<IndicatorSeriesMap>({});
  const crosshairHandlerRef = useRef<
    ((param: MouseEventParams) => void) | null
  >(null);
  const hoverDataRef = useRef<HoverData | null>(null);
  const manualRangeRef = useRef<LogicalRange | null>(null);
  const hasManualRangeRef = useRef(false);
  const suppressRangeEventRef = useRef(false);
  const rangeHandlerRef = useRef<((range: LogicalRange | null) => void) | null>(null);

  const [candles, setCandles] = useState<CandlestickData[]>([]);
  const initialIndicatorVisibility = useMemo(() => {
    const initial: Record<IndicatorKey, boolean> = {} as Record<
      IndicatorKey,
      boolean
    >;
    for (const indicator of INDICATOR_CONFIG) {
      initial[indicator.key] = chartOnly ? false : indicator.defaultVisible;
    }
    return initial;
  }, [chartOnly]);

  const [indicatorVisibility, setIndicatorVisibility] = useState<
    Record<IndicatorKey, boolean>
  >(initialIndicatorVisibility);

  useEffect(() => {
    setIndicatorVisibility(initialIndicatorVisibility);
  }, [initialIndicatorVisibility]);
  const [hoverData, setHoverData] = useState<HoverData | null>(null);
  const [chartMeta, setChartMeta] = useState<{
    orderBook: { bids: OrderBookEntry[]; asks: OrderBookEntry[] };
    summaryStats: MarketSnapshot["summaryStats"];
    updatedAt: string | null;
  } | null>(null);
  const [hasLiveData, setHasLiveData] = useState(false);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [isChartVisible, setIsChartVisible] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [activeTimeframe, setActiveTimeframe] = useState(
    timeframe && timeframe.trim().length ? timeframe : "1h"
  );
  const interval = useMemo(
    () => mapTimeframeToInterval(activeTimeframe),
    [activeTimeframe]
  );

  useEffect(() => {
    if (timeframe && timeframe.trim().length) {
      setActiveTimeframe(timeframe);
    }
  }, [timeframe]);

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
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
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

  const snapshotProgress = useMemo(
    (): { hitTargets: number[]; stopHit: boolean } => {
      if (!snapshotCandles?.length || !tradePlan || !direction) {
        return { hitTargets: [], stopHit: false };
      }
      return computePlanProgress(snapshotCandles, direction, tradePlan);
    },
    [direction, snapshotCandles, tradePlan]
  );

  const liveProgress = useMemo(
    (): { hitTargets: number[]; stopHit: boolean } => {
      if (
        !hasLiveData ||
        !candles.length ||
        !snapshotCandles?.length ||
        !tradePlan ||
        !direction
      ) {
        return { hitTargets: [], stopHit: false };
      }

      const lastSnapshotTimeRaw = snapshotCandles[snapshotCandles.length - 1]?.time;
      const lastSnapshotTime =
        typeof lastSnapshotTimeRaw === "number" ? lastSnapshotTimeRaw : NaN;

      const relevantCandles = candles.filter((candle) => {
        const numericTime =
          typeof candle.time === "number" ? candle.time : Number.NaN;
        if (!Number.isFinite(numericTime)) {
          return false;
        }
        if (Number.isFinite(lastSnapshotTime)) {
          return numericTime >= lastSnapshotTime;
        }
        return true;
      });

      if (!relevantCandles.length) {
        return { hitTargets: [], stopHit: false };
      }

      return computePlanProgress(relevantCandles, direction, tradePlan);
    },
    [candles, direction, hasLiveData, snapshotCandles, tradePlan]
  );

  const progressDelta =
    liveProgress.hitTargets.length || liveProgress.stopHit
      ? (() => {
          const baselineTargets = new Set(snapshotProgress.hitTargets);
          const hitTargets = liveProgress.hitTargets.filter(
            (index) => !baselineTargets.has(index)
          );
          const stopHit = liveProgress.stopHit && !snapshotProgress.stopHit;
          return { hitTargets, stopHit };
        })()
      : { hitTargets: [] as number[], stopHit: false };
  const targetStatuses = useMemo(
    () =>
      direction && tradePlan?.takeProfits?.length
        ? tradePlan.takeProfits
            .map((value, index) => {
              if (typeof value !== "number" || !Number.isFinite(value)) {
                return null;
              }
              const liveHit = liveProgress.hitTargets.includes(index);
              const snapshotHit = snapshotProgress.hitTargets.includes(index);
              const status = liveHit
                ? "live"
                : snapshotHit
                ? "snapshot"
                : "pending";
              return {
                index,
                value,
                status,
              };
            })
            .filter(
              (
                item
              ): item is { index: number; value: number; status: "live" | "snapshot" | "pending" } =>
                item !== null
            )
        : [],
    [direction, liveProgress.hitTargets, snapshotProgress.hitTargets, tradePlan]
  );
  const totalTargets = targetStatuses.length;
  const hitTargetCount = targetStatuses.filter(
    (item) => item.status === "live" || item.status === "snapshot"
  ).length;
  const summaryLabel =
    totalTargets > 0
      ? progressCopy.summary
          .replace("{hit}", String(hitTargetCount))
          .replace("{total}", String(totalTargets))
      : null;

  const setHoverState = useCallback((value: HoverData | null) => {
    hoverDataRef.current = value;
    setHoverData(value);
  }, []);

  const teardownChart = useCallback(() => {
    if (chartApiRef.current && crosshairHandlerRef.current) {
      chartApiRef.current.unsubscribeCrosshairMove(
        crosshairHandlerRef.current
      );
    }
    if (chartApiRef.current && rangeHandlerRef.current) {
      chartApiRef.current
        .timeScale()
        .unsubscribeVisibleLogicalRangeChange(rangeHandlerRef.current);
    }
    if (chartApiRef.current) {
      chartApiRef.current.remove();
    }
    chartApiRef.current = null;
    candleSeriesRef.current = null;
    snapshotSeriesRef.current = null;
    indicatorSeriesRef.current = {};
    crosshairHandlerRef.current = null;
    hoverDataRef.current = null;
    manualRangeRef.current = null;
    hasManualRangeRef.current = false;
    suppressRangeEventRef.current = false;
    rangeHandlerRef.current = null;
    setHoverState(null);
  }, [setHoverState]);

  useEffect(() => {
    let cancelled = false;

    const load = async (silent = false) => {
      if (!silent) {
        setIsChartLoading(true);
      }
      try {
        const params = new URLSearchParams({
          symbol,
          interval,
          limit: "500",
          provider,
          locale,
        });
        const resolvedMode = mode ?? DEFAULT_MARKET_MODE;
        if (resolvedMode) {
          params.set("mode", resolvedMode);
        }

        const capturedAtMs = snapshotCapturedAt
          ? Date.parse(snapshotCapturedAt)
          : NaN;
        if (Number.isFinite(capturedAtMs)) {
          const start = Math.max(capturedAtMs - 7 * 24 * 60 * 60 * 1000, 0);
          const end = Date.now();
          const intervalMsMap: Record<string, number> = {
            "1m": 60_000,
            "5m": 5 * 60_000,
            "15m": 15 * 60_000,
            "1h": 60 * 60_000,
            "4h": 4 * 60 * 60_000,
            "1d": 24 * 60 * 60_000,
          };
          const intervalMs = intervalMsMap[interval] ?? intervalMsMap["1h"];
          const estimate = Math.min(
            Math.ceil((end - start) / intervalMs) + 10,
            5000
          );
          params.set("limit", String(estimate));
          params.set("start", String(start));
          params.set("end", String(end));
        }

        const response = await fetch(`/api/market?${params.toString()}`);
        if (!response.ok) {
          throw new Error(historyCopy.error);
        }
        const payload = (await response.json()) as MarketSnapshot;
        if (cancelled) {
          return;
        }

        const parsedCandles = (payload.candles ?? []).map<CandlestickData>(
          (item) => ({
            time: (item.openTime / 1000) as CandlestickData["time"],
            open: Number(item.open.toFixed(2)),
            high: Number(item.high.toFixed(2)),
            low: Number(item.low.toFixed(2)),
            close: Number(item.close.toFixed(2)),
          })
        );

        setChartMeta({
          orderBook: {
            bids: payload.orderBook?.bids ?? [],
            asks: payload.orderBook?.asks ?? [],
          },
          summaryStats: payload.summaryStats ?? null,
          updatedAt: payload.updatedAt ?? null,
        });
        setLastUpdated(
          payload.updatedAt ? new Date(payload.updatedAt) : new Date()
        );

        if (!parsedCandles.length) {
          if (snapshotCandles?.length) {
            setCandles(snapshotCandles);
            setIsChartVisible(true);
            setChartError(null);
            setHasLiveData(false);
          } else {
            setCandles([]);
            setIsChartVisible(false);
            setChartError(historyCopy.empty);
            teardownChart();
            setHoverState(null);
            setHasLiveData(false);
          }
          return;
        }

        setCandles(parsedCandles);
        setHasLiveData(true);
        setIsChartVisible(true);
        setChartError(null);
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (snapshotCandles?.length) {
          setCandles(snapshotCandles);
          setChartMeta(null);
          setIsChartVisible(true);
          setChartError(
            error instanceof Error ? error.message : historyCopy.error
          );
          setHasLiveData(false);
        } else {
          setCandles([]);
          setChartMeta(null);
          setIsChartVisible(false);
          teardownChart();
          setHoverState(null);
          setChartError(
            error instanceof Error ? error.message : historyCopy.error
          );
          setHasLiveData(false);
        }
      } finally {
        if (!cancelled && !silent) {
          setIsChartLoading(false);
        }
      }
    };

    void load(false);
    const timer = setInterval(() => {
      void load(true);
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [
    historyCopy.empty,
    historyCopy.error,
    interval,
    locale,
    mode,
    provider,
    teardownChart,
    setHoverState,
    symbol,
    snapshotCapturedAt,
    snapshotCandles,
  ]);

  useEffect(() => {
    if (snapshotCandles?.length) {
      setCandles(snapshotCandles);
      setIsChartVisible(true);
      setChartError(null);
      setHasLiveData(false);
    }
  }, [snapshotCandles]);

  useEffect(() => () => teardownChart(), [teardownChart]);

  useEffect(() => {
    if (!chartContainerRef.current || !candles.length) {
      return;
    }

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

      const snapshotSeries = chart.addCandlestickSeries({
        upColor: withAlpha("#22c55e", 0.38),
        borderUpColor: withAlpha("#22c55e", 0.38),
        wickUpColor: withAlpha("#22c55e", 0.28),
        downColor: withAlpha("#ef4444", 0.38),
        borderDownColor: withAlpha("#ef4444", 0.38),
        wickDownColor: withAlpha("#ef4444", 0.28),
        priceScaleId: "right",
      });
      snapshotSeries.applyOptions({
        priceLineVisible: false,
        lastValueVisible: false,
      });

      const candleSeries = chart.addCandlestickSeries({
        upColor: "#22c55e",
        borderUpColor: "#22c55e",
        wickUpColor: "#22c55e",
        downColor: "#ef4444",
        borderDownColor: "#ef4444",
        wickDownColor: "#ef4444",
        priceScaleId: "right",
      });

      if (!chartOnly) {
        indicatorSeriesRef.current = createIndicatorSeries(
          chart,
          indicatorVisibility,
          INDICATOR_CONFIG
        );
      }

      chartApiRef.current = chart;
      candleSeriesRef.current = candleSeries;
      snapshotSeriesRef.current = snapshotSeries;

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

      const rangeHandler = (range: LogicalRange | null) => {
        if (suppressRangeEventRef.current) {
          return;
        }
        if (range) {
          manualRangeRef.current = range;
          hasManualRangeRef.current = true;
        }
      };

      chart.timeScale().subscribeVisibleLogicalRangeChange(rangeHandler);
      rangeHandlerRef.current = rangeHandler;
    }

    const chartInstance = chartApiRef.current;
    const candleSeries = candleSeriesRef.current;

    if (!chartInstance || !candleSeries) {
      return;
    }

    const timeScale = chartInstance.timeScale();
    const restoreRange =
      hasManualRangeRef.current && manualRangeRef.current !== null
        ? manualRangeRef.current
        : null;

    if (restoreRange) {
      suppressRangeEventRef.current = true;
      candleSeries.setData(candles);
      timeScale.setVisibleLogicalRange(restoreRange);
    } else {
      candleSeries.setData(candles);
      timeScale.fitContent();
    }

    const snapshotSeries = snapshotSeriesRef.current;
    if (snapshotSeries) {
      if (snapshotCandles?.length) {
        snapshotSeries.setData(snapshotCandles);
        snapshotSeries.applyOptions({
          visible: hasLiveData,
        });
      } else {
        snapshotSeries.setData([]);
        snapshotSeries.applyOptions({ visible: false });
      }
    }

    suppressRangeEventRef.current = false;

    if (!chartOnly) {
      const indicatorData = buildIndicatorData(candles, INDICATOR_CONFIG);
      updateIndicatorSeries(
        indicatorSeriesRef.current,
        indicatorData,
        indicatorVisibility,
        INDICATOR_CONFIG
      );
    }

    const latest = candles[candles.length - 1];
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
    candles,
    chartOnly,
    hasLiveData,
    hoverDateFormatter,
    indicatorVisibility,
    setHoverState,
    snapshotCandles,
  ]);

  const handleTimeframeChange = (next: (typeof TIMEFRAME_OPTIONS)[number]) => {
    setActiveTimeframe(next);
    setHoverState(null);
    hoverDataRef.current = null;
  };

  const toggleIndicator = (key: IndicatorKey) => {
    if (chartOnly) {
      return;
    }
    setIndicatorVisibility((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const summaryStats = chartMeta?.summaryStats ?? null;
  const baseAssetSymbol = summaryStats
    ? summaryStats.symbol.replace(/USDT$/i, "")
    : formattedPair.split("/")[0] ?? "";
  if (chartOnly) {
    const lastPriceLabelChartOnly = summaryStats
      ? simpleNumberFormatter.format(summaryStats.lastPrice)
      : hoverData?.close
      ? priceFormatter.format(hoverData.close)
      : "-";

    return (
      <section className="space-y-4">
        <div className="rounded-3xl border border-[var(--swimm-neutral-300)] bg-white p-6 shadow-sm shadow-[var(--swimm-neutral-300)]/40">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--swimm-neutral-500)]">
                {liveCopy.card.title}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-2xl font-semibold text-[var(--swimm-navy-900)]">
                  {formattedPair}
                </h3>
                <span className="rounded-full border border-[var(--swimm-primary-700)]/40 bg-[var(--swimm-primary-500)]/15 px-3 py-1 text-xs font-semibold uppercase text-[var(--swimm-primary-700)]">
                  {activeTimeframe.toUpperCase()}
                </span>
                <span className="flex items-center gap-2 rounded-full border border-[var(--swimm-neutral-300)] bg-white px-3 py-1">
                  <Image
                    src={PROVIDER_ICON_MAP[provider]}
                    alt={providerLabel}
                    width={18}
                    height={18}
                    className="h-4 w-4"
                  />
                  <span className="text-xs text-[var(--swimm-neutral-500)]">
                    {providerLabel}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[var(--swimm-neutral-500)]">
                <span className="text-lg font-semibold text-[var(--swimm-navy-900)]">
                  {lastPriceLabelChartOnly}
                </span>
                {isChartLoading && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-[var(--swimm-neutral-300)] bg-white px-3 py-1 text-xs font-medium text-[var(--swimm-neutral-400)]">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border border-[var(--swimm-neutral-300)] border-t-[var(--swimm-primary-500)]" />
                    {liveCopy.card.loading}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {TIMEFRAME_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleTimeframeChange(option)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                    activeTimeframe === option
                      ? "border-[var(--swimm-primary-700)] bg-[var(--swimm-primary-500)]/20 text-[var(--swimm-primary-700)]"
                      : "border-[var(--swimm-neutral-300)] bg-white text-[var(--swimm-neutral-500)] hover:border-[var(--swimm-primary-500)] hover:text-[var(--swimm-primary-700)]"
                  }`}
                >
                  {option.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 relative min-h-[20rem] md:min-h-[24rem]">
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

          <div className="mt-4 grid gap-2 rounded-xl border border-[var(--swimm-neutral-300)] bg-[var(--swimm-neutral-100)] px-4 py-3 text-xs text-[var(--swimm-neutral-500)] sm:grid-cols-2">
            {hoverData ? (
              <>
                <div className="font-semibold text-[var(--swimm-navy-900)]">
                  {hoverData.timeLabel}
                </div>
                <div className="text-right">
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

          {chartError && (
            <div className="mt-4 rounded-2xl border border-[var(--swimm-down)]/30 bg-[var(--swimm-down)]/10 px-4 py-3 text-sm text-[var(--swimm-down)]">
              {chartError}
            </div>
          )}
        </div>
      </section>
    );
  }

  const showProgressBadges =
    hasLiveData && (progressDelta.hitTargets.length > 0 || progressDelta.stopHit);

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
  const lastPriceLabel = summaryStats
    ? simpleNumberFormatter.format(summaryStats.lastPrice)
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
    ? `${simpleNumberFormatter.format(summaryStats.highPrice)} / ${simpleNumberFormatter.format(
        summaryStats.lowPrice
      )}`
    : "-";
  const formattedUpdatedAt = chartMeta?.updatedAt
    ? hoverDateFormatter.format(new Date(chartMeta.updatedAt))
    : lastUpdated
    ? hoverDateFormatter.format(lastUpdated)
    : "-";
  const orderBookBids = chartMeta?.orderBook.bids ?? [];
  const orderBookAsks = chartMeta?.orderBook.asks ?? [];

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-[var(--swimm-neutral-300)] bg-white p-6 shadow-sm shadow-[var(--swimm-neutral-300)]/40">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--swimm-neutral-300)] bg-white/85 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--swimm-neutral-500)]">
                  {liveCopy.card.title}
                </div>
                <div className="flex flex-wrap items-baseline gap-3">
                  <h3 className="text-2xl font-semibold text-[var(--swimm-navy-900)]">
                    {formattedPair}
                  </h3>
                  <span className="rounded-full border border-[var(--swimm-primary-700)]/40 bg-[var(--swimm-primary-500)]/15 px-3 py-1 text-xs font-semibold uppercase text-[var(--swimm-primary-700)]">
                    {activeTimeframe.toUpperCase()}
                  </span>
                  <span className="flex items-center gap-2 rounded-full border border-[var(--swimm-neutral-300)] bg-white px-3 py-1">
                    <Image
                      src={PROVIDER_ICON_MAP[provider]}
                      alt={providerLabel}
                      width={18}
                      height={18}
                      className="h-4 w-4"
                    />
                    <span className="sr-only">{providerLabel}</span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--swimm-neutral-500)]">
                  <span className="text-lg font-semibold text-[var(--swimm-navy-900)]">
                    {lastPriceLabel}
                  </span>
                  {priceChangePct !== null && (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${changeBadgeClass}`}
                    >
                      {priceChangeLabel}
                    </span>
                  )}
                  {isChartLoading && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--swimm-neutral-300)] bg-white px-3 py-1 text-xs font-medium text-[var(--swimm-neutral-400)]">
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border border-[var(--swimm-neutral-300)] border-t-[var(--swimm-primary-500)]" />
                      {liveCopy.card.loading}
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
                  <span className="ml-1 text-[var(--swimm-navy-900)]">{highLowLabel}</span>
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
                  onClick={() => handleTimeframeChange(option)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                    activeTimeframe === option
                      ? "border-[var(--swimm-primary-700)] bg-[var(--swimm-primary-500)]/20 text-[var(--swimm-primary-700)]"
                      : "border-[var(--swimm-neutral-300)] bg-white text-[var(--swimm-neutral-500)] hover:border-[var(--swimm-primary-500)] hover:text-[var(--swimm-primary-700)]"
                  }`}
                >
                  {option.toUpperCase()}
                </button>
              ))}
            </div>
            {showProgressBadges ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {progressDelta.hitTargets.map((index) => (
                  <span
                    key={`tp-hit-${index}`}
                    className="rounded-full border border-[var(--swimm-up)]/40 bg-[var(--swimm-up)]/10 px-3 py-1 text-xs font-semibold text-[var(--swimm-up)]"
                  >
                    {progressCopy.tpHit.replace("{number}", String(index + 1))}
                  </span>
                ))}
                {progressDelta.stopHit ? (
                  <span className="rounded-full border border-[var(--swimm-down)]/40 bg-[var(--swimm-down)]/10 px-3 py-1 text-xs font-semibold text-[var(--swimm-down)]">
                    {progressCopy.stopHit}
                  </span>
                ) : null}
              </div>
            ) : null}
            {summaryLabel ? (
              <div className="mt-2 space-y-2">
                <span className="inline-flex rounded-full border border-[var(--swimm-neutral-300)] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--swimm-neutral-500)]">
                  {summaryLabel}
                </span>
                {targetStatuses.length ? (
                  <div className="flex flex-wrap gap-2">
                    {targetStatuses.map((target) => {
                      const label = progressCopy.targetLabel.replace(
                        "{number}",
                        String(target.index + 1)
                      );
                      const statusLabel =
                        target.status === "live"
                          ? progressCopy.statusLive
                          : target.status === "snapshot"
                          ? progressCopy.statusSnapshot
                          : progressCopy.statusPending;
                      const badgeClass =
                        target.status === "live"
                          ? "border-[var(--swimm-up)]/40 bg-[var(--swimm-up)]/10 text-[var(--swimm-up)]"
                          : target.status === "snapshot"
                          ? "border-[var(--swimm-primary-500)]/40 bg-[var(--swimm-primary-500)]/10 text-[var(--swimm-primary-700)]"
                          : "border-[var(--swimm-neutral-300)] bg-white text-[var(--swimm-neutral-500)]";
                      return (
                        <span
                          key={`tp-status-${target.index}`}
                          className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass}`}
                        >
                          <span>{label}</span>
                          <span className="text-[0.7rem] uppercase tracking-wide">
                            {statusLabel}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
            {chartOnly ? null : (
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
                          onClick={() => toggleIndicator(indicator.key)}
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
            )}
            <div className="mt-4 grid gap-2 rounded-xl border border-[var(--swimm-neutral-300)] bg-[var(--swimm-neutral-100)] px-4 py-3 text-xs text-[var(--swimm-neutral-500)] sm:grid-cols-2">
              {hoverData ? (
                <>
                  <div className="font-semibold text-[var(--swimm-navy-900)]">
                    {hoverData.timeLabel}
                  </div>
                  <div className="text-right">
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
                      {orderBookBids.slice(0, ORDERBOOK_LIMIT).map((bid, index) => (
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
                      {orderBookAsks.slice(0, ORDERBOOK_LIMIT).map((ask, index) => (
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

          {chartError && (
            <div className="rounded-2xl border border-[var(--swimm-down)]/30 bg-[var(--swimm-down)]/10 px-4 py-3 text-sm text-[var(--swimm-down)]">
              {chartError}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
