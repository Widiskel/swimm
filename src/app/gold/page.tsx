"use client";

import Link from "next/link";

import { SiteHeader } from "@/components/SiteHeader";
import { useLanguage } from "@/providers/language-provider";

export default function GoldLandingPage() {
  const { messages } = useLanguage();

  return (
    <div className="min-h-screen bg-[var(--swimm-neutral-100)] text-[var(--swimm-navy-900)]">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 pb-24 pt-12">
        <header className="space-y-3">
          <span className="inline-flex items-center rounded-full border border-[var(--swimm-primary-500)] bg-[var(--swimm-primary-500)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--swimm-primary-700)]">
            XAUUSD
          </span>
          <h1 className="text-3xl font-semibold">Gold / USD Analysis</h1>
          <p className="max-w-2xl text-sm text-[var(--swimm-neutral-600)]">
            Add a market data provider for spot gold (XAUUSD), then run the same SWIMM agent analysis with entries, targets, stops, and narrative.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4 rounded-3xl border border-[var(--swimm-neutral-300)] bg-white p-6">
            <h2 className="text-lg font-semibold">Recommended providers</h2>
            <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--swimm-neutral-600)]">
              <li>
                Twelve Data — time series for XAU/USD. Free tier, simple REST. <code>symbol=XAU/USD</code>.
              </li>
              <li>
                Alpha Vantage — FX/commodities via FX endpoints. Free keys, strict rate limits.
              </li>
              <li>
                Finnhub — Metals and forex candles, generous developer plan.
              </li>
              <li>
                GoldAPI / MetalpriceAPI — purpose-built gold spot and historical, paid tiers.
              </li>
            </ul>
            <p className="text-sm text-[var(--swimm-neutral-500)]">
              Prefer another API? Share the docs — SWIMM can plug it in.
            </p>
          </div>

          <div className="space-y-4 rounded-3xl border border-[var(--swimm-neutral-300)] bg-white p-6">
            <h2 className="text-lg font-semibold">How we’ll integrate</h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--swimm-neutral-600)]">
              <li>Set your provider key in env or Profile (coming for gold).</li>
              <li>Backend adds /api/market support for provider <code>gold</code> with XAUUSD candles.</li>
              <li>Analysis page gets a prefilled option for Gold.</li>
            </ol>
            <div className="rounded-2xl border border-dashed border-[var(--swimm-neutral-300)] bg-[var(--swimm-neutral-100)] p-4 text-sm text-[var(--swimm-neutral-600)]">
              Env sketch:
              <pre className="mt-2 whitespace-pre-wrap text-xs">{`# Gold data provider
GOLD_PROVIDER=twelvedata   # or alphavantage|finnhub|goldapi
GOLD_API_KEY=your_key_here`}</pre>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--swimm-neutral-300)] bg-white p-6">
          <h2 className="text-lg font-semibold">Next step</h2>
          <p className="mt-2 text-sm text-[var(--swimm-neutral-600)]">
            Tell me which provider you prefer. I’ll wire it so XAUUSD appears in the pair selector and works end-to-end in the agent.
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              href="/analysis"
              className="inline-flex items-center justify-center rounded-full border border-[var(--swimm-primary-500)] bg-[var(--swimm-primary-500)] px-6 py-3 text-sm font-semibold text-[var(--swimm-navy-900)] shadow-[var(--swimm-glow)] transition hover:bg-[var(--swimm-primary-700)] hover:text-white"
            >
              Open analysis dashboard
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
