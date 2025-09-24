"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import type { CandlestickData } from "lightweight-charts";

import { SiteHeader } from "@/components/SiteHeader";
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
import type { AgentResponse, DataMode } from "@/features/analysis/types";
import { HeroSection } from "@/features/market/components/HeroSection";
import { LiveMarketSection, type LiveMarketHandle } from "@/features/market/components/LiveMarketSection";
import { PairSelectionCard } from "@/features/market/components/PairSelectionCard";
import { DEFAULT_PAIR_SYMBOL, INDICATOR_CONFIG, TIMEFRAME_OPTIONS } from "@/features/market/constants";
import type { IndicatorKey, OverlayLevel } from "@/features/market/types";
import { useHistory } from "@/providers/history-provider";
import { useLanguage } from "@/providers/language-provider";

type TradingPair = {
  symbol: string;
  label: string;
};

const buildInitialIndicatorVisibility = () => {
  const initial: Record<IndicatorKey, boolean> = {} as Record<IndicatorKey, boolean>;
  for (const item of INDICATOR_CONFIG) {
    initial[item.key] = item.defaultVisible;
  }
  return initial;
};

export default function AnalysisPage() {
  const { t } = useLanguage();
  const { ready, authenticated, login } = usePrivy();
  const { addEntry } = useHistory();

  const [availablePairs, setAvailablePairs] = useState<TradingPair[]>([]);
  const [isLoadingPairs, setIsLoadingPairs] = useState(false);
  const [selectedPair, setSelectedPair] = useState<string>(DEFAULT_PAIR_SYMBOL);
  const [timeframe, setTimeframe] = useState<(typeof TIMEFRAME_OPTIONS)[number]>("1h");
  const [indicatorVisibility, setIndicatorVisibility] = useState<Record<IndicatorKey, boolean>>(buildInitialIndicatorVisibility);
  const [latestCandles, setLatestCandles] = useState<CandlestickData[]>([]);
  const [analysisCandles, setAnalysisCandles] = useState<CandlestickData[]>([]);
  const [response, setResponse] = useState<AgentResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const liveMarketRef = useRef<LiveMarketHandle | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadPairs = async () => {
      setIsLoadingPairs(true);
      try {
        const res = await fetch("/api/symbols");
        if (!res.ok) {
          throw new Error(`Failed to load symbols: ${res.status}`);
        }
        const payload = (await res.json()) as { symbols?: TradingPair[] };
        const pairs = payload.symbols ?? [];
        if (!cancelled) {
          setAvailablePairs(pairs);
          if (pairs.length > 0) {
            setSelectedPair((prev) => (pairs.some((item) => item.symbol === prev) ? prev : pairs[0].symbol));
          }
        }
      } catch (error) {
        console.error("Failed to fetch Binance pairs", error);
      } finally {
        if (!cancelled) {
          setIsLoadingPairs(false);
        }
      }
    };

    loadPairs();
    return () => {
      cancelled = true;
    };
  }, []);

  const priceFormatter = useMemo(
    () =>
      new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );
  const formatPrice = useMemo(() => formatPriceLabel(priceFormatter), [priceFormatter]);

  const tradeEntries = useMemo(() => {
    if (!response) {
      return [] as number[];
    }
    if (response.tradePlan?.entries?.length) {
      return response.tradePlan.entries;
    }
    if (response.tradePlan?.entry !== null && response.tradePlan?.entry !== undefined) {
      return [response.tradePlan.entry];
    }
    return [] as number[];
  }, [response]);

  const entryZoneValues = useMemo(() => buildEntryZones(tradeEntries), [tradeEntries]);
  const paddedTargets = useMemo(() => buildTargets(response?.tradePlan?.takeProfits ?? []), [response]);

  const tradeStopLoss = response?.tradePlan?.stopLoss ?? null;
  const tradeExecutionWindow = response?.tradePlan?.executionWindow ?? "-";
  const tradeSizingNotes = response?.tradePlan?.sizingNotes ?? "-";
  const tradeRationale = response?.tradePlan?.rationale ?? "-";

  const rawPairSymbol = response?.market?.pair ?? selectedPair ?? DEFAULT_PAIR_SYMBOL;
  const formattedPair = useMemo(() => buildFormattedPair(rawPairSymbol, selectedPair), [rawPairSymbol, selectedPair]);
  const tradingNarrative = useMemo(() => buildTradingNarrative(tradeRationale, response), [tradeRationale, response]);

  const analysisOverlays = useMemo<OverlayLevel[]>(
    () => buildOverlayLevels(entryZoneValues, paddedTargets, tradeStopLoss),
    [entryZoneValues, paddedTargets, tradeStopLoss]
  );

  const supportiveHighlights = useMemo(() => buildSupportiveHighlights(response), [response]);

  const [chartStartLabel, chartEndLabel] = useMemo(() => {
    const points = response?.market?.chart?.points ?? [];
    return buildChartRangeLabels(points);
  }, [response]);

  const canRunAnalysis = ready && authenticated && latestCandles.length > 0 && !isRunning;

  const handlePairChange = (symbol: string) => {
    setSelectedPair(symbol);
    setResponse(null);
    setAnalysisCandles([]);
    setLatestCandles([]);
    setAnalysisError(null);
  };

  const handleShowChart = () => {
    liveMarketRef.current?.startChart();
  };

  const handleTimeframeChange = (nextTimeframe: (typeof TIMEFRAME_OPTIONS)[number]) => {
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
    if (!latestCandles.length || !ready || !authenticated) {
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
      addEntry({ pair: selectedPair, timeframe, response: payload });
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

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <SiteHeader />
        <main className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center px-6 text-center">
          <div className="space-y-4">
            <p className="text-lg text-slate-300">
              {t("Connecting to Privy services...", "Menghubungkan layanan Privy...")}
            </p>
            <p className="text-sm text-slate-500">
              {t("Please wait while we verify your authentication status.", "Harap tunggu, kami sedang memverifikasi status autentikasi Anda.")}
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <SiteHeader />
        <main className="mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center gap-6 px-6 text-center">
          <span className="rounded-full border border-slate-800 px-4 py-1 text-xs tracking-[0.35em] text-slate-400 uppercase">
            {t("Protected Area", "Area Terproteksi")}
          </span>
          <h2 className="text-3xl font-semibold text-slate-50 sm:text-4xl">
            {t("Sign in to run personalised trading analysis", "Masuk untuk menjalankan analisa trading terpersonalisasi")}
          </h2>
          <p className="max-w-2xl text-base text-slate-400">
            {t(
              "Real-time analytics are available once you log in. Access the SWIMM agent for price forecasts and execution-ready playbooks.",
              "Analisa realtime tersedia setelah Anda masuk. Akses agen SWIMM untuk forecasting harga dan playbook siap eksekusi."
            )}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => login?.()}
              className="rounded-md border border-sky-500 px-6 py-2 text-sm font-medium text-slate-100 transition hover:bg-sky-500/10"
            >
              {t("Sign in with Privy", "Masuk lewat Privy")}
            </button>
            <Link
              href="/"
              className="rounded-md border border-slate-700 px-6 py-2 text-sm text-slate-300 transition hover:bg-slate-800/60"
            >
              {t("Back to home", "Kembali ke beranda")}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-6 py-12 space-y-10">
        <section className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <HeroSection />
          <PairSelectionCard
            selectedPair={selectedPair}
            onPairChange={handlePairChange}
            onShowChart={handleShowChart}
            pairs={availablePairs}
            isLoadingPairs={isLoadingPairs}
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
