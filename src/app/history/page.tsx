"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";

import { SiteHeader } from "@/components/SiteHeader";
import { useHistory } from "@/providers/history-provider";
import { useLanguage } from "@/providers/language-provider";

const formatDate = (value: string, languageTag: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(languageTag, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export default function HistoryPage() {
  const { ready, authenticated, login } = usePrivy();
  const { entries, clearEntries } = useHistory();
  const { messages, languageTag } = useLanguage();
  const historyCopy = messages.history;

  const totalBuy = useMemo(
    () => entries.filter((item) => item.decision?.action === "buy").length,
    [entries]
  );
  const totalSell = useMemo(
    () => entries.filter((item) => item.decision?.action === "sell").length,
    [entries]
  );
  const totalHold = useMemo(
    () => entries.filter((item) => item.decision?.action === "hold").length,
    [entries]
  );

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <SiteHeader />
        <main className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center px-6 text-center">
          <p className="text-lg text-slate-300">{historyCopy.connecting}</p>
        </main>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <SiteHeader />
        <main className="mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center gap-6 px-6 text-center">
          <span className="rounded-full border border-slate-800 px-4 py-1 text-xs uppercase tracking-[0.35em] text-slate-400">
            {historyCopy.protectedBadge}
          </span>
          <h2 className="text-3xl font-semibold text-slate-50 sm:text-4xl">
            {historyCopy.signInHeading}
          </h2>
          <p className="max-w-2xl text-base text-slate-400">
            {historyCopy.signInDescription}
          </p>
          <button
            type="button"
            onClick={() => login?.()}
            className="rounded-md border border-sky-500 px-6 py-2 text-sm font-medium text-slate-100 transition hover:bg-sky-500/10"
          >
            {historyCopy.signInButton}
          </button>
        </main>
      </div>
    );
  }

  const metrics = [
    {
      label: historyCopy.metrics.totalAnalyses,
      value: entries.length,
      className: "text-slate-50",
    },
    {
      label: historyCopy.metrics.buySignals,
      value: totalBuy,
      className: "text-emerald-400",
    },
    {
      label: historyCopy.metrics.sellHoldSignals,
      value: totalSell + totalHold,
      className: "text-amber-300",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-slate-50">
              {historyCopy.title}
            </h2>
            <p className="mt-2 text-sm text-slate-400">{historyCopy.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={clearEntries}
            disabled={entries.length === 0}
            className="self-start rounded-md border border-rose-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-rose-300 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
          >
            {historyCopy.clearButton}
          </button>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
            >
              <p className="text-sm text-slate-400">{metric.label}</p>
              <p className={`mt-2 text-3xl font-semibold ${metric.className}`}>
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        {entries.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-10 text-center">
            <h3 className="text-xl font-semibold text-slate-200">
              {historyCopy.empty.title}
            </h3>
            <p className="mt-3 text-sm text-slate-400">
              {historyCopy.empty.descriptionPrefix}
              <Link href="/analysis" className="text-sky-400 hover:underline">
                {historyCopy.empty.linkText}
              </Link>
              {historyCopy.empty.descriptionSuffix}
            </p>
          </div>
        ) : (
          <div className="mt-12 space-y-6">
            {entries.map((entry) => {
              const entryValues = (entry.response.tradePlan.entries ?? []).length
                ? entry.response.tradePlan.entries ?? []
                : [entry.response.tradePlan.entry];
              const takeProfits = entry.response.tradePlan.takeProfits ?? [];

              return (
                <article
                  key={entry.id}
                  className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6 shadow-lg shadow-sky-500/5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                        {entry.pair} - {entry.timeframe}
                      </p>
                      <h4 className="mt-1 text-lg font-semibold text-slate-50">
                        {entry.decision?.action?.toUpperCase() ?? "NO SIGNAL"} -
                        {" "}
                        {formatDate(entry.createdAt, languageTag)}
                      </h4>
                      <p className="mt-2 text-sm text-slate-300 line-clamp-3">
                        {entry.summary}
                      </p>
                    </div>
                    <div className="flex flex-col items-start gap-2 text-sm text-slate-300 sm:items-end">
                      <span>
                        {historyCopy.entryCard.confidence}: {(entry.decision?.confidence ?? 0).toLocaleString(
                          languageTag,
                          {
                            style: "percent",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }
                        )}
                      </span>
                      <span>
                        {historyCopy.entryCard.planTimeframe}: {entry.decision?.timeframe ?? entry.timeframe}
                      </span>
                      <Link
                        href={{ pathname: "/analysis", query: { fromHistory: entry.id } }}
                        className="rounded-md border border-slate-700 px-4 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-800/60"
                      >
                        {historyCopy.entryCard.openInDashboard}
                      </Link>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4 text-xs text-slate-400 sm:grid-cols-2">
                    <div>
                      <h5 className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                        {historyCopy.entryCard.entries}
                      </h5>
                      <p className="mt-1 text-sm text-slate-200">
                        {entryValues
                          .filter((value): value is number => typeof value === "number")
                          .map((value) => value.toFixed(2))
                          .join(" | ") || "-"}
                      </p>
                    </div>
                    <div>
                      <h5 className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                        {historyCopy.entryCard.takeProfits}
                      </h5>
                      <p className="mt-1 text-sm text-slate-200">
                        {takeProfits.map((value) => value.toFixed(2)).join(" | ") || "-"}
                      </p>
                    </div>
                    <div>
                      <h5 className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                        {historyCopy.entryCard.stopLoss}
                      </h5>
                      <p className="mt-1 text-sm text-slate-200">
                        {typeof entry.response.tradePlan.stopLoss === "number"
                          ? entry.response.tradePlan.stopLoss.toFixed(2)
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <h5 className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                        {historyCopy.entryCard.sizingNotes}
                      </h5>
                      <p className="mt-1 text-sm text-slate-200">
                        {entry.response.tradePlan.sizingNotes || historyCopy.entryCard.noSizingNotes}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
