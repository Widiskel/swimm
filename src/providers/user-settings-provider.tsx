"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useSession } from "./session-provider";

export type UserSettings = {
  binanceApiKey: string | null;
  binanceApiSecret: string | null;
  bybitApiKey: string | null;
  bybitApiSecret: string | null;
  updatedAt: string | null;
};

type UserSettingsContextValue = {
  settings: UserSettings | null;
  status: "idle" | "loading" | "error";
  error: string | null;
  refresh: () => Promise<void>;
  save: (payload: UserSettings) => Promise<void>;
};

const DEFAULT_SETTINGS: UserSettings = {
  binanceApiKey: null,
  binanceApiSecret: null,
  bybitApiKey: null,
  bybitApiSecret: null,
  updatedAt: null,
};

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null);

const fetchSettings = async () => {
  const response = await fetch("/api/settings", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Settings request failed with ${response.status}`);
  }
  const payload = (await response.json()) as {
    settings?: {
      binanceApiKey: string | null;
      binanceApiSecret: string | null;
      bybitApiKey: string | null;
      bybitApiSecret: string | null;
      updatedAt?: string;
    } | null;
  };
  if (!payload.settings) {
    return null;
  }
  return {
    binanceApiKey: payload.settings.binanceApiKey ?? null,
    binanceApiSecret: payload.settings.binanceApiSecret ?? null,
    bybitApiKey: payload.settings.bybitApiKey ?? null,
    bybitApiSecret: payload.settings.bybitApiSecret ?? null,
    updatedAt: payload.settings.updatedAt ?? null,
  } satisfies UserSettings;
};

export const UserSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const { status: sessionStatus } = useSession();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (sessionStatus !== "authenticated") {
      setSettings(null);
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const data = await fetchSettings();
      setSettings(data ?? DEFAULT_SETTINGS);
      setStatus("idle");
    } catch (fetchError) {
      console.error("Failed to fetch user settings", fetchError);
      setError(fetchError instanceof Error ? fetchError.message : "Unknown error");
      setStatus("error");
    }
  }, [sessionStatus]);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      void refresh();
    } else {
      setSettings(null);
    }
  }, [sessionStatus, refresh]);

  const save = useCallback(
    async (payload: UserSettings) => {
      if (sessionStatus !== "authenticated") {
        throw new Error("Session required");
      }
      setStatus("loading");
      setError(null);
      try {
        const response = await fetch("/api/settings", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Failed to save settings");
        }
        const data = (await response.json()) as {
          settings?: UserSettings | null;
        };
        setSettings(
          data.settings ?? {
            ...DEFAULT_SETTINGS,
            ...payload,
            updatedAt: new Date().toISOString(),
          }
        );
        setStatus("idle");
      } catch (saveError) {
        console.error("Failed to save user settings", saveError);
        setError(
          saveError instanceof Error ? saveError.message : "Failed to save settings"
        );
        setStatus("error");
        throw saveError;
      }
    },
    [sessionStatus]
  );

  const value = useMemo<UserSettingsContextValue>(
    () => ({
      settings,
      status,
      error,
      refresh,
      save,
    }),
    [settings, status, error, refresh, save]
  );

  return <UserSettingsContext.Provider value={value}>{children}</UserSettingsContext.Provider>;
};

export const useUserSettings = () => {
  const context = useContext(UserSettingsContext);
  if (!context) {
    throw new Error("useUserSettings must be used within UserSettingsProvider");
  }
  return context;
};
