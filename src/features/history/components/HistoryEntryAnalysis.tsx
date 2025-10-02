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

  const originalTimeframe = (entry.decision?.timeframe ?? entry.timeframe ?? "1h").toLowerCase();
  const [viewTimeframe, setViewTimeframe] = useState<string>(originalTimeframe);
  const timeframe = viewTimeframe;
  const interval = mapTimeframeToInterval(timeframe);
  const symbol = entry.pair ?? entry.response.market?.pair ?? "BTCUSDT";

  useEffect(() => {
    let cancelled = false;

    const resample = (source: CandlestickData[], from: string, to: string) => {
      const unit = (s: string) => ({ "1m":1, "5m":5, "15m":15, "1h":60, "4h":240, "1d":1440 }[s] ?? 60);
      const fm = unit(from); const tm = unit(to);
      if (fm === tm) return source;
      if (tm % fm !== 0 || tm < fm) return source;
      const factor = tm / fm;
      const out: CandlestickData[] = [];
      const arr = [...source].sort((a,b) => (a.time as number) - (b.time as number));
      for (let i=0;i<arr.length;i+=factor){
        const chunk = arr.slice(i, i+factor); if (chunk.length === 0) continue;
        const open = chunk[0].open; const close = chunk[chunk.length-1].close;
        const high = Math.max(...chunk.map(c=>c.high));
        const low = Math.min(...chunk.map(c=>c.low));
        out.push({ time: chunk[0].time, open, high, low, close });
      }
      return out;
    };

    const load = async () => {
      setIsFetching(true);
      try {
        if (entry.snapshot && entry.snapshot.candles && entry.snapshot.candles.length) {
          const base = entry.snapshot.timeframe?.toLowerCase?.() || originalTimeframe;
          const candles: CandlestickData[] = entry.snapshot.candles.map(k => ({
            time: (k.openTime/1000) as CandlestickData["time"],
            open: Number(k.open.toFixed(2)),
            high: Number(k.high.toFixed(2)),
            low: Number(k.low.toFixed(2)),
            close: Number(k.close.toFixed(2)),
          }));
          const reshaped = resample(candles, base, timeframe).slice(-220);
          if (!cancelled) {
            setAnalysisCandles(reshaped);
            const [startLabel, endLabel] = buildChartRangeLabels(reshaped.map(item => ({ time: new Date((item.time as number)*1000).toISOString(), close: item.close })), languageTag);
            setChartStart(startLabel); setChartEnd(endLabel);
          }
          return;
        }
        const params = new URLSearchParams();
        params.set("symbol", symbol); params.set("interval", interval); params.set("limit","300");
        const response = await fetch(`/api/market?${params.toString()}`);
        if (!response.ok) throw new Error(`Market request failed with ${response.status}`);
        const payload = (await response.json()) as { candles?: { openTime:number; open:number; high:number; low:number; close:number; volume:number; }[]; };
        const candles: CandlestickData[] = (payload.candles ?? []).map((item) => ({
          time: (item.openTime / 1000) as CandlestickData["time"],
          open: Number(item.open.toFixed(2)),
          high: Number(item.high.toFixed(2)),
          low: Number(item.low.toFixed(2)),
          close: Number(item.close.toFixed(2)),
        }));
        if (!cancelled) {
          setAnalysisCandles(candles.slice(-220));
          if (candles.length) {
            const [startLabel, endLabel] = buildChartRangeLabels(candles.map((item) => ({ time: new Date((item.time as number) * 1000).toISOString(), close: item.close })), languageTag);
            setChartStart(startLabel); setChartEnd(endLabel);
          } else { setChartStart("-"); setChartEnd("-"); }
        }
      } finally { if (!cancelled) setIsFetching(false); }
    };

    void load();
    return () => { cancelled = true; };
  }, [entry, symbol, interval, timeframe, languageTag, originalTimeframe]);

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