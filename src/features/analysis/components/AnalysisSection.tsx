"use client";

import {
  useEffect,
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
  type IPriceLine,
  type ISeriesApi,
  type LogicalRange,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";

import type { AgentResponse } from "../types";
import { useLanguage } from "@/providers/language-provider";
import {
  buildIndicatorData,
  createIndicatorSeries,
  updateIndicatorSeries,
} from "@/features/market/utils/indicators";
import { updateOverlayPriceLines } from "@/features/market/utils/overlays";
import {
  INDICATOR_CONFIG,
  TARGET_LABELS,
  type AssetCategory,
  type MarketMode,
} from "@/features/market/constants";
import type {
  IndicatorKey,
  IndicatorSeriesMap,
  OverlayLevel,
} from "@/features/market/types";
import { formatPairLabel } from "@/features/market/utils/format";

const SNAPSHOT_LIMIT = 220;
const ZONE_LOOKAHEAD_BARS = 6;
const EXECUTION_WINDOW_OFFSET_MINUTES = 7 * 60;

type OverlayZone = {
  top: number;
  bottom: number;
  label: string;
  color: string;
  border: string;
};

export const mapTimeframeToSeconds = (value: string) => {
  const normalized = value.trim().toLowerCase();
  const map: Record<string, number> = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "30m": 1800,
    "1h": 3600,
    "2h": 7200,
    "4h": 14400,
    "6h": 21600,
    "8h": 28800,
    "12h": 43200,
    "1d": 86400,
    "1w": 604800,
  };
  return map[normalized] ?? 3600;
};

const formatExecutionWindowLabel = (raw: string): string => {
  if (!raw?.trim()) {
    return "-";
  }

  const parts = raw.split(/\s+-\s+/).filter((part) => part.trim().length > 0);
  const formatPart = (value: string) => {
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) {
      return null;
    }
    const offsetMs = EXECUTION_WINDOW_OFFSET_MINUTES * 60 * 1000;
    const adjusted = parsed + offsetMs;
    const date = new Date(adjusted);
    const pad = (input: number) => String(input).padStart(2, "0");
    const year = date.getUTCFullYear();
    const month = pad(date.getUTCMonth() + 1);
    const day = pad(date.getUTCDate());
    const hours = pad(date.getUTCHours());
    const minutes = pad(date.getUTCMinutes());
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  if (parts.length === 1) {
    const formatted = formatPart(parts[0]);
    return formatted ? `${formatted} (GMT + 7)` : raw;
  }

  if (parts.length >= 2) {
    const start = formatPart(parts[0]);
    const end = formatPart(parts[1]);
    if (start && end) {
      return `${start} - ${end} (GMT + 7)`;
    }
  }

  return raw;
};

type AnalysisSectionProps = {
  response: AgentResponse | null;
  timeframe: string;
  indicatorVisibility: Record<IndicatorKey, boolean>;
  analysisCandles: CandlestickData[];
  overlayLevels: OverlayLevel[];
  supportiveHighlights: string[];
  paddedTargets: (number | null)[];
  entryZoneValues: number[];
  tradeStopLoss: number | null;
  tradeExecutionWindow: string;
  tradeSizingNotes: string;
  tradingNarrative: string;
  formatPrice: (value: number | null) => string;
  formattedPair: string;
  chartStartLabel: string;
  chartEndLabel: string;
  canSaveReport: boolean;
  isSessionSyncing: boolean;
  saveFeedback: string;
  onFeedbackChange?: (value: string) => void;
  onSaveReport: () => void;
  isSavingReport: boolean;
  saveStatus: "idle" | "success" | "error";
  saveError: string | null;
  sectionRef?:
    | RefObject<HTMLElement>
    | MutableRefObject<HTMLElement | null>
    | null;
  analysisMarkers?: SeriesMarker<Time>[];
  analysisCandleDetails?: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
  } | null;
  marketMode?: MarketMode;
  assetCategory?: AssetCategory;
};

const MotionSection = motion.section;

export function AnalysisSection({
  response,
  timeframe,
  indicatorVisibility,
  analysisCandles,
  overlayLevels,
  supportiveHighlights,
  paddedTargets,
  entryZoneValues,
  tradeStopLoss,
  tradeExecutionWindow,
  tradeSizingNotes,
  tradingNarrative,
  formatPrice,
  formattedPair,
  chartStartLabel,
  chartEndLabel,
  canSaveReport,
  isSessionSyncing,
  saveFeedback,
  onFeedbackChange: _onFeedbackChange,
  onSaveReport,
  isSavingReport,
  saveStatus,
  saveError,
  sectionRef,
  analysisMarkers = [],
  analysisCandleDetails = null,
  marketMode,
  assetCategory,
}: AnalysisSectionProps) {
  const { messages, __, languageTag } = useLanguage();
  const analysisCopy = messages.analysis;
  const fallbackCopy = messages.analysisFallback;
  const saveCopy = analysisCopy.savePanel;

  const summaryText = response?.summary?.trim().length
    ? response.summary
    : fallbackCopy.summary;
  const rationaleText = response?.decision?.rationale?.trim().length
    ? response.decision.rationale
    : fallbackCopy.rationale;
  const chartNarrativeText = response?.market?.chart?.narrative?.trim().length
    ? response.market.chart.narrative
    : "";
  const chartForecastText = response?.market?.chart?.forecast?.trim().length
    ? response.market.chart.forecast
    : "";
  const technicalLines = response?.market?.technical ?? [];
  const fundamentalLines = response?.market?.fundamental ?? [];
  const nextStepLines = response?.nextSteps ?? [];

  const sizingNotesText = tradeSizingNotes?.trim().length
    ? tradeSizingNotes
    : "-";
  const sizingCopy = analysisCopy.sizingCalc;
  const resolvedMode: MarketMode = marketMode ?? "spot";
  const resolvedCategory: AssetCategory = assetCategory ?? "crypto";
  const isLeveragedMarket =
    resolvedMode === "futures" || resolvedCategory === "gold";

  const [equity, setEquity] = useState<number>(1000);
  const [riskPct, setRiskPct] = useState<number>(1.0);
  const [leverage, setLeverage] = useState<number>(
    isLeveragedMarket ? 20 : 1
  );
  const [leverageTouched, setLeverageTouched] = useState(false);
  const [manualBudget, setManualBudget] = useState<number>(0);
  const [manualBudgetTouched, setManualBudgetTouched] = useState(false);
  const [manualEntryPrice, setManualEntryPrice] = useState<number | null>(null);
  const [manualPriceTouched, setManualPriceTouched] = useState(false);

  const primaryEntry = (entryZoneValues?.[0] ?? null) as number | null;
  const inferredEntryFromChart = analysisCandles.length
    ? Number(analysisCandles[analysisCandles.length - 1].close.toFixed(2))
    : null;
  const effectiveEntry =
    primaryEntry !== null && Number.isFinite(primaryEntry)
      ? Number(primaryEntry.toFixed(2))
      : inferredEntryFromChart;
  const effectiveStop =
    typeof tradeStopLoss === "number" && Number.isFinite(tradeStopLoss)
      ? Number(tradeStopLoss.toFixed(2))
      : null;

  const bias = response?.tradePlan?.bias ?? "long";
  const tradeDirection = bias === "short" ? -1 : 1;

  const stopDistance =
    effectiveEntry !== null && effectiveStop !== null
      ? Math.abs(effectiveEntry - effectiveStop)
      : null;

  const normalizedRiskPct = Math.max(0, riskPct);
  const riskAmount = Number((equity * (normalizedRiskPct / 100)).toFixed(2));

  const recommendedQuantity =
    stopDistance && stopDistance > 0
      ? Number((riskAmount / stopDistance).toFixed(6))
      : null;

  const clampedLeverage = isLeveragedMarket
    ? Math.min(Math.max(Math.round(leverage), 1), 125)
    : 1;

  const recommendedNotional =
    effectiveEntry !== null && recommendedQuantity !== null
      ? Number((recommendedQuantity * effectiveEntry).toFixed(2))
      : null;

  const recommendedMargin =
    recommendedNotional !== null
      ? Number((recommendedNotional / clampedLeverage).toFixed(2))
      : null;

  const recommendedExposure = isLeveragedMarket
    ? recommendedMargin
    : recommendedNotional;

  useEffect(() => {
    if (!isLeveragedMarket) {
      if (leverage !== 1) {
        setLeverage(1);
      }
      setLeverageTouched(false);
      return;
    }
    if (!leverageTouched && leverage !== 20) {
      setLeverage(20);
    }
  }, [isLeveragedMarket, leverage, leverageTouched]);

  useEffect(() => {
    if (!manualPriceTouched && effectiveEntry !== null) {
      setManualEntryPrice(effectiveEntry);
    }
  }, [effectiveEntry, manualPriceTouched]);

  useEffect(() => {
    if (!manualBudgetTouched && recommendedExposure !== null) {
      setManualBudget(recommendedExposure);
    }
  }, [recommendedExposure, manualBudgetTouched]);
  // No lot input; qty derives from equity and risk only.

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(languageTag, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [languageTag]
  );

  const quantityFormatter = useMemo(
    () =>
      new Intl.NumberFormat(languageTag, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 6,
      }),
    [languageTag]
  );

  const formatSigned = (value: number | null) => {
    if (value === null || Number.isNaN(value)) {
      return "-";
    }
    const absValue = Math.abs(value);
    const sign = value > 0 ? "+" : value < 0 ? "-" : "";
    return `${sign}${numberFormatter.format(absValue)} USDT`;
  };

  const formatQuantity = (value: number | null) =>
    value !== null && Number.isFinite(value)
      ? quantityFormatter.format(value)
      : "-";

  const manualEntryPriceResolved =
    manualEntryPrice !== null ? manualEntryPrice : effectiveEntry;

  const manualBudgetNormalized =
    manualBudget > 0
      ? manualBudget
      : recommendedExposure !== null
      ? recommendedExposure
      : null;

  const manualNotional =
    manualBudgetNormalized !== null && manualEntryPriceResolved !== null
      ? Number(
          (
            manualBudgetNormalized *
            (isLeveragedMarket ? clampedLeverage : 1)
          ).toFixed(2)
        )
      : null;

  const manualQuantity =
    manualNotional !== null &&
    manualEntryPriceResolved !== null &&
    manualEntryPriceResolved > 0
      ? Number((manualNotional / manualEntryPriceResolved).toFixed(6))
      : null;

  const computePnl = (
    exitPrice: number | null,
    entryPriceValue: number | null,
    quantityValue: number | null
  ) => {
    if (
      exitPrice === null ||
      entryPriceValue === null ||
      quantityValue === null ||
      !Number.isFinite(exitPrice) ||
      !Number.isFinite(entryPriceValue) ||
      !Number.isFinite(quantityValue)
    ) {
      return null;
    }
    const delta = exitPrice - entryPriceValue;
    const raw = tradeDirection * delta * quantityValue;
    return Number(raw.toFixed(2));
  };

  const recommendedStopPnl = computePnl(
    effectiveStop,
    effectiveEntry,
    recommendedQuantity
  );
  const manualStopPnl = computePnl(
    effectiveStop,
    manualEntryPriceResolved,
    manualQuantity
  );

  type TargetRow = {
    key: (typeof TARGET_LABELS)[number];
    label: (typeof TARGET_LABELS)[number];
    price: number;
    isStop: false;
  };

  type StopRow = {
    key: "stop";
    label: string;
    price: number;
    isStop: true;
  };

  type PnlRow = TargetRow | StopRow;

  const pnlRows = (
    [
      ...paddedTargets
        .map((target, index) =>
          target !== null
            ? {
                key: TARGET_LABELS[index],
                label: TARGET_LABELS[index],
                price: target,
                isStop: false,
              }
            : null
        )
        .filter(
          (item): item is TargetRow => item !== null
        ),
      effectiveStop !== null
        ? {
            key: "stop",
            label: sizingCopy.stopLabel ?? analysisCopy.tradePlan.stopLoss,
            price: effectiveStop,
            isStop: true,
          }
        : null,
    ].filter(Boolean) as PnlRow[]
  ).map((row) => ({
    ...row,
    recommended: computePnl(row.price, effectiveEntry, recommendedQuantity),
    manual: computePnl(row.price, manualEntryPriceResolved, manualQuantity),
  }));

  const baseAssetSymbol = formattedPair.split("/")[0]?.trim() ?? "";

  const manualNotionalDisplay = manualNotional;

  const tradingNarrativeText = tradingNarrative?.trim().length
    ? tradingNarrative
    : analysisCopy.tradePlan.narrativeFallback;

  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const indicatorSeriesRef = useRef<IndicatorSeriesMap>({});
  const overlayPriceLinesRef = useRef<IPriceLine[]>([]);
  const [snapshotReady, setSnapshotReady] = useState(false);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const ohlcTimeFormatterRef = useRef<Intl.DateTimeFormat | null>(null);
  if (!ohlcTimeFormatterRef.current) {
    ohlcTimeFormatterRef.current = new Intl.DateTimeFormat(languageTag, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  useEffect(() => {
    if (!response || !analysisCandles.length) {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
        indicatorSeriesRef.current = {};
        overlayPriceLinesRef.current = [];
      }
      setSnapshotReady(false);
      return;
    }

    if (!chartContainerRef.current) {
      return;
    }

    const previousRange = chartRef.current
      ? chartRef.current.timeScale().getVisibleLogicalRange()
      : null;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
      indicatorSeriesRef.current = {};
      overlayPriceLinesRef.current = [];
    }

    const chartRoot = chartContainerRef.current;

    const chart = createChart(chartRoot, {
      layout: {
        background: { color: "#020617" },
        textColor: "#cbd5f5",
      },
      grid: {
        vertLines: { color: "#0f172a" },
        horzLines: { color: "#0f172a" },
      },
      rightPriceScale: {
        borderColor: "#1e293b",
      },
      timeScale: {
        borderColor: "#1e293b",
        secondsVisible: false,
      },
      autoSize: true,
      handleScroll: true,
      handleScale: true,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      borderUpColor: "#22c55e",
      wickUpColor: "#22c55e",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      wickDownColor: "#ef4444",
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = candleSeries;
    indicatorSeriesRef.current = createIndicatorSeries(
      chart,
      indicatorVisibility,
      INDICATOR_CONFIG
    );

    const limitedCandles = analysisCandles.slice(-SNAPSHOT_LIMIT);
    candleSeries.setData(limitedCandles);
    candleSeries.setMarkers(analysisMarkers ?? []);

    const timeframeSeconds = mapTimeframeToSeconds(timeframe);
    const entryPrices = entryZoneValues.length ? entryZoneValues : [];
    const entryMin = entryPrices.length ? Math.min(...entryPrices) : null;
    const entryMax = entryPrices.length ? Math.max(...entryPrices) : null;
    const stopPrice =
      typeof tradeStopLoss === "number" && Number.isFinite(tradeStopLoss)
        ? Number(tradeStopLoss.toFixed(2))
        : null;

    const zones: OverlayZone[] = [];
    if (entryMin !== null && entryMax !== null) {
      if (stopPrice !== null) {
        zones.push({
          top: Math.max(entryMax, stopPrice),
          bottom: Math.min(entryMin, stopPrice),
          label: "SL " + String(formatPrice(stopPrice)),
          color: "rgba(239,68,68,0.16)",
          border: "rgba(239,68,68,0.65)",
        });
      }

      paddedTargets.forEach((target, index) => {
        if (target === null) {
          return;
        }
        const formattedTarget = formatPrice(target);
        zones.push({
          top: Math.max(entryMax, target),
          bottom: Math.min(entryMin, target),
          label: String(TARGET_LABELS[index]) + " " + String(formattedTarget),
          color: "rgba(34,197,94,0.18)",
          border: "rgba(34,197,94,0.65)",
        });
      });
    }

    const toTimestamp = (
      time: CandlestickData["time"] | undefined
    ): UTCTimestamp | null => {
      if (typeof time === "number") {
        return time as UTCTimestamp;
      }
      if (!time) {
        return null;
      }
      if (typeof time === "object") {
        if ("timestamp" in time && typeof time.timestamp === "number") {
          return time.timestamp as UTCTimestamp;
        }
        const year = "year" in time ? Number(time.year) : 1970;
        const month = "month" in time ? Number(time.month) - 1 : 0;
        const day = "day" in time ? Number(time.day) : 1;
        return Math.floor(
          new Date(year, month, day).getTime() / 1000
        ) as UTCTimestamp;
      }
      return null;
    };

    const renderOverlay = () => {
      const chartRoot = chartContainerRef.current;
      const overlayCanvas = overlayCanvasRef.current;
      if (!chartRoot || !overlayCanvas) {
        return;
      }
      const ctx = overlayCanvas.getContext("2d");
      if (!ctx) {
        return;
      }

      const { width, height } = chartRoot.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      overlayCanvas.width = Math.max(1, Math.floor(width * dpr));
      overlayCanvas.height = Math.max(1, Math.floor(height * dpr));
      overlayCanvas.style.width = String(width) + "px";
      overlayCanvas.style.height = String(height) + "px";
      ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);

      if (!zones.length) {
        ctx.restore();
        return;
      }

      const timeScale = chart.timeScale();

      const lastTime = toTimestamp(
        limitedCandles[limitedCandles.length - 1]?.time
      );
      if (lastTime === null) {
        ctx.restore();
        return;
      }

      const futureTime = (lastTime +
        timeframeSeconds * ZONE_LOOKAHEAD_BARS) as UTCTimestamp;
      const priceScale = chart.priceScale("right");
      const priceToCoordinate =
        priceScale && "priceToCoordinate" in priceScale
          ? (
              priceScale as unknown as {
                priceToCoordinate: (price: number) => number | null;
              }
            ).priceToCoordinate.bind(priceScale)
          : candleSeries.priceToCoordinate.bind(candleSeries);

      const safeStartTime = lastTime as Time;
      const safeFutureTime = futureTime as Time;

      const startX = timeScale.timeToCoordinate(safeStartTime);
      const endX = timeScale.timeToCoordinate(safeFutureTime);
      if (startX === null || endX === null) {
        ctx.restore();
        return;
      }

      const left = Math.min(startX, endX);
      const right = Math.max(startX, endX);

      zones.forEach((zone) => {
        const topCoord = priceToCoordinate(zone.top);
        const bottomCoord = priceToCoordinate(zone.bottom);
        if (topCoord === null || bottomCoord === null) {
          return;
        }
        const zoneTop = Math.min(topCoord, bottomCoord);
        const zoneHeight = Math.abs(bottomCoord - topCoord);
        ctx.fillStyle = zone.color;
        ctx.fillRect(left, zoneTop, right - left, zoneHeight);
        ctx.strokeStyle = zone.border;
        ctx.lineWidth = 1;
        ctx.strokeRect(left, zoneTop, right - left, zoneHeight);

        const labelPadding = 4;
        const labelHeight = 16;
        ctx.font = "10px 'Inter', sans-serif";
        const textWidth = ctx.measureText(zone.label).width;
        const labelWidth = textWidth + labelPadding * 2;
        const labelX = right - labelWidth - 6;
        const labelY = zoneTop + labelPadding;
        ctx.fillStyle = "rgba(15,23,42,0.92)";
        ctx.fillRect(labelX, labelY - labelPadding, labelWidth, labelHeight);
        ctx.strokeStyle = zone.border;
        ctx.strokeRect(labelX, labelY - labelPadding, labelWidth, labelHeight);
        ctx.fillStyle = "#e2e8f0";
        ctx.fillText(zone.label, labelX + labelPadding, labelY + 2);
      });

      ctx.restore();
    };

    const indicatorData = buildIndicatorData(limitedCandles, INDICATOR_CONFIG);
    updateIndicatorSeries(
      indicatorSeriesRef.current,
      indicatorData,
      indicatorVisibility,
      INDICATOR_CONFIG
    );

    updateOverlayPriceLines(candleSeries, overlayLevels, overlayPriceLinesRef);

    chart.timeScale().applyOptions({ rightOffset: ZONE_LOOKAHEAD_BARS + 2 });

    renderOverlay();

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => renderOverlay())
        : null;
    if (chartRoot && resizeObserver) {
      resizeObserver.observe(chartRoot);
    }

    const rangeHandler = () => {
      renderOverlay();
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(rangeHandler);
    const priceScale = chart.priceScale("right");
    const priceScaleHandler = () => renderOverlay();
    if (priceScale && "subscribePriceScaleChange" in priceScale) {
      (
        priceScale as unknown as {
          subscribePriceScaleChange: (handler: () => void) => void;
        }
      ).subscribePriceScaleChange(priceScaleHandler);
    }

    if (previousRange) {
      chart.timeScale().setVisibleLogicalRange(previousRange);
    } else {
      chart.timeScale().fitContent();
    }
    renderOverlay();
    setSnapshotReady(true);

    return () => {
      chart.remove();
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(rangeHandler);
      if (priceScale && "unsubscribePriceScaleChange" in priceScale) {
        (
          priceScale as unknown as {
            unsubscribePriceScaleChange: (handler: () => void) => void;
          }
        ).unsubscribePriceScaleChange(priceScaleHandler);
      }
      chartRef.current = null;
      seriesRef.current = null;
      indicatorSeriesRef.current = {};
      overlayPriceLinesRef.current = [];
      if (chartRoot && resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [
    analysisCandles,
    indicatorVisibility,
    overlayLevels,
    response,
    entryZoneValues,
    paddedTargets,
    tradeStopLoss,
    timeframe,
    formatPrice,
    analysisMarkers,
  ]);

  if (!response) {
    return null;
  }

  const actionLabel = response.decision.action?.toUpperCase() ?? "HOLD";
  const actionKey = actionLabel.toLowerCase();
  const isHoldSignal = actionKey === "hold";

  const showSavePanel = canSaveReport && !isHoldSignal;
  const isSaved = canSaveReport && saveStatus === "success";
  const disableSaveButton =
    !canSaveReport || isSessionSyncing || isSavingReport || isSaved;
  const showSaveSuccess = canSaveReport && saveStatus === "success";
  const showSaveError =
    canSaveReport && saveStatus === "error" && Boolean(saveError);
  const sessionHint = !canSaveReport
    ? saveCopy.loginPrompt
    : isSessionSyncing
    ? saveCopy.syncing
    : saveCopy.hint;
  const executionWindowLabel = formatExecutionWindowLabel(tradeExecutionWindow);

  return (
    <MotionSection
      ref={(node) => {
        if (sectionRef && "current" in sectionRef) {
          (sectionRef as MutableRefObject<HTMLElement | null>).current = node;
        }
      }}
      id="insights"
      className="rounded-3xl border border-[var(--swimm-neutral-300)] bg-white p-8"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-[var(--swimm-navy-900)]">
            {__("analysis.heading", {
              pair: formattedPair,
              timeframe: timeframe.toUpperCase(),
            })}
          </h3>
          <p className="text-sm text-[var(--swimm-neutral-500)]">
            {__("analysis.confidence", {
              value: Math.round((response.decision.confidence ?? 0) * 100),
              action: actionLabel,
            })}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--swimm-neutral-200)] bg-[var(--swimm-neutral-50)] px-4 py-3 text-xs text-[var(--swimm-neutral-600)]">
        <span className="font-semibold text-[var(--swimm-navy-900)]">
          {analysisCopy.disclaimer.title}
        </span>
        <span className="ml-2 block text-[var(--swimm-neutral-500)] md:inline">
          {analysisCopy.disclaimer.body}
        </span>
      </div>

      <div className="mt-8 space-y-6">
        <div className="rounded-3xl border border-[var(--swimm-neutral-300)] bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--swimm-neutral-300)]">
              {analysisCopy.snapshot.title}
            </div>
            <div className="text-[11px] uppercase tracking-wide text-[var(--swimm-neutral-300)]">
              Timeframe {timeframe.toUpperCase()}
            </div>
          </div>
          <p className="mt-3 text-xs text-[var(--swimm-neutral-500)]">
            {analysisCopy.snapshot.description}
          </p>
          <div className="relative mt-4 h-64 w-full overflow-hidden rounded-2xl border border-[var(--swimm-neutral-300)] bg-white">
            <div ref={chartContainerRef} className="h-full w-full" />
            <canvas
              ref={overlayCanvasRef}
              className="pointer-events-none absolute inset-0"
            />
            {!snapshotReady && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--swimm-neutral-300)]">
                {analysisCopy.snapshot.placeholder}
              </div>
            )}
          </div>
          {analysisCandleDetails ? (
            <div className="mt-4 grid gap-3 rounded-2xl border border-[var(--swimm-neutral-200)] bg-[var(--swimm-neutral-50)] px-4 py-3 text-xs text-[var(--swimm-neutral-600)] sm:grid-cols-6">
              <div className="sm:col-span-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--swimm-neutral-400)]">
                  {analysisCopy.snapshot.ohlcCapturedAt}
                </div>
                <div className="mt-1 font-semibold text-[var(--swimm-navy-900)]">
                  {ohlcTimeFormatterRef.current?.format(
                    new Date(analysisCandleDetails.time * 1000)
                  )}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--swimm-neutral-400)]">
                  {analysisCopy.snapshot.ohlcOpen}
                </div>
                <div className="mt-1 font-semibold">
                  {formatPrice(analysisCandleDetails.open)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--swimm-neutral-400)]">
                  {analysisCopy.snapshot.ohlcHigh}
                </div>
                <div className="mt-1 font-semibold">
                  {formatPrice(analysisCandleDetails.high)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--swimm-neutral-400)]">
                  {analysisCopy.snapshot.ohlcLow}
                </div>
                <div className="mt-1 font-semibold">
                  {formatPrice(analysisCandleDetails.low)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--swimm-neutral-400)]">
                  {analysisCopy.snapshot.ohlcClose}
                </div>
                <div className="mt-1 font-semibold">
                  {formatPrice(analysisCandleDetails.close)}
                </div>
              </div>
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[var(--swimm-neutral-300)]">
            <span className="rounded-full border border-[var(--swimm-primary-500)]/40 px-2 py-1 text-[var(--swimm-primary-700)]">
              {analysisCopy.snapshot.legendEntry}
            </span>
            <span className="rounded-full border border-[var(--swimm-up)]/30 px-2 py-1 text-[var(--swimm-up)]">
              {analysisCopy.snapshot.legendTarget}
            </span>
            <span className="rounded-full border border-[var(--swimm-down)]/30 px-2 py-1 text-[var(--swimm-down)]">
              {analysisCopy.snapshot.legendStop}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-stretch">
        <div className="flex h-full flex-col gap-4 rounded-3xl border border-[var(--swimm-neutral-300)] bg-white p-6">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--swimm-neutral-300)]">
                {analysisCopy.summaryTitle}
              </div>
              <span
                className={[
                  "rounded-full border px-3 py-1 text-xs font-semibold uppercase",
                  actionLabel === "BUY"
                    ? "border-[var(--swimm-up)]/40 bg-[var(--swimm-up)]/10 text-[var(--swimm-up)]"
                    : actionLabel === "SELL"
                    ? "border-[var(--swimm-down)]/40 bg-[var(--swimm-down)]/10 text-[var(--swimm-down)]"
                    : "border-[var(--swimm-warn)]/40 bg-[var(--swimm-warn)]/10 text-[var(--swimm-warn)]",
                ].join(" ")}
              >
                {actionLabel}
              </span>
            </div>
            <p className="mt-4 text-sm text-[var(--swimm-neutral-500)]">
              {summaryText}
            </p>
            <p className="mt-4 rounded-2xl border border-[var(--swimm-neutral-300)] bg-white px-4 py-3 text-xs text-[var(--swimm-neutral-500)]">
              {rationaleText}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-[var(--swimm-neutral-300)] bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--swimm-neutral-300)]">
                {analysisCopy.chartInsight.title}
              </div>
              <p className="mt-3 text-xs text-[var(--swimm-neutral-500)]">
                {chartNarrativeText}
              </p>
              <p className="mt-2 text-xs text-[var(--swimm-neutral-500)]">
                {analysisCopy.chartInsight.forecast} {chartForecastText}
              </p>
              <div className="mt-4 grid gap-2 text-[11px] text-[var(--swimm-neutral-500)] sm:grid-cols-2">
                <div>
                  {analysisCopy.chartInsight.rangeStart}: {chartStartLabel}
                </div>
                <div>
                  {analysisCopy.chartInsight.rangeEnd}: {chartEndLabel}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--swimm-neutral-300)] bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--swimm-neutral-500)]">
                {analysisCopy.technical.title}
              </div>
              <ul className="mt-3 space-y-2 text-xs text-[var(--swimm-neutral-500)]">
                {(technicalLines.length
                  ? technicalLines
                  : [analysisCopy.technical.empty]
                ).map((item) => (
                  <li
                    key={item}
                    className="rounded-xl border border-[var(--swimm-neutral-300)] bg-white px-3 py-2"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-[var(--swimm-neutral-300)] bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--swimm-neutral-500)]">
                {analysisCopy.fundamental.title}
              </div>
              <ul className="mt-3 space-y-2 text-xs text-[var(--swimm-neutral-500)]">
                {(fundamentalLines.length
                  ? fundamentalLines
                  : [analysisCopy.fundamental.empty]
                ).map((item, index) => (
                  <li
                    key={String(item) + "-" + String(index)}
                    className="rounded-xl border border-[var(--swimm-neutral-300)] bg-white px-3 py-2"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-[var(--swimm-neutral-300)] bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--swimm-neutral-500)]">
                {analysisCopy.highlights.title}
              </div>
              <ul className="mt-3 space-y-2 text-xs text-[var(--swimm-neutral-500)]">
                {(supportiveHighlights.length
                  ? supportiveHighlights
                  : analysisCopy.highlights.empty
                  ? [analysisCopy.highlights.empty]
                  : []
                ).map((item, index) => (
                  <li
                    key={String(item) + "-" + String(index)}
                    className="rounded-xl border border-[var(--swimm-neutral-300)] bg-white px-3 py-2"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex h-full flex-col rounded-3xl border border-[var(--swimm-neutral-300)] bg-white p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--swimm-neutral-300)]">
            {analysisCopy.tradePlan.title}
          </div>
          <div className="mt-4 grid flex-1 gap-4 text-xs text-[var(--swimm-neutral-500)]">
            <div>
              <div className="font-semibold text-[var(--swimm-navy-900)]">
                {analysisCopy.tradePlan.entryZone}
              </div>
              {entryZoneValues.length ? (
                <ul className="mt-2 space-y-1">
                  {entryZoneValues.map((entry, index) => (
                    <li
                      key={"entry-" + String(entry) + "-" + String(index)}
                      className="flex items-center justify-between rounded-lg border border-[var(--swimm-neutral-300)] bg-white px-3 py-2"
                    >
                      <span>
                        {entryZoneValues.length > 1
                          ? "ENTRY " + String(index + 1)
                          : "ENTRY"}
                      </span>
                      <span>{formatPrice(entry)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-[var(--swimm-neutral-300)]">
                  {analysisCopy.tradePlan.noEntry}
                </p>
              )}
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--swimm-neutral-500)]">
                {analysisCopy.tradePlan.targets}
              </div>
              <ul className="mt-2 space-y-1 text-xs text-[var(--swimm-neutral-500)]">
                {paddedTargets.map((target, index) => (
                  <li
                    key={"plan-target-" + String(index)}
                    className="flex items-center justify-between rounded-lg border border-[var(--swimm-neutral-300)] bg-white px-3 py-2"
                  >
                    <span>{TARGET_LABELS[index]}</span>
                    <span>{target !== null ? formatPrice(target) : "-"}</span>
                  </li>
                ))}
              </ul>
              {paddedTargets.every((target) => target === null) && (
                <p className="mt-2 text-xs text-[var(--swimm-neutral-300)]">
                  {analysisCopy.tradePlan.noTargets}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-[var(--swimm-neutral-500)]">
              <span>{analysisCopy.tradePlan.stopLoss}</span>
              <span className="text-[var(--swimm-navy-900)]">
                {formatPrice(tradeStopLoss)}
              </span>
            </div>
            <div className="grid gap-3 text-xs text-[var(--swimm-neutral-500)] sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--swimm-neutral-300)] bg-white px-3 py-3">
                <div className="font-semibold text-[var(--swimm-neutral-500)]">
                  {analysisCopy.tradePlan.executionWindow}
                </div>
                <div className="mt-1 text-[11px] text-[var(--swimm-neutral-500)]">
                  {executionWindowLabel}
                </div>
              </div>
              <div className="rounded-lg border border-[var(--swimm-neutral-300)] bg-white px-3 py-3">
                <div className="font-semibold text-[var(--swimm-neutral-500)]">
                  {analysisCopy.tradePlan.sizingNotes}
                </div>
                <div className="mt-1 text-[11px] text-[var(--swimm-neutral-500)]">
                  {sizingNotesText}
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--swimm-neutral-500)]">
                {analysisCopy.tradePlan.narrativeTitle}
              </div>
              <p className="mt-2 whitespace-pre-line text-xs text-[var(--swimm-neutral-500)]">
                {tradingNarrativeText}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--swimm-neutral-300)] bg-white p-6 lg:col-span-2 lg:self-start">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--swimm-neutral-300)]">
            {sizingCopy.title}
          </div>
          <div className="mt-4 grid gap-3 text-xs text-[var(--swimm-neutral-500)] md:grid-cols-3">
            <div className="space-y-2">
              <label className="block text-[11px] text-[var(--swimm-neutral-500)]">
                {sizingCopy.equityLabel}
              </label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={1}
                value={equity}
                onChange={(event) =>
                  setEquity(Math.max(0, Number(event.target.value)))
                }
                className="w-full rounded-lg border border-[var(--swimm-neutral-300)] bg-white px-3 py-2 text-[var(--swimm-navy-900)]"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[11px] text-[var(--swimm-neutral-500)]">
                {sizingCopy.riskPercentLabel}
              </label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={0.1}
                value={riskPct}
                onChange={(event) =>
                  setRiskPct(Math.max(0, Number(event.target.value)))
                }
                className="w-full rounded-lg border border-[var(--swimm-neutral-300)] bg-white px-3 py-2 text-[var(--swimm-navy-900)]"
              />
            </div>
            {isLeveragedMarket ? (
              <div className="space-y-2">
                <label className="block text-[11px] text-[var(--swimm-neutral-500)]">
                  {sizingCopy.leverageLabel}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={1}
                  max={125}
                  step={1}
                  value={clampedLeverage}
                  onChange={(event) => {
                    setLeverageTouched(true);
                    const parsed = Number(event.target.value);
                    if (Number.isFinite(parsed)) {
                      setLeverage(Math.min(Math.max(parsed, 1), 125));
                    }
                  }}
                  className="w-full rounded-lg border border-[var(--swimm-neutral-300)] bg-white px-3 py-2 text-[var(--swimm-navy-900)]"
                />
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="space-y-2 rounded-2xl border border-[var(--swimm-neutral-300)] bg-[var(--swimm-neutral-50)] p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--swimm-neutral-500)]">
                {isLeveragedMarket
                  ? sizingCopy.recommendedMargin
                  : sizingCopy.recommendedAllocation}
              </div>
              <div className="text-lg font-semibold text-[var(--swimm-navy-900)]">
                {recommendedExposure !== null
                  ? formatPrice(recommendedExposure)
                  : "-"}
              </div>
              <div className="grid gap-1 text-[11px] text-[var(--swimm-neutral-500)]">
                <div>
                  {sizingCopy.entryPriceLabel}: {formatPrice(effectiveEntry)}
                </div>
                <div>
                  {sizingCopy.stopPriceLabel}: {formatPrice(effectiveStop)}
                </div>
                <div>
                  {sizingCopy.positionSizeLabel}:{" "}
                  {recommendedQuantity !== null
                    ? `${formatQuantity(recommendedQuantity)} ${baseAssetSymbol}`
                    : "-"}
                </div>
                <div>
                  {sizingCopy.notionalLabel}:{" "}
                  {recommendedNotional !== null
                    ? formatPrice(recommendedNotional)
                    : "-"}
                </div>
                {isLeveragedMarket ? (
                  <div>
                    {sizingCopy.marginLabel}:{" "}
                    {recommendedMargin !== null
                      ? formatPrice(recommendedMargin)
                      : "-"}
                  </div>
                ) : null}
                <div>
                  {sizingCopy.riskAmountLabel}:{" "}
                  {formatSigned(recommendedStopPnl)}
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-[var(--swimm-neutral-300)] bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--swimm-neutral-500)]">
                {sizingCopy.manualPlanTitle}
              </div>
              <div className="space-y-2">
                <label className="block text-[11px] text-[var(--swimm-neutral-500)]">
                  {isLeveragedMarket
                    ? sizingCopy.manualMarginLabel
                    : sizingCopy.manualAllocationLabel}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.01}
                  value={manualBudget}
                  onChange={(event) => {
                    setManualBudgetTouched(true);
                    const value = event.target.value;
                    if (value === "") {
                      setManualBudget(0);
                      return;
                    }
                    const parsed = Number(value);
                    if (Number.isFinite(parsed)) {
                      setManualBudget(Math.max(0, parsed));
                    }
                  }}
                  className="w-full rounded-lg border border-[var(--swimm-neutral-300)] bg-white px-3 py-2 text-[var(--swimm-navy-900)]"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[11px] text-[var(--swimm-neutral-500)]">
                  {sizingCopy.manualEntryPriceLabel}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.01}
                  value={manualEntryPrice ?? ""}
                  onChange={(event) => {
                    setManualPriceTouched(true);
                    const value = event.target.value;
                    if (value === "") {
                      setManualEntryPrice(null);
                      return;
                    }
                    const parsed = Number(value);
                    if (Number.isFinite(parsed)) {
                      setManualEntryPrice(Math.max(0, parsed));
                    }
                  }}
                  className="w-full rounded-lg border border-[var(--swimm-neutral-300)] bg-white px-3 py-2 text-[var(--swimm-navy-900)]"
                />
              </div>
              <div className="grid gap-1 text-[11px] text-[var(--swimm-neutral-500)]">
                <div>
                  {sizingCopy.positionSizeLabel}:{" "}
                  {manualQuantity !== null
                    ? `${formatQuantity(manualQuantity)} ${baseAssetSymbol}`
                    : "-"}
                </div>
                {isLeveragedMarket ? (
                  <>
                    <div>
                      {sizingCopy.marginLabel}:{" "}
                      {manualBudgetNormalized !== null
                        ? formatPrice(manualBudgetNormalized)
                        : "-"}
                    </div>
                    <div>
                      {sizingCopy.notionalLabel}:{" "}
                      {manualNotionalDisplay !== null
                        ? formatPrice(manualNotionalDisplay)
                        : "-"}
                    </div>
                  </>
                ) : (
                  <div>
                    {sizingCopy.notionalLabel}:{" "}
                    {manualNotionalDisplay !== null
                      ? formatPrice(manualNotionalDisplay)
                      : "-"}
                  </div>
                )}
                <div>
                  {sizingCopy.riskAmountLabel}:{" "}
                  {formatSigned(manualStopPnl)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--swimm-neutral-300)] bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--swimm-neutral-500)]">
              {sizingCopy.pnlHeader}
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--swimm-neutral-200)] text-xs">
                <thead>
                  <tr className="text-[11px] uppercase tracking-[0.2em] text-[var(--swimm-neutral-400)]">
                    <th className="py-2 text-left">{sizingCopy.targetColumn}</th>
                    <th className="py-2 text-left">{sizingCopy.priceColumn}</th>
                    <th className="py-2 text-left">{sizingCopy.recommendedColumn}</th>
                    <th className="py-2 text-left">{sizingCopy.manualColumn}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--swimm-neutral-200)]">
                  {pnlRows.length ? (
                    pnlRows.map((row) => (
                      <tr
                        key={row.key}
                        className={row.isStop ? "bg-[var(--swimm-neutral-50)]" : ""}
                      >
                        <td className="py-2 font-semibold text-[var(--swimm-neutral-600)]">
                          {row.label}
                        </td>
                        <td className="py-2 text-[var(--swimm-neutral-500)]">
                          {formatPrice(row.price)}
                        </td>
                        <td
                          className={`py-2 ${
                            row.recommended === null
                              ? "text-[var(--swimm-neutral-400)]"
                              : row.recommended > 0
                              ? "text-[var(--swimm-up)]"
                              : row.recommended < 0
                              ? "text-[var(--swimm-down)]"
                              : "text-[var(--swimm-neutral-500)]"
                          }`}
                        >
                          {formatSigned(row.recommended)}
                        </td>
                        <td
                          className={`py-2 ${
                            row.manual === null
                              ? "text-[var(--swimm-neutral-400)]"
                              : row.manual > 0
                              ? "text-[var(--swimm-up)]"
                              : row.manual < 0
                              ? "text-[var(--swimm-down)]"
                              : "text-[var(--swimm-neutral-500)]"
                          }`}
                        >
                          {formatSigned(row.manual)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-4 text-center text-[var(--swimm-neutral-400)]"
                      >
                        {sizingCopy.pnlEmpty}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-3 text-[10px] text-[var(--swimm-neutral-400)]">
            {sizingCopy.note}
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--swimm-neutral-300)] bg-white p-6 lg:col-span-2 h-min">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--swimm-neutral-300)]">
            {analysisCopy.nextSteps.title}
          </div>
          <ul className="mt-4 space-y-3 text-sm text-[var(--swimm-neutral-500)]">
            {nextStepLines.map((step, index) => (
              <li
                key={String(step) + "-" + String(index)}
                className="flex items-start gap-3 rounded-xl border border-[var(--swimm-neutral-300)] bg-[var(--swimm-neutral-100)] px-4 py-3"
              >
                <span className="mt-1 h-2 w-2 rounded-full bg-[var(--swimm-primary-700)]" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        {showSavePanel ? (
        <div className="rounded-3xl border border-[var(--swimm-neutral-300)] bg-white p-6 lg:col-span-2 lg:self-start">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--swimm-neutral-300)]">
                  {saveCopy.title}
                </div>
                <p className="mt-3 text-sm text-[var(--swimm-neutral-500)]">
                  {saveCopy.description}
                </p>
              </div>
              {showSaveSuccess ? (
                <span className="rounded-full border border-[var(--swimm-up)]/40 bg-[var(--swimm-up)]/10 px-3 py-1 text-xs font-semibold text-[var(--swimm-up)]">
                  {saveCopy.successMessage}
                </span>
              ) : null}
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div
                className={[
                  "text-xs",
                  showSaveError
                    ? "text-[var(--swimm-down)]"
                    : "text-[var(--swimm-neutral-400)]",
                ].join(" ")}
              >
                {showSaveError
                  ? saveError
                    ? saveError
                    : saveCopy.genericError
                  : sessionHint}
              </div>
              <button
                type="button"
                onClick={onSaveReport}
                disabled={disableSaveButton}
                className="inline-flex items-center justify-center rounded-full border border-[var(--swimm-primary-700)] bg-[var(--swimm-primary-500)]/15 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--swimm-primary-700)] transition hover:bg-[var(--swimm-primary-500)]/25 disabled:cursor-not-allowed disabled:border-[var(--swimm-neutral-300)] disabled:bg-[var(--swimm-neutral-200)]/60 disabled:text-[var(--swimm-neutral-400)]"
              >
                {isSavingReport
                  ? saveCopy.savingButton
                  : isSaved
                  ? saveCopy.savedButton
                  : saveCopy.saveButton}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </MotionSection>
  );
}

export const buildChartRangeLabels = (
  points: AgentResponse["market"]["chart"]["points"],
  languageTag: string
) => {
  if (!points?.length) {
    return ["-", "-"] as const;
  }
  const formatter = new Intl.DateTimeFormat(languageTag, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const start = formatter.format(new Date(points[0].time));
  const end = formatter.format(new Date(points[points.length - 1].time));
  return [start, end] as const;
};

export const buildSupportiveHighlights = (response: AgentResponse | null) => {
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
};

export const buildOverlayLevels = (
  entryZoneValues: number[],
  paddedTargets: (number | null)[],
  tradeStopLoss: number | null
): OverlayLevel[] => {
  const levels: OverlayLevel[] = [];

  entryZoneValues.forEach((price, index) => {
    levels.push({
      price: Number(price.toFixed(2)),
      label:
        entryZoneValues.length > 1 ? "ENTRY " + String(index + 1) : "ENTRY",
      color: "#17dce0",
    });
  });

  paddedTargets.forEach((target, index) => {
    if (target !== null && Number.isFinite(target)) {
      levels.push({
        price: Number(target.toFixed(2)),
        label: "TP" + String(index + 1),
        color: "#16c784",
      });
    }
  });

  if (tradeStopLoss !== null && Number.isFinite(tradeStopLoss)) {
    levels.push({
      price: Number(tradeStopLoss.toFixed(2)),
      label: "STOP",
      color: "#ea3943",
    });
  }

  const unique = new Map<number, OverlayLevel>();
  for (const level of levels) {
    unique.set(level.price, level);
  }
  return Array.from(unique.values()).sort((a, b) => a.price - b.price);
};

export const buildEntryZones = (entries: number[]) => {
  if (!entries.length) {
    return [] as number[];
  }
  return [...entries].sort((a, b) => a - b);
};

export const buildTargets = (takeProfits: number[]) =>
  Array.from({ length: TARGET_LABELS.length }, (_, index) =>
    takeProfits[index] !== undefined ? takeProfits[index] : null
  );

export const buildFormattedPair = (
  rawPairSymbol: string,
  fallbackPair: string
) => formatPairLabel(rawPairSymbol ?? fallbackPair);

export const buildTradingNarrative = (
  tradeRationale: string,
  response: AgentResponse | null
) =>
  tradeRationale && tradeRationale.trim().length > 0
    ? tradeRationale
    : response?.decision?.rationale ?? response?.summary ?? "";

export const formatPriceLabel =
  (formatter: Intl.NumberFormat) => (value: number | null) =>
    typeof value === "number" && Number.isFinite(value)
      ? formatter.format(value) + " USDT"
      : "-";
