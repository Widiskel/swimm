"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AgentResponse } from "@/features/analysis/types";

type HistoryEntry = {
  id: string;
  createdAt: string;
  pair: string;
  timeframe: string;
  decision: AgentResponse["decision"] | null;
  summary: string;
  response: AgentResponse;
};

type HistoryContextValue = {
  entries: HistoryEntry[];
  addEntry: (payload: { pair: string; timeframe: string; response: AgentResponse }) => void;
  clearEntries: () => void;
};

const HistoryContext = createContext<HistoryContextValue | undefined>(undefined);

const STORAGE_KEY = "web-analytic-ai-history";

const loadInitialHistory = (): HistoryEntry[] => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as HistoryEntry[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch (error) {
    console.warn("Gagal membaca riwayat analisa", error);
    return [];
  }
};

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<HistoryEntry[]>(() => loadInitialHistory());

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const addEntry = useCallback(
    ({ pair, timeframe, response }: { pair: string; timeframe: string; response: AgentResponse }) => {
      setEntries((prev) => {
        const entry: HistoryEntry = {
          id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          createdAt: new Date().toISOString(),
          pair,
          timeframe,
          decision: response.decision ?? null,
          summary: response.summary,
          response,
        };
        return [entry, ...prev].slice(0, 50);
      });
    },
    []
  );

  const clearEntries = useCallback(() => {
    setEntries([]);
  }, []);

  const value = useMemo<HistoryContextValue>(
    () => ({
      entries,
      addEntry,
      clearEntries,
    }),
    [entries, addEntry, clearEntries]
  );

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

export const useHistory = () => {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error("useHistory harus digunakan di dalam HistoryProvider");
  }
  return context;
};
