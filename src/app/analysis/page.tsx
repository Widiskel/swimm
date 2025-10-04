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
  CATEGORY_PROVIDER_MAP,
  DEFAULT_PAIR_SYMBOL,
  INDICATOR_CONFIG,
  TIMEFRAME_OPTIONS,
  DEFAULT_PROVIDER,
  DEFAULT_MARKET_MODE,
  DEFAULT_ASSET_CATEGORY,
  type MarketMode,
  type AssetCategory,
} from "@/features/market/constants";
import type { CexProvider } from "@/features/market/exchanges";
import type { IndicatorKey, OverlayLevel } from "@/features/market/types";
import { useHistory } from "@/providers/history-provider";
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

  const [assetCategory, setAssetCategory] = useState<AssetCategory>(DEFAULT_ASSET_CATEGORY);
  const [provider, setProvider] = useState<CexProvider>(DEFAULT_PROVIDER);
  const [marketMode, setMarketMode] = useState<MarketMode>(DEFAULT_MARKET_MODE);
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
  const [saveFeedback, setSaveFeedback] = useState("");
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  // Auto-refresh after first manual analyze
  const hasUserAnalyzedRef = useRef(false);
  const lastAnalyzedClosedRef = useRef<number | null>(null);
  const [showUpdatedToast, setShowUpdatedToast] = useState(false);
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState("");
  const [lastClosedTimeSec, setLastClosedTimeSec] = useState<number | null>(null);

  const liveMarketRef = useRef<LiveMarketHandle | null>(null);
  const chartSectionRef = useRef<HTMLElement | null>(null);
  const analysisSectionRef = useRef<HTMLElement | null>(null);
  const lastPairByProviderRef = useRef<Record<CexProvider, Record<MarketMode, string>>>(
    {
      binance: {
        spot: DEFAULT_PAIR_SYMBOL,
        futures: DEFAULT_PAIR_SYMBOL,
      },
      bybit: {
        spot: "BTCUSDT",
        futures: "BTCUSDT",
      },
      twelvedata: {
        spot: "XAUUSD",
        futures: "XAUUSD",
      },
    }
  );
  const canPersistHistory = sessionStatus === "authenticated";

  const loadPairs = useCallback(async () => {
    const params = new URLSearchParams({
      provider,
      locale,
      mode: marketMode,
      category: assetCategory,
    });
    const res = await fetch(`/api/symbols?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Failed to load symbols: ${res.status}`);
    }
    const payload = (await res.json()) as { symbols?: TradingPair[] };
    return payload.symbols ?? [];
  }, [assetCategory, locale, marketMode, provider]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoadingPairs(true);
      setAvailablePairs([]);
      try {
        const pairs = await loadPairs();
        if (cancelled) {
          return;
        }
        setAvailablePairs(pairs);
        if (pairs.length > 0) {
          const preferred = lastPairByProviderRef.current[provider]?.[marketMode];
          const fallback = pairs[0]?.symbol ?? "";
          const nextSymbol = preferred && pairs.some((item) => item.symbol === preferred)
            ? preferred
            : fallback;
          if (nextSymbol) {
            lastPairByProviderRef.current[provider][marketMode] = nextSymbol;
            setSelectedPair(nextSymbol);
          } else {
            setSelectedPair("");
          }
        } else {
          setSelectedPair("");
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
  }, [loadPairs, marketMode, provider]);

  useEffect(() => {
    const isSavableSignal = (response?.decision?.action ?? "").toLowerCase() === "buy" || (response?.decision?.action ?? "").toLowerCase() === "sell";
    if (!canPersistHistory) {
      setSaveFeedback("");
      setSaveStatus("idle");
      setSaveError(null);
      return;
    }
    if (!isSavableSignal) {
      setSaveStatus("idle");
      setSaveError(null);
    }
  }, [canPersistHistory, response?.decision?.action]);

  const providerLabel = useMemo(() => __("pairSelection.providerOptions." + provider), [__, provider]);
  const modeLabel = useMemo(() => __("pairSelection.modeOptions." + marketMode), [__, marketMode]);

  const priceFormatter = useMemo(
    () =>
      new Intl.NumberFormat(languageTag, {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
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

  const handleAssetCategoryChange = (nextCategory: AssetCategory) => {
    if (nextCategory === assetCategory) {
      return;
    }
    setAssetCategory(nextCategory);
    const nextProvider = CATEGORY_PROVIDER_MAP[nextCategory][0];
    setProvider(nextProvider);
    const stored = lastPairByProviderRef.current[nextProvider]?.[DEFAULT_MARKET_MODE];
    setMarketMode(DEFAULT_MARKET_MODE);
    setSelectedPair(stored ?? "");
    setResponse(null);
    setAnalysisCandles([]);
    setLatestCandles([]);
    setAnalysisError(null);
    liveMarketRef.current?.reset();
  };

  const handleProviderChange = (nextProvider: CexProvider) => {
    if (nextProvider === provider) {
      return;
    }
    setProvider(nextProvider);
    if (nextProvider === "twelvedata" && marketMode !== "spot") {
      setMarketMode("spot");
    }
    setResponse(null);
    setAnalysisCandles([]);
    setLatestCandles([]);
    setAnalysisError(null);
    liveMarketRef.current?.reset();
  };

  const handleModeChange = (nextMode: MarketMode) => {
    if (provider === "twelvedata" && nextMode !== "spot") {
      return;
    }
    if (nextMode === marketMode) {
      return;
    }
    setMarketMode(nextMode);
    const stored = lastPairByProviderRef.current[provider]?.[nextMode];
    setSelectedPair(stored ?? "");
    setResponse(null);
    setAnalysisCandles([]);
    setLatestCandles([]);
    setAnalysisError(null);
    liveMarketRef.current?.reset();
  };

  const handlePairChange = (symbol: string) => {
    setSelectedPair(symbol);
    lastPairByProviderRef.current[provider][marketMode] = symbol;
    setResponse(null);
    setAnalysisCandles([]);
    setLatestCandles([]);
    setAnalysisError(null);
  };

  const handleShowChart = () => {
    liveMarketRef.current?.startChart({ mode: marketMode });
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
    liveMarketRef.current?.startChart({ mode: marketMode });
    // Reset last analyzed candle so the next closed candle on the new timeframe triggers a fresh analyze
    lastAnalyzedClosedRef.current = null;
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

    setIsSavingReport(true);
    setSaveError(null);

    try {
      await saveEntry({
        pair: selectedPair,
        timeframe,
        provider,
        response,
        verdict: "unknown",
        feedback: saveFeedback.trim() || undefined,
        snapshot: {
          timeframe,
          capturedAt: (
            analysisCandles.length
              ? new Date((analysisCandles[analysisCandles.length - 1].time as number) * 1000).toISOString()
              : new Date().toISOString()
          ),
          candles: analysisCandles.map((c) => ({
            openTime: Number((c.time as number) * 1000),
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: 0,
            closeTime: Number((c.time as number) * 1000),
          })),
        },
      });
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

  const handleAnalyze = useCallback(async () => {
    if (!latestCandles.length || !ready || !authenticated) {
      return;
    }
    const objective = `Analyse ${modeLabel} trading pair ${formattedPair} on timeframe ${timeframe} using ${providerLabel}`;

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
          mode: marketMode,
          locale,
          category: assetCategory,
        }),
      });

      if (!res.ok) {
        let message = analysisCopy.agentFailure;
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
      setSaveFeedback("");
      setSaveStatus("idle");
      setSaveError(null);
      // Mark that user has started analysis and capture last closed-candle time
      if (lastClosedTimeSec !== null) {
        lastAnalyzedClosedRef.current = lastClosedTimeSec;
      }
      hasUserAnalyzedRef.current = true;
      // Show a lightweight update toast
      const formatter = new Intl.DateTimeFormat(languageTag, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setLastUpdatedLabel(formatter.format(new Date()));
      setShowUpdatedToast(true);
      window.setTimeout(() => setShowUpdatedToast(false), 2500);
      if (typeof window !== "undefined") {
        window.requestAnimationFrame(() => {
          analysisSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    } catch (runError) {
      console.error(runError);
      if (runError instanceof Error && runError.message) {
        setAnalysisError(runError.message);
      } else {
        setAnalysisError(analysisCopy.agentGenericError);
      }
    } finally {
      setIsRunning(false);
    }
  }, [
    analysisCopy.agentFailure,
    analysisCopy.agentGenericError,
    authenticated,
    formattedPair,
    languageTag,
    latestCandles,
    locale,
    marketMode,
    modeLabel,
    provider,
    providerLabel,
    ready,
    selectedPair,
    timeframe,
    lastClosedTimeSec,
    assetCategory,
  ]);

  // Auto-run analyze when a new candle closes for the selected timeframe (strict closed-candle)
  useEffect(() => {
    if (!hasUserAnalyzedRef.current) {
      return;
    }
    if (isRunning || !ready || !authenticated) {
      return;
    }
    if (lastClosedTimeSec === null) {
      return;
    }
    if (lastAnalyzedClosedRef.current === null) {
      // First observation after enabling auto-refresh
      lastAnalyzedClosedRef.current = lastClosedTimeSec;
      return;
    }
    if (lastClosedTimeSec !== lastAnalyzedClosedRef.current) {
      // New candle detected -> refresh analysis
      void handleAnalyze();
    }
  }, [authenticated, handleAnalyze, isRunning, lastClosedTimeSec, ready]);

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
            className="flex h-full"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <HeroSection />
          </motion.div>
          <PairSelectionCard
            className="h-full"
            category={assetCategory}
            onCategoryChange={handleAssetCategoryChange}
            provider={provider}
            onProviderChange={handleProviderChange}
            mode={marketMode}
            onModeChange={handleModeChange}
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
          mode={marketMode}
          selectedPair={selectedPair}
          timeframe={timeframe}
          onTimeframeChange={handleTimeframeChange}
          indicatorVisibility={indicatorVisibility}
          onToggleIndicator={handleIndicatorToggle}
          onCandlesChange={setLatestCandles}
          onLastClosedTimeChange={setLastClosedTimeSec}
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
          saveFeedback={saveFeedback}
          onFeedbackChange={setSaveFeedback}
          onSaveReport={handleSaveReport}
          isSavingReport={isSavingReport}
          saveStatus={saveStatus}
          saveError={saveError}
          marketMode={marketMode}
          assetCategory={assetCategory}
        />
        {/* Update ticker */}
        {showUpdatedToast && (
          <div className="fixed bottom-4 right-4 z-50">
            <div className="rounded-full border border-[var(--swimm-primary-500)]/40 bg-[var(--swimm-primary-500)]/10 px-4 py-2 text-xs font-semibold text-[var(--swimm-primary-700)] shadow-[var(--swimm-glow)]">
              {__("analysisPage.updatedToast", { time: lastUpdatedLabel })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
