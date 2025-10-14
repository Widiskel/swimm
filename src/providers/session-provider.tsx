"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePrivy } from "@privy-io/react-auth";

export type SessionData = {
  sessionId: string;
  userId: string;
  email?: string | null;
  name?: string | null;
  wallet?: string | null;
  createdAt: string;
  expiresAt: string;
  credits: number;
};

type SessionStatus = "loading" | "authenticated" | "guest";

type SessionContextValue = {
  status: SessionStatus;
  session: SessionData | null;
  isSyncing: boolean;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const normalizeSession = (session: SessionData | null) => {
  if (!session) {
    return null;
  }
  const credits =
    typeof session.credits === "number" && Number.isFinite(session.credits)
      ? Math.max(0, Math.floor(session.credits))
      : 0;
  return {
    ...session,
    credits,
  };
};

const fetchSession = async () => {
  const response = await fetch("/api/session", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Session request failed with ${response.status}`);
  }
  const payload = (await response.json()) as { session: SessionData | null };
  return normalizeSession(payload.session ?? null);
};

const createServerSession = async (
  data: Partial<SessionData> & { userId: string }
) => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  const response = await fetch("/api/session", {
    method: "POST",
    headers,
    body: JSON.stringify({
      userId: data.userId,
      email: data.email ?? null,
      name: data.name ?? null,
      wallet: data.wallet ?? null,
    }),
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to create session (${response.status})`);
  }
  const payload = (await response.json()) as { session: SessionData | null };
  return normalizeSession(payload.session ?? null);
};

const destroyServerSession = async () => {
  await fetch("/api/session", {
    method: "DELETE",
    credentials: "include",
    cache: "no-store",
  }).catch(() => undefined);
};

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, user } = usePrivy();
  const [session, setSession] = useState<SessionData | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [isSyncing, setIsSyncing] = useState(false);
  const lastSyncUserId = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    setIsSyncing(true);
    try {
      const current = await fetchSession();
      setSession(current);
      setStatus(current ? "authenticated" : "guest");
      lastSyncUserId.current = current?.userId ?? null;
    } catch (error) {
      console.warn("Failed to refresh session", error);
      setSession(null);
      setStatus("guest");
      lastSyncUserId.current = null;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!authenticated) {
      lastSyncUserId.current = null;
      setSession(null);
      setStatus("guest");
      void destroyServerSession();
      return;
    }

    const userId = user?.id;
    if (!userId) {
      return;
    }

    if (lastSyncUserId.current === userId) {
      return;
    }

    const email = user.email?.address ?? null;
    const wallet = user.wallet?.address ?? null;
    const derivedName = user.farcaster?.username ? `@${user.farcaster.username}` : email ?? wallet;

    setIsSyncing(true);
    void createServerSession({ userId, email, name: derivedName, wallet })
      .then((created) => {
        setSession(created);
        setStatus(created ? "authenticated" : "guest");
        lastSyncUserId.current = created?.userId ?? null;
      })
      .catch((error) => {
        console.error("Failed to create session", error);
      })
      .finally(() => {
        setIsSyncing(false);
      });
  }, [authenticated, ready, user]);

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      session,
      isSyncing,
      refresh,
    }),
    [status, session, isSyncing, refresh]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
};
