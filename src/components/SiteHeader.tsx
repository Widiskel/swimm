"use client";

import Link from "next/link";

import { useLanguage } from "@/providers/language-provider";
import { AuthSection } from "@/features/auth/components/AuthSection";

type NavLink = {
  href: string;
  english: string;
  indonesian: string;
};

const NAV_LINKS: NavLink[] = [
  { href: "/", english: "Home", indonesian: "Beranda" },
  { href: "/analysis", english: "Analysis", indonesian: "Analisis" },
  { href: "/history", english: "History", indonesian: "Riwayat" },
];

export function SiteHeader() {
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-lg font-semibold text-slate-950">
            SW
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">SWIMM</div>
            <p className="text-sm text-slate-200">
              {t("Soon You Will Make Money", "Segera Anda Akan Menghasilkan Uang")}
            </p>
          </div>
        </div>
        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          {NAV_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-slate-50">
              {t(item.english, item.indonesian)}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleLanguage}
            className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-300 transition hover:border-sky-500 hover:text-sky-200"
          >
            {language === "en" ? "EN" : "ID"}
          </button>
          <AuthSection />
        </div>
      </div>
    </header>
  );
}
