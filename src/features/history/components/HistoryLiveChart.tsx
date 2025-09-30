"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
} from "lightweight-charts";

import type { CexProvider } from "@/features/market/exchanges";
import type { MarketMode } from "@/features/market/constants";
import { DEFAULT_MARKET_MODE } from "@/features/market/constants";
import { useLanguage } from "@/providers/language-provider";

const REFRESH_INTERVAL_MS = 60_000;

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

export type HistoryLiveChartProps = {
  symbol: string;
  provider: CexProvider;
  mode?: MarketMode | null;
  timeframe: string;
};

export function HistoryLiveChart({
  symbol,
  provider,
  mode,
  timeframe,
}: HistoryLiveChartProps) {
  const { languageTag, messages } = useLanguage();
  const copy = messages.history.liveComparison;
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [candles, setCandles] = useState<CandlestickData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const effectiveTimeframe = timeframe && timeframe.trim().length ? timeframe : "1h";
  const interval = useMemo(() => mapTimeframeToInterval(effectiveTimeframe), [effectiveTimeframe]);
  const displayTimeframe = effectiveTimeframe.toUpperCase();

  useEffect(() => {
    let isMounted = true;
    const fetchCandles = async (silent = false) => {
      if (!silent) {
        setIsLoading(true);
      }
      try {
        const params = new URLSearchParams({
          symbol,
          interval,
          limit: "300",
          provider,
          mode: mode ?? DEFAULT_MARKET_MODE,
        });
        const response = await fetch(`/api/market?${params.toString()}`);
        if (!response.ok) {
          throw new Error(copy.error);
        }
        const payload = (await response.json()) as {
          candles?: {
            openTime: number;
            open: number;
            high: number;
            low: number;
            close: number;
          }[];
        };
        if (!isMounted) {
          return;
        }
        const parsed = (payload.candles ?? []).map<CandlestickData>((item) => ({
          time: (item.openTime / 1000) as CandlestickData["time"],
          open: Number(item.open.toFixed(2)),
          high: Number(item.high.toFixed(2)),
          low: Number(item.low.toFixed(2)),
          close: Number(item.close.toFixed(2)),
        }));
        setCandles(parsed);
        setError(null);
        setLastUpdated(new Date());
      } catch (fetchError) {
        if (!isMounted) {
          return;
        }
        setError(fetchError instanceof Error ? fetchError.message : copy.error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchCandles();
    const timer = setInterval(() => {
      void fetchCandles(true);
    }, REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [copy.error, interval, mode, provider, symbol]);

  useEffect(() => {
    if (!chartContainerRef.current) {
      return;
    }
    if (!candles.length) {
      return;
    }
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
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
        vertLine: { visible: true, color: "#64748b" },
        horzLine: { visible: true, color: "#64748b" },
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

    const series = chart.addCandlestickSeries({
      upColor: "#22c55e",
      borderUpColor: "#22c55e",
      wickUpColor: "#22c55e",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      wickDownColor: "#ef4444",
    });

    series.setData(candles);
    chart.timeScale().fitContent();

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [candles]);

  const formattedUpdated = useMemo(() => {
    if (!lastUpdated) {
      return "-";
    }
    return new Intl.DateTimeFormat(languageTag, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(lastUpdated);
  }, [languageTag, lastUpdated]);

  return (
    <section className="mt-6 rounded-3xl border border-[var(--swimm-neutral-300)] bg-white p-6 shadow-sm shadow-[var(--swimm-neutral-300)]/40">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-lg font-semibold text-[var(--swimm-navy-900)]">
            {copy.title}
          </h4>
          <p className="text-sm text-[var(--swimm-neutral-500)]">
            {copy.subtitle
              .replace("{pair}", symbol)
              .replace("{timeframe}", displayTimeframe)
              .replace("{provider}", provider.toUpperCase())}
          </p>
        </div>
        <span className="text-xs text-[var(--swimm-neutral-400)]">
          {copy.lastUpdated.replace("{time}", formattedUpdated)}
        </span>
      </div>

      <div className="relative mt-4 h-72 w-full overflow-hidden rounded-2xl border border-[var(--swimm-neutral-300)] bg-white">
        <div ref={chartContainerRef} className="h-full w-full" />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--swimm-neutral-300)]">
            {copy.loading}
          </div>
        )}
        {!isLoading && !candles.length ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--swimm-neutral-300)]">
            {copy.empty}
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 rounded-xl border border-[var(--swimm-down)] bg-[var(--swimm-down)]/10 px-4 py-2 text-xs text-[var(--swimm-down)]">
          {error}
        </p>
      ) : null}
    </section>
  );
}
