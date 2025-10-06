"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";

import { SiteHeader } from "@/components/SiteHeader";
import type { AgentResponse } from "@/features/analysis/types";
import { HistoryEntryAnalysis } from "@/features/history/components/HistoryEntryAnalysis";
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
      openTime: number;
      open: number;
      high: number;
      low: number;
      close: number;
      time?: number;
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

const badgeClasses: Record<string, string> = {
  buy: "bg-[var(--swimm-up)]/10 text-[var(--swimm-up)] ring-1 ring-[var(--swimm-up)]/30",
  sell: "bg-[var(--swimm-down)]/10 text-[var(--swimm-down)] ring-1 ring-[var(--swimm-down)]/30",
  hold: "bg-[var(--swimm-neutral-100)] text-[var(--swimm-neutral-500)] ring-1 ring-[var(--swimm-neutral-200)]",
};

export default function SharedHistoryPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = use(params);
  const { messages, languageTag } = useLanguage();
  const historyCopy = messages.history;
  const detailCopy = historyCopy.detail;
  const summaryCopy = historyCopy.summaryRow;
  const shareCopy = historyCopy.shareView;
  const verdictCopy = historyCopy.entryCard.verdict;

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
          ...entry.snapshot,
          extensionStartTime:
            typeof entry.snapshot.extensionStartTime === "number"
              ? entry.snapshot.extensionStartTime
              : null,
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
          setError(
            fetchError instanceof Error ? fetchError.message : shareCopy.notFoundDescription
          );
          setStatus("error");
        }
      }
    };

    void fetchEntry();
    return () => {
      cancelled = true;
    };
  }, [shareId, shareCopy.notFoundDescription]);

  const metaFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(languageTag, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [languageTag]
  );

  const decisionLabel = useMemo(() => {
    const value =
      historyEntry?.decision?.action ?? historyEntry?.response.decision?.action ?? "";
    if (!value) {
      return summaryCopy.noDecision;
    }
    return value.toUpperCase();
  }, [historyEntry?.decision?.action, historyEntry?.response.decision?.action, summaryCopy.noDecision]);

  const verdictLabel = useMemo(() => {
    const key = historyEntry?.verdict ?? "unknown";
    return verdictCopy[key as keyof typeof verdictCopy] ?? summaryCopy.noVerdict;
  }, [historyEntry?.verdict, summaryCopy.noVerdict, verdictCopy]);

  const createdLabel = useMemo(() => {
    if (!historyEntry) {
      return "";
    }
    return metaFormatter.format(new Date(historyEntry.createdAt));
  }, [historyEntry, metaFormatter]);

  const updatedLabel = useMemo(() => {
    if (!historyEntry) {
      return "";
    }
    return metaFormatter.format(new Date(historyEntry.updatedAt));
  }, [historyEntry, metaFormatter]);

  const renderContent = () => {
    if (status === "loading") {
      return (
        <div className="rounded-3xl bg-white/90 p-10 text-center text-sm text-[var(--swimm-neutral-500)] shadow-sm ring-1 ring-[var(--swimm-neutral-200)]">
          {shareCopy.loading ?? "Loading shared analysis..."}
        </div>
      );
    }

    if (status === "error" || !entry || !historyEntry) {
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

    const decisionKey = (
      historyEntry.decision?.action ?? historyEntry.response.decision?.action ?? ""
    ).toLowerCase();
    const badgeClass = badgeClasses[decisionKey] ?? badgeClasses.hold;
    const formattedPair = `${historyEntry.pair} ${String.fromCharCode(8226)} ${historyEntry.timeframe.toUpperCase()}`;

    return (
      <div className="space-y-6">
        <section className="rounded-3xl bg-white/90 p-6 shadow-sm ring-1 ring-[var(--swimm-neutral-200)]">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--swimm-navy-900)]">
                {formattedPair}
              </h1>
              <p className="mt-1 text-sm text-[var(--swimm-neutral-500)]">
                {historyCopy.entryCard.provider}: {historyEntry.provider.toUpperCase()} / {" "}
                {historyEntry.mode.toUpperCase()}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span
                className={`inline-flex items-center justify-center rounded-full px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] ${badgeClass}`}
              >
                {detailCopy.decisionLabel}: {decisionLabel}
              </span>
              <span className="inline-flex items-center justify-center rounded-full bg-[var(--swimm-neutral-100)] px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--swimm-neutral-600)] ring-1 ring-[var(--swimm-neutral-200)]">
                {detailCopy.verdictLabel}: {verdictLabel}
              </span>
            </div>
            <div className="grid gap-2 text-xs text-[var(--swimm-neutral-500)] sm:grid-cols-2">
              <div>
                <span className="font-semibold text-[var(--swimm-neutral-700)]">
                  {detailCopy.metaCreated}:
                </span>{" "}
                {createdLabel}
              </div>
              <div>
                <span className="font-semibold text-[var(--swimm-neutral-700)]">
                  {detailCopy.metaUpdated}:
                </span>{" "}
                {updatedLabel}
              </div>
            </div>
          </div>
        </section>

        <HistoryEntryAnalysis entry={historyEntry} onUpdateEntry={handleNoopUpdate} readOnly />
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

