"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Language = "en" | "id";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (english: string, indonesian: string) => string;
  select: (value: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "swimm-language";

const readInitialLanguage = (): Language => {
  if (typeof window === "undefined") {
    return "en";
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "id" ? "id" : "en";
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const initial = readInitialLanguage();
    setLanguageState(initial);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, language);
    }
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => (prev === "en" ? "id" : "en"));
  }, []);

  const t = useCallback(
    (english: string, indonesian: string) => (language === "id" ? indonesian : english),
    [language]
  );

  const select = useCallback(
    (value: string) => {
      if (!value.includes(" // ")) {
        return value;
      }
      const [english, indonesian] = value.split(" // ");
      if (language === "id") {
        return (indonesian ?? english ?? "").trim();
      }
      return (english ?? indonesian ?? "").trim();
    },
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage, toggleLanguage, t, select }),
    [language, setLanguage, toggleLanguage, t, select]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};
