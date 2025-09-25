"use client";

import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getLanguageTag,
  isLocale,
  messages,
  type Locale,
  type Messages,
} from "@/i18n/messages";

type Replacements = Record<string, string | number>;

type LanguageContextValue = {
  locale: Locale;
  languageTag: ReturnType<typeof getLanguageTag>;
  messages: Messages;
  setLocale: (locale: Locale) => void;
  __: (path: string, replacements?: Replacements) => string;
};

const STORAGE_KEY = "wa-locale";

const LanguageContext = createContext<LanguageContextValue | null>(null);

const resolvePath = (source: Messages, path: string): unknown =>
  path.split(".").reduce<unknown>((acc, segment) => {
    if (!acc || typeof acc !== "object") {
      return undefined;
    }
    return (acc as Record<string, unknown>)[segment];
  }, source);

const formatMessage = (message: string, replacements?: Replacements) => {
  if (!replacements) {
    return message;
  }
  return Object.entries(replacements).reduce((acc, [key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, "g");
    return acc.replace(regex, String(value));
  }, message);
};

export function LanguageProvider({ children }: PropsWithChildren) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && isLocale(stored)) {
      setLocaleState(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    const localeMessages = messages[locale];
    const languageTag = getLanguageTag(locale);

    const translate = (path: string, replacements?: Replacements) => {
      const resolved = resolvePath(localeMessages, path);
      if (typeof resolved === "string") {
        return formatMessage(resolved, replacements);
      }
      return path;
    };

    return {
      locale,
      languageTag,
      messages: localeMessages,
      setLocale,
      __: translate,
    };
  }, [locale, setLocale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};
