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
  const metrics = introduction.metrics ?? [];
  const providers = landing.providers;
  const productShowcase = landing.productShowcase;

  const primaryCtaLabel = isAuthenticated
    ? introduction.ctaPrimaryAuthenticated
    : introduction.ctaPrimaryGuest;
  const secondaryCtaLabel = isAuthenticated
    ? introduction.ctaSecondaryAuthenticated
    : introduction.ctaSecondaryGuest;

  const primaryHref = "/analysis";
  const secondaryHref = isAuthenticated ? "/history" : "#features";
  const heroHighlights = useMemo(
    () =>
      introduction.highlights.map((item, index) => ({
        ...item,
        icon: ["📊", "🧠", "🎯", "⚡"][index % 4],
      })),
    [introduction.highlights]
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--swimm-bg)] text-[var(--swimm-text)]">
      <div className="pointer-events-none absolute inset-x-0 top-[-40%] h-[520px] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2)_0%,_rgba(8,47,73,0)_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.15)_0%,_rgba(8,47,73,0)_60%)]" />
      <SiteHeader />
      <MotionMain
        className="relative mx-auto flex max-w-6xl flex-col gap-20 px-6 py-16"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Hero */}
        <MotionSection
          className="flex flex-col gap-12"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.6, ease: "easeOut" }}
        >
          <div className="flex flex-col gap-10">
            <div className="space-y-6 rounded-4xl border border-white/20 bg-white/90 p-8 shadow-2xl shadow-[var(--swimm-glow)] backdrop-blur">
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--swimm-primary-500)]/40 bg-[var(--swimm-primary-400)]/15 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--swimm-primary-700)]">
                  {introduction.badge}
                </span>
                <Image
                  src="/logo/branding.png"
                  alt="SWIMM"
                  width={150}
                  height={42}
                  className="h-10 w-auto"
                  priority
                />
              </div>
              <div className="space-y-4">
                <h1 className="text-3xl font-semibold leading-tight text-[var(--swimm-navy-900)] md:text-5xl">
                  {introduction.heading}
                </h1>
                <p className="text-base text-[var(--swimm-neutral-500)] md:text-lg">
                  {introduction.description}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={primaryHref}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--swimm-primary-500)] bg-[var(--swimm-primary-500)] px-7 py-3 text-sm font-semibold text-[var(--swimm-navy-900)] shadow-[var(--swimm-glow)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[var(--swimm-primary-700)] hover:text-white"
                >
                  {primaryCtaLabel}
                </Link>
                <Link
                  href={secondaryHref}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--swimm-neutral-300)] bg-white/80 px-7 py-3 text-sm font-semibold text-[var(--swimm-neutral-600)] transition-transform duration-200 hover:-translate-y-0.5 hover:border-[var(--swimm-primary-500)] hover:text-[var(--swimm-primary-700)]"
                >
                  {secondaryCtaLabel}
                </Link>
              </div>
              {!privyReady ? (
                <p className="rounded-2xl border border-[var(--swimm-neutral-200)] bg-[var(--swimm-neutral-100)] px-4 py-3 text-xs text-[var(--swimm-neutral-500)]">
                  {introduction.privyWaiting}
                </p>
              ) : null}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--swimm-neutral-400)]">
                  {introduction.highlightsHeading}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {heroHighlights.map((highlight) => (
                  <div
                    key={highlight.title}
                    className="flex items-start gap-4 rounded-3xl border border-[var(--swimm-neutral-200)] bg-white px-5 py-4 text-sm text-[var(--swimm-neutral-500)] shadow-sm"
                  >
                    <span className="text-lg">{highlight.icon}</span>
                    <div>
                      <p className="text-base font-semibold text-[var(--swimm-navy-900)]">
                        {highlight.title}
                      </p>
                      <p className="mt-2 leading-relaxed">{highlight.description}</p>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            </div>

            {metrics.length ? (
              <div className="grid gap-4 sm:grid-cols-3">
                {metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-3xl border border-white/20 bg-white/70 px-5 py-4 text-sm shadow-lg backdrop-blur"
                  >
                    <div className="text-2xl font-semibold text-[var(--swimm-primary-700)]">
                      {metric.value}
                    </div>
                    <div className="mt-1 font-semibold text-[var(--swimm-navy-900)]">
                      {metric.label}
                    </div>
                    <p className="mt-2 text-xs text-[var(--swimm-neutral-500)]">
                      {metric.caption}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </MotionSection>

        {/* Product Showcase */}
        {productShowcase ? (
          <MotionSection
            id="product"
            className="grid gap-10 rounded-4xl border border-white/20 bg-white/95 p-10 shadow-xl backdrop-blur lg:grid-cols-[1fr_1fr] lg:items-center"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="space-y-6">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--swimm-primary-500)]/40 bg-[var(--swimm-primary-400)]/15 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--swimm-primary-700)]">
                {productShowcase.badge}
              </span>
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-[var(--swimm-navy-900)]">
                  {productShowcase.title}
                </h2>
                <p className="text-sm text-[var(--swimm-neutral-500)]">
                  {productShowcase.description}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {productShowcase.highlights?.map((item) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 rounded-3xl border border-[var(--swimm-neutral-200)] bg-white px-5 py-4 text-sm text-[var(--swimm-neutral-600)] shadow-sm"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--swimm-primary-500)]/10 text-[var(--swimm-primary-700)]">
                      <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path d="M5 12l4 4 10-10" />
                      </svg>
                    </span>
                    <div>
                      <p className="font-semibold text-[var(--swimm-navy-900)]">
                        {item.title}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-[var(--swimm-neutral-500)]">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href={primaryHref}
                className="inline-flex w-fit items-center justify-center rounded-full border border-[var(--swimm-primary-500)] bg-[var(--swimm-primary-500)] px-6 py-2.5 text-sm font-semibold text-[var(--swimm-navy-900)] shadow-[var(--swimm-glow)] transition hover:-translate-y-0.5 hover:bg-[var(--swimm-primary-700)] hover:text-white"
              >
                {productShowcase.cta}
              </Link>
            </div>
            <div className="relative overflow-hidden rounded-[32px] border border-white/30 bg-gradient-to-br from-white/40 via-white/10 to-white/40 p-4 shadow-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18)_0%,_rgba(2,6,23,0)_65%)]" />
              <div className="relative overflow-hidden rounded-[24px] border border-white/30 bg-[var(--swimm-neutral-900)]/80">
                <Image
                  src="/img/product.png"
                  alt={productShowcase.imageAlt ?? "SWIMM product preview"}
                  width={1920}
                  height={1080}
                  className="h-auto w-full object-cover"
                  priority
                />
              </div>
            </div>
          </MotionSection>
        ) : null}

        {/* Providers */}
        {providers ? (
          <MotionSection
            className="rounded-4xl border border-white/20 bg-white/90 p-8 shadow-xl backdrop-blur"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-[var(--swimm-navy-900)]">
                  {providers.heading}
                </h2>
                <p className="text-sm text-[var(--swimm-neutral-500)]">
                  {providers.description}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {providers.items.map((item) => (
                  <div
                    key={item}
                    className="rounded-3xl border border-[var(--swimm-neutral-200)] bg-white px-4 py-3 text-xs font-semibold text-[var(--swimm-neutral-600)] shadow-sm"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </MotionSection>
        ) : null}

        {/* Why SWIMM */}
        <MotionSection
          id="features"
          className="rounded-4xl border border-white/20 bg-white/90 p-10 shadow-xl backdrop-blur"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
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
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {why.cards.map((card) => (
              <div
                key={card.title}
                className="group rounded-3xl border border-[var(--swimm-neutral-200)] bg-white px-6 py-5 text-sm text-[var(--swimm-neutral-600)] shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[var(--swimm-primary-500)]/40 hover:shadow-lg"
              >
                <h3 className="text-base font-semibold text-[var(--swimm-navy-900)]">
                  {card.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[var(--swimm-neutral-500)]">
                  {card.description}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Link
              href="/analysis"
              className="inline-flex items-center justify-center rounded-full border border-[var(--swimm-primary-500)] bg-[var(--swimm-primary-500)] px-6 py-2.5 text-sm font-semibold text-[var(--swimm-navy-900)] shadow-[var(--swimm-glow)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[var(--swimm-primary-700)] hover:text-white"
            >
              {why.cta}
            </Link>
          </div>
        </MotionSection>

        {/* Spotlight */}
        <MotionSection
          id="spotlight"
          className="grid gap-10 rounded-4xl border border-white/20 bg-white/90 p-10 shadow-xl backdrop-blur lg:grid-cols-[1fr_0.9fr] lg:items-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="space-y-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--swimm-primary-500)]/40 bg-[var(--swimm-primary-500)]/15 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--swimm-primary-700)]">
              {spotlight.badge}
            </span>
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-[var(--swimm-navy-900)]">
                {spotlight.title}
              </h2>
              <p className="text-sm text-[var(--swimm-neutral-500)]">
                {spotlight.description}
              </p>
            </div>
            <Link
              href="/analysis"
              className="inline-flex w-fit items-center justify-center rounded-full border border-[var(--swimm-primary-500)] bg-[var(--swimm-primary-500)] px-6 py-2.5 text-sm font-semibold text-[var(--swimm-navy-900)] shadow-[var(--swimm-glow)] transition hover:-translate-y-0.5 hover:bg-[var(--swimm-primary-700)] hover:text-white"
            >
              {spotlight.cta}
            </Link>
          </div>
          <div className="relative overflow-hidden rounded-[32px] border border-white/25 bg-gradient-to-br from-[var(--swimm-bg)] via-white/60 to-white/80 p-6 shadow-inner">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.2)_0%,_rgba(2,6,23,0)_70%)]" />
            <div className="relative grid gap-4">
              {spotlight.features?.map((feature, index) => (
                <div
                  key={feature.title}
                  className="group flex gap-4 rounded-3xl border border-[var(--swimm-neutral-200)] bg-white/90 px-5 py-4 text-sm text-[var(--swimm-neutral-600)] shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[var(--swimm-primary-500)]/40 hover:shadow-lg"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--swimm-primary-500)]/30 bg-[var(--swimm-primary-500)]/10 text-xs font-semibold text-[var(--swimm-primary-700)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--swimm-navy-900)]">
                      {feature.title}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-[var(--swimm-neutral-500)]">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </MotionSection>

        {/* Getting Started */}
        <MotionSection
          id="workflow"
          className="rounded-4xl border border-white/20 bg-white/90 p-10 shadow-xl backdrop-blur"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-3">
              <h2 className="text-2xl font-semibold text-[var(--swimm-navy-900)]">
                {gettingStarted.heading}
              </h2>
              <p className="text-sm text-[var(--swimm-neutral-500)]">
                {gettingStarted.description}
              </p>
            </div>
            <Link
              href={isAuthenticated ? "/analysis" : "#features"}
              className="inline-flex items-center justify-center rounded-full border border-[var(--swimm-primary-500)] bg-white/80 px-6 py-2.5 text-sm font-semibold text-[var(--swimm-primary-700)] shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--swimm-primary-500)]/15"
            >
              {isAuthenticated
                ? gettingStarted.ctaAuthenticated
                : gettingStarted.ctaGuest}
            </Link>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {gettingStartedSteps.map((step) => (
              <div
                key={step.id}
                className="relative flex flex-col gap-3 rounded-3xl border border-[var(--swimm-neutral-200)] bg-white px-6 py-6 shadow-sm"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--swimm-primary-500)]/40 bg-[var(--swimm-primary-500)]/10 text-sm font-semibold text-[var(--swimm-primary-700)]">
                  {step.id}
                </span>
                <h3 className="text-sm font-semibold text-[var(--swimm-navy-900)]">
                  {step.title}
                </h3>
                <p className="text-xs leading-relaxed text-[var(--swimm-neutral-500)]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </MotionSection>

        {/* Disclaimer */}
        <MotionSection
          className="rounded-4xl border border-white/20 bg-[var(--swimm-neutral-50)]/90 p-8 text-sm text-[var(--swimm-neutral-600)] shadow-inner backdrop-blur"
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
