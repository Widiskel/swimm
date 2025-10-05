"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { CandlestickData } from "lightweight-charts";
import type { HistorySnapshotResult } from "@/features/history/types";

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
import {
  INDICATOR_CONFIG,
  DEFAULT_MARKET_MODE,
  type AssetCategory,
  type MarketMode,
} from "@/features/market/constants";
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

const toIsoTime = (time: CandlestickData["time"]): string | null => {
  if (typeof time === "number" && Number.isFinite(time)) {
    return new Date(time * 1000).toISOString();
  }
  if (typeof time === "string") {
    const parsed = Date.parse(time);
    if (Number.isFinite(parsed)) {
      return new Date(parsed).toISOString();
    }
    return null;
  }
  if (time && typeof time === "object") {
    const maybeDay = time as { year?: number; month?: number; day?: number };
    if (
      typeof maybeDay.year === "number" &&
      typeof maybeDay.month === "number" &&
      typeof maybeDay.day === "number"
    ) {
      const epochMs = Date.UTC(maybeDay.year, maybeDay.month - 1, maybeDay.day);
      if (Number.isFinite(epochMs)) {
        return new Date(epochMs).toISOString();
      }
    }
  }
  return null;
};

const buildRangePoints = (candles: CandlestickData[]) => {
  const points = candles
    .map((item) => {
      const isoTime = toIsoTime(item.time);
      if (!isoTime) {
        return null;
      }
      return { time: isoTime, close: item.close };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  return points as Parameters<typeof buildChartRangeLabels>[0];
};

const sanitizeCandles = (candles: CandlestickData[]) => {
  const map = new Map<number, CandlestickData>();
  for (const item of candles) {
    if (typeof item.time !== "number" || !Number.isFinite(item.time)) {
      continue;
    }
    map.set(item.time, item);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, value]) => value);
};

const resolveDirection = (entry: HistoryEntry | null | undefined) => {
  const plan = entry?.response.tradePlan;
  const bias = plan?.bias;
  if (bias === "long" || bias === "short") {
    return bias;
  }

  const action = entry?.response.decision?.action ?? entry?.decision?.action;
  if (action === "buy") {
    return "long";
  }
  if (action === "sell") {
    return "short";
  }

  if (!plan) {
    return null;
  }

  const entryCandidates = Array.isArray(plan.entries)
    ? plan.entries.filter((value) => typeof value === "number" && Number.isFinite(value))
    : [];
  if (
    typeof plan.entry === "number" &&
    Number.isFinite(plan.entry) &&
    !entryCandidates.length
  ) {
    entryCandidates.push(plan.entry);
  }
  const entryPrice = entryCandidates.length
    ? entryCandidates.reduce((sum, value) => sum + value, 0) / entryCandidates.length
    : null;

  const rawTargets = plan.takeProfits ?? [];
  const numericTargets = rawTargets.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  );

  if (entryPrice !== null && numericTargets.length) {
    const maxTarget = Math.max(...numericTargets);
    const minTarget = Math.min(...numericTargets);
    if (maxTarget > entryPrice) {
      return "long";
    }
    if (minTarget < entryPrice) {
      return "short";
    }
  }

  if (entryPrice !== null && typeof plan.stopLoss === "number" && Number.isFinite(plan.stopLoss)) {
    if (plan.stopLoss < entryPrice) {
      return "long";
    }
    if (plan.stopLoss > entryPrice) {
      return "short";
    }
  }

  return null;
};

type SnapshotResult = HistorySnapshotResult | null;

const collectEntryPrices = (plan: HistoryEntry["response"]["tradePlan"], fallbackEntry?: number | null) => {
  const values: number[] = [];
  if (plan) {
    if (Array.isArray(plan.entries)) {
      for (const value of plan.entries) {
        if (typeof value === "number" && Number.isFinite(value)) {
          values.push(value);
        }
      }
    }
    if (typeof plan.entry === "number" && Number.isFinite(plan.entry)) {
      values.push(plan.entry);
    }
  }
  if (typeof fallbackEntry === "number" && Number.isFinite(fallbackEntry)) {
    values.push(fallbackEntry);
  }
  return values;
};

const computeEntryRange = (plan: HistoryEntry["response"]["tradePlan"], fallbackEntry?: number | null) => {
  const entries = collectEntryPrices(plan, fallbackEntry);
  if (!entries.length) {
    return null as { min: number; max: number } | null;
  }
  return {
    min: Math.min(...entries),
    max: Math.max(...entries),
  };
};

const collectTargetLevels = (plan: HistoryEntry["response"]["tradePlan"]) => {
  if (!plan || !Array.isArray(plan.takeProfits)) {
    return [] as number[];
  }
  return plan.takeProfits
    .map((value) =>
      typeof value === "number" && Number.isFinite(value) ? value : null
    )
    .filter((value): value is number => value !== null);
};

const computeStopLoss = (plan: HistoryEntry["response"]["tradePlan"]) => {
  if (!plan || typeof plan.stopLoss !== "number" || !Number.isFinite(plan.stopLoss)) {
    return null;
  }
  return plan.stopLoss;
};

const detectSnapshotResult = (
  entry: HistoryEntry,
  candles: CandlestickData[]
): SnapshotResult => {
  const plan = entry.response.tradePlan;
  if (!plan || !candles.length) {
    return null;
  }
  const direction = resolveDirection(entry);
  if (!direction) {
    return null;
  }

  const entryRange = computeEntryRange(plan);
  const targetLevels = collectTargetLevels(plan);
  const stopPrice = computeStopLoss(plan);

  const eventIndex = candles.length > 1 ? candles.length - 2 : candles.length - 1;
  const eventCandle = candles[eventIndex];
  if (!eventCandle) {
    return null;
  }

  if (
    stopPrice !== null &&
    (direction === "short"
      ? eventCandle.low <= stopPrice || eventCandle.high >= stopPrice
      : eventCandle.low <= stopPrice)
  ) {
    return { type: "stop" };
  }

  if (targetLevels.length) {
    let bestTargetIndex: number | null = null;
    let bestTargetValue: number | null = null;
    targetLevels.forEach((value, index) => {
      const hit =
        direction === "short"
          ? eventCandle.low <= value
          : eventCandle.high >= value;
      if (!hit) {
        return;
      }
      if (bestTargetIndex === null || bestTargetValue === null) {
        bestTargetIndex = index;
        bestTargetValue = value;
        return;
      }
      const isBetter = direction === "short" ? value < bestTargetValue : value > bestTargetValue;
      if (isBetter) {
        bestTargetIndex = index;
        bestTargetValue = value;
      }
    });
    if (bestTargetIndex !== null) {
      return { type: "target", index: bestTargetIndex };
    }
  }

  if (
    entryRange &&
    eventCandle.low <= entryRange.max &&
    eventCandle.high >= entryRange.min
  ) {
    return { type: "entry" };
  }

  return null;
};

const buildSnapshotContext = (
  entry: HistoryEntry | null | undefined
): {
  candles: CandlestickData[];
  result: SnapshotResult;
  extensionStartTime: number | null;
} => {
  const snapshot = entry?.snapshot;
  if (!snapshot?.candles?.length) {
    return { candles: [] as CandlestickData[], result: null, extensionStartTime: null };
  }

  const toCandlestick = (item: {
    openTime?: number;
    time?: number;
    open: number;
    high: number;
    low: number;
    close: number;
  }): CandlestickData | null => {
    const rawTime =
      typeof item.time === "number" && Number.isFinite(item.time)
        ? item.time
        : typeof item.openTime === "number" && Number.isFinite(item.openTime)
        ? Math.floor(item.openTime / 1000)
        : null;
    if (rawTime === null) {
      return null;
    }
    return {
      time: rawTime as CandlestickData["time"],
      open: Number(item.open.toFixed(2)),
      high: Number(item.high.toFixed(2)),
      low: Number(item.low.toFixed(2)),
      close: Number(item.close.toFixed(2)),
    } satisfies CandlestickData;
  };

  const mapped = snapshot.candles
    .map((item) => toCandlestick(item))
    .filter((item): item is CandlestickData => item !== null);

  const sanitized = sanitizeCandles(mapped);
  if (!sanitized.length) {
    return { candles: [], result: null, extensionStartTime: null };
  }

  const normalizedResult: SnapshotResult = (() => {
    const base = snapshot.result;
    if (!base) {
      return null;
    }
    if (base.type === "entry") {
      return { type: "entry" };
    }
    if (base.type === "stop") {
      return { type: "stop" };
    }
    if (base.type === "target") {
      const index = typeof base.index === "number" && Number.isFinite(base.index)
        ? Math.max(0, Math.floor(base.index))
        : 0;
      return { type: "target", index };
    }
    return null;
  })();

  const fallbackResult = entry ? detectSnapshotResult(entry, sanitized) : null;

  const extensionStartTime =
    typeof snapshot.extensionStartTime === "number" && Number.isFinite(snapshot.extensionStartTime)
      ? snapshot.extensionStartTime
      : null;

  const decoratedCandles = sanitized.map((candle) => {
    const numericTime = typeof candle.time === "number" ? candle.time : Number(candle.time);
    if (extensionStartTime !== null && Number.isFinite(numericTime) && numericTime > extensionStartTime) {
      return {
        ...candle,
        color: "#ffffff",
        wickColor: "#ffffff",
        borderColor: "#ffffff",
      } satisfies CandlestickData;
    }
    return candle;
  });

  return {
    candles: decoratedCandles,
    result:
      normalizedResult ??
      fallbackResult ??
      (decoratedCandles.length ? ({ type: "entry" } as SnapshotResult) : null),
    extensionStartTime,
  };
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

  const originalTimeframe = (entry.decision?.timeframe ?? entry.timeframe ?? "1h").toLowerCase();
  const timeframe = originalTimeframe;
  const interval = mapTimeframeToInterval(timeframe);
  const symbol = entry.pair ?? entry.response.market?.pair ?? "BTCUSDT";
  const derivedMode: MarketMode = entry.mode ?? DEFAULT_MARKET_MODE;
  const derivedCategory: AssetCategory =
    entry.provider === "twelvedata" ? "gold" : "crypto";
  const snapshotContext = useMemo(() => buildSnapshotContext(entry), [entry]);
  const snapshotCandles = snapshotContext.candles;
  const snapshotResult = snapshotContext.result;

  useEffect(() => {
    setVerdictValue(entry.verdict);
    setFeedbackValue(entry.feedback ?? "");
    setSubmitError(null);
    setExecutionMessage(null);
    setExecutionError(null);
    setExecutedState(entry.executed);
  }, [entry.id, entry.verdict, entry.feedback, entry.executed]);

  const fetchSnapshotMessage = messages.live.errors.fetchSnapshot;

  const capturedAtMs = useMemo(() => {
    const fromSnapshot = entry.snapshot?.capturedAt
      ? Date.parse(entry.snapshot.capturedAt)
      : NaN;
    if (Number.isFinite(fromSnapshot)) {
      return fromSnapshot;
    }
    const fromCreated = Date.parse(entry.createdAt);
    return Number.isFinite(fromCreated) ? fromCreated : null;
  }, [entry.snapshot?.capturedAt, entry.createdAt]);

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
        if (entry.snapshot && snapshotCandles.length) {
          const base = entry.snapshot.timeframe?.toLowerCase?.() || originalTimeframe;
          const reshaped = resample(snapshotCandles, base, timeframe);
          const normalized = sanitizeCandles(reshaped).slice(-220);
          if (!cancelled) {
            setAnalysisCandles(normalized);
            const [startLabel, endLabel] = buildChartRangeLabels(
              buildRangePoints(normalized),
              languageTag
            );
            setChartStart(startLabel);
            setChartEnd(endLabel);
            setMarketError(null);
          }
          return;
        }
        const providerParam =
          (entry.provider as string) === "gold" ? "twelvedata" : entry.provider;
        const categoryParam = providerParam === "twelvedata" ? "gold" : "crypto";
        const effectiveMode = providerParam === "twelvedata" ? "spot" : entry.mode ?? DEFAULT_MARKET_MODE;

        const params = new URLSearchParams();
        params.set("symbol", symbol);
        params.set("interval", interval);
        params.set("provider", providerParam);
        params.set("category", categoryParam);
        params.set("mode", effectiveMode);

        const fallbackCaptured = capturedAtMs ?? Date.now();
        const startRange = Math.max(fallbackCaptured - 7 * 24 * 60 * 60 * 1000, 0);
        const endRange = capturedAtMs ?? Date.now();
        const intervalMsMap: Record<string, number> = {
          "1m": 60_000,
          "5m": 5 * 60_000,
          "15m": 15 * 60_000,
          "1h": 60 * 60_000,
          "4h": 4 * 60 * 60_000,
          "1d": 24 * 60 * 60_000,
        };
        const intervalMs = intervalMsMap[interval] ?? intervalMsMap["1h"];
        const estimatedLimit = Math.min(
          Math.ceil((endRange - startRange) / intervalMs) + 10,
          5000
        );
        params.set("limit", String(estimatedLimit));
        params.set("start", String(startRange));
        params.set("end", String(endRange));

        const response = await fetch(`/api/market?${params.toString()}`);
        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          let parsedMessage = errorText.trim();
          if (parsedMessage) {
            try {
              const parsed = JSON.parse(parsedMessage) as { error?: string };
              if (typeof parsed.error === "string" && parsed.error.trim().length) {
                parsedMessage = parsed.error.trim();
              }
            } catch {
              // ignore json parse error, fallback to raw text
            }
          }
          const finalMessage = parsedMessage || `Market request failed with ${response.status}`;
          if (!cancelled && finalMessage.toLowerCase().includes("pair is not supported")) {
            setAnalysisCandles([]);
            setChartStart("-");
            setChartEnd("-");
            setMarketError(finalMessage);
            setIsFetching(false);
            return;
          }
          throw new Error(finalMessage);
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
        const candles: CandlestickData[] = (payload.candles ?? []).map((item) => ({
          time: (item.openTime / 1000) as CandlestickData["time"],
          open: Number(item.open.toFixed(2)),
          high: Number(item.high.toFixed(2)),
          low: Number(item.low.toFixed(2)),
          close: Number(item.close.toFixed(2)),
        }));
        const sanitizedCandles = sanitizeCandles(candles);

        if (!cancelled) {
          if (!sanitizedCandles.length) {
            setAnalysisCandles([]);
            setChartStart("-");
            setChartEnd("-");
            setMarketError(fetchSnapshotMessage);
          } else {
            const limited = sanitizedCandles.slice(-220);
            setAnalysisCandles(limited);
            const [startLabel, endLabel] = buildChartRangeLabels(
              buildRangePoints(limited),
              languageTag
            );
            setChartStart(startLabel);
            setChartEnd(endLabel);
            setMarketError(null);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load history candles", error);
          setAnalysisCandles([]);
          setChartStart("-");
          setChartEnd("-");
          setMarketError(
            error instanceof Error ? error.message : fetchSnapshotMessage
          );
        }
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [
    entry,
    symbol,
    interval,
    timeframe,
    languageTag,
    originalTimeframe,
    capturedAtMs,
    fetchSnapshotMessage,
    snapshotCandles,
  ]);

  const priceFormatter = useMemo(
    () =>
      new Intl.NumberFormat(languageTag, {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
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
        snapshotCapturedAt={entry.snapshot?.capturedAt ?? entry.createdAt}
        snapshotCandles={snapshotCandles}
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
        marketMode={derivedMode}
        assetCategory={derivedCategory}
        sectionRef={sectionRef}
        snapshotResult={snapshotResult}
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
                            className="h-4 w-4 accent-[var(--swimm-primary-700)]"
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
