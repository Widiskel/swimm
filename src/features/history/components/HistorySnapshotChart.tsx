"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
} from "lightweight-charts";

import { TIMEFRAME_OPTIONS } from "@/features/market/constants";
import { useLanguage } from "@/providers/language-provider";

const timeframeToMinutes = (value: string) => {
  const map: Record<string, number> = {
    "1m": 1,
    "5m": 5,
    "15m": 15,
    "1h": 60,
    "4h": 240,
    "1d": 1440,
  };
  return map[value] ?? 60;
};

const sanitizeCandles = (candles: CandlestickData[]) => {
  const map = new Map<number, CandlestickData>();
  for (const item of candles) {
    const time = (item.time as number) ?? 0;
    if (!Number.isFinite(time)) continue;
    map.set(time, item);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, value]) => value);
};

const resampleCandles = (
  source: CandlestickData[],
  from: string,
  to: string
) => {
  const fromMinutes = timeframeToMinutes(from);
  const toMinutes = timeframeToMinutes(to);
  if (fromMinutes === toMinutes) {
    return source;
  }
  if (toMinutes <= fromMinutes || toMinutes % fromMinutes !== 0) {
    return source;
  }
  const factor = toMinutes / fromMinutes;
  const sorted = [...source].sort(
    (a, b) => (a.time as number) - (b.time as number)
  );
  const output: CandlestickData[] = [];
  for (let i = 0; i < sorted.length; i += factor) {
    const chunk = sorted.slice(i, i + factor);
    if (!chunk.length) continue;
    const open = chunk[0].open;
    const close = chunk[chunk.length - 1].close;
    const high = Math.max(...chunk.map((item) => item.high));
    const low = Math.min(...chunk.map((item) => item.low));
    output.push({
      time: chunk[0].time,
      open,
      high,
      low,
      close,
    });
  }
  return output;
};

export type HistorySnapshotChartProps = {
  title: string;
  candles: CandlestickData[];
  baseTimeframe: string;
  capturedLabel?: string | null;
  defaultTimeframe?: string;
  entryLevels?: number[];
  targetLevels?: number[];
  stopLevel?: number | null;
  entryCandles?: CandlestickData[];
  targetCandles?: CandlestickData[];
  stopCandles?: CandlestickData[];
  result?: {
    type: "entry" | "target" | "stop";
    index?: number;
  } | null;
};

export function HistorySnapshotChart({
  title,
  candles,
  baseTimeframe,
  capturedLabel,
  defaultTimeframe = baseTimeframe,
  entryLevels = [],
  targetLevels = [],
  stopLevel = null,
  result,
}: HistorySnapshotChartProps) {
  const { messages } = useLanguage();
  const shareCopy = messages.history.shareView;
  const [activeTimeframe, setActiveTimeframe] = useState(() =>
    defaultTimeframe?.toLowerCase?.() ?? "1h"
  );

  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartApiRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);

  const sanitizedCandles = useMemo(
    () => sanitizeCandles(candles ?? []),
    [candles]
  );

  const displayCandles = useMemo(() => {
    const base = baseTimeframe?.toLowerCase?.() ?? "1h";
    const target = activeTimeframe?.toLowerCase?.() ?? base;
    const resampled = resampleCandles(sanitizedCandles, base, target);
    return sanitizeCandles(resampled);
  }, [sanitizedCandles, baseTimeframe, activeTimeframe]);

  const badgeCopy = shareCopy.snapshotBadges;
  const resultLabel = useMemo(() => {
    if (!result) {
      return null;
    }
    if (result.type === "entry") {
      return badgeCopy.resultEntry;
    }
    if (result.type === "stop") {
      return badgeCopy.resultStop;
    }
    if (result.type === "target") {
      const index = (result.index ?? 0) + 1;
      return badgeCopy.resultTarget.replace("{number}", String(index));
    }
    return null;
  }, [result, badgeCopy]);

  const resultClassName = useMemo(() => {
    if (!result) {
      return "rounded-full border px-2 py-1 text-[var(--swimm-neutral-400)]";
    }
    if (result.type === "stop") {
      return "rounded-full border border-[var(--swimm-down)]/30 px-2 py-1 text-[var(--swimm-down)]";
    }
    if (result.type === "target") {
      return "rounded-full border border-[var(--swimm-up)]/30 px-2 py-1 text-[var(--swimm-up)]";
    }
    return "rounded-full border border-[var(--swimm-primary-500)]/40 px-2 py-1 text-[var(--swimm-primary-700)]";
  }, [result]);

  useEffect(() => {
    if (!chartContainerRef.current) {
      return undefined;
    }
    const { clientWidth, clientHeight } = chartContainerRef.current;
    const chart = createChart(chartContainerRef.current, {
      width: clientWidth,
      height: clientHeight || 320,
      layout: {
        background: { color: "#ffffff" },
        textColor: "#0d223b",
      },
      grid: {
        vertLines: { color: "#e2e8f0" },
        horzLines: { color: "#e2e8f0" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderVisible: false,
      },
      crosshair: {
        vertLine: { color: "#6366f1", width: 1, style: 1 },
        horzLine: { color: "#6366f1", width: 1, style: 1 },
      },
    });
    const series = chart.addCandlestickSeries({
      upColor: "#16c784",
      borderUpColor: "#16c784",
      wickUpColor: "#16c784",
      downColor: "#ea3943",
      borderDownColor: "#ea3943",
      wickDownColor: "#ea3943",
    });

    chartApiRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (!chartContainerRef.current || !chartApiRef.current) {
        return;
      }
      const { clientWidth: width, clientHeight: height } =
        chartContainerRef.current;
      chartApiRef.current.applyOptions({ width, height: height || 320 });
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartApiRef.current = null;
      seriesRef.current = null;
      priceLinesRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !chartApiRef.current) {
      return;
    }
    seriesRef.current.setData(displayCandles);
    chartApiRef.current.timeScale().fitContent();

    priceLinesRef.current.forEach((line) => seriesRef.current?.removePriceLine(line));
    priceLinesRef.current = [];

    const lines: IPriceLine[] = [];

    const addLine = (price: number, color: string, title: string) => {
      if (!Number.isFinite(price) || !seriesRef.current) {
        return;
      }
      const line = seriesRef.current.createPriceLine({
        price,
        color,
        lineWidth: 2,
        axisLabelColor: color,
        title,
        lineStyle: 2,
      });
      lines.push(line);
    };

    entryLevels.forEach((level, index) =>
      addLine(level, "#0ea5e9", `Entry ${index + 1}`)
    );
    targetLevels.forEach((level, index) =>
      addLine(level, "#22c55e", `TP ${index + 1}`)
    );
    if (typeof stopLevel === "number") {
      addLine(stopLevel, "#ef4444", "SL");
    }

    priceLinesRef.current = lines;
  }, [displayCandles, entryLevels, targetLevels, stopLevel]);

  const handleTimeframeChange = (next: (typeof TIMEFRAME_OPTIONS)[number]) => {
    setActiveTimeframe(next);
  };

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-[var(--swimm-neutral-300)] bg-white p-6 shadow-sm shadow-[var(--swimm-neutral-300)]/40">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--swimm-neutral-500)]">
              {title}
            </div>
            {capturedLabel ? (
              <div className="text-xs text-[var(--swimm-neutral-500)]">
                {shareCopy.snapshotCapturedAt.replace("{timestamp}", capturedLabel)}
              </div>
            ) : null}
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
          <div className="absolute inset-0 overflow-hidden rounded-3xl border border-[var(--swimm-neutral-300)] bg-white">
            <div ref={chartContainerRef} className="h-full w-full" />
          </div>
          {!displayCandles.length && (
            <div className="absolute inset-0 flex items-center justify-center rounded-3xl border border-dashed border-[var(--swimm-neutral-300)] bg-white text-sm text-[var(--swimm-neutral-500)]">
              {shareCopy.snapshotEmpty}
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[var(--swimm-neutral-400)]">
          <span className="rounded-full border border-[var(--swimm-primary-500)]/40 px-2 py-1 text-[var(--swimm-primary-700)]">
            {badgeCopy.entry}
          </span>
          <span className="rounded-full border border-[var(--swimm-up)]/30 px-2 py-1 text-[var(--swimm-up)]">
            {badgeCopy.target}
          </span>
          <span className="rounded-full border border-[var(--swimm-down)]/30 px-2 py-1 text-[var(--swimm-down)]">
            {badgeCopy.stop}
          </span>
          {resultLabel ? (
            <span className={resultClassName}>
              {badgeCopy.resultLabel}: {resultLabel}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
