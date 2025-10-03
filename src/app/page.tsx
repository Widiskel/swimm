"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";

import { SiteHeader } from "@/components/SiteHeader";
import { useLanguage } from "@/providers/language-provider";
import { useSession } from "@/providers/session-provider";

const MotionMain = motion.main;
const MotionSection = motion.section;

export default function HomePage() {
  const { messages } = useLanguage();
  const { status } = useSession();
  const { ready: privyReady } = usePrivy();

  const isAuthenticated = status === "authenticated";
  const landing = messages.landing;
  const introduction = landing.introduction;
  const why = landing.why;
  const spotlight = landing.spotlight;
  const gettingStarted = landing.gettingStarted;
  const disclaimer = landing.disclaimer;
  const gettingStartedSteps = gettingStarted.steps;

  const primaryCtaLabel = isAuthenticated
    ? introduction.ctaPrimaryAuthenticated
    : introduction.ctaPrimaryGuest;
  const secondaryCtaLabel = isAuthenticated
    ? introduction.ctaSecondaryAuthenticated
    : introduction.ctaSecondaryGuest;

  const primaryHref = "/analysis";
  const secondaryHref = isAuthenticated ? "/history" : "#features";

  const highlightCards = useMemo(
    () =>
      introduction.highlights.map((item) => (
        <div
          key={item.title}
          className="rounded-2xl border border-[var(--swimm-neutral-300)] bg-white/80 p-4 shadow-sm"
        >
          <h3 className="text-sm font-semibold text-[var(--swimm-navy-900)]">
            {item.title}
          </h3>
          <p className="mt-2 text-xs text-[var(--swimm-neutral-500)]">
            {item.description}
          </p>
        </div>
      )),
    [introduction.highlights]
  );

  return (
    <div className="min-h-screen bg-[var(--swimm-bg)] text-[var(--swimm-text)]">
      <SiteHeader />
      <MotionMain
        className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-12"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* 1. Introduction */}
        <MotionSection
          className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
        >
          <div className="flex flex-col gap-8 rounded-3xl border border-[var(--swimm-neutral-300)] bg-white/95 p-8 shadow-xl shadow-[var(--swimm-glow)]">
            <div className="flex items-center gap-3">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--swimm-primary-500)]/40 bg-[var(--swimm-primary-500)]/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-[var(--swimm-primary-700)]">
                {introduction.badge}
              </span>
              <Image
                src="/logo/branding.png"
                alt="SWIMM logo"
                width={150}
                height={42}
                className="h-10 w-auto"
                priority
              />
            </div>
            <div>
              <h1 className="text-3xl font-semibold leading-tight text-[var(--swimm-navy-900)] md:text-4xl">
                {introduction.heading}
              </h1>
              <p className="mt-4 text-base text-[var(--swimm-neutral-500)]">
                {introduction.description}
              </p>
            </div>
            {!privyReady ? (
              <p className="rounded-2xl border border-[var(--swimm-neutral-300)] bg-[var(--swimm-neutral-100)]/60 px-4 py-3 text-xs text-[var(--swimm-neutral-500)]">
                {introduction.privyWaiting}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={primaryHref}
                className="inline-flex items-center justify-center rounded-full border border-[var(--swimm-primary-500)] bg-[var(--swimm-primary-500)] px-6 py-3 text-sm font-semibold text-[var(--swimm-navy-900)] shadow-[var(--swimm-glow)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[var(--swimm-primary-600)] hover:text-white"
              >
                {primaryCtaLabel}
              </Link>
              <Link
                href={secondaryHref}
                className="inline-flex items-center justify-center rounded-full border border-[var(--swimm-neutral-300)] bg-white px-6 py-3 text-sm font-semibold text-[var(--swimm-neutral-500)] transition-transform duration-200 hover:-translate-y-0.5 hover:border-[var(--swimm-primary-500)] hover:text-[var(--swimm-primary-700)]"
              >
                {secondaryCtaLabel}
              </Link>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">{highlightCards}</div>
        </MotionSection>

        {/* 2. Why SWIMM */}
        <MotionSection
          id="features"
          className="rounded-3xl border border-[var(--swimm-neutral-300)] bg-white/95 p-8 shadow-lg"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold text-[var(--swimm-navy-900)]">
              {why.heading}
            </h2>
            <p className="mt-3 text-sm text-[var(--swimm-neutral-500)]">
              {why.description}
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {why.cards.map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-[var(--swimm-neutral-200)] bg-white px-5 py-4 text-sm text-[var(--swimm-neutral-600)] shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <h3 className="text-[var(--swimm-navy-900)]">{card.title}</h3>
                <p className="mt-2 text-xs text-[var(--swimm-neutral-500)]">
                  {card.description}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link
              href="/analysis"
              className="inline-flex items-center justify-center rounded-full border border-[var(--swimm-primary-500)] bg-[var(--swimm-primary-500)] px-5 py-2 text-sm font-semibold text-[var(--swimm-navy-900)] shadow-[var(--swimm-glow)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[var(--swimm-primary-600)] hover:text-white"
            >
              {why.cta}
            </Link>
          </div>
        </MotionSection>

        {/* 3. Feature spotlight */}
        <MotionSection
          id="spotlight"
          className="grid gap-8 rounded-3xl border border-[var(--swimm-neutral-300)] bg-white/95 p-8 shadow-xl lg:grid-cols-[1fr_0.8fr] lg:items-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="flex flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--swimm-gold-500,#facc15)]/40 bg-[var(--swimm-gold-500,#facc15)]/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-[var(--swimm-gold-700,#ca8a04)]">
              {spotlight.badge}
            </span>
            <div>
              <h2 className="text-2xl font-semibold text-[var(--swimm-navy-900)]">
                {spotlight.title}
              </h2>
              <p className="mt-3 text-sm text-[var(--swimm-neutral-500)]">
                {spotlight.description}
              </p>
            </div>
            <Link
              href="/gold"
              className="inline-flex w-fit items-center justify-center rounded-full border border-[var(--swimm-primary-500)] bg-[var(--swimm-primary-500)] px-5 py-2 text-sm font-semibold text-[var(--swimm-navy-900)] shadow-[var(--swimm-glow)] transition hover:-translate-y-0.5 hover:bg-[var(--swimm-primary-600)] hover:text-white"
            >
              {spotlight.cta}
            </Link>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-[var(--swimm-neutral-300)] bg-[var(--swimm-neutral-50)] p-6 shadow-inner">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[var(--swimm-primary-500)]/10" />
            <div className="relative grid gap-4 text-xs text-[var(--swimm-neutral-500)]">
              <div className="flex items-center justify-between rounded-2xl border border-[var(--swimm-neutral-200)] bg-white px-4 py-3">
                <span>XAUUSD</span>
                <span className="font-semibold text-[var(--swimm-navy-900)]">Live Candles</span>
              </div>
              <div className="rounded-2xl border border-[var(--swimm-neutral-200)] bg-white px-4 py-3">
                <p className="text-[var(--swimm-neutral-500)]">
                  {spotlight.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {spotlight.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[var(--swimm-neutral-200)] bg-white px-3 py-1 text-[10px] text-[var(--swimm-neutral-500)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </MotionSection>

        {/* 4. Getting started */}
        <MotionSection
          id="workflow"
          className="rounded-3xl border border-[var(--swimm-neutral-300)] bg-gradient-to-br from-white via-white to-[var(--swimm-neutral-100)] p-8 shadow-lg"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold text-[var(--swimm-navy-900)]">
                {gettingStarted.heading}
              </h2>
              <p className="mt-3 text-sm text-[var(--swimm-neutral-500)]">
                {gettingStarted.description}
              </p>
            </div>
            <Link
              href={isAuthenticated ? "/analysis" : "#features"}
              className="inline-flex items-center justify-center rounded-full border border-[var(--swimm-primary-500)] bg-white px-5 py-2 text-sm font-semibold text-[var(--swimm-primary-700)] shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--swimm-primary-500)]/15"
            >
              {isAuthenticated
                ? gettingStarted.ctaAuthenticated
                : gettingStarted.ctaGuest}
            </Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {gettingStartedSteps.map((step) => (
              <div
                key={step.id}
                className="relative flex flex-col gap-3 rounded-2xl border border-[var(--swimm-neutral-300)] bg-white px-5 py-6 shadow-sm"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--swimm-primary-500)]/40 bg-[var(--swimm-primary-500)]/10 text-sm font-semibold text-[var(--swimm-primary-700)]">
                  {step.id}
                </span>
                <h3 className="text-sm font-semibold text-[var(--swimm-navy-900)]">
                  {step.title}
                </h3>
                <p className="text-xs text-[var(--swimm-neutral-500)]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </MotionSection>

        {/* 5. Disclaimer */}
        <MotionSection
          className="rounded-3xl border border-[var(--swimm-neutral-300)] bg-[var(--swimm-neutral-50)] p-6 text-sm text-[var(--swimm-neutral-600)] shadow-inner"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h2 className="text-base font-semibold text-[var(--swimm-navy-900)]">
            {disclaimer.heading}
          </h2>
          <p className="mt-2 leading-relaxed">{disclaimer.body}</p>
        </MotionSection>
      </MotionMain>
    </div>
  );
}
