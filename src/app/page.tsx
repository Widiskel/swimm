"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { usePrivy } from "@privy-io/react-auth";

import { SiteHeader } from "@/components/SiteHeader";
import { useLanguage } from "@/providers/language-provider";

const MotionLink = motion(Link);

export default function LandingPage() {
  const { ready, authenticated, login } = usePrivy();
  const { messages, __ } = useLanguage();
  const landing = messages.landing;

  const primaryCta = authenticated ? (
    <MotionLink
      href="/analysis"
      className="inline-flex items-center justify-center rounded-full bg-[var(--swimm-primary-500)] px-6 py-3 text-sm font-semibold text-[var(--swimm-navy-900)] shadow-lg shadow-[var(--swimm-glow)]"
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 240, damping: 18 }}
    >
      {__("landing.hero.ctaPrimaryAuthenticated")}
    </MotionLink>
  ) : (
    <motion.button
      type="button"
      onClick={() => login?.()}
      className="inline-flex items-center justify-center rounded-full bg-[var(--swimm-primary-500)] px-6 py-3 text-sm font-semibold text-[var(--swimm-navy-900)] shadow-lg shadow-[var(--swimm-glow)] disabled:cursor-not-allowed disabled:opacity-60"
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 240, damping: 18 }}
      disabled={!ready}
    >
      {__("landing.hero.ctaPrimaryGuest")}
    </motion.button>
  );

  const secondaryCta = authenticated ? (
    <MotionLink
      href="/history"
      className="inline-flex items-center justify-center rounded-full border border-[var(--swimm-neutral-300)] px-6 py-3 text-sm font-semibold text-[var(--swimm-primary-700)]"
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 240, damping: 18 }}
    >
      {__("landing.hero.ctaSecondaryAuthenticated")}
    </MotionLink>
  ) : (
    <MotionLink
      href="/#features"
      className="inline-flex items-center justify-center rounded-full border border-[var(--swimm-neutral-300)] px-6 py-3 text-sm font-semibold text-[var(--swimm-primary-700)]"
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 240, damping: 18 }}
    >
      {__("landing.hero.ctaSecondaryGuest")}
    </MotionLink>
  );

  return (
    <div className="min-h-screen bg-[var(--swimm-bg)] text-[var(--swimm-text)]">
      <SiteHeader />

      <main className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[var(--swimm-gradient)] opacity-20" />

        <motion.section
          className="mx-auto flex max-w-6xl flex-col gap-12 px-6 pb-16 pt-20 lg:flex-row lg:items-center"
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="space-y-6 lg:w-3/5">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--swimm-primary-500)]/30 bg-[var(--swimm-primary-500)]/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-[var(--swimm-primary-700)]">
              {landing.hero.badge}
            </span>
            <h2 className="text-4xl font-semibold leading-tight text-[var(--swimm-navy-900)] sm:text-5xl">
              {landing.hero.heading}
            </h2>
            <p className="max-w-2xl text-lg text-[var(--swimm-neutral-500)]">
              {landing.hero.description}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              {primaryCta}
              {secondaryCta}
            </div>
            {!ready && (
              <p className="text-xs text-[var(--swimm-neutral-500)]">
                {landing.hero.privyWaiting}
              </p>
            )}
          </div>
          <div className="grid flex-1 gap-4 rounded-2xl border border-[var(--swimm-neutral-300)] bg-white p-6 shadow-xl shadow-[var(--swimm-glow)]">
            {landing.highlights.map((item, index) => (
              <div
                key={item.title}
                className="rounded-xl border border-[var(--swimm-neutral-300)] bg-white/90 p-5 transition-transform duration-200 hover:-translate-y-0.5"
                data-aos="zoom-in-up"
                data-aos-delay={index * 140}
              >
                <h3 className="text-sm font-semibold text-[var(--swimm-primary-700)]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-[var(--swimm-neutral-500)]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          id="features"
          className="bg-white/80 py-16"
          initial={{ opacity: 0, x: 60 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.75, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.35 }}
        >
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h3 className="text-3xl font-semibold text-[var(--swimm-navy-900)]">
                  {landing.features.heading}
                </h3>
                <p className="mt-3 max-w-2xl text-base text-[var(--swimm-neutral-500)]">
                  {landing.features.description}
                </p>
              </div>
              <MotionLink
                href="/analysis"
                className="hidden rounded-full bg-[var(--swimm-primary-500)] px-5 py-2 text-sm font-semibold text-[var(--swimm-navy-900)] shadow-sm shadow-[var(--swimm-glow)] lg:inline-flex"
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 240, damping: 18 }}
              >
                {landing.features.cta}
              </MotionLink>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {landing.features.cards.map((feature, index) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-[var(--swimm-neutral-300)] bg-white p-6 shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
                  data-aos="fade-up"
                  data-aos-delay={120 + index * 100}
                >
                  <h4 className="text-base font-semibold text-[var(--swimm-navy-900)]">
                    {feature.title}
                  </h4>
                  <p className="mt-3 text-sm text-[var(--swimm-neutral-500)]">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          className="py-16"
          initial={{ opacity: 0, x: -60 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.75, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.35 }}
        >
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
              <div className="space-y-5">
                <h3 className="text-3xl font-semibold text-[var(--swimm-navy-900)]">
                  {landing.workflow.heading}
                </h3>
                <p className="text-base text-[var(--swimm-neutral-500)]">
                  {landing.workflow.description}
                </p>
                <MotionLink
                  href={authenticated ? "/analysis" : "/#features"}
                  className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--swimm-primary-500)] px-5 py-2 text-sm font-semibold text-[var(--swimm-navy-900)] shadow"
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 240, damping: 18 }}
                >
                  {authenticated
                    ? landing.workflow.ctaAuthenticated
                    : landing.workflow.ctaGuest}
                </MotionLink>
              </div>
              <div className="grid gap-6">
                {landing.workflow.steps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    className="flex gap-5 rounded-2xl border border-[var(--swimm-neutral-300)] bg-white p-6 shadow"
                    whileHover={{ y: -6 }}
                    transition={{ type: "spring", stiffness: 220, damping: 20, delay: index * 0.04 }}
                    data-aos="fade-right"
                    data-aos-delay={index * 150}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--swimm-primary-500)]/20 text-sm font-semibold text-[var(--swimm-primary-700)]">
                      {step.id}
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-[var(--swimm-navy-900)]">
                        {step.title}
                      </h4>
                      <p className="mt-2 text-sm text-[var(--swimm-neutral-500)]">
                        {step.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>
      </main>

      <footer className="border-t border-[var(--swimm-neutral-300)] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 text-sm text-[var(--swimm-neutral-500)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} SWIMM - {landing.footer?.copyright}
          </p>
          <div className="flex items-center gap-4">
            <Link href="/analysis" className="transition hover:text-[var(--swimm-primary-700)]">
              {landing.footer?.navDashboard}
            </Link>
            <Link href="/history" className="transition hover:text-[var(--swimm-primary-700)]">
              {landing.footer?.navHistory}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
