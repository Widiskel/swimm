"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";

import { LanguageSwitcher } from "@/features/shared/components/LanguageSwitcher";
import { AuthSection } from "@/features/auth/components/AuthSection";
import { useLanguage } from "@/providers/language-provider";

const MotionHeader = motion.header;
const MotionLink = motion(Link);

export function SiteHeader() {
  const { messages } = useLanguage();
  const header = messages.siteHeader;
  const navItems = useMemo(
    () => [
      { href: "/", label: header.nav.home },
      { href: "/analysis", label: header.nav.analysis },
      { href: "/history", label: header.nav.history },
    ],
    [header.nav.analysis, header.nav.history, header.nav.home]
  );

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((previous) => !previous);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    if (!isMobileMenuOpen) {
      document.body.style.removeProperty("overflow");
      return;
    }
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobileMenu();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileMenuOpen, closeMobileMenu]);

  return (
    <MotionHeader
      className="border-b border-[var(--swimm-neutral-300)] bg-white/90 shadow-sm"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-5 text-[var(--swimm-navy-900)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleMobileMenu}
            className="flex items-center sm:hidden"
            aria-label={header.mobileMenuLabel}
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-[var(--swimm-navy-900)]" aria-hidden="true">
              <line x1="3" y1="8" x2="21" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="3" y1="16" x2="21" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <MotionLink
            href="/"
            className="hidden items-center sm:flex"
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 280, damping: 20 }}
          >
            <Image
              src="/logo/branding.png"
              alt={header.brandingAlt}
              width={170}
              height={48}
              className="h-12 w-auto"
              sizes="(max-width: 640px) 40px, 170px"
              priority
            />
          </MotionLink>
        </div>
        <nav className="hidden items-center gap-6 text-sm text-[var(--swimm-neutral-500)] md:flex">
          {navItems.map((item) => (
            <MotionLink
              key={item.href}
              href={item.href}
              className="transition text-[var(--swimm-neutral-500)] hover:text-[var(--swimm-primary-700)]"
              whileHover={{ y: -2, color: "var(--swimm-primary-700)" }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
            >
              {item.label}
            </MotionLink>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <div className="block">
            <LanguageSwitcher />
          </div>
          <AuthSection />
        </div>
      </div>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-hidden="true"
            className="absolute inset-0 bg-[var(--swimm-navy-900)]/20"
            onClick={closeMobileMenu}
          />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="relative z-10 flex h-full w-[85%] max-w-sm flex-col bg-white px-6 pb-10 pt-8 text-[var(--swimm-navy-900)] shadow-xl"
          >
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={closeMobileMenu}
                aria-label={header.mobileMenuCloseLabel}
                className="rounded-full border border-[var(--swimm-neutral-200)] bg-white p-2 text-[var(--swimm-neutral-500)]"
              >
                <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
                  <path
                    d="M6 6l8 8m0-8l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </button>
            </div>

            <nav className="mt-8 flex flex-col gap-4 text-base">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className="rounded-2xl border border-[var(--swimm-neutral-200)] bg-[var(--swimm-neutral-50)] px-4 py-3 font-medium text-[var(--swimm-navy-900)] shadow-sm"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto flex flex-col gap-4">
              <div className="rounded-2xl border border-[var(--swimm-neutral-200)] bg-white p-4">
                <AuthSection />
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </MotionHeader>
  );
}






