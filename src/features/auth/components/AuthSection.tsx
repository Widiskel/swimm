"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { usePrivy } from "@privy-io/react-auth";

import { useLanguage } from "@/providers/language-provider";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

type ButtonState = "idle" | "loading";

type MaybeWalletAccount = {
  address?: string | null;
  type?: string | null;
};

type MaybeWalletUser = {
  linkedAccounts?: MaybeWalletAccount[] | null;
  wallets?: MaybeWalletAccount[] | null;
};

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
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const displayName = useMemo(() => {
    if (!user) {
      return null;
    }
    if (user.email?.address) {
      return user.email.address;
    }
    const extendedUser = user as MaybeWalletUser;
    const linkedWallet = extendedUser.linkedAccounts?.find((account) => account?.type === "wallet");
    const walletFallback = extendedUser.wallets?.[0]?.address ?? linkedWallet?.address ?? undefined;
    const walletAddress = user.wallet?.address ?? walletFallback ?? undefined;
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
      setMenuOpen(false);
    } catch (authError) {
      console.error("Logout failed", authError);
      setError(authError instanceof Error ? authError.message : copy.logoutError);
    } finally {
      setState("idle");
    }
  }, [copy.logoutError, logout]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }
      if (containerRef.current.contains(event.target as Node)) {
        return;
      }
      setMenuOpen(false);
    };

    window.addEventListener("click", handleClickOutside);
    return () => {
      window.removeEventListener("click", handleClickOutside);
    };
  }, [menuOpen]);

  const initials = useMemo(() => {
    const source = (displayName ?? copy.defaultUser).trim();
    const letters = source.replace(/[^A-Za-z0-9]/g, "");
    if (letters.length >= 2) {
      return letters.slice(0, 2).toUpperCase();
    }
    if (letters.length === 1) {
      return letters.toUpperCase();
    }
    return "US";
  }, [copy.defaultUser, displayName]);

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
          className="rounded-full border border-[var(--swimm-primary-500)] bg-[var(--swimm-primary-500)] px-5 py-2 text-sm font-semibold text-[var(--swimm-navy-900)] shadow-[var(--swimm-glow)] disabled:cursor-not-allowed disabled:border-[var(--swimm-neutral-300)] disabled:bg-[var(--swimm-neutral-300)]/40 disabled:text-[var(--swimm-neutral-500)]"
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
    <div className="relative" ref={containerRef}>
      <motion.button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--swimm-primary-500)] bg-[var(--swimm-primary-500)]/10 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--swimm-primary-700)] shadow-[var(--swimm-glow)]"
      >
        {initials}
      </motion.button>
      {menuOpen ? (
        <div className="absolute right-0 z-30 mt-3 w-52 rounded-2xl border border-[var(--swimm-neutral-200)] bg-white p-3 shadow-xl">
          <div className="mb-3 border-b border-[var(--swimm-neutral-100)] pb-2 text-sm">
            <p className="font-semibold text-[var(--swimm-navy-900)]">
              {displayName ?? copy.defaultUser}
            </p>
            <p className="text-xs text-[var(--swimm-neutral-500)]">{copy.authenticatedLabel}</p>
          </div>
          <ul className="flex flex-col gap-1 text-sm">
            <li>
              <LinkButton href="/profile" label={messages.siteHeader.nav.profile} onNavigate={() => setMenuOpen(false)} />
            </li>
            <li>
              <button
                type="button"
                onClick={handleLogout}
                disabled={state === "loading"}
                className="flex w-full items-center justify-between rounded-xl border border-[var(--swimm-neutral-200)] px-3 py-2 text-[var(--swimm-neutral-600)] transition hover:border-[var(--swimm-down)]/40 hover:bg-[var(--swimm-down)]/10 hover:text-[var(--swimm-down)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>{state === "loading" ? copy.logoutProcessing : copy.logout}</span>
                <svg
                  viewBox="0 0 20 20"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    d="M7 5V4a2 2 0 0 1 2-2h7v16H9a2 2 0 0 1-2-2v-1"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13 10H3m0 0 3-3m-3 3 3 3"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </li>
          </ul>
          {error ? <p className="mt-3 text-xs text-[var(--swimm-down)]">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
};

type LinkButtonProps = {
  href: string;
  label: string;
  onNavigate: () => void;
};

const MotionLinkButton = motion(Link);

const LinkButton = ({ href, label, onNavigate }: LinkButtonProps) => (
  <MotionLinkButton
    href={href}
    onClick={onNavigate}
    whileHover={{ x: 3 }}
    transition={{ type: "spring", stiffness: 260, damping: 18 }}
    className="flex items-center justify-between rounded-xl border border-[var(--swimm-neutral-200)] px-3 py-2 text-[var(--swimm-neutral-600)] transition hover:border-[var(--swimm-primary-500)]/50 hover:bg-[var(--swimm-primary-500)]/10 hover:text-[var(--swimm-primary-700)]"
  >
    <span>{label}</span>
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        d="m9 6 4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 10h9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </MotionLinkButton>
);

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
