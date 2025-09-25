"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
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
      console.error("Login failed", authError);
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
      console.error("Logout failed", authError);
      setError(authError instanceof Error ? authError.message : copy.logoutError);
    } finally {
      setState("idle");
    }
  }, [copy.logoutError, logout]);

  if (!ready) {
    return (
      <motion.button
        type="button"
        className="rounded-full border border-[var(--swimm-neutral-300)] bg-[var(--swimm-neutral-100)] px-5 py-2 text-sm font-medium text-[var(--swimm-neutral-500)]"
        disabled
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
      >
        {copy.connecting}
      </motion.button>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex flex-col items-end gap-1">
        <motion.button
          type="button"
          onClick={handleLogin}
          disabled={state === "loading"}
          className="rounded-full border border-[var(--swimm-primary-500)] bg-[var(--swimm-primary-500)] px-5 py-2 text-sm font-semibold text-[var(--swimm-navy-900)] shadow-sm shadow-[var(--swimm-glow)] disabled:cursor-not-allowed disabled:border-[var(--swimm-neutral-300)] disabled:bg-[var(--swimm-neutral-300)]/40 disabled:text-[var(--swimm-neutral-500)]"
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 240, damping: 18 }}
        >
          {state === "loading" ? copy.loginProcessing : copy.login}
        </motion.button>
        {error ? (
          <span className="text-xs text-[var(--swimm-down)]">{error}</span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col text-right text-sm">
        <span className="font-medium text-[var(--swimm-navy-900)]">
          {displayName ?? copy.defaultUser}
        </span>
        <span className="text-xs text-[var(--swimm-neutral-500)]">{copy.authenticatedLabel}</span>
      </div>
      <motion.button
        type="button"
        onClick={handleLogout}
        disabled={state === "loading"}
        className="rounded-full border border-[var(--swimm-neutral-300)] px-4 py-1.5 text-xs font-medium text-[var(--swimm-neutral-500)]"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      >
        {state === "loading" ? copy.logoutProcessing : copy.logout}
      </motion.button>
      {error ? <span className="text-xs text-[var(--swimm-down)]">{error}</span> : null}
    </div>
  );
};

export function AuthSection() {
  const { messages } = useLanguage();
  const copy = messages.auth;

  if (!PRIVY_APP_ID) {
    const [prefix, suffix] = copy.envMissing.split("NEXT_PUBLIC_PRIVY_APP_ID");
    return (
      <div className="rounded-md border border-dashed border-[var(--swimm-neutral-300)] px-3 py-2 text-xs text-[var(--swimm-neutral-500)]">
        {prefix}
        <code className="text-[var(--swimm-primary-700)]">NEXT_PUBLIC_PRIVY_APP_ID</code>
        {suffix}
      </div>
    );
  }

  return <GuardedAuthControls />;
}
