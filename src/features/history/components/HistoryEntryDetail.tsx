"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { SiteHeader } from "@/components/SiteHeader";
import { HistoryEntryAnalysis } from "@/features/history/components/HistoryEntryAnalysis";
import { useHistory } from "@/providers/history-provider";
import { useLanguage } from "@/providers/language-provider";

const badgeClasses: Record<string, string> = {
  buy: "bg-[var(--swimm-up)]/10 text-[var(--swimm-up)] ring-1 ring-[var(--swimm-up)]/30",
  sell: "bg-[var(--swimm-down)]/10 text-[var(--swimm-down)] ring-1 ring-[var(--swimm-down)]/30",
  hold: "bg-[var(--swimm-neutral-100)] text-[var(--swimm-neutral-500)] ring-1 ring-[var(--swimm-neutral-200)]",
};

export function HistoryEntryDetail({ entryId }: { entryId: string }) {
  const { entries, isLoading, error, refresh, updateEntry } = useHistory();
  const { messages, languageTag } = useLanguage();
  const historyCopy = messages.history;
  const detailCopy = historyCopy.detail;
  const hasRequestedRef = useRef(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  const entry = useMemo(() => entries.find((item) => item.id === entryId), [entries, entryId]);

  useEffect(() => {
    if (!entry && !isBootstrapping && !isLoading && !hasRequestedRef.current) {
      hasRequestedRef.current = true;
      setIsBootstrapping(true);
      void refresh().finally(() => setIsBootstrapping(false));
    }
  }, [entry, isLoading, isBootstrapping, refresh]);

  const metaFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(languageTag, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [languageTag]
  );

  const renderNotFound = () => (
    <div className="rounded-3xl bg-white/90 p-10 text-center shadow-sm ring-1 ring-[var(--swimm-neutral-200)]">
      <h2 className="text-2xl font-semibold text-[var(--swimm-navy-900)]">
        {detailCopy.missingTitle}
      </h2>
      <p className="mt-3 text-sm text-[var(--swimm-neutral-500)]">
        {detailCopy.missingDescription}
      </p>
      {error ? (
        <p className="mt-4 text-xs text-[var(--swimm-down)]">{error}</p>
      ) : null}
    </div>
  );

  const mainContent = (() => {
    if (!entry) {
      if (isLoading || isBootstrapping) {
        return (
          <div className="rounded-3xl bg-white/90 p-10 text-center text-sm text-[var(--swimm-neutral-500)] shadow-sm ring-1 ring-[var(--swimm-neutral-200)]">
            {detailCopy.loading}
          </div>
        );
      }
      return renderNotFound();
    }

    const decision = (entry.decision?.action ?? entry.response.decision?.action ?? "").toLowerCase();
    const decisionLabel = decision
      ? decision.toUpperCase()
      : historyCopy.summaryRow.noDecision;
    const verdictKey = entry.verdict ?? "unknown";
    const verdictLabel = historyCopy.entryCard.verdict[verdictKey] ?? historyCopy.summaryRow.noVerdict;
    const createdLabel = metaFormatter.format(new Date(entry.createdAt));
    const updatedLabel = metaFormatter.format(new Date(entry.updatedAt));
    const formattedPair = `${entry.pair} • ${entry.timeframe.toUpperCase()}`;

    return (
      <>
        <section className="rounded-3xl bg-white/90 p-6 shadow-sm ring-1 ring-[var(--swimm-neutral-200)]">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--swimm-navy-900)]">{formattedPair}</h1>
              <p className="mt-1 text-sm text-[var(--swimm-neutral-500)]">
                {historyCopy.entryCard.provider}: {entry.provider.toUpperCase()} / {entry.mode.toUpperCase()}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span
                className={`inline-flex items-center justify-center rounded-full px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] ${
                  badgeClasses[decision] ?? badgeClasses.hold
                }`}
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

        <HistoryEntryAnalysis
          entry={entry}
          onUpdateEntry={(updates) => updateEntry(entry.id, updates)}
        />
      </>
    );
  })();

  return (
    <div className="min-h-screen bg-[var(--swimm-bg)] text-[var(--swimm-text)]">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-12 space-y-6">
        <Link
          href="/history"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--swimm-primary-700)] transition hover:-translate-x-0.5"
        >
          {`< ${detailCopy.backLink}`}
        </Link>
        {mainContent}
      </main>
    </div>
  );
}
