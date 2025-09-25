"use client";

import { useLanguage } from "@/providers/language-provider";

export function HeroSection() {
  const { messages } = useLanguage();
  const hero = messages.hero;

  return (
    <div
      className="rounded-3xl border border-[var(--swimm-neutral-300)] bg-white p-8 shadow-xl shadow-[var(--swimm-glow)]"
      data-aos="fade-up"
    >
      <span className="inline-flex items-center gap-2 rounded-full border border-[var(--swimm-primary-500)]/40 bg-[var(--swimm-primary-500)]/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[var(--swimm-primary-700)]">
        {hero.badge}
      </span>
      <h2 className="mt-6 text-3xl font-semibold leading-tight text-[var(--swimm-navy-900)] md:text-4xl">
        {hero.heading}
      </h2>
      <p className="mt-4 text-base text-[var(--swimm-neutral-500)]">{hero.description}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {hero.features.map((feature) => (
          <div key={feature.title} className="rounded-2xl border border-[var(--swimm-neutral-300)] bg-white p-4">
            <div className="text-sm font-semibold text-[var(--swimm-navy-900)]">{feature.title}</div>
            <p className="mt-2 text-xs text-[var(--swimm-neutral-500)]">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
