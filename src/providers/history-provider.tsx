"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { AgentResponse } from "@/features/analysis/types";
import { DEFAULT_PROVIDER, type CexProvider } from "@/features/market/exchanges";
import { useSession } from "@/providers/session-provider";

export type HistoryVerdict = "accurate" | "inaccurate" | "unknown";

export type HistoryEntry = {
  id: string;
  createdAt: string;
  updatedAt: string;
  pair: string;
  timeframe: string;
  provider: CexProvider;
  decision: AgentResponse["decision"] | null;
  summary: string;
  response: AgentResponse;
  verdict: HistoryVerdict;
  feedback: string | null;
};

type SaveHistoryPayload = {
  pair: string;
  timeframe: string;
  provider?: CexProvider;
  response: AgentResponse;
  verdict: HistoryVerdict;
  feedback?: string;
};

type HistoryContextValue = {
  entries: HistoryEntry[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  saveEntry: (payload: SaveHistoryPayload) => Promise<HistoryEntry>;
  clearEntries: () => Promise<void>;
};

const HistoryContext = createContext<HistoryContextValue | null>(null);

const buildError = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (status !== "authenticated") {
      setEntries([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/history", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`History request failed with ${response.status}`);
      }
      const payload = (await response.json()) as { entries?: HistoryEntry[] };
      setEntries(payload.entries ?? []);
    } catch (fetchError) {
      const message = buildError(fetchError, "Unable to load history.");
      setError(message);
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveEntry = useCallback(
    async ({
      pair,
      timeframe,
      provider = DEFAULT_PROVIDER,
      response,
      verdict,
      feedback,
    }: SaveHistoryPayload) => {
      if (status !== "authenticated") {
        throw new Error("Session required.");
      }

      const body = {
        pair,
        timeframe,
        provider,
        response,
        verdict,
        feedback,
      };

      const request = await fetch("/api/history", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!request.ok) {
        let message = `Failed to save history entry (${request.status})`;
        try {
          const payload = (await request.json()) as { error?: string };
          if (payload.error) {
            message = payload.error;
          }
        } catch (parseError) {
          console.warn("Failed to parse history save error", parseError);
        }
        throw new Error(message);
      }

      const payload = (await request.json()) as { entry: HistoryEntry };
      const entry = payload.entry;
      setEntries((prev) => [entry, ...prev]);
      setError(null);
      return entry;
    },
    [status]
  );

  const clearEntries = useCallback(async () => {
    if (status !== "authenticated") {
      setEntries([]);
      return;
    }

    try {
      const response = await fetch("/api/history", {
        method: "DELETE",
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Failed to clear history (${response.status})`);
      }
      setEntries([]);
      setError(null);
    } catch (clearError) {
      const message = buildError(clearError, "Unable to clear history.");
      setError(message);
    }
  }, [status]);

  const value = useMemo<HistoryContextValue>(
    () => ({
      entries,
      isLoading,
      error,
      refresh,
      saveEntry,
      clearEntries,
    }),
    [entries, isLoading, error, refresh, saveEntry, clearEntries]
  );

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

export const useHistory = () => {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error("useHistory must be used within HistoryProvider");
  }
  return context;
};
