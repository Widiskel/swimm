"use client";

import { useCallback, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";

import { useLanguage } from "@/providers/language-provider";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

type ButtonState = "idle" | "loading";

const shorten = (value: string) => {
  if (value.length <= 10) {
    return value;
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const GuardedAuthControls = () => {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { messages } = useLanguage();
  const copy = messages.auth;
  const [state, setState] = useState<ButtonState>("idle");
  const [error, setError] = useState<string | null>(null);

  const displayName = useMemo(() => {
    if (!user) {
      return null;
    }
    if (user.email?.address) {
      return user.email.address;
    }
    const walletAddress = user.wallet?.address ?? user.wallets?.[0]?.address;
    if (walletAddress) {
      return shorten(walletAddress);
    }
    if (user.phone?.number) {
      return user.phone.number;
    }
    if (user.farcaster?.username) {
      return `@${user.farcaster.username}`;
    }
    return null;
  }, [user]);

  const handleLogin = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      await login();
    } catch (authError) {
      console.error("Privy login failed", authError);
      setError(authError instanceof Error ? authError.message : copy.loginError);
    } finally {
      setState("idle");
    }
  }, [copy.loginError, login]);

  const handleLogout = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      await logout();
    } catch (authError) {
      console.error("Privy logout failed", authError);
      setError(authError instanceof Error ? authError.message : copy.logoutError);
    } finally {
      setState("idle");
    }
  }, [copy.logoutError, logout]);

  if (!ready) {
    return (
      <button
        type="button"
        className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-400"
        disabled
      >
        {copy.connecting}
      </button>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={handleLogin}
          disabled={state === "loading"}
          className="rounded-md border border-sky-500 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
        >
          {state === "loading" ? copy.loginProcessing : copy.login}
        </button>
        {error ? (
          <span className="text-xs text-rose-400">{error}</span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col text-right text-sm">
        <span className="font-medium text-slate-100">
          {displayName ?? copy.defaultUser}
        </span>
        <span className="text-xs text-slate-500">{copy.authenticatedLabel}</span>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        disabled={state === "loading"}
        className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700/30 disabled:cursor-not-allowed disabled:text-slate-500"
      >
        {state === "loading" ? copy.logoutProcessing : copy.logout}
      </button>
      {error ? <span className="text-xs text-rose-400">{error}</span> : null}
    </div>
  );
};

export function AuthSection() {
  const { messages } = useLanguage();
  const copy = messages.auth;

  if (!PRIVY_APP_ID) {
    const [prefix, suffix] = copy.envMissing.split("NEXT_PUBLIC_PRIVY_APP_ID");
    return (
      <div className="rounded-md border border-dashed border-slate-700 px-3 py-2 text-xs text-slate-500">
        {prefix}
        <code className="text-slate-300">NEXT_PUBLIC_PRIVY_APP_ID</code>
        {suffix}
      </div>
    );
  }

  return <GuardedAuthControls />;
}
