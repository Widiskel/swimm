"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import type { CandlestickData } from "lightweight-charts";

import { SiteHeader } from "@/components/SiteHeader";
import type { AgentResponse } from "@/features/analysis/types";
import { HistoryEntryAnalysis } from "@/features/history/components/HistoryEntryAnalysis";
import { HistorySnapshotChart } from "@/features/history/components/HistorySnapshotChart";
import {
  DEFAULT_MARKET_MODE,
  isMarketMode,
  type MarketMode,
} from "@/features/market/constants";
import {
  DEFAULT_PROVIDER,
  isCexProvider,
  type CexProvider,
} from "@/features/market/exchanges";
import { useLanguage } from "@/providers/language-provider";
import type { HistoryEntry, HistoryVerdict } from "@/providers/history-provider";

type SharedHistoryEntry = {
  id: string | null;
  shareId: string | null;
  pair: string;
  timeframe: string;
  provider: string;
  mode: string;
  decision: AgentResponse["decision"] | null;
  summary: string;
  response: AgentResponse;
  verdict: string;
  feedback: string | null;
  executed: boolean | null;
  snapshot: {
    timeframe: string;
    capturedAt: string;
    candles: Array<{
      time?: number;
      openTime?: number;
      open: number;
      high: number;
      low: number;
      close: number;
    }>;
    result?: {
      type: "entry" | "target" | "stop";
      index?: number;
    } | null;
    extensionStartTime?: number | null;
    entryCandles?: Array<{
      openTime?: number;
      time?: number;
      open: number;
      high: number;
      low: number;
      close: number;
    }>;
    targetCandles?: Array<{
      openTime?: number;
      time?: number;
      open: number;
      high: number;
      low: number;
      close: number;
    }>;
    stopCandles?: Array<{
      openTime?: number;
      time?: number;
      open: number;
      high: number;
      low: number;
      close: number;
    }>;
  } | null;
  createdAt: string;
  updatedAt: string;
  shareCreatedAt: string | null;
};

const formatTemplate = (template: string, value: string) =>
  template.includes("{timestamp}") ? template.replace("{timestamp}", value) : `${template} ${value}`;

export default function SharedHistoryPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = use(params);
  const { messages, languageTag } = useLanguage();
  const shareCopy = messages.history.shareView;
  const verdictCopy = messages.history.entryCard.verdict;

  const [entry, setEntry] = useState<SharedHistoryEntry | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [error, setError] = useState<string | null>(null);

  const resolvedProvider = useMemo<CexProvider>(() => {
    if (!entry?.provider || !isCexProvider(entry.provider)) {
      return DEFAULT_PROVIDER;
    }
    return entry.provider;
  }, [entry?.provider]);

  const resolvedMode = useMemo<MarketMode>(() => {
    if (!entry?.mode || !isMarketMode(entry.mode)) {
      return DEFAULT_MARKET_MODE;
    }
    return entry.mode;
  }, [entry?.mode]);

  const historyEntry = useMemo<HistoryEntry | null>(() => {
    if (!entry) {
      return null;
    }

    const rawVerdict = entry.verdict?.toLowerCase() ?? "";
    const normalizedVerdict: HistoryVerdict =
      rawVerdict === "accurate" || rawVerdict === "inaccurate"
        ? (rawVerdict as HistoryVerdict)
        : "unknown";

    const snapshot = entry.snapshot
      ? {
          timeframe: entry.snapshot.timeframe,
          capturedAt: entry.snapshot.capturedAt,
          candles: (entry.snapshot.candles ?? []).reduce<Array<{
            openTime: number;
            open: number;
            high: number;
            low: number;
            close: number;
            time?: number;
          }>>((acc, item) => {
            const rawTime =
              typeof item.time === "number" && Number.isFinite(item.time)
                ? item.time
                : typeof item.openTime === "number" &&
                  Number.isFinite(item.openTime)
                ? Math.floor(item.openTime / 1000)
                : null;

            if (rawTime === null) {
              return acc;
            }

            const openTime =
              typeof item.openTime === "number" && Number.isFinite(item.openTime)
                ? item.openTime
                : rawTime * 1000;

            acc.push({
              openTime,
              open: item.open,
              high: item.high,
              low: item.low,
              close: item.close,
              time: rawTime,
            });
            return acc;
          }, []),
          result: entry.snapshot.result ?? null,
          extensionStartTime:
            typeof entry.snapshot.extensionStartTime === "number"
              ? entry.snapshot.extensionStartTime
              : null,
          entryCandles: entry.snapshot.entryCandles,
          targetCandles: entry.snapshot.targetCandles,
          stopCandles: entry.snapshot.stopCandles,
        }
      : undefined;

    return {
      id: entry.id ?? entry.shareId ?? "shared-entry",
      sessionId: "",
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      pair: entry.pair,
      timeframe: entry.timeframe,
      provider: resolvedProvider,
      mode: resolvedMode,
      decision: entry.decision,
      summary: entry.summary,
      response: entry.response,
      verdict: normalizedVerdict,
      feedback: entry.feedback ?? null,
      executed: entry.executed,
      snapshot,
      shareId: entry.shareId,
      shareCreatedAt: entry.shareCreatedAt,
    };
  }, [entry, resolvedProvider, resolvedMode]);

  const liveDefaultTimeframe = useMemo(
    () =>
      (entry?.decision?.timeframe ?? entry?.timeframe ?? "1h")
        .toLowerCase?.()
        .trim() || "1h",
    [entry?.decision?.timeframe, entry?.timeframe]
  );

  const snapshotBaseTimeframe = useMemo(
    () =>
      entry?.snapshot?.timeframe?.toLowerCase?.() ?? liveDefaultTimeframe,
    [entry?.snapshot?.timeframe, liveDefaultTimeframe]
  );

  const snapshotCandles = useMemo<CandlestickData[]>(() => {
    if (!entry?.snapshot?.candles?.length) {
      return [];
    }
    const extensionStartTime =
      typeof entry.snapshot.extensionStartTime === "number" &&
      Number.isFinite(entry.snapshot.extensionStartTime)
        ? entry.snapshot.extensionStartTime
        : null;
    return entry.snapshot.candles
      .map((item) => {
        const time = Number(item.time ?? 0);
        if (!Number.isFinite(time)) {
          return null;
        }
        const candle: CandlestickData = {
          time: time as CandlestickData["time"],
          open: Number(item.open),
          high: Number(item.high),
          low: Number(item.low),
          close: Number(item.close),
        };
        if (extensionStartTime !== null && time > extensionStartTime) {
          const isBearish = candle.close < candle.open;
          candle.color = isBearish
            ? "rgba(248,113,113,0.2)"
            : "rgba(74,222,128,0.2)";
          candle.wickColor = isBearish
            ? "rgba(248,113,113,0.4)"
            : "rgba(74,222,128,0.4)";
          candle.borderColor = candle.color;
        }
        return candle;
      })
      .filter((value): value is CandlestickData => value !== null);
  }, [entry?.snapshot?.candles, entry?.snapshot?.extensionStartTime]);

  const handleNoopUpdate = useCallback(async () => {
    if (!historyEntry) {
      throw new Error("Shared analysis not ready.");
    }
    return historyEntry;
  }, [historyEntry]);

  useEffect(() => {
    let cancelled = false;
    const fetchEntry = async () => {
      setStatus("loading");
      setError(null);
      try {
        const res = await fetch(`/api/history/share/${shareId}`, {
          method: "GET",
          cache: "no-store",
        });
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { error?: string } | null;
          if (!cancelled) {
            setError(payload?.error ?? shareCopy.notFoundDescription);
            setStatus("error");
          }
          return;
        }
        const payload = (await res.json()) as { entry: SharedHistoryEntry };
        if (!cancelled) {
          setEntry(payload.entry);
          setStatus("ready");
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : shareCopy.notFoundDescription);
          setStatus("error");
        }
      }
    };

    void fetchEntry();
    return () => {
      cancelled = true;
    };
  }, [shareId, shareCopy.notFoundDescription]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(languageTag, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [languageTag]
  );

  const decisionLabel = useMemo(() => {
    if (!entry?.decision?.action) {
      return messages.history.summaryRow.noDecision;
    }
    return entry.decision.action.toUpperCase();
  }, [entry?.decision?.action, messages.history.summaryRow.noDecision]);

  const verdictLabel = useMemo(() => {
    if (!entry?.verdict) {
      return messages.history.summaryRow.noVerdict;
    }
    return verdictCopy[entry.verdict as keyof typeof verdictCopy] ?? entry.verdict;
  }, [entry?.verdict, verdictCopy, messages.history.summaryRow.noVerdict]);

  const executionStatusLabel = useMemo(() => {
    if (entry?.executed === true) {
      return shareCopy.executionExecuted;
    }
    if (entry?.executed === false) {
      return shareCopy.executionReference;
    }
    return shareCopy.executionPending;
  }, [
    entry?.executed,
    shareCopy.executionExecuted,
    shareCopy.executionReference,
    shareCopy.executionPending,
  ]);

  const sharedAt = entry?.shareCreatedAt
    ? dateFormatter.format(new Date(entry.shareCreatedAt))
    : null;
  const updatedAt = entry?.updatedAt ? dateFormatter.format(new Date(entry.updatedAt)) : null;

  const plan = entry?.response.tradePlan;

  const entryLevels = useMemo(() => {
    if (!plan) return [] as number[];
    if (Array.isArray(plan.entries) && plan.entries.length) {
      return plan.entries;
    }
    return typeof plan.entry === "number" ? [plan.entry] : ([] as number[]);
  }, [plan]);

  const targetLevels = useMemo(() => plan?.takeProfits ?? [], [plan]);

  const stopLevel = useMemo(
    () => (typeof plan?.stopLoss === "number" ? plan.stopLoss : null),
    [plan]
  );

  const renderContent = () => {
    if (status === "loading") {
      return (
        <div className="rounded-3xl bg-white/90 p-10 text-center text-sm text-[var(--swimm-neutral-500)] shadow-sm ring-1 ring-[var(--swimm-neutral-200)]">
          {shareCopy.loading ?? "Loading shared analysis..."}
        </div>
      );
    }

    if (status === "error" || !entry) {
      return (
        <div className="space-y-4 rounded-3xl bg-white/90 p-10 text-center shadow-sm ring-1 ring-[var(--swimm-neutral-200)]">
          <h2 className="text-2xl font-semibold text-[var(--swimm-navy-900)]">
            {shareCopy.notFoundTitle}
          </h2>
          <p className="text-sm text-[var(--swimm-neutral-500)]">
            {error ?? shareCopy.notFoundDescription}
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-[var(--swimm-primary-500)] bg-[var(--swimm-primary-500)] px-5 py-2 text-sm font-semibold text-[var(--swimm-navy-900)] shadow-[var(--swimm-glow)] transition hover:-translate-y-0.5"
          >
            {shareCopy.backCta}
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <section className="rounded-3xl bg-white/90 p-6 shadow-sm ring-1 ring-[var(--swimm-neutral-200)]">
          <div className="flex flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--swimm-primary-500)]/30 bg-[var(--swimm-primary-500)]/15 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--swimm-primary-700)]">
              {shareCopy.badge}
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-[var(--swimm-navy-900)]">
                {entry.pair} • {entry.timeframe.toUpperCase()}
              </h1>
              <p className="mt-2 text-sm text-[var(--swimm-neutral-500)]">{shareCopy.description}</p>
            </div>
            <div className="grid gap-2 text-xs text-[var(--swimm-neutral-500)] sm:grid-cols-2">
              <div>
                <span className="font-semibold text-[var(--swimm-neutral-700)]">{shareCopy.providerLabel}:</span> {entry.provider.toUpperCase()}
              </div>
              <div>
                <span className="font-semibold text-[var(--swimm-neutral-700)]">{shareCopy.modeLabel}:</span> {entry.mode.toUpperCase()}
              </div>
              <div>
                <span className="font-semibold text-[var(--swimm-neutral-700)]">{shareCopy.decisionLabel}:</span> {decisionLabel}
              </div>
              <div>
                <span className="font-semibold text-[var(--swimm-neutral-700)]">{shareCopy.verdictLabel}:</span> {verdictLabel}
              </div>
              <div>
                <span className="font-semibold text-[var(--swimm-neutral-700)]">{shareCopy.executionLabel}:</span> {executionStatusLabel}
              </div>
              {sharedAt ? (
                <div>
                  <span className="font-semibold text-[var(--swimm-neutral-700)]">
                    {formatTemplate(shareCopy.sharedAt, sharedAt)}
                  </span>
                </div>
              ) : null}
              {updatedAt ? (
                <div>
                  <span className="font-semibold text-[var(--swimm-neutral-700)]">
                    {formatTemplate(shareCopy.updatedAt, updatedAt)}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {historyEntry ? (
          <HistoryEntryAnalysis
            entry={historyEntry}
            onUpdateEntry={handleNoopUpdate}
            readOnly
          />
        ) : null}

        {snapshotCandles.length ? (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--swimm-navy-900)]">
              {shareCopy.snapshotChartTitle}
            </h2>
            <HistorySnapshotChart
              title={shareCopy.snapshotChartTitle}
              candles={snapshotCandles}
              baseTimeframe={snapshotBaseTimeframe}
              capturedLabel={
                entry.snapshot?.capturedAt
                  ? dateFormatter.format(new Date(entry.snapshot.capturedAt))
                  : null
              }
              defaultTimeframe={liveDefaultTimeframe}
              entryLevels={entryLevels}
              targetLevels={targetLevels}
              stopLevel={stopLevel}
              result={entry.snapshot?.result ?? null}
            />
          </div>
        ) : null}

        <section className="rounded-3xl bg-white/90 p-6 shadow-sm ring-1 ring-[var(--swimm-neutral-200)]">
          <h2 className="text-lg font-semibold text-[var(--swimm-navy-900)]">{shareCopy.feedbackLabel}</h2>
          <p className="mt-2 text-sm text-[var(--swimm-neutral-500)]">
            {entry.feedback?.trim().length ? entry.feedback : shareCopy.noFeedback}
          </p>
        </section>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--swimm-bg)] text-[var(--swimm-text)]">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-12 space-y-6">{renderContent()}</main>
    </div>
  );
}

