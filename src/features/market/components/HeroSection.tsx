"use client";

import { useLanguage } from "@/providers/language-provider";

const FEATURE_CARDS = [
  {
    title: { en: "Streaming Charts", id: "Grafik Langsung" },
    subtitle: {
      en: "Real-time candlesticks for majors and emerging pairs with 30-second refresh.",
      id: "Candlestick real-time untuk pair mayor dan pendatang baru dengan pembaruan tiap 30 detik.",
    },
  },
  {
    title: { en: "LLM Market Reasoning", id: "Penalaran Pasar LLM" },
    subtitle: {
      en: "Fireworks-powered agent distils sentiment, technicals, and fundamentals.",
      id: "Agen berbasis Fireworks merangkum sentimen, teknikal, dan fundamental.",
    },
  },
  {
    title: { en: "Execution Playbook", id: "Rencana Eksekusi" },
    subtitle: {
      en: "Entry zones, tiered targets, stops, and sizing tips in one view.",
      id: "Zona entry, target bertingkat, stop, dan catatan sizing dalam satu tampilan.",
    },
  },
];

export function HeroSection() {
  const { t } = useLanguage();

  return (
    <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-8 shadow-2xl shadow-sky-500/10">
      <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/50 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-sky-300">
        {t("Multi-Pair Market Intelligence", "Inteligensi Pasar Multi-Pair")}
      </span>
      <h2 className="mt-6 text-3xl font-semibold leading-tight text-slate-50 md:text-4xl">
        {t(
          "Monitor crypto majors and emerging pairs in real time.",
          "Pantau pair kripto utama dan pendatang baru secara langsung."
        )}
      </h2>
      <p className="mt-4 text-base text-slate-300">
        {t(
          "SWIMM blends live Binance data, order flow, and breaking news into actionable trade ideas.",
          "SWIMM memadukan data live Binance, order flow, dan berita terkini menjadi ide trading siap eksekusi."
        )}
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {FEATURE_CARDS.map((card) => (
          <div key={card.title.en} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-sm font-semibold text-slate-200">
              {t(card.title.en, card.title.id)}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {t(card.subtitle.en, card.subtitle.id)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
