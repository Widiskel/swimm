"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

import { LanguageSwitcher } from "@/features/shared/components/LanguageSwitcher";
import { AuthSection } from "@/features/auth/components/AuthSection";
import { useLanguage } from "@/providers/language-provider";

const MotionHeader = motion.header;
const MotionLink = motion(Link);

export function SiteHeader() {
  const { messages } = useLanguage();
  const header = messages.siteHeader;

  return (
    <MotionHeader
      className="border-b border-[var(--swimm-neutral-300)] bg-white/90 shadow-sm"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-5 text-[var(--swimm-navy-900)]">
        <MotionLink
          href="/"
          className="flex items-center gap-3"
          whileHover={{ y: -2 }}
          transition={{ type: "spring", stiffness: 280, damping: 20 }}
        >
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
        </MotionLink>
        <nav className="hidden items-center gap-6 text-sm text-[var(--swimm-neutral-500)] md:flex">
          {[
            { href: "/", label: header.nav.home },
            { href: "/analysis", label: header.nav.analysis },
            { href: "/history", label: header.nav.history },
          ].map((item) => (
            <MotionLink
              key={item.href}
              href={item.href}
              className="transition text-[var(--swimm-neutral-500)]"
              whileHover={{ y: -2, color: "var(--swimm-primary-700)" }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
            >
              {item.label}
            </MotionLink>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <AuthSection />
        </div>
      </div>
    </MotionHeader>
  );
}
