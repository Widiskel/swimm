"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import type { CandlestickData } from "lightweight-charts";

import { SiteHeader } from "@/components/SiteHeader";
import type { AgentResponse } from "@/features/analysis/types";
import { HistoryLiveChart } from "@/features/history/components/HistoryLiveChart";
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

type SharedHistoryEntry = {
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
      time: number;
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

  const chartSymbol = useMemo(
    () => entry?.response.market?.pair ?? entry?.pair ?? "BTCUSDT",
    [entry?.response.market?.pair, entry?.pair]
  );

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
          candle.color = "#ffffff";
          candle.wickColor = "#ffffff";
          candle.borderColor = "#ffffff";
        }
        return candle;
      })
      .filter((value): value is CandlestickData => value !== null);
  }, [entry?.snapshot?.candles, entry?.snapshot?.extensionStartTime]);

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

  const entriesList = useMemo(() => {
    if (!plan) return [] as number[];
    if (Array.isArray(plan.entries) && plan.entries.length) {
      return plan.entries;
    }
    return typeof plan.entry === "number" ? [plan.entry] : ([] as number[]);
  }, [plan]);

  const targetsList = useMemo(() => plan?.takeProfits ?? [], [plan?.takeProfits]);

  const highlights = entry?.response.highlights ?? [];
  const nextSteps = entry?.response.nextSteps ?? [];

  const renderPlanList = (values: number[], emptyLabel: string) => {
    if (!values.length) {
      return <p className="text-sm text-[var(--swimm-neutral-500)]">{emptyLabel}</p>;
    }
    return (
      <ul className="mt-2 space-y-1">
        {values.map((value, index) => (
          <li
            key={`${value}-${index}`}
            className="rounded-xl border border-[var(--swimm-neutral-200)] bg-[var(--swimm-neutral-50)] px-3 py-2 font-mono text-sm text-[var(--swimm-navy-900)]"
          >
            {value}
          </li>
        ))}
      </ul>
    );
  };

  const renderList = (items: string[], emptyLabel: string) => {
    if (!items.length) {
      return <p className="text-sm text-[var(--swimm-neutral-500)]">{emptyLabel}</p>;
    }
    return (
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--swimm-neutral-600)]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  };

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

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-[var(--swimm-navy-900)]">
            {shareCopy.liveChartTitle}
          </h2>
          <HistoryLiveChart
            symbol={chartSymbol}
            provider={resolvedProvider}
            mode={resolvedMode}
            timeframe={liveDefaultTimeframe}
            snapshotCapturedAt={entry.snapshot?.capturedAt ?? entry.createdAt}
            snapshotCandles={snapshotCandles}
            variant="chartOnly"
          />
        </div>

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
          <h2 className="text-lg font-semibold text-[var(--swimm-navy-900)]">{shareCopy.summaryTitle}</h2>
          <p className="mt-2 text-sm text-[var(--swimm-neutral-600)]">
            {entry.summary || entry.response.summary}
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--swimm-navy-900)]">{shareCopy.rationaleLabel}</h3>
              <p className="mt-1 text-sm text-[var(--swimm-neutral-500)]">
                {entry.response.decision?.rationale || plan?.rationale || shareCopy.noRationale}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--swimm-navy-900)]">{shareCopy.forecastLabel}</h3>
              <p className="mt-1 text-sm text-[var(--swimm-neutral-500)]">
                {entry.response.market?.chart?.forecast || shareCopy.noForecast}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white/90 p-6 shadow-sm ring-1 ring-[var(--swimm-neutral-200)]">
          <h2 className="text-lg font-semibold text-[var(--swimm-navy-900)]">{shareCopy.tradePlanTitle}</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-[var(--swimm-neutral-700)]">{shareCopy.entriesLabel}</h3>
              {renderPlanList(entriesList, shareCopy.noEntries)}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--swimm-neutral-700)]">{shareCopy.targetsLabel}</h3>
              {renderPlanList(targetsList, shareCopy.noTargets)}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--swimm-neutral-700)]">{shareCopy.stopLabel}</h3>
              <p className="mt-2 font-mono text-sm text-[var(--swimm-navy-900)]">
                {typeof plan?.stopLoss === "number" ? plan.stopLoss : shareCopy.noStop}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--swimm-neutral-700)]">{shareCopy.sizingLabel}</h3>
              <p className="mt-2 text-sm text-[var(--swimm-neutral-500)]">
                {plan?.sizingNotes?.trim().length ? plan.sizingNotes : shareCopy.noSizing}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white/90 p-6 shadow-sm ring-1 ring-[var(--swimm-neutral-200)]">
          <h2 className="text-lg font-semibold text-[var(--swimm-navy-900)]">{shareCopy.highlightsTitle}</h2>
          {renderList(highlights, shareCopy.noHighlights)}
          <h3 className="mt-4 text-sm font-semibold text-[var(--swimm-neutral-700)]">{shareCopy.nextStepsTitle}</h3>
          {renderList(nextSteps, shareCopy.noNextSteps)}
        </section>

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
