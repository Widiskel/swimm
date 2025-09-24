"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";

import { SiteHeader } from "@/components/SiteHeader";
import { useLanguage } from "@/providers/language-provider";

const HIGHLIGHTS = [
  {
    title: { en: "Multi-Pair Forecasting", id: "Prakiraan Multi-Pair" },
    description: {
      en: "AI projections across BTC, ETH, SOL, and rotating assets.",
      id: "Proyeksi AI untuk BTC, ETH, SOL, dan aset yang bergantian.",
    },
  },
  {
    title: { en: "Unified Sentiment", id: "Sentimen Terpadu" },
    description: {
      en: "Blend scraped headlines, briefs, and custom data for balanced decisions.",
      id: "Gabungkan headline scraping, ringkasan, dan data kustom untuk keputusan berimbang.",
    },
  },
  {
    title: { en: "Trade Plans", id: "Rencana Trading" },
    description: {
      en: "Entries, targets, stops, and sizing guidance aligned to your timeframe.",
      id: "Entry, target, stop, dan panduan sizing yang selaras dengan timeframe Anda.",
    },
  },
];

const FEATURE_BLOCKS = [
  {
    title: { en: "Sentiment Fusion", id: "Fusi Sentimen" },
    description: {
      en: "Scraped headlines surface into prioritised highlights for faster conviction.",
      id: "Headline hasil scraping muncul sebagai highlight prioritas untuk mempercepat keyakinan.",
    },
  },
  {
    title: { en: "Adaptive Technicals", id: "Teknikal Adaptif" },
    description: {
      en: "Dynamic overlays, SMA, RSI, and volatility auto-adjust to timeframe.",
      id: "Overlay dinamis, SMA, RSI, dan volatilitas otomatis menyesuaikan timeframe.",
    },
  },
  {
    title: { en: "Risk Discipline", id: "Disiplin Risiko" },
    description: {
      en: "Every call ships with realistic targets and protective stops.",
      id: "Setiap rekomendasi menyertakan target realistis dan stop defensif.",
    },
  },
  {
    title: { en: "Live Binance Feed", id: "Data Binance Langsung" },
    description: {
      en: "Stream candlesticks for majors and track new listings effortlessly.",
      id: "Streaming candlestick untuk pair mayor dan memantau listing baru dengan mudah.",
    },
  },
  {
    title: { en: "Timeframe Control", id: "Kontrol Timeframe" },
    description: {
      en: "Flip from 5-minute scalps to daily swings without losing context.",
      id: "Beralih dari scalp 5 menit ke swing harian tanpa kehilangan konteks.",
    },
  },
  {
    title: { en: "Persistent History", id: "Riwayat Persisten" },
    description: {
      en: "Compare past calls stored locally and iterate your playbook.",
      id: "Bandingkan sinyal terdahulu yang tersimpan lokal dan iterasikan strategi.",
    },
  },
];

const WORKFLOW_STEPS = [
  {
    id: "01",
    title: { en: "Authenticate with Privy", id: "Masuk lewat Privy" },
    description: {
      en: "Secure login via email or wallet unlocks SWIMM -nalytics.",
      id: "Login aman via email atau wallet untuk membuka analisa SWIMM.",
    },
  },
  {
    id: "02",
    title: { en: "Pick Pair & Timeframe", id: "Pilih Pair & Timeframe" },
    description: {
      en: "Switch from scalps to swings across supported symbols in seconds.",
      id: "Beralih dari scalp ke swing pada simbol yang didukung hanya dalam detik.",
    },
  },
  {
    id: "03",
    title: { en: "Execute with Confidence", id: "Eksekusi Percaya Diri" },
    description: {
      en: "Follow AI-backed entries, targets, and risk parameters.",
      id: "Ikuti entry, target, dan parameter risiko berbasis AI.",
    },
  },
];

export default function LandingPage() {
  const { ready, authenticated, login } = usePrivy();
  const { t } = useLanguage();

  const primaryCta = authenticated ? (
    <Link
      href="/analysis"
      className="inline-flex items-center justify-center rounded-md bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/25 transition hover:bg-sky-400"
    >
      {t("Launch analysis dashboard", "Buka dashboard analisa")}
    </Link>
  ) : (
    <button
      type="button"
      onClick={() => login?.()}
      className="inline-flex items-center justify-center rounded-md bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/25 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={!ready}
    >
      {t("Sign in & start", "Masuk & mulai")}
    </button>
  );

  const secondaryCta = authenticated ? (
    <Link
      href="/history"
      className="inline-flex items-center justify-center rounded-md border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800/60"
    >
      {t("Review history", "Lihat riwayat")}
    </Link>
  ) : (
    <Link
      href="/#features"
      className="inline-flex items-center justify-center rounded-md border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800/60"
    >
      {t("Explore features", "Jelajahi fitur")}
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
              {t("SWIMM -ntelligence Hub", "Pusat Inteligensi SWIMM")}
            </span>
            <h2 className="text-4xl font-semibold leading-tight text-slate-50 sm:text-5xl">
              {t(
                "Multi-pair crypto intelligence with natural-language guidance.",
                "Inteligensi kripto multi-pair dengan panduan bahasa natural."
              )}
            </h2>
            <p className="max-w-2xl text-lg text-slate-300">
              {t(
                "SWIMM -arnesses Fireworks LLM to analyse structure, sentiment, and liquidity across supported pairs.",
                "SWIMM -emanfaatkan Fireworks LLM untuk menganalisa struktur, sentimen, dan likuiditas di seluruh pair yang tersedia."
              )}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              {primaryCta}
              {secondaryCta}
            </div>
            {!ready && (
              <p className="text-xs text-slate-500">
                {t(
                  "Waiting for Privy connection... buttons activate once authentication is ready.",
                  "Menunggu koneksi Privy... tombol akan aktif setelah autentikasi siap."
                )}
              </p>
            )}
          </div>
          <div className="grid flex-1 gap-4 rounded-2xl border border-slate-800/70 bg-slate-900/40 p-6 shadow-xl shadow-sky-500/5 backdrop-blur lg:max-w-sm">
            {HIGHLIGHTS.map((item) => (
              <div key={item.title.en} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <h3 className="text-sm font-semibold text-sky-200">{t(item.title.en, item.title.id)}</h3>
                <p className="mt-2 text-sm text-slate-300">{t(item.description.en, item.description.id)}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="bg-slate-900/40 py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h3 className="text-3xl font-semibold text-slate-50">
                  {t("Why traders choose SWIMM", "Mengapa trader memilih SWIMM")}
                </h3>
                <p className="mt-3 max-w-2xl text-base text-slate-400">
                  {t(
                    "Each briefing blends technical signals, catalysts, and AI projections to minimise bias.",
                    "Setiap ringkasan menggabungkan sinyal teknikal, katalis, dan proyeksi AI untuk meminimalkan bias."
                  )}
                </p>
              </div>
              <Link
                href="/analysis"
                className="hidden rounded-md border border-slate-700 px-5 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800/60 lg:inline-flex"
              >
                {t("View the dashboard", "Lihat dashboard")}
              </Link>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {FEATURE_BLOCKS.map((feature) => (
                <div key={feature.title.en} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
                  <h4 className="text-base font-semibold text-slate-100">{t(feature.title.en, feature.title.id)}</h4>
                  <p className="mt-3 text-sm text-slate-300">{t(feature.description.en, feature.description.id)}</p>
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
                  {t("Three simple steps", "Tiga langkah mudah")}
                </h3>
                <p className="text-base text-slate-400">
                  {t(
                    "SWIMM -ondenses research workflows into one command centre so you can execute decisively.",
                    "SWIMM -erampingkan workflow riset menjadi satu pusat komando sehingga Anda dapat mengeksekusi dengan mantap."
                  )}
                </p>
                <Link
                  href={authenticated ? "/analysis" : "/#features"}
                  className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-700 px-5 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800/60"
                >
                  {authenticated
                    ? t("Open analysis now", "Buka analisa sekarang")
                    : t("Preview features", "Lihat fitur")}
                </Link>
              </div>
              <div className="grid gap-6">
                {WORKFLOW_STEPS.map((step) => (
                  <div key={step.id} className="flex gap-5 rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/10 text-sm font-semibold text-sky-300">
                      {step.id}
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-slate-100">
                        {t(step.title.en, step.title.id)}
                      </h4>
                      <p className="mt-2 text-sm text-slate-300">
                        {t(step.description.en, step.description.id)}
                      </p>
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
                    <p>&copy; {new Date().getFullYear()} SWIMM - {t("Soon You Will Make Money", "Segera Anda Akan Menghasilkan Uang")}.</p>
          <div className="flex items-center gap-4">
            <Link href="/analysis" className="transition hover:text-slate-200">
              {t("Dashboard", "Dashboard")}
            </Link>
            <Link href="/history" className="transition hover:text-slate-200">
              {t("History", "Riwayat")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}



