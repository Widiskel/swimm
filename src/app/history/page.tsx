"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";

import { SiteHeader } from "@/components/SiteHeader";
import { useHistory, type HistoryEntry, type HistoryVerdict } from "@/providers/history-provider";
import { useLanguage } from "@/providers/language-provider";
import { HistoryEntryAnalysis } from "@/features/history/components/HistoryEntryAnalysis";

type DayGroup = {
  key: string;
  label: string;
  entries: HistoryEntry[];
  totals: {
    total: number;
    buy: number;
    sell: number;
  };
};

export default function HistoryPage() {
  const { ready, authenticated, login } = usePrivy();
  const { entries, clearEntries, isLoading, error } = useHistory();
  const { messages, languageTag } = useLanguage();
  const historyCopy = messages.history;

  type DecisionFilter = "all" | "buy" | "sell";
  type VerdictFilter = "all" | HistoryVerdict;

  const [searchQuery, setSearchQuery] = useState("");
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>("all");
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>("all");
  const [pairFilter, setPairFilter] = useState<string>("all");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const pairOptions = useMemo(() => {
    const unique = new Set<string>();
    entries.forEach((entry) => {
      if (entry.pair) {
        unique.add(entry.pair);
      }
    });
    return Array.from(unique).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return entries.filter((entry) => {
      if (pairFilter !== "all" && entry.pair !== pairFilter) {
        return false;
      }
      if (decisionFilter !== "all") {
        const action = (entry.decision?.action ?? entry.response.decision?.action ?? "").toLowerCase();
        if (action !== decisionFilter) {
          return false;
        }
      }
      if (verdictFilter !== "all") {
        const verdict = entry.verdict ?? "unknown";
        if (verdict !== verdictFilter) {
          return false;
        }
      }
      if (!normalizedQuery) {
        return true;
      }
      const haystack = [
        entry.pair,
        entry.timeframe,
        entry.summary,
        entry.feedback,
        entry.response.tradePlan.rationale,
        entry.response.market?.chart?.forecast,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [entries, searchQuery, decisionFilter, verdictFilter, pairFilter]);

  useEffect(() => {
    if (selectedEntryId && !filteredEntries.some((entry) => entry.id === selectedEntryId)) {
      setSelectedEntryId(null);
    }
  }, [filteredEntries, selectedEntryId]);

  const totalBuy = useMemo(
    () => filteredEntries.filter((item) => item.decision?.action === "buy").length,
    [filteredEntries]
  );
  const totalSell = useMemo(
    () => filteredEntries.filter((item) => item.decision?.action === "sell").length,
    [filteredEntries]
  );
  const groupedDays = useMemo(() => {
    const keyFormatter = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const labelFormatter = new Intl.DateTimeFormat(languageTag, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const map = new Map<string, DayGroup>();

    for (const entry of filteredEntries) {
      const created = new Date(entry.createdAt);
      if (Number.isNaN(created.getTime())) {
        continue;
      }
      const key = keyFormatter.format(created);
      const label = labelFormatter.format(created);
      if (!map.has(key)) {
        map.set(key, {
          key,
          label,
          entries: [],
          totals: { total: 0, buy: 0, sell: 0 },
        });
      }
      const group = map.get(key)!;
      group.entries.push(entry);
      group.totals.total += 1;
      const action = entry.decision?.action ?? entry.response.decision?.action ?? null;
      if (action === "buy") {
        group.totals.buy += 1;
      } else if (action === "sell") {
        group.totals.sell += 1;
      }
    }

    const result = Array.from(map.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
    result.forEach((group) => {
      group.entries.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
    return result;
  }, [filteredEntries, languageTag]);

  const handleSelectEntry = (entryId: string) => {
    setSelectedEntryId((prev) => (prev === entryId ? null : entryId));
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-[var(--swimm-bg)] text-[var(--swimm-text)]">
        <SiteHeader />
        <main className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center px-6 text-center">
          <p className="text-lg text-[var(--swimm-neutral-500)]">{historyCopy.connecting}</p>
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
            {historyCopy.protectedBadge}
          </span>
          <h2 className="text-3xl font-semibold text-[var(--swimm-navy-900)] sm:text-4xl">
            {historyCopy.signInHeading}
          </h2>
          <p className="max-w-2xl text-base text-[var(--swimm-neutral-500)]">
            {historyCopy.signInDescription}
          </p>
          <button
            type="button"
            onClick={() => login?.()}
            className="rounded-full border border-[var(--swimm-primary-500)] bg-[var(--swimm-primary-500)] px-6 py-2 text-sm font-semibold text-[var(--swimm-navy-900)] shadow-[var(--swimm-glow)] transition hover:-translate-y-0.5"
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
      value: filteredEntries.length,
      className: "text-[var(--swimm-navy-900)]",
    },
    {
      label: historyCopy.metrics.buySignals,
      value: totalBuy,
      className: "text-[var(--swimm-up)]",
    },
    {
      label: historyCopy.metrics.sellSignals,
      value: totalSell,
      className: "text-[var(--swimm-down)]",
    },
  ];

  const renderMetricValue = (value: number) =>
    value.toLocaleString(languageTag, { maximumFractionDigits: 0 });

  const decisionOptions = [
    { value: "all" as DecisionFilter, label: historyCopy.filters.allOption },
    { value: "buy" as DecisionFilter, label: historyCopy.filters.decisionOptions.buy },
    { value: "sell" as DecisionFilter, label: historyCopy.filters.decisionOptions.sell },
  ];

  const verdictOptions = [
    { value: "all" as VerdictFilter, label: historyCopy.filters.allOption },
    { value: "accurate" as VerdictFilter, label: historyCopy.filters.verdictOptions.accurate },
    { value: "inaccurate" as VerdictFilter, label: historyCopy.filters.verdictOptions.inaccurate },
    { value: "unknown" as VerdictFilter, label: historyCopy.filters.verdictOptions.unknown },
  ];

  const renderSummaryRow = (entry: HistoryEntry) => {
    const decision = entry.decision?.action ?? entry.response.decision?.action ?? "";
    const decisionKey = decision.toLowerCase();
    const decisionLabel = decision ? decision.toUpperCase() : historyCopy.summaryRow.noDecision;
    const verdictKey = (entry.verdict ?? "unknown") as keyof typeof historyCopy.entryCard.verdict;
    const verdictLabel = historyCopy.entryCard.verdict[verdictKey] ?? historyCopy.summaryRow.noVerdict;
    const summaryText = historyCopy.summaryRow.format
      .replace("{decision}", decisionLabel)
      .replace("{verdict}", verdictLabel);
    const entryLabel = historyCopy.summaryRow.entry
      .replace("{pair}", entry.pair)
      .replace("{timeframe}", entry.timeframe.toUpperCase());
    const isActive = selectedEntryId === entry.id;

    const decisionBadgeClass: Record<string, string> = {
      buy: "border-[var(--swimm-up)] bg-[var(--swimm-up)]/10 text-[var(--swimm-up)]",
      sell: "border-[var(--swimm-down)] bg-[var(--swimm-down)]/10 text-[var(--swimm-down)]",
    };

    const verdictBadgeClass: Record<string, string> = {
      accurate: "border-[var(--swimm-up)] bg-[var(--swimm-up)]/10 text-[var(--swimm-up)]",
      inaccurate: "border-[var(--swimm-down)] bg-[var(--swimm-down)]/10 text-[var(--swimm-down)]",
      unknown: "border-[var(--swimm-neutral-300)] bg-[var(--swimm-neutral-100)] text-[var(--swimm-neutral-500)]",
    };

    return (
      <li key={entry.id} className="rounded-2xl border border-[var(--swimm-neutral-300)] bg-[var(--swimm-neutral-100)]">
        <button
          type="button"
          onClick={() => handleSelectEntry(entry.id)}
          className={`flex w-full flex-col gap-3 px-4 py-4 text-left transition hover:bg-white ${
            isActive ? "border-l-4 border-[var(--swimm-primary-500)] bg-white" : ""
          }`}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span
              className={`inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] ${
                decisionBadgeClass[decisionKey] ?? "border-[var(--swimm-neutral-300)] bg-white text-[var(--swimm-neutral-500)]"
              }`}
            >
              {decisionLabel}
            </span>
            <span
              className={`inline-flex min-w-[8rem] items-center justify-center rounded-2xl border px-5 py-2 text-sm font-semibold uppercase tracking-[0.25em] ${
                verdictBadgeClass[verdictKey] ?? verdictBadgeClass.unknown
              }`}
            >
              {verdictLabel}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-[var(--swimm-navy-900)]">{entryLabel}</span>
            <span className="text-xs text-[var(--swimm-neutral-500)]">{summaryText}</span>
          </div>
        </button>
        {isActive ? (
          <div className="border-t border-[var(--swimm-neutral-200)] bg-white px-4 py-4">
            <HistoryEntryAnalysis entry={entry} languageTag={languageTag} />
          </div>
        ) : null}
      </li>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--swimm-bg)] text-[var(--swimm-text)]">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-6 py-12 space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-[var(--swimm-navy-900)]">
              {historyCopy.title}
            </h2>
            <p className="mt-2 text-sm text-[var(--swimm-neutral-500)]">{historyCopy.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={clearEntries}
            disabled={entries.length === 0 || isLoading}
            className="self-start rounded-full border border-[var(--swimm-down)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--swimm-down)] transition hover:-translate-y-0.5 disabled:opacity-40"
          >
            {historyCopy.clearButton}
          </button>
        </div>

        {error ? (
          <div className="rounded-2xl border border-[var(--swimm-down)] bg-[var(--swimm-down)]/10 px-4 py-3 text-sm text-[var(--swimm-down)]">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1.5fr_repeat(3,minmax(0,1fr))]">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            type="search"
            placeholder={historyCopy.filters.searchPlaceholder}
            className="h-10 rounded-full border border-[var(--swimm-neutral-300)] bg-white px-4 text-sm text-[var(--swimm-neutral-600)] outline-none transition focus:border-[var(--swimm-primary-500)] focus:ring-2 focus:ring-[var(--swimm-primary-500)]/30"
          />
          <select
            value={pairFilter}
            onChange={(event) => setPairFilter(event.target.value)}
            className="h-10 rounded-full border border-[var(--swimm-neutral-300)] bg-white px-4 text-sm text-[var(--swimm-neutral-600)] outline-none transition focus:border-[var(--swimm-primary-500)] focus:ring-2 focus:ring-[var(--swimm-primary-500)]/30"
          >
            <option value="all">{historyCopy.filters.allOption}</option>
            {pairOptions.map((pair) => (
              <option key={pair} value={pair}>
                {pair}
              </option>
            ))}
          </select>
          <select
            value={decisionFilter}
            onChange={(event) => setDecisionFilter(event.target.value as DecisionFilter)}
            className="h-10 rounded-full border border-[var(--swimm-neutral-300)] bg-white px-4 text-sm text-[var(--swimm-neutral-600)] outline-none transition focus:border-[var(--swimm-primary-500)] focus:ring-2 focus:ring-[var(--swimm-primary-500)]/30"
          >
            {decisionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={verdictFilter}
            onChange={(event) => setVerdictFilter(event.target.value as VerdictFilter)}
            className="h-10 rounded-full border border-[var(--swimm-neutral-300)] bg-white px-4 text-sm text-[var(--swimm-neutral-600)] outline-none transition focus:border-[var(--swimm-primary-500)] focus:ring-2 focus:ring-[var(--swimm-primary-500)]/30"
          >
            {verdictOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-3xl border border-[var(--swimm-neutral-300)] bg-white p-6 shadow-sm shadow-[var(--swimm-neutral-300)]/40"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--swimm-neutral-300)]">
                {metric.label}
              </p>
              <p className={`mt-3 text-3xl font-semibold ${metric.className}`}>
                {renderMetricValue(metric.value)}
              </p>
            </div>
          ))}
        </div>

        {isLoading && entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--swimm-neutral-300)] bg-[var(--swimm-neutral-100)] p-10 text-center text-sm text-[var(--swimm-neutral-500)]">
            {historyCopy.loading}
          </div>
        ) : groupedDays.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--swimm-neutral-300)] bg-[var(--swimm-neutral-100)] p-10 text-center">
            <h3 className="text-xl font-semibold text-[var(--swimm-navy-900)]">
              {historyCopy.empty.title}
            </h3>
            <p className="mt-3 text-sm text-[var(--swimm-neutral-500)]">
              {historyCopy.empty.descriptionPrefix}
              <Link
                href="/analysis"
                className="text-[var(--swimm-primary-700)] hover:underline"
              >
                {historyCopy.empty.linkText}
              </Link>
              {historyCopy.empty.descriptionSuffix}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedDays.map((day) => (
              <section
                key={day.key}
                className="rounded-3xl border border-[var(--swimm-neutral-300)] bg-white p-6 shadow-sm shadow-[var(--swimm-neutral-300)]/30"
              >
                <header className="flex flex-col gap-3 border-b border-[var(--swimm-neutral-200)] pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--swimm-neutral-300)]">
                      {historyCopy.dayGroup.title.replace("{date}", day.label)}
                    </p>
                    <div className="mt-2 grid gap-2 text-sm text-[var(--swimm-neutral-500)] sm:grid-cols-2 lg:grid-cols-4">
                      <span>
                        <span className="font-semibold text-[var(--swimm-navy-900)]">
                          {renderMetricValue(day.totals.total)}
                        </span>
                        {" "}
                        {historyCopy.dayGroup.totals.analyses}
                      </span>
                      <span>
                        <span className="font-semibold text-[var(--swimm-up)]">
                          {renderMetricValue(day.totals.buy)}
                        </span>
                        {" "}
                        {historyCopy.dayGroup.totals.buy}
                      </span>
                      <span>
                        <span className="font-semibold text-[var(--swimm-down)]">
                          {renderMetricValue(day.totals.sell)}
                        </span>
                        {" "}
                        {historyCopy.dayGroup.totals.sell}
                      </span>
                    </div>
                  </div>
                </header>
                <ul className="mt-4 space-y-3">
                  {day.entries.map((entry) => renderSummaryRow(entry))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
