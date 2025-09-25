"use client";

import { useLanguage } from "@/providers/language-provider";

export function HeroSection() {
  const { messages } = useLanguage();
  const hero = messages.hero;

  return (
    <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-8 shadow-2xl shadow-sky-500/10">
      <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/50 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-sky-300">
        {hero.badge}
      </span>
      <h2 className="mt-6 text-3xl font-semibold leading-tight text-slate-50 md:text-4xl">
        {hero.heading}
      </h2>
      <p className="mt-4 text-base text-slate-300">{hero.description}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {hero.features.map((feature) => (
          <div key={feature.title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-sm font-semibold text-slate-200">{feature.title}</div>
            <p className="mt-2 text-xs text-slate-400">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
