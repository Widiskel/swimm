"use client";

import { useMemo, useRef, useState } from "react";
import type { CandlestickData } from "lightweight-charts";

import { HeroSection } from "@/features/market/components/HeroSection";
import { PairSelectionCard } from "@/features/market/components/PairSelectionCard";
import {
  LiveMarketSection,
  type LiveMarketHandle,
} from "@/features/market/components/LiveMarketSection";
import {
  AnalysisSection,
  buildChartRangeLabels,
  buildEntryZones,
  buildFormattedPair,
  buildOverlayLevels,
  buildSupportiveHighlights,
  buildTargets,
  buildTradingNarrative,
  formatPriceLabel,
} from "@/features/analysis/components/AnalysisSection";
import {
  DEFAULT_PAIR_SYMBOL,
  INDICATOR_CONFIG,
  TIMEFRAME_OPTIONS,
  TRADING_PAIRS,
} from "@/features/market/constants";
import type { IndicatorKey, OverlayLevel } from "@/features/market/types";
import type { AgentResponse, DataMode } from "@/features/analysis/types";

const buildInitialIndicatorVisibility = () => {
  const initial: Record<IndicatorKey, boolean> = {} as Record<
    IndicatorKey,
    boolean
  >;
  for (const item of INDICATOR_CONFIG) {
    initial[item.key] = item.defaultVisible;
  }
  return initial;
};

export default function Home() {
  const [selectedPair, setSelectedPair] = useState<string>(
    TRADING_PAIRS[0].symbol
  );
  const [timeframe, setTimeframe] =
    useState<(typeof TIMEFRAME_OPTIONS)[number]>("1h");
  const [indicatorVisibility, setIndicatorVisibility] = useState<
    Record<IndicatorKey, boolean>
  >(buildInitialIndicatorVisibility);
  const [latestCandles, setLatestCandles] = useState<CandlestickData[]>([]);
  const [analysisCandles, setAnalysisCandles] = useState<CandlestickData[]>([]);
  const [response, setResponse] = useState<AgentResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const liveMarketRef = useRef<LiveMarketHandle | null>(null);

  const priceFormatter = useMemo(
    () =>
      new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );
  const formatPrice = useMemo(() => formatPriceLabel(priceFormatter), [
    priceFormatter,
  ]);

  const tradeEntries = useMemo(() => {
    if (!response) {
      return [] as number[];
    }
    if (response.tradePlan?.entries?.length) {
      return response.tradePlan.entries;
    }
    if (
      response.tradePlan?.entry !== null &&
      response.tradePlan?.entry !== undefined
    ) {
      return [response.tradePlan.entry];
    }
    return [] as number[];
  }, [response]);

  const entryZoneValues = useMemo(
    () => buildEntryZones(tradeEntries),
    [tradeEntries]
  );

  const paddedTargets = useMemo(
    () => buildTargets(response?.tradePlan?.takeProfits ?? []),
    [response]
  );

  const tradeStopLoss = response?.tradePlan?.stopLoss ?? null;
  const tradeExecutionWindow = response?.tradePlan?.executionWindow ?? "-";
  const tradeSizingNotes = response?.tradePlan?.sizingNotes ?? "-";
  const tradeRationale = response?.tradePlan?.rationale ?? "-";

  const rawPairSymbol =
    response?.market?.pair ?? selectedPair ?? DEFAULT_PAIR_SYMBOL;
  const formattedPair = useMemo(
    () => buildFormattedPair(rawPairSymbol, selectedPair),
    [rawPairSymbol, selectedPair]
  );

  const tradingNarrative = useMemo(
    () => buildTradingNarrative(tradeRationale, response),
    [tradeRationale, response]
  );

  const analysisOverlays = useMemo<OverlayLevel[]>(
    () => buildOverlayLevels(entryZoneValues, paddedTargets, tradeStopLoss),
    [entryZoneValues, paddedTargets, tradeStopLoss]
  );

  const supportiveHighlights = useMemo(
    () => buildSupportiveHighlights(response),
    [response]
  );

  const [chartStartLabel, chartEndLabel] = useMemo(() => {
    const points = response?.market?.chart?.points ?? [];
    return buildChartRangeLabels(points);
  }, [response]);

  const canRunAnalysis = latestCandles.length > 0 && !isRunning;

  const handlePairChange = (symbol: string) => {
    setSelectedPair(symbol);
    setResponse(null);
    setAnalysisCandles([]);
    setLatestCandles([]);
    setAnalysisError(null);
    liveMarketRef.current?.reset();
  };

  const handleShowChart = () => {
    liveMarketRef.current?.startChart();
  };

  const handleTimeframeChange = (
    nextTimeframe: (typeof TIMEFRAME_OPTIONS)[number]
  ) => {
    setTimeframe(nextTimeframe);
    setResponse(null);
    setAnalysisCandles([]);
    setLatestCandles([]);
    setAnalysisError(null);
    liveMarketRef.current?.startChart();
  };

  const handleIndicatorToggle = (key: IndicatorKey) => {
    setIndicatorVisibility((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleAnalyze = async () => {
    if (!latestCandles.length) {
      return;
    }
    const objective = `Analisa trading pair ${formattedPair} pada timeframe ${timeframe}`;

    setIsRunning(true);
    setAnalysisError(null);

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
      setAnalysisCandles(latestCandles.slice(-180));
    } catch (runError) {
      console.error(runError);
      if (runError instanceof Error) {
        setAnalysisError(runError.message);
      } else {
        setAnalysisError("Terjadi masalah saat menjalankan agent. Coba ulangi.");
      }
    } finally {
      setIsRunning(false);
    }
  };

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
          <HeroSection />
          <PairSelectionCard
            selectedPair={selectedPair}
            onPairChange={handlePairChange}
            onShowChart={handleShowChart}
          />
        </section>

        <LiveMarketSection
          ref={liveMarketRef}
          selectedPair={selectedPair}
          timeframe={timeframe}
          onTimeframeChange={handleTimeframeChange}
          indicatorVisibility={indicatorVisibility}
          onToggleIndicator={handleIndicatorToggle}
          onCandlesChange={setLatestCandles}
          canRunAnalysis={canRunAnalysis}
          onAnalyze={handleAnalyze}
          isRunningAnalysis={isRunning}
          analysisError={analysisError}
        />

        <AnalysisSection
          response={response}
          timeframe={timeframe}
          indicatorVisibility={indicatorVisibility}
          analysisCandles={analysisCandles}
          overlayLevels={analysisOverlays}
          supportiveHighlights={supportiveHighlights}
          paddedTargets={paddedTargets}
          entryZoneValues={entryZoneValues}
          tradeStopLoss={tradeStopLoss}
          tradeExecutionWindow={tradeExecutionWindow}
          tradeSizingNotes={tradeSizingNotes}
          tradingNarrative={tradingNarrative}
          formatPrice={formatPrice}
          formattedPair={formattedPair}
          chartStartLabel={chartStartLabel}
          chartEndLabel={chartEndLabel}
        />
      </main>
    </div>
  );
}
