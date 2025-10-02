"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  DEFAULT_PAIR_SYMBOL,
  INDICATOR_CONFIG,
  TIMEFRAME_OPTIONS,
  DEFAULT_PROVIDER,
} from "@/features/market/constants";
import type { CexProvider } from "@/features/market/exchanges";
import type { IndicatorKey, OverlayLevel } from "@/features/market/types";
import { useHistory, type HistoryVerdict } from "@/providers/history-provider";
import { useLanguage } from "@/providers/language-provider";
import { useSession } from "@/providers/session-provider";

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
  const { messages, languageTag, __, locale } = useLanguage();
  const analysisCopy = messages.analysisPage;
  const savePanelCopy = messages.analysis.savePanel;
  const { ready, authenticated, login } = usePrivy();
  const { saveEntry } = useHistory();
  const { status: sessionStatus, isSyncing: isSessionSyncing } = useSession();

  const [provider, setProvider] = useState<CexProvider>(DEFAULT_PROVIDER);
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
  const [saveVerdict, setSaveVerdict] = useState<HistoryVerdict | null>(null);
  const [saveFeedback, setSaveFeedback] = useState("");
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const liveMarketRef = useRef<LiveMarketHandle | null>(null);
  const chartSectionRef = useRef<HTMLElement | null>(null);
  const analysisSectionRef = useRef<HTMLElement | null>(null);
  const lastPairByProviderRef = useRef<Record<CexProvider, string>>({
    binance: DEFAULT_PAIR_SYMBOL,
    bybit: "BTCUSDT",
  });
  const canPersistHistory = sessionStatus === "authenticated";

  const loadPairs = useCallback(async () => {
    const res = await fetch(`/api/symbols?provider=${provider}&locale=${locale}`);
    if (!res.ok) {
      throw new Error(`Failed to load symbols: ${res.status}`);
    }
    const payload = (await res.json()) as { symbols?: TradingPair[] };
    return payload.symbols ?? [];
  }, [locale, provider]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoadingPairs(true);
      try {
        const pairs = await loadPairs();
        if (cancelled) {
          return;
        }
        setAvailablePairs(pairs);
        if (pairs.length > 0) {
          const preferred = lastPairByProviderRef.current[provider];
          const nextSymbol = pairs.some((item) => item.symbol === preferred)
            ? preferred
            : pairs[0].symbol;
          lastPairByProviderRef.current[provider] = nextSymbol;
          setSelectedPair(nextSymbol);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch tradable pairs", error);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPairs(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [loadPairs, provider]);

  useEffect(() => {
    const isSavableSignal = (response?.decision?.action ?? "").toLowerCase() === "buy" || (response?.decision?.action ?? "").toLowerCase() === "sell";
    if (!canPersistHistory) {
      setSaveVerdict(null);
      setSaveFeedback("");
      setSaveStatus("idle");
      setSaveError(null);
      return;
    }
    if (!isSavableSignal) {
      setSaveVerdict(null);
      setSaveStatus("idle");
      setSaveError(null);
    }
  }, [canPersistHistory, response?.decision?.action]);

  const providerLabel = useMemo(() => __("pairSelection.providerOptions." + provider), [__, provider]);

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

  const decisionAction = response?.decision?.action?.toLowerCase() ?? null;
  const isSavableSignal = decisionAction === "buy" || decisionAction === "sell";
  const canSaveHistory = canPersistHistory && isSavableSignal;

  const [chartStartLabel, chartEndLabel] = useMemo(() => {
    const points = response?.market?.chart?.points ?? [];
    return buildChartRangeLabels(points, languageTag);
  }, [languageTag, response]);

  const canRunAnalysis = ready && authenticated && latestCandles.length > 0 && !isRunning;

  const handleProviderChange = (nextProvider: CexProvider) => {
    if (nextProvider === provider) {
      return;
    }
    setProvider(nextProvider);
    setResponse(null);
    setAnalysisCandles([]);
    setLatestCandles([]);
    setAnalysisError(null);
    liveMarketRef.current?.reset();
  };

  const handlePairChange = (symbol: string) => {
    setSelectedPair(symbol);
    lastPairByProviderRef.current[provider] = symbol;
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

  const handleSaveReport = async () => {
    if (!response) {
      return;
    }
    if (!isSavableSignal) {
      setSaveStatus("error");
      setSaveError(savePanelCopy.holdNotAllowed);
      return;
    }
    if (!canPersistHistory) {
      setSaveStatus("error");
      setSaveError(savePanelCopy.loginPrompt);
      return;
    }
    if (!saveVerdict) {
      setSaveStatus("error");
      setSaveError(savePanelCopy.verdictRequired);
      return;
    }

    setIsSavingReport(true);
    setSaveError(null);

    try {
      await saveEntry({\n        pair: selectedPair,\n        timeframe,\n        provider,\n        response,\n        verdict: saveVerdict,\n        feedback: saveFeedback.trim() || undefined,\n        snapshot: {\n          timeframe,\n          at: (analysisCandles.length ? new Date((analysisCandles[analysisCandles.length - 1].time as number) * 1000).toISOString() : new Date().toISOString()),\n          candles: analysisCandles.map(c => ({\n            openTime: Number((c.time as number) * 1000),\n            open: c.open,\n            high: c.high,\n            low: c.low,\n            close: c.close,\n            volume: 0,\n            closeTime: Number((c.time as number) * 1000)\n          }))\n        }\n      });
      setSaveStatus("success");
    } catch (saveException) {
      const message =
        saveException instanceof Error && saveException.message
          ? saveException.message
          : savePanelCopy.genericError;
      setSaveStatus("error");
      setSaveError(message);
    } finally {
      setIsSavingReport(false);
    }
  };

  const handleAnalyze = async () => {
    if (!latestCandles.length || !ready || !authenticated) {
      return;
    }
    const objective = `Analyse trading pair ${formattedPair} on timeframe ${timeframe} using ${providerLabel}`;

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
          provider,
          locale,
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
      setSaveVerdict(null);
      setSaveFeedback("");
      setSaveStatus("idle");
      setSaveError(null);
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
              className="rounded-full border border-[var(--swimm-primary-500)] bg-[var(--swimm-primary-500)] px-6 py-2 text-sm font-semibold text-[var(--swimm-navy-900)] shadow-[var(--swimm-glow)]"
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
          animate={{ opacity: 1, y: 0 }}
          
          transition={{ duration: 0.65, ease: "easeOut" }}
        >
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <HeroSection />
          </motion.div>
          <PairSelectionCard
            provider={provider}
            onProviderChange={handleProviderChange}
            selectedPair={selectedPair}
            onPairChange={handlePairChange}
            onShowChart={handleShowChart}
            pairs={availablePairs}
            isLoadingPairs={isLoadingPairs}
          />
        </motion.section>

        <LiveMarketSection
          ref={liveMarketRef}
          provider={provider}
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
          canSaveReport={canSaveHistory}
          isSessionSyncing={isSessionSyncing}
          saveVerdict={saveVerdict}
          onVerdictChange={setSaveVerdict}
          saveFeedback={saveFeedback}
          onFeedbackChange={setSaveFeedback}
          onSaveReport={handleSaveReport}
          isSavingReport={isSavingReport}
          saveStatus={saveStatus}
          saveError={saveError}
        />
      </main>
    </div>
  );
}


