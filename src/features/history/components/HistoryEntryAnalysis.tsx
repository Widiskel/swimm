"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CandlestickData } from "lightweight-charts";

import {
  AnalysisSection,
  buildChartRangeLabels,
  buildEntryZones,
  buildOverlayLevels,
  buildSupportiveHighlights,
  buildTargets,
  buildTradingNarrative,
  formatPriceLabel,
  buildFormattedPair,
} from "@/features/analysis/components/AnalysisSection";
import { INDICATOR_CONFIG } from "@/features/market/constants";
import type { IndicatorKey } from "@/features/market/types";
import type { HistoryEntry } from "@/providers/history-provider";

const buildInitialIndicatorVisibility = () => {
  const initial: Record<IndicatorKey, boolean> = {} as Record<IndicatorKey, boolean>;
  for (const item of INDICATOR_CONFIG) {
    initial[item.key] = item.defaultVisible;
  }
  return initial;
};

const mapTimeframeToInterval = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  const allowed = new Set(["1m", "5m", "15m", "1h", "4h", "1d"]);
  if (allowed.has(normalized)) {
    return normalized;
  }
  if (allowed.has(normalized.replace(/[^0-9a-z]/g, ""))) {
    return normalized.replace(/[^0-9a-z]/g, "");
  }
  if (normalized === "1h") {
    return "1h";
  }
  if (normalized === "1d" || normalized === "1day") {
    return "1d";
  }
  return "1h";
};

type HistoryEntryAnalysisProps = {
  entry: HistoryEntry;
  languageTag: string;
};

export function HistoryEntryAnalysis({ entry, languageTag }: HistoryEntryAnalysisProps) {
  const indicatorVisibility = useMemo(() => buildInitialIndicatorVisibility(), []);
  const [analysisCandles, setAnalysisCandles] = useState<CandlestickData[]>([]);
  const [chartStart, setChartStart] = useState("-");
  const [chartEnd, setChartEnd] = useState("-");
  const [isFetching, setIsFetching] = useState(false);

  const sectionRef = useRef<HTMLElement | null>(null);

  const timeframe = (entry.decision?.timeframe ?? entry.timeframe ?? "1h").toLowerCase();
  const interval = mapTimeframeToInterval(timeframe);
  const symbol = entry.pair ?? entry.response.market?.pair ?? "BTCUSDT";

  useEffect(() => {
    let cancelled = false;
    const loadCandles = async () => {
      setIsFetching(true);
      try {
        const params = new URLSearchParams();
        params.set("symbol", symbol);
        params.set("interval", interval);
        params.set("limit", "300");
        const response = await fetch(`/api/market?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`Market request failed with ${response.status}`);
        }
        const payload = (await response.json()) as {
          candles?: {
            openTime: number;
            open: number;
            high: number;
            low: number;
            close: number;
            volume: number;
          }[];
        };
        if (cancelled) {
          return;
        }
        const candles: CandlestickData[] = (payload.candles ?? []).map((item) => ({
          time: (item.openTime / 1000) as CandlestickData["time"],
          open: Number(item.open.toFixed(2)),
          high: Number(item.high.toFixed(2)),
          low: Number(item.low.toFixed(2)),
          close: Number(item.close.toFixed(2)),
        }));
        setAnalysisCandles(candles.slice(-220));
        if (candles.length) {
          const [startLabel, endLabel] = buildChartRangeLabels(
            candles.map((item) => ({
              time: new Date((item.time as number) * 1000).toISOString(),
              close: item.close,
            })),
            languageTag
          );
          setChartStart(startLabel);
          setChartEnd(endLabel);
        } else {
          setChartStart("-");
          setChartEnd("-");
        }
      } catch (error) {
        console.error("Failed to load market data for history entry", error);
      } finally {
        if (!cancelled) {
          setIsFetching(false);
        }
      }
    };

    void loadCandles();
    return () => {
      cancelled = true;
    };
  }, [symbol, interval, languageTag]);

  const priceFormatter = useMemo(
    () =>
      new Intl.NumberFormat(languageTag, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [languageTag]
  );

  const formatPrice = useMemo(() => formatPriceLabel(priceFormatter), [priceFormatter]);
  const entryZoneValues = useMemo(() => buildEntryZones(entry.response.tradePlan.entries ?? []), [entry]);
  const paddedTargets = useMemo(
    () => buildTargets(entry.response.tradePlan.takeProfits ?? []),
    [entry]
  );
  const overlayLevels = useMemo(
    () =>
      buildOverlayLevels(
        entryZoneValues,
        paddedTargets,
        entry.response.tradePlan.stopLoss ?? null
      ),
    [entryZoneValues, paddedTargets, entry]
  );
  const supportiveHighlights = useMemo(() => buildSupportiveHighlights(entry.response), [entry]);
  const tradingNarrative = useMemo(
    () => buildTradingNarrative(entry.response.tradePlan.rationale ?? "", entry.response),
    [entry]
  );
  const formattedPair = useMemo(
    () => buildFormattedPair(entry.response.market?.pair ?? entry.pair, entry.pair),
    [entry]
  );

  return (
    <AnalysisSection
      response={entry.response}
      timeframe={timeframe}
      indicatorVisibility={indicatorVisibility}
      analysisCandles={analysisCandles}
      overlayLevels={overlayLevels}
      supportiveHighlights={supportiveHighlights}
      paddedTargets={paddedTargets}
      entryZoneValues={entryZoneValues}
      tradeStopLoss={entry.response.tradePlan.stopLoss ?? null}
      tradeExecutionWindow={entry.response.tradePlan.executionWindow ?? "-"}
      tradeSizingNotes={entry.response.tradePlan.sizingNotes ?? "-"}
      tradingNarrative={tradingNarrative}
      formatPrice={formatPrice}
      formattedPair={formattedPair}
      chartStartLabel={chartStart}
      chartEndLabel={chartEnd}
      canSaveReport={false}
      isSessionSyncing={isFetching}
      saveVerdict={entry.verdict}
      onVerdictChange={() => {}}
      saveFeedback={entry.feedback ?? ""}
      onFeedbackChange={() => {}}
      onSaveReport={() => {}}
      isSavingReport={false}
      saveStatus="idle"
      saveError={null}
      sectionRef={sectionRef}
    />
  );
}