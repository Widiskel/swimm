"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
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

const MotionLink = motion(Link);

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
  const { messages, languageTag } = useLanguage();
  const analysisCopy = messages.analysisPage;
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
  const chartSectionRef = useRef<HTMLElement | null>(null);
  const analysisSectionRef = useRef<HTMLElement | null>(null);

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
      new Intl.NumberFormat(languageTag, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [languageTag]
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
    return buildChartRangeLabels(points, languageTag);
  }, [languageTag, response]);

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
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        chartSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
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
    const objective = `Analyse trading pair ${formattedPair} on timeframe ${timeframe}`;

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
      if (typeof window !== "undefined") {
        window.requestAnimationFrame(() => {
          analysisSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
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
      <div className="min-h-screen bg-[var(--swimm-bg)] text-[var(--swimm-text)]">
        <SiteHeader />
        <main className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center px-6 text-center">
          <div className="space-y-4">
            <p className="text-lg text-[var(--swimm-neutral-500)]">{analysisCopy.connectingTitle}</p>
            <p className="text-sm text-[var(--swimm-neutral-300)]">{analysisCopy.connectingSubtitle}</p>
          </div>
        </main>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[var(--swimm-bg)] text-[var(--swimm-text)]">
        <SiteHeader />
        <main className="mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center gap-6 px-6 text-center">
          <span className="rounded-full border border-[var(--swimm-primary-500)]/40 bg-[var(--swimm-primary-500)]/10 px-4 py-1 text-xs uppercase tracking-[0.35em] text-[var(--swimm-primary-700)]">
            {analysisCopy.protectedBadge}
          </span>
          <h2 className="text-3xl font-semibold text-[var(--swimm-navy-900)] sm:text-4xl">
            {analysisCopy.signInHeading}
          </h2>
          <p className="max-w-2xl text-base text-[var(--swimm-neutral-500)]">
            {analysisCopy.signInDescription}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <motion.button
              type="button"
              onClick={() => login?.()}
              className="rounded-full border border-[var(--swimm-primary-500)] bg-[var(--swimm-primary-500)] px-6 py-2 text-sm font-semibold text-[var(--swimm-navy-900)] shadow-sm shadow-[var(--swimm-glow)]"
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 240, damping: 18 }}
            >
              {analysisCopy.signInButton}
            </motion.button>
            <MotionLink
              href="/"
              className="rounded-full border border-[var(--swimm-neutral-300)] px-6 py-2 text-sm font-semibold text-[var(--swimm-neutral-500)]"
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 240, damping: 18 }}
            >
              {analysisCopy.backHome}
            </MotionLink>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--swimm-bg)] text-[var(--swimm-text)]">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-6 py-12 space-y-10">
        <motion.section
          className="grid gap-8 lg:grid-cols-[1.2fr_1fr]"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
        >
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <HeroSection />
          </motion.div>
          <PairSelectionCard
            selectedPair={selectedPair}
            onPairChange={handlePairChange}
            onShowChart={handleShowChart}
            pairs={availablePairs}
            isLoadingPairs={isLoadingPairs}
          />
        </motion.section>

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
          sectionRef={chartSectionRef}
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
          sectionRef={analysisSectionRef}
        />
      </main>
    </div>
  );
}
