"use client";

import Image from "next/image";
import Link from "next/link";

import { LanguageSwitcher } from "@/features/shared/components/LanguageSwitcher";
import { AuthSection } from "@/features/auth/components/AuthSection";
import { useLanguage } from "@/providers/language-provider";

export function SiteHeader() {
  const { messages } = useLanguage();
  const header = messages.siteHeader;

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-5">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo/logo.png"
            alt={header.logoAlt}
            width={40}
            height={40}
            className="h-10 w-10 flex-shrink-0 sm:hidden"
            priority
          />
          <Image
            src="/logo/branding.png"
            alt={header.brandingAlt}
            width={170}
            height={48}
            className="hidden h-12 w-auto sm:block"
            priority
            sizes="(max-width: 640px) 40px, 170px"
          />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          {[
            { href: "/", label: header.nav.home },
            { href: "/analysis", label: header.nav.analysis },
            { href: "/history", label: header.nav.history },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition hover:text-slate-50"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <AuthSection />
        </div>
      </div>
    </header>
  );
}
