"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Locale } from "@/i18n/messages";
import { useLanguage } from "@/providers/language-provider";

type LanguageSwitcherOption = {
  value: Locale;
  label: string;
  flag: string;
};

const LANGUAGE_OPTIONS: LanguageSwitcherOption[] = [
  {
    value: "en",
    label: "English",
    flag: "/flags/en.svg",
  },
  {
    value: "id",
    label: "Bahasa Indonesia",
    flag: "/flags/id.svg",
  },
];

export function LanguageSwitcher() {
  const { locale, setLocale, messages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activeOption = useMemo(
    () => LANGUAGE_OPTIONS.find((option) => option.value === locale) ?? LANGUAGE_OPTIONS[0],
    [locale]
  );

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSelect = useCallback(
    (value: Locale) => {
      setLocale(value);
      close();
    },
    [setLocale, close]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }
      if (containerRef.current.contains(event.target as Node)) {
        return;
      }
      close();
    };

    window.addEventListener("click", handleClickOutside);
    return () => {
      window.removeEventListener("click", handleClickOutside);
    };
  }, [isOpen, close]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={messages.header.languageLabel}
        className="flex items-center gap-2 rounded-full border border-[var(--swimm-neutral-300)] bg-white px-4 py-2 text-sm font-medium text-[var(--swimm-navy-900)] shadow-[var(--swimm-glow)] transition hover:border-[var(--swimm-primary-500)] focus:border-[var(--swimm-primary-700)] focus:outline-none"
      >
        <Image
          src={activeOption.flag}
          alt={activeOption.label}
          width={20}
          height={20}
          className="h-5 w-5 rounded-full"
        />
        <span>{activeOption.label}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="h-4 w-4 text-[var(--swimm-neutral-400)]"
        >
          <path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {isOpen ? (
        <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-2xl border border-[var(--swimm-neutral-200)] bg-white shadow-lg">
          <ul role="listbox" aria-label={messages.header.languageLabel}>
            {LANGUAGE_OPTIONS.map((option) => {
              const isActive = option.value === locale;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => handleSelect(option.value)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition ${
                      isActive
                        ? "bg-[var(--swimm-primary-500)]/10 text-[var(--swimm-primary-700)]"
                        : "text-[var(--swimm-neutral-500)] hover:bg-[var(--swimm-neutral-100)]"
                    }`}
                  >
                    <Image
                      src={option.flag}
                      alt={option.label}
                      width={20}
                      height={20}
                      className="h-5 w-5 rounded-full"
                    />
                    <span>{option.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
