"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";

import { SiteHeader } from "@/components/SiteHeader";
import { useLanguage } from "@/providers/language-provider";

export default function LandingPage() {
  const { ready, authenticated, login } = usePrivy();
  const { messages, __ } = useLanguage();
  const landing = messages.landing;

  const primaryCta = authenticated ? (
    <Link
      href="/analysis"
      className="inline-flex items-center justify-center rounded-md bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/25 transition hover:bg-sky-400"
    >
      {__("landing.hero.ctaPrimaryAuthenticated")}
    </Link>
  ) : (
    <button
      type="button"
      onClick={() => login?.()}
      className="inline-flex items-center justify-center rounded-md bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/25 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={!ready}
    >
      {__("landing.hero.ctaPrimaryGuest")}
    </button>
  );

  const secondaryCta = authenticated ? (
    <Link
      href="/history"
      className="inline-flex items-center justify-center rounded-md border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800/60"
    >
      {__("landing.hero.ctaSecondaryAuthenticated")}
    </Link>
  ) : (
    <Link
      href="/#features"
      className="inline-flex items-center justify-center rounded-md border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800/60"
    >
      {__("landing.hero.ctaSecondaryGuest")}
    </Link>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SiteHeader />

      <main className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%)]" />

        <section className="mx-auto flex max-w-6xl flex-col gap-12 px-6 pb-16 pt-20 lg:flex-row lg:items-center">
          <div className="space-y-6 lg:w-3/5">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-sky-300">
              {landing.hero.badge}
            </span>
            <h2 className="text-4xl font-semibold leading-tight text-slate-50 sm:text-5xl">
              {landing.hero.heading}
            </h2>
            <p className="max-w-2xl text-lg text-slate-300">{landing.hero.description}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              {primaryCta}
              {secondaryCta}
            </div>
            {!ready && (
              <p className="text-xs text-slate-500">{landing.hero.privyWaiting}</p>
            )}
          </div>
          <div className="grid flex-1 gap-4 rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6 shadow-xl shadow-sky-500/5 backdrop-blur lg:max-w-sm">
            {landing.highlights.map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <h3 className="text-sm font-semibold text-sky-200">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="bg-slate-900/40 py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h3 className="text-3xl font-semibold text-slate-50">
                  {landing.features.heading}
                </h3>
                <p className="mt-3 max-w-2xl text-base text-slate-400">
                  {landing.features.description}
                </p>
              </div>
              <Link
                href="/analysis"
                className="hidden rounded-md border border-slate-700 px-5 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800/60 lg:inline-flex"
              >
                {landing.features.cta}
              </Link>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {landing.features.cards.map((feature) => (
                <div key={feature.title} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
                  <h4 className="text-base font-semibold text-slate-100">{feature.title}</h4>
                  <p className="mt-3 text-sm text-slate-300">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
              <div className="space-y-5">
                <h3 className="text-3xl font-semibold text-slate-50">
                  {landing.workflow.heading}
                </h3>
                <p className="text-base text-slate-400">{landing.workflow.description}</p>
                <Link
                  href={authenticated ? "/analysis" : "/#features"}
                  className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-700 px-5 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800/60"
                >
                  {authenticated
                    ? landing.workflow.ctaAuthenticated
                    : landing.workflow.ctaGuest}
                </Link>
              </div>
              <div className="grid gap-6">
                {landing.workflow.steps.map((step) => (
                  <div key={step.id} className="flex gap-5 rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/10 text-sm font-semibold text-sky-300">
                      {step.id}
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-slate-100">{step.title}</h4>
                      <p className="mt-2 text-sm text-slate-300">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} SWIMM - {landing.footer?.copyright}
          </p>
          <div className="flex items-center gap-4">
            <Link href="/analysis" className="transition hover:text-slate-200">
              {landing.footer?.navDashboard}
            </Link>
            <Link href="/history" className="transition hover:text-slate-200">
              {landing.footer?.navHistory}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
