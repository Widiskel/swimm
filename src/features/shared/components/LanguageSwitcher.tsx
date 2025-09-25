"use client";

import { type ChangeEvent } from "react";

import type { Locale } from "@/i18n/messages";
import { useLanguage } from "@/providers/language-provider";

const FLAGS: Record<Locale, { symbol: string; label: string }> = {
  en: { symbol: "🇺🇸", label: "English" },
  id: { symbol: "🇮🇩", label: "Bahasa Indonesia" },
};

export function LanguageSwitcher() {
  const { locale, setLocale, messages } = useLanguage();
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setLocale(event.target.value as Locale);
  };

  return (
    <div className="relative">
      <select
        aria-label={messages.header.languageLabel}
        value={locale}
        onChange={handleChange}
        className="appearance-none rounded-full border border-slate-700 bg-slate-900/90 px-6 py-2 text-transparent outline-none transition hover:border-slate-500 focus:border-sky-500"
      >
        {(Object.keys(FLAGS) as Locale[]).map((option) => (
          <option key={option} value={option}>
            {FLAGS[option]?.symbol ?? option}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg">
        {FLAGS[locale]?.symbol ?? "🌐"}
        <span className="sr-only">{FLAGS[locale]?.label}</span>
      </span>
    </div>
  );
}
