"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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
import { INDICATOR_CONFIG, DEFAULT_MARKET_MODE } from "@/features/market/constants";
import type { IndicatorKey } from "@/features/market/types";
import type { HistoryEntry, HistoryVerdict } from "@/providers/history-provider";
import { useLanguage } from "@/providers/language-provider";
import { HistoryLiveChart } from "./HistoryLiveChart";

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
  onUpdateEntry: (updates: {
    verdict?: HistoryVerdict;
    feedback?: string;
    executed?: boolean | null;
    sessionId?: string;
    createdAt?: string;
  }) => Promise<HistoryEntry>;
};

export function HistoryEntryAnalysis({ entry, onUpdateEntry }: HistoryEntryAnalysisProps) {
  const { messages, languageTag } = useLanguage();
  const indicatorVisibility = useMemo(() => buildInitialIndicatorVisibility(), []);
  const [analysisCandles, setAnalysisCandles] = useState<CandlestickData[]>([]);
  const [chartStart, setChartStart] = useState("-");
  const [chartEnd, setChartEnd] = useState("-");
  const [isFetching, setIsFetching] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [verdictValue, setVerdictValue] = useState<HistoryVerdict>(entry.verdict);
  const [feedbackValue, setFeedbackValue] = useState(entry.feedback ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isUpdatingExecution, setIsUpdatingExecution] = useState(false);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [executedState, setExecutedState] = useState(entry.executed);

  const sectionRef = useRef<HTMLElement | null>(null);

  const timeframe = (entry.decision?.timeframe ?? entry.timeframe ?? "1h").toLowerCase();
  const interval = mapTimeframeToInterval(timeframe);
  const symbol = entry.pair ?? entry.response.market?.pair ?? "BTCUSDT";

  useEffect(() => {
    setVerdictValue(entry.verdict);
    setFeedbackValue(entry.feedback ?? "");
    setSubmitError(null);
    setExecutionMessage(null);
    setExecutionError(null);
    setExecutedState(entry.executed);
  }, [entry.id, entry.verdict, entry.feedback, entry.executed]);

  useEffect(() => {
    let cancelled = false;
    const loadCandles = async () => {
      setIsFetching(true);
      try {
        const params = new URLSearchParams();
        params.set("symbol", symbol);
        params.set("interval", interval);
        params.set("limit", "300");
        params.set("provider", entry.provider);
        params.set("mode", entry.mode ?? DEFAULT_MARKET_MODE);
        const response = await fetch(`/api/market?${params.toString()}`);
        if (!response.ok) {
          let errorMessage = `Market request failed with ${response.status}`;
          try {
            const payload = (await response.json()) as { error?: string };
            if (payload?.error) {
              errorMessage = payload.error;
            }
          } catch (parseError) {
            console.warn("Failed to parse market error payload", parseError);
          }
          setAnalysisCandles([]);
          setChartStart("-");
          setChartEnd("-");
          setMarketError(errorMessage);
          return;
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
        setMarketError(null);
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
  }, [symbol, interval, languageTag, entry.provider, entry.mode]);

  const priceFormatter = useMemo(
    () =>
      new Intl.NumberFormat(languageTag, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [languageTag]
  );

  const saveCopy = messages.analysis.savePanel;
  const feedbackCopy = messages.history.feedbackPanel;
  const executionCopy = messages.history.executionSurvey;
  const decisionAction = (entry.decision?.action ?? entry.response.decision?.action ?? "").toLowerCase();
  const canUpdateVerdict = (decisionAction === "buy" || decisionAction === "sell") && entry.executed === true;
  const verdictOptions = [
    {
      key: "accurate" as HistoryVerdict,
      label: saveCopy.verdictOptions.accurate.label,
      description: saveCopy.verdictOptions.accurate.description,
    },
    {
      key: "inaccurate" as HistoryVerdict,
      label: saveCopy.verdictOptions.inaccurate.label,
      description: saveCopy.verdictOptions.inaccurate.description,
    },
  ];
  const trimmedFeedback = feedbackValue.trim();
  const initialFeedback = (entry.feedback ?? "").trim();
  const isDirty = verdictValue !== entry.verdict || trimmedFeedback !== initialFeedback;
  const disableSubmit = !canUpdateVerdict || isSubmitting || !isDirty;

  const executionRecorded = typeof executedState === "boolean";
  const showFeedbackCard = executedState === true;
  const showVerdictControls = executedState === true;

  const handleExecutionUpdate = async (executed: boolean) => {
    if (isUpdatingExecution) {
      return;
    }
    const previousState = executedState;
    setExecutionMessage(null);
    setExecutionError(null);
    setExecutedState(executed);
    setIsUpdatingExecution(true);
    try {
      const updated = await onUpdateEntry({
        executed,
        sessionId: entry.sessionId,
        createdAt: entry.createdAt,
      });
      setExecutionMessage(executed ? executionCopy.recordedYes : executionCopy.recordedNo);
      setVerdictValue(updated.verdict);
      setFeedbackValue(updated.feedback ?? "");
    } catch (error) {
      setExecutionError(executionCopy.updateError);
      setExecutedState(previousState);
      console.error(error);
    } finally {
      setIsUpdatingExecution(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isDirty || !canUpdateVerdict) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("idle");
    setSubmitError(null);

    try {
      await onUpdateEntry({
        verdict: verdictValue,
        feedback: trimmedFeedback,
        sessionId: entry.sessionId,
        createdAt: entry.createdAt,
      });
      setSubmitStatus("success");
    } catch (error) {
      setSubmitStatus("error");
      setSubmitError(error instanceof Error ? error.message : feedbackCopy.genericError);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isDirty && submitStatus === "success") {
      setSubmitStatus("idle");
      setSubmitError(null);
    }
  }, [isDirty, submitStatus]);

  const formatPrice = useMemo(() => formatPriceLabel(priceFormatter), [priceFormatter]);
  const tradeEntries = useMemo(() => {
    const plan = entry.response.tradePlan;
    if (Array.isArray(plan.entries) && plan.entries.length) {
      return plan.entries;
    }
    if (plan.entry !== null && plan.entry !== undefined) {
      return [plan.entry];
    }
    return [] as number[];
  }, [entry]);
  const entryZoneValues = useMemo(() => buildEntryZones(tradeEntries), [tradeEntries]);
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
  const tradingNarrative = useMemo(() => {
    const planRationale = entry.response.tradePlan.rationale ?? "-";
    return buildTradingNarrative(planRationale, entry.response);
  }, [entry]);
  const formattedPair = useMemo(
    () => buildFormattedPair(entry.response.market?.pair ?? entry.pair, entry.pair),
    [entry]
  );

  return (
    <>
      <HistoryLiveChart
        symbol={entry.response.market?.pair ?? entry.pair}
        provider={entry.provider}
        mode={entry.mode}
        timeframe={entry.decision?.timeframe ?? entry.timeframe ?? timeframe}
      />

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
        saveFeedback={entry.feedback ?? ""}
        onFeedbackChange={() => {}}
        onSaveReport={() => {}}
        isSavingReport={false}
        saveStatus="idle"
        saveError={null}
        sectionRef={sectionRef}
      />

      {marketError ? (
        <p className="mt-4 rounded-2xl border border-[var(--swimm-neutral-300)] bg-[var(--swimm-neutral-50)] px-4 py-3 text-xs text-[var(--swimm-down)]">
          {marketError}
        </p>
      ) : null}

      <section className="mt-6 rounded-3xl border border-[var(--swimm-neutral-300)] bg-white p-6 shadow-sm shadow-[var(--swimm-neutral-300)]/40">
        <h4 className="text-lg font-semibold text-[var(--swimm-navy-900)]">
          {executionCopy.title}
        </h4>
        <p className="mt-2 text-sm text-[var(--swimm-neutral-500)]">
          {executionCopy.description}
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => handleExecutionUpdate(true)}
            disabled={isUpdatingExecution}
            className={`inline-flex items-center justify-center rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:border-[var(--swimm-neutral-300)] disabled:bg-[var(--swimm-neutral-200)]/60 disabled:text-[var(--swimm-neutral-400)] ${
              executedState === true
                ? "border-[var(--swimm-primary-700)] bg-[var(--swimm-primary-500)]/15 text-[var(--swimm-primary-700)]"
                : "border-[var(--swimm-neutral-300)] bg-white text-[var(--swimm-neutral-500)] hover:border-[var(--swimm-primary-500)] hover:text-[var(--swimm-primary-700)]"
            }`}
          >
            {executionCopy.executedYes}
          </button>
          <button
            type="button"
            onClick={() => handleExecutionUpdate(false)}
            disabled={isUpdatingExecution}
            className={`inline-flex items-center justify-center rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:border-[var(--swimm-neutral-300)] disabled:bg-[var(--swimm-neutral-200)]/60 disabled:text-[var(--swimm-neutral-400)] ${
              executedState === false
                ? "border-[var(--swimm-primary-700)] bg-[var(--swimm-primary-500)]/15 text-[var(--swimm-primary-700)]"
                : "border-[var(--swimm-neutral-300)] bg-white text-[var(--swimm-neutral-500)] hover:border-[var(--swimm-primary-500)] hover:text-[var(--swimm-primary-700)]"
            }`}
          >
            {executionCopy.executedNo}
          </button>
        </div>
        {executionError ? (
          <p className="mt-3 text-xs text-[var(--swimm-down)]">{executionError}</p>
        ) : null}
      </section>

      {executionRecorded && executionMessage ? (
        <p
          className={`mt-4 rounded-2xl px-4 py-3 text-xs ${
            executedState === true
              ? "border border-[var(--swimm-primary-500)]/40 bg-[var(--swimm-primary-500)]/10 text-[var(--swimm-primary-700)]"
              : "border border-[var(--swimm-neutral-300)] bg-[var(--swimm-neutral-100)] text-[var(--swimm-neutral-500)]"
          }`}
        >
          {executionMessage}
        </p>
      ) : null}

      {showFeedbackCard ? (
        <section className="mt-6 rounded-3xl border border-[var(--swimm-neutral-300)] bg-white p-6 shadow-sm shadow-[var(--swimm-neutral-300)]/40">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-lg font-semibold text-[var(--swimm-navy-900)]">
                {feedbackCopy.title}
              </h4>
              <p className="text-sm text-[var(--swimm-neutral-500)]">{feedbackCopy.description}</p>
            </div>
          </div>

          {!showVerdictControls || !canUpdateVerdict ? (
            <p className="mt-4 rounded-2xl border border-[var(--swimm-neutral-300)] bg-[var(--swimm-neutral-100)] px-4 py-3 text-xs text-[var(--swimm-neutral-500)]">
              {feedbackCopy.holdDisabled}
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--swimm-neutral-400)]">
                  {feedbackCopy.verdictLabel}
                </legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  {verdictOptions.map((option) => {
                    const isActive = verdictValue === option.key;
                    return (
                      <label
                        key={option.key}
                        className={`flex flex-col gap-1 rounded-2xl border px-4 py-3 transition ${
                          isActive
                            ? "border-[var(--swimm-primary-500)] bg-[var(--swimm-primary-500)]/10 text-[var(--swimm-primary-700)]"
                            : "border-[var(--swimm-neutral-300)] bg-white text-[var(--swimm-neutral-600)] hover:border-[var(--swimm-primary-500)]"
                        }`}
                      >
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          <input
                            type="radio"
                            name="history-verdict"
                            value={option.key}
                            checked={isActive}
                            onChange={() => setVerdictValue(option.key)}
                            className="h-4 w-4 accent-[var(--swimm-primary-600)]"
                          />
                        {option.label}
                      </span>
                      <span className="text-xs text-[var(--swimm-neutral-500)]">
                        {option.description}
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-[var(--swimm-neutral-400)]">{feedbackCopy.pendingHint}</p>
            </fieldset>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--swimm-neutral-400)]">
                {feedbackCopy.feedbackLabel}
              </label>
              <textarea
                value={feedbackValue}
                onChange={(event) => setFeedbackValue(event.target.value)}
                placeholder={feedbackCopy.feedbackPlaceholder}
                className="mt-2 w-full rounded-2xl border border-[var(--swimm-neutral-300)] bg-white px-4 py-3 text-sm text-[var(--swimm-neutral-600)] outline-none transition focus:border-[var(--swimm-primary-500)] focus:ring-2 focus:ring-[var(--swimm-primary-500)]/30"
                rows={3}
              />
              <p className="mt-2 text-xs text-[var(--swimm-neutral-400)]">{saveCopy.feedbackHint}</p>
            </div>

            {submitStatus === "success" ? (
              <div className="rounded-2xl border border-[var(--swimm-up)] bg-[var(--swimm-up)]/10 px-4 py-3 text-sm text-[var(--swimm-up)]">
                {feedbackCopy.success}
              </div>
            ) : null}
            {submitStatus === "error" ? (
              <div className="rounded-2xl border border-[var(--swimm-down)] bg-[var(--swimm-down)]/10 px-4 py-3 text-sm text-[var(--swimm-down)]">
                {submitError ?? feedbackCopy.genericError}
              </div>
            ) : null}

            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={disableSubmit}
                className="inline-flex items-center justify-center rounded-full border border-[var(--swimm-primary-700)] bg-[var(--swimm-primary-500)]/15 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--swimm-primary-700)] transition hover:-translate-y-0.5 hover:bg-[var(--swimm-primary-500)]/25 disabled:cursor-not-allowed disabled:border-[var(--swimm-neutral-300)] disabled:bg-[var(--swimm-neutral-200)]/60 disabled:text-[var(--swimm-neutral-400)]"
              >
                {isSubmitting ? feedbackCopy.updatingButton : feedbackCopy.submitButton}
              </button>
            </div>
          </form>
        )}
      </section>
      ) : null}

    </>
  );
}
