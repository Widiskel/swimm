"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { AgentResponse } from "@/features/analysis/types";
import { DEFAULT_PROVIDER, type CexProvider } from "@/features/market/exchanges";
import type { MarketMode } from "@/features/market/constants";
import { useSession } from "@/providers/session-provider";

export type HistoryVerdict = "accurate" | "inaccurate" | "unknown";

export type HistorySnapshot = {
  timeframe: string;
  capturedAt: string; // ISO timestamp
  candles: Array<{
    openTime: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
    closeTime?: number;
  }>;
  result?: {
    type: "entry" | "target" | "stop";
    index?: number;
  } | null;
  extensionStartTime?: number | null;
  entryCandles?: Array<{
    openTime?: number;
    open: number;
    high: number;
    low: number;
    close: number;
    time?: number;
  }>;
  targetCandles?: Array<{
    openTime?: number;
    open: number;
    high: number;
    low: number;
    close: number;
    time?: number;
  }>;
  stopCandles?: Array<{
    openTime?: number;
    open: number;
    high: number;
    low: number;
    close: number;
    time?: number;
  }>;
} | null;

export type HistoryEntry = {
  id: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  pair: string;
  timeframe: string;
  provider: CexProvider;
  mode: MarketMode;
  decision: AgentResponse["decision"] | null;
  summary: string;
  response: AgentResponse;
  verdict: HistoryVerdict;
  feedback: string | null;
  executed?: boolean | null;
  snapshot?: HistorySnapshot;
  shareId: string | null;
  shareCreatedAt: string | null;
};

type SaveHistoryPayload = {
  pair: string;
  timeframe: string;
  provider?: CexProvider;
  response: AgentResponse;
  verdict: HistoryVerdict;
  feedback?: string;
  snapshot?: {
    timeframe: string;
    capturedAt: string;
    candles: Array<{
      openTime: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume?: number;
      closeTime?: number;
    }>;
  };
};

type UpdateHistoryPayload = {
  verdict?: HistoryVerdict;
  feedback?: string;
  executed?: boolean | null;
  sessionId?: string;
  createdAt?: string;
};

type HistoryContextValue = {
  entries: HistoryEntry[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  saveEntry: (payload: SaveHistoryPayload) => Promise<HistoryEntry>;
  updateEntry: (id: string, payload: UpdateHistoryPayload) => Promise<HistoryEntry>;
  shareEntry: (id: string) => Promise<HistoryEntry>;
  revokeShare: (id: string) => Promise<HistoryEntry>;
  clearEntries: () => Promise<void>;
};

const HistoryContext = createContext<HistoryContextValue | null>(null);

const buildError = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

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
      setError(buildError(fetchError, "Unable to load history."));
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveEntry = useCallback(
    async ({ pair, timeframe, provider = DEFAULT_PROVIDER, response, verdict, feedback, snapshot }: SaveHistoryPayload) => {
      if (status !== "authenticated") {
        throw new Error("Session required.");
      }
      const body = { pair, timeframe, provider, response, verdict, feedback, snapshot };
      const request = await fetch("/api/history", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!request.ok) {
        let message = `Failed to save history entry (${request.status})`;
        try {
          const payload = (await request.json()) as { error?: string };
          if (payload.error) message = payload.error;
        } catch { /* ignore */ }
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

  const updateEntry = useCallback(
    async (id: string, { verdict, feedback, executed, sessionId: sessionIdHint, createdAt: createdAtHint }: UpdateHistoryPayload) => {
      if (status !== "authenticated") {
        throw new Error("Session required.");
      }
      const body: Record<string, unknown> = {};
      if (typeof verdict !== "undefined") body.verdict = verdict;
      if (typeof feedback !== "undefined") body.feedback = feedback;
      if (typeof executed !== "undefined") body.executed = executed;
      if (sessionIdHint) body.sessionId = sessionIdHint;
      if (createdAtHint) body.createdAt = createdAtHint;

      if (Object.keys(body).length === 0) {
        throw new Error("Nothing to update.");
      }

      const request = await fetch(`/api/history/${id}`, {
        method: "PUT",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!request.ok) {
        let message = `Failed to update history entry (${request.status})`;
        try {
          const payload = (await request.json()) as { error?: string };
          if (payload.error) message = payload.error;
        } catch { /* ignore */ }
        throw new Error(message);
      }
      const payload = (await request.json()) as { entry: HistoryEntry };
      const updated = payload.entry;
      setEntries((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
      setError(null);
      return updated;
    },
    [status]
  );

  const shareEntry = useCallback(
    async (id: string) => {
      if (status !== "authenticated") {
        throw new Error("Session required.");
      }
      const request = await fetch(`/api/history/${id}/share`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
      if (!request.ok) {
        let message = `Failed to share history entry (${request.status})`;
        try {
          const payload = (await request.json()) as { error?: string };
          if (payload.error) message = payload.error;
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }
      const payload = (await request.json()) as { entry: HistoryEntry };
      const updated = payload.entry;
      setEntries((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
      return updated;
    },
    [status]
  );

  const revokeShare = useCallback(
    async (id: string) => {
      if (status !== "authenticated") {
        throw new Error("Session required.");
      }
      const request = await fetch(`/api/history/${id}/share`, {
        method: "DELETE",
        credentials: "include",
        cache: "no-store",
      });
      if (!request.ok) {
        let message = `Failed to update share state (${request.status})`;
        try {
          const payload = (await request.json()) as { error?: string };
          if (payload.error) message = payload.error;
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }
      const payload = (await request.json()) as { entry: HistoryEntry };
      const updated = payload.entry;
      setEntries((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
      return updated;
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
      setError(buildError(clearError, "Unable to clear history."));
    }
  }, [status]);

  const value = useMemo<HistoryContextValue>(
    () => ({
      entries,
      isLoading,
      error,
      refresh,
      saveEntry,
      updateEntry,
      shareEntry,
      revokeShare,
      clearEntries,
    }),
    [entries, isLoading, error, refresh, saveEntry, updateEntry, shareEntry, revokeShare, clearEntries]
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
