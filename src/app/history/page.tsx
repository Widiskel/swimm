"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";
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
          <motion.button
            type="button"
            onClick={() => login?.()}
            className="rounded-full border border-[var(--swimm-primary-500)] bg-[var(--swimm-primary-500)] px-6 py-2 text-sm font-semibold text-[var(--swimm-navy-900)] shadow-[var(--swimm-glow)]"
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 240, damping: 18 }}
          >
            {historyCopy.signInButton}
          </motion.button>
        </main>
      </div>
    );
  }

  const metrics = [
    {
      label: historyCopy.metrics.totalAnalyses,
      value: entries.length,
      className: "text-[var(--swimm-navy-900)]",
    },
    {
      label: historyCopy.metrics.buySignals,
      value: totalBuy,
      className: "text-[var(--swimm-up)]",
    },
    {
      label: historyCopy.metrics.sellHoldSignals,
      value: totalSell + totalHold,
      className: "text-[var(--swimm-warn)]",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--swimm-bg)] text-[var(--swimm-text)]">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <motion.div
          className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div>
            <h2 className="text-3xl font-semibold text-[var(--swimm-navy-900)]">
              {historyCopy.title}
            </h2>
            <p className="mt-2 text-sm text-[var(--swimm-neutral-500)]">{historyCopy.subtitle}</p>
          </div>
          <motion.button
            type="button"
            onClick={clearEntries}
            disabled={entries.length === 0}
            className="self-start rounded-full border border-[var(--swimm-down)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--swimm-down)]"
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 240, damping: 18 }}
          >
            {historyCopy.clearButton}
          </motion.button>
        </motion.div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {metrics.map((metric, index) => (
            <div
              key={metric.label}
              className="rounded-2xl border border-[var(--swimm-neutral-300)] bg-white p-6 shadow-sm"
              data-aos="fade-up"
              data-aos-delay={index * 120}
            >
              <p className="text-sm text-[var(--swimm-neutral-500)]">{metric.label}</p>
              <p className={`mt-2 text-3xl font-semibold ${metric.className}`}>
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        {entries.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-[var(--swimm-neutral-300)] bg-[var(--swimm-neutral-100)] p-10 text-center">
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
          <div className="mt-12 space-y-6">
            {entries.map((entry) => {
              const entryValues = (entry.response.tradePlan.entries ?? []).length
                ? entry.response.tradePlan.entries ?? []
                : [entry.response.tradePlan.entry];
              const takeProfits = entry.response.tradePlan.takeProfits ?? [];

              return (
                <motion.article
                  key={entry.id}
                  className="rounded-3xl border border-[var(--swimm-neutral-300)] bg-white p-6 shadow-lg shadow-[var(--swimm-glow)]"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-[var(--swimm-neutral-300)]">
                        {entry.pair} - {entry.timeframe}
                      </p>
                      <h4 className="mt-1 text-lg font-semibold text-[var(--swimm-navy-900)]">
                        {entry.decision?.action?.toUpperCase() ?? "NO SIGNAL"} -
                        {" "}
                        {formatDate(entry.createdAt, languageTag)}
                      </h4>
                      <p className="mt-2 text-sm text-[var(--swimm-neutral-500)] line-clamp-3">
                        {entry.summary}
                      </p>
                    </div>
                    <div className="flex flex-col items-start gap-2 text-sm text-[var(--swimm-neutral-500)] sm:items-end">
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
                        className="rounded-full border border-[var(--swimm-primary-700)] px-4 py-1.5 text-xs font-medium text-[var(--swimm-primary-700)] transition hover:bg-[var(--swimm-primary-700)] hover:text-white"
                      >
                        {historyCopy.entryCard.openInDashboard}
                      </Link>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 rounded-2xl border border-[var(--swimm-neutral-300)] bg-[var(--swimm-neutral-100)] p-4 text-xs text-[var(--swimm-neutral-500)] sm:grid-cols-2">
                    <div>
                      <h5 className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--swimm-neutral-300)]">
                        {historyCopy.entryCard.entries}
                      </h5>
                      <p className="mt-1 text-sm text-[var(--swimm-navy-900)]">
                        {entryValues
                          .filter((value): value is number => typeof value === "number")
                          .map((value) => value.toFixed(2))
                          .join(" | ") || "-"}
                      </p>
                    </div>
                    <div>
                      <h5 className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--swimm-neutral-300)]">
                        {historyCopy.entryCard.takeProfits}
                      </h5>
                      <p className="mt-1 text-sm text-[var(--swimm-navy-900)]">
                        {takeProfits.map((value) => value.toFixed(2)).join(" | ") || "-"}
                      </p>
                    </div>
                    <div>
                      <h5 className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--swimm-neutral-300)]">
                        {historyCopy.entryCard.stopLoss}
                      </h5>
                      <p className="mt-1 text-sm text-[var(--swimm-navy-900)]">
                        {typeof entry.response.tradePlan.stopLoss === "number"
                          ? entry.response.tradePlan.stopLoss.toFixed(2)
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <h5 className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--swimm-neutral-300)]">
                        {historyCopy.entryCard.sizingNotes}
                      </h5>
                      <p className="mt-1 text-sm text-[var(--swimm-neutral-500)]">
                        {entry.response.tradePlan.sizingNotes || historyCopy.entryCard.noSizingNotes}
                      </p>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
