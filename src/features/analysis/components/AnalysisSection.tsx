"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  type CandlestickData,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
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
} from "@/features/market/constants";
import type {
  IndicatorKey,
  IndicatorSeriesMap,
  OverlayLevel,
} from "@/features/market/types";

const SNAPSHOT_LIMIT = 220;

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
};

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
}: AnalysisSectionProps) {
  const { messages, __ } = useLanguage();
  const analysisCopy = messages.analysis;
  const fallbackCopy = messages.analysisFallback;

  const summaryText = response?.summary?.trim().length
    ? response.summary
    : fallbackCopy.summary;
  const rationaleText = response?.decision?.rationale?.trim().length
    ? response.decision.rationale
    : fallbackCopy.rationale;
  const chartNarrativeText =
    response?.market?.chart?.narrative?.trim().length
      ? response.market.chart.narrative
      : "";
  const chartForecastText =
    response?.market?.chart?.forecast?.trim().length
      ? response.market.chart.forecast
      : "";
  const technicalLines = response?.market?.technical ?? [];
  const fundamentalLines = response?.market?.fundamental ?? [];
  const nextStepLines = response?.nextSteps ?? [];
  const sizingNotesText = tradeSizingNotes?.trim().length
    ? tradeSizingNotes
    : "-";
  const tradingNarrativeText = tradingNarrative?.trim().length
    ? tradingNarrative
    : analysisCopy.tradePlan.narrativeFallback;

  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const indicatorSeriesRef = useRef<IndicatorSeriesMap>({});
  const overlayPriceLinesRef = useRef<IPriceLine[]>([]);
  const [snapshotReady, setSnapshotReady] = useState(false);

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

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
      indicatorSeriesRef.current = {};
      overlayPriceLinesRef.current = [];
    }

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
        vertLine: { visible: false },
        horzLine: { visible: false },
      },
      rightPriceScale: {
        borderColor: "#1e293b",
      },
      timeScale: {
        borderColor: "#1e293b",
        secondsVisible: false,
      },
      autoSize: true,
      handleScroll: false,
      handleScale: false,
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

    const indicatorData = buildIndicatorData(limitedCandles, INDICATOR_CONFIG);
    updateIndicatorSeries(
      indicatorSeriesRef.current,
      indicatorData,
      indicatorVisibility,
      INDICATOR_CONFIG
    );

    updateOverlayPriceLines(
      candleSeries,
      overlayLevels,
      overlayPriceLinesRef
    );

    chart.timeScale().fitContent();
    setSnapshotReady(true);

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      indicatorSeriesRef.current = {};
      overlayPriceLinesRef.current = [];
    };
  }, [analysisCandles, indicatorVisibility, overlayLevels, response]);

  if (!response) {
    return null;
  }

  const actionLabel = response.decision.action?.toUpperCase() ?? "HOLD";
  const confidenceValue = Math.round((response.decision.confidence ?? 0) * 100);
  const technicalList =
    technicalLines.length > 0 ? technicalLines : [analysisCopy.technical.empty];
  const fundamentalList =
    fundamentalLines.length > 0
      ? fundamentalLines
      : [analysisCopy.fundamental.empty];
  const supportiveList = supportiveHighlights;
  const nextStepsList = nextStepLines;

  return (
    <section
      id="insights"
      className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-100">
            {__("analysis.heading", {
              pair: formattedPair,
              timeframe: timeframe.toUpperCase(),
            })}
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            {__("analysis.confidence", {
              value: confidenceValue,
              action: actionLabel,
            })}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              {analysisCopy.summaryTitle}
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${
                actionLabel === "BUY"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : actionLabel === "SELL"
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-200"
              }`}
            >
              {actionLabel}
            </span>
          </div>
          <p className="mt-4 text-sm text-slate-300">{summaryText}</p>
          <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-xs text-slate-400">
            {rationaleText}
          </p>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                {analysisCopy.snapshot.title}
              </div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">
                Timeframe {timeframe.toUpperCase()}
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              {analysisCopy.snapshot.description}
            </p>
            <div className="relative mt-4 h-64 w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950/70">
              <div
                ref={chartContainerRef}
                className="pointer-events-none h-full w-full"
              />
              {!snapshotReady && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
                  {analysisCopy.snapshot.placeholder}
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
              <span className="rounded-full border border-sky-500/30 px-2 py-1 text-sky-200">
                {analysisCopy.snapshot.legendEntry}
              </span>
              <span className="rounded-full border border-emerald-500/30 px-2 py-1 text-emerald-200">
                {analysisCopy.snapshot.legendTarget}
              </span>
              <span className="rounded-full border border-rose-500/30 px-2 py-1 text-rose-200">
                {analysisCopy.snapshot.legendStop}
              </span>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              {analysisCopy.chartInsight.title}
            </div>
            <p className="mt-3 text-xs text-slate-300">{chartNarrativeText}</p>
            <p className="mt-2 text-xs text-slate-400">
              {analysisCopy.chartInsight.forecast} {chartForecastText}
            </p>
            <div className="mt-4 grid gap-2 text-[11px] text-slate-400 sm:grid-cols-2">
              <div>
                {analysisCopy.chartInsight.rangeStart}: {chartStartLabel}
              </div>
              <div>
                {analysisCopy.chartInsight.rangeEnd}: {chartEndLabel}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {analysisCopy.technical.title}
              </div>
              <ul className="mt-3 space-y-2 text-xs text-slate-300">
                {technicalList.map((item) => (
                  <li
                    key={item}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {analysisCopy.fundamental.title}
              </div>
              <ul className="mt-3 space-y-2 text-xs text-slate-300">
                {fundamentalList.map((item) => (
                  <li
                    key={item}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {supportiveList.length > 0 && (
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {analysisCopy.highlights.title}
              </div>
              <ul className="mt-3 space-y-2 text-xs text-slate-300">
                {supportiveList.map((highlight) => (
                  <li
                    key={highlight}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2"
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
              {analysisCopy.tradePlan.title}
            </div>
            <div className="mt-4 grid gap-4 text-xs text-slate-300">
              <div>
                <div className="font-semibold text-slate-200">
                  {analysisCopy.tradePlan.entryZone}
                </div>
                {entryZoneValues.length ? (
                  <ul className="mt-2 space-y-1">
                    {entryZoneValues.map((entry, index) => (
                      <li
                        key={`entry-${entry}-${index}`}
                        className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2"
                      >
                        <span>
                          {entryZoneValues.length > 1
                            ? `ENTRY ${index + 1}`
                            : "ENTRY"}
                        </span>
                        <span>{formatPrice(entry)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">
                    {analysisCopy.tradePlan.noEntry}
                  </p>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {analysisCopy.tradePlan.targets}
                </div>
                <ul className="mt-2 space-y-1 text-xs text-slate-300">
                  {paddedTargets.map((target, index) => (
                    <li
                      key={`plan-target-${index}`}
                      className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2"
                    >
                      <span>{TARGET_LABELS[index]}</span>
                      <span>{target !== null ? formatPrice(target) : "-"}</span>
                    </li>
                  ))}
                </ul>
                {paddedTargets.every((target) => target === null) && (
                  <p className="mt-2 text-xs text-slate-500">
                    {analysisCopy.tradePlan.noTargets}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{analysisCopy.tradePlan.stopLoss}</span>
                <span className="text-slate-200">{formatPrice(tradeStopLoss)}</span>
              </div>
              <div className="grid gap-3 text-xs text-slate-400 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-3">
                  <div className="font-semibold text-slate-300">
                    {analysisCopy.tradePlan.executionWindow}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {tradeExecutionWindow}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-3">
                  <div className="font-semibold text-slate-300">
                    {analysisCopy.tradePlan.sizingNotes}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {sizingNotesText}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {analysisCopy.tradePlan.narrativeTitle}
                </div>
                <p className="mt-2 whitespace-pre-line text-xs text-slate-300">
                  {tradingNarrativeText}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              {analysisCopy.nextSteps.title}
            </div>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              {nextStepsList.map((step) => (
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
              {analysisCopy.integration.title}
            </div>
            <p className="mt-3">{analysisCopy.integration.body1}</p>
            <p className="mt-2">{analysisCopy.integration.body2}</p>
          </div>
        </div>
      </div>
    </section>
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
      label: entryZoneValues.length > 1 ? `ENTRY ${index + 1}` : "ENTRY",
      color: "#38bdf8",
    });
  });

  paddedTargets.forEach((target, index) => {
    if (target !== null && Number.isFinite(target)) {
      levels.push({
        price: Number(target.toFixed(2)),
        label: `TP${index + 1}`,
        color: "#22c55e",
      });
    }
  });

  if (tradeStopLoss !== null && Number.isFinite(tradeStopLoss)) {
    levels.push({
      price: Number(tradeStopLoss.toFixed(2)),
      label: "STOP",
      color: "#ef4444",
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

export const formatPriceLabel = (formatter: Intl.NumberFormat) =>
  (value: number | null) =>
    typeof value === "number" && Number.isFinite(value)
      ? `${formatter.format(value)} USDT`
      : "-";
