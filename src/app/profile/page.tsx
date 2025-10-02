"use client";

import type { ReactElement } from "react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";

import { SiteHeader } from "@/components/SiteHeader";
import { useLanguage } from "@/providers/language-provider";
import { useUserSettings, type UserSettings } from "@/providers/user-settings-provider";
import { resolveDisplayName } from "@/utils/resolve-display-name";

const MAX_LENGTH = 128;

const normalizeInput = (value: string) => value.slice(0, MAX_LENGTH);

type IconProps = {
  className?: string;
};

const AccountTabIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
  </svg>
);

const buildInitialState = (
  settings: UserSettings | null,
  fallbackDisplayName: string
) => ({
  displayName: settings?.displayName ?? fallbackDisplayName ?? "",
});

type TabId = "account";

type TabDefinition = {
  id: TabId;
  label: string;
  icon: (props: IconProps) => ReactElement;
};

type ConnectorDescriptor = {
  id: string;
  label: string;
  connected: boolean;
  detail: string | null;
  connect?: () => void | Promise<void>;
  disconnect?: () => void | Promise<void>;
};

export default function ProfilePage() {
  const {
    ready,
    authenticated,
    login,
    user,
    linkEmail,
    linkGoogle,
    linkDiscord,
    unlinkEmail,
    unlinkGoogle,
    unlinkDiscord,
  } = usePrivy();
  const { messages } = useLanguage();
  const profileCopy = messages.profile;
  const { settings, status, error, save } = useUserSettings();

  const linkedAccounts = useMemo(() => {
    const raw = (user as unknown as {
      linkedAccounts?: Array<Record<string, unknown>>;
      linked_accounts?: Array<Record<string, unknown>>;
    }) ?? {};
    if (Array.isArray(raw.linkedAccounts)) {
      return raw.linkedAccounts;
    }
    if (Array.isArray(raw.linked_accounts)) {
      return raw.linked_accounts;
    }
    return [];
  }, [user]);

  const fallbackDisplayName = useMemo(
    () => resolveDisplayName(user, settings?.displayName) ?? "",
    [settings?.displayName, user]
  );

  const [form, setForm] = useState(buildInitialState(settings, fallbackDisplayName));
  const [activeTab, setActiveTab] = useState<TabId>("account");
  const [accountState, setAccountState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [accountError, setAccountError] = useState<string | null>(null);
  const [connectorBusy, setConnectorBusy] = useState<string | null>(null);
  const [connectorError, setConnectorError] = useState<string | null>(null);

  useEffect(() => {
    setForm(buildInitialState(settings, fallbackDisplayName));
  }, [settings, fallbackDisplayName]);

  const handleChange = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = normalizeInput(event.target.value ?? "");
    setForm((prev) => ({ ...prev, [field]: nextValue }));
    if (accountState === "success" || accountState === "error") {
      setAccountState("idle");
      setAccountError(null);
    }
  };

  const handleAccountSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authenticated) {
      setAccountState("error");
      setAccountError(profileCopy.errors.sessionRequired);
      return;
    }
    setAccountState("saving");
    setAccountError(null);
    try {
      await save({
        displayName: form.displayName.trim() ? form.displayName.trim() : null,
        binanceApiKey: settings?.binanceApiKey ?? null,
        binanceApiSecret: settings?.binanceApiSecret ?? null,
        bybitApiKey: settings?.bybitApiKey ?? null,
        bybitApiSecret: settings?.bybitApiSecret ?? null,
        updatedAt: settings?.updatedAt ?? null,
      });
      setAccountState("success");
    } catch (saveError) {
      setAccountState("error");
      setAccountError(saveError instanceof Error ? saveError.message : profileCopy.errors.saveFailed);
    }
  };

  const showLoader = status === "loading" && !settings;
  const tabs = useMemo<TabDefinition[]>(
    () => [
      { id: "account", label: profileCopy.tabs.account, icon: AccountTabIcon },
    ],
    [profileCopy.tabs.account]
  );

  const handleTabClick = (tabId: TabId) => {
    setActiveTab(tabId);
    setConnectorError(null);
  };

  const activeDescription = profileCopy.descriptions?.[activeTab] ?? "";

  const connectorStatus = useMemo<ConnectorDescriptor[]>(() => {
    const emailAccount = user?.email?.address || linkedAccounts.find((account) => account?.type === "email")?.address;
    const googleConnected = linkedAccounts.some(
      (account) => typeof account?.type === "string" && account.type.includes("google")
    );
    const discordConnected = linkedAccounts.some(
      (account) => typeof account?.type === "string" && account.type.includes("discord")
    );

    const googleAccount = linkedAccounts.find(
      (account) => typeof account?.type === "string" && account.type.includes("google")
    ) as Record<string, unknown> | undefined;
    const discordAccount = linkedAccounts.find(
      (account) => typeof account?.type === "string" && account.type.includes("discord")
    ) as Record<string, unknown> | undefined;

    const googleSubject = typeof googleAccount?.subject === "string" ? googleAccount.subject : null;
    const discordSubject = typeof discordAccount?.subject === "string" ? discordAccount.subject : null;
    const googleDetail =
      typeof googleAccount?.email === "string"
        ? (googleAccount.email as string)
        : typeof googleAccount?.name === "string"
        ? (googleAccount.name as string)
        : null;
    const discordDetail =
      typeof discordAccount?.username === "string"
        ? (discordAccount.username as string)
        : null;

    const emailDetail = typeof emailAccount === "string" ? emailAccount : null;

    return [
      {
        id: "email",
        label: profileCopy.connections.email,
        connected: Boolean(emailDetail),
        detail: emailDetail,
        connect: linkEmail,
        disconnect: emailDetail
          ? async () => {
              await unlinkEmail(emailDetail);
            }
          : undefined,
      },
      {
        id: "google",
        label: profileCopy.connections.google,
        connected: googleConnected,
        detail: googleDetail,
        connect: linkGoogle,
        disconnect: googleSubject
          ? async () => {
              await unlinkGoogle(googleSubject);
            }
          : undefined,
      },
      {
        id: "discord",
        label: profileCopy.connections.discord,
        connected: discordConnected,
        detail: discordDetail,
        connect: linkDiscord,
        disconnect: discordSubject
          ? async () => {
              await unlinkDiscord(discordSubject);
            }
          : undefined,
      },
    ];
  }, [
    linkDiscord,
    linkEmail,
    linkGoogle,
    linkedAccounts,
    profileCopy.connections.discord,
    profileCopy.connections.email,
    profileCopy.connections.google,
    unlinkDiscord,
    unlinkEmail,
    unlinkGoogle,
    user?.email?.address,
  ]);

  const handleConnectorAction = async (
    connector: (typeof connectorStatus)[number],
    action: "connect" | "disconnect"
  ) => {
    if (!authenticated) {
      setConnectorError(profileCopy.errors.sessionRequired);
      return;
    }
    setConnectorBusy(`${connector.id}-${action}`);
    setConnectorError(null);
    try {
      if (action === "connect") {
        await connector.connect?.();
      } else if (action === "disconnect" && connector.disconnect) {
        await connector.disconnect();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : profileCopy.errors.saveFailed;
      setConnectorError(message);
    } finally {
      setConnectorBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--swimm-neutral-100)] text-[var(--swimm-navy-900)]">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 pb-20 pt-12">
        <header className="space-y-3">
          <span className="inline-flex items-center rounded-full border border-[var(--swimm-primary-500)] bg-[var(--swimm-primary-500)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--swimm-primary-700)]">
            {profileCopy.badge}
          </span>
          <h1 className="text-3xl font-semibold text-[var(--swimm-navy-900)]">{profileCopy.title}</h1>
          <p className="max-w-2xl text-sm text-[var(--swimm-neutral-500)]">{activeDescription}</p>
        </header>

        {!ready ? (
          <section className="rounded-3xl border border-[var(--swimm-neutral-300)] bg-white p-8 text-center text-sm text-[var(--swimm-neutral-500)]">
            {profileCopy.loading}
          </section>
        ) : !authenticated ? (
          <section className="rounded-3xl border border-[var(--swimm-neutral-300)] bg-white p-8 text-center">
            <h2 className="text-xl font-semibold text-[var(--swimm-navy-900)]">{profileCopy.authRequired.title}</h2>
            <p className="mt-3 text-sm text-[var(--swimm-neutral-500)]">{profileCopy.authRequired.description}</p>
            <button
              type="button"
              onClick={() => login()}
              className="mt-6 inline-flex items-center justify-center rounded-full border border-[var(--swimm-primary-500)] bg-[var(--swimm-primary-500)] px-6 py-3 text-sm font-semibold text-[var(--swimm-navy-900)] shadow-[var(--swimm-glow)] transition hover:bg-[var(--swimm-primary-700)] hover:text-white"
            >
              {profileCopy.authRequired.cta}
            </button>
          </section>
        ) : showLoader ? (
          <section className="rounded-3xl border border-[var(--swimm-neutral-300)] bg-white p-8 text-center text-sm text-[var(--swimm-neutral-500)]">
            {profileCopy.loading}
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
            <aside className="rounded-3xl border border-[var(--swimm-neutral-300)] bg-white p-4">
              <nav className="flex flex-col gap-2 text-sm">
                {tabs.map((tab) => {
                  const isActive = tab.id === activeTab;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleTabClick(tab.id)}
                      className={`flex items-center justify-between rounded-2xl px-4 py-2 transition ${
                        isActive
                          ? "bg-[var(--swimm-primary-500)]/10 text-[var(--swimm-primary-700)]"
                          : "text-[var(--swimm-neutral-500)] hover:bg-[var(--swimm-neutral-100)]"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <Icon
                          className={`h-4 w-4 ${
                            isActive
                              ? "text-[var(--swimm-primary-700)]"
                              : "text-[var(--swimm-neutral-400)]"
                          }`}
                        />
                        {tab.label}
                      </span>
                      {isActive ? <span className="h-2 w-2 rounded-full bg-[var(--swimm-primary-500)]" /> : null}
                    </button>
                  );
                })}
              </nav>
            </aside>

            <div className="space-y-8">
              {activeTab === "account" ? (
                <form className="space-y-6 rounded-3xl border border-[var(--swimm-neutral-300)] bg-white p-8" onSubmit={handleAccountSubmit}>
                  <div className="space-y-2">
                    <label className="block text-sm text-[var(--swimm-neutral-600)]">
                      <span className="font-medium text-[var(--swimm-neutral-700)]">
                        {profileCopy.account.displayNameLabel}
                      </span>
                      <input
                        type="text"
                        value={form.displayName || ""}
                        onChange={handleChange("displayName")}
                        placeholder={profileCopy.account.displayNamePlaceholder}
                        className="mt-2 h-11 w-full rounded-2xl border border-[var(--swimm-neutral-300)] bg-white px-4 text-sm text-[var(--swimm-neutral-700)] outline-none transition focus:border-[var(--swimm-primary-600)] focus:ring-2 focus:ring-[var(--swimm-primary-500)]/30"
                        autoComplete="off"
                      />
                    </label>
                    <p className="text-xs text-[var(--swimm-neutral-500)]">{profileCopy.account.displayNameHelp}</p>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-[var(--swimm-neutral-200)] bg-[var(--swimm-neutral-50)] p-5">
                    <div>
                      <h2 className="text-base font-semibold text-[var(--swimm-navy-900)]">{profileCopy.account.connectionsTitle}</h2>
                      <p className="mt-1 text-xs text-[var(--swimm-neutral-500)]">{profileCopy.account.connectionsDescription}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {connectorStatus.map((connector) => (
                        <div
                          key={connector.id}
                          className="flex flex-col gap-2 rounded-xl border border-[var(--swimm-neutral-200)] bg-white p-4 text-sm text-[var(--swimm-neutral-600)]"
                        >
                          <span className="font-semibold text-[var(--swimm-navy-900)]">{connector.label}</span>
                          <span
                            className={`text-xs font-medium uppercase tracking-[0.2em] ${
                              connector.connected
                                ? "text-[var(--swimm-up)]"
                                : "text-[var(--swimm-neutral-400)]"
                            }`}
                          >
                            {connector.connected
                              ? profileCopy.account.connectionStatus.connected
                              : profileCopy.account.connectionStatus.notConnected}
                          </span>
                          {connector.detail ? (
                            <span className="text-xs text-[var(--swimm-neutral-500)]">{connector.detail}</span>
                          ) : null}
                          <div className="mt-2 flex gap-2">
                            {connector.connected && connector.disconnect ? (
                              <button
                                type="button"
                                onClick={() => handleConnectorAction(connector, "disconnect")}
                                disabled={connectorBusy === `${connector.id}-disconnect`}
                                className="rounded-full border border-[var(--swimm-down)]/40 bg-[var(--swimm-down)]/10 px-3 py-1 text-xs font-semibold text-[var(--swimm-down)] transition hover:bg-[var(--swimm-down)]/20 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {connectorBusy === `${connector.id}-disconnect`
                                  ? profileCopy.account.actions.processing
                                  : profileCopy.account.actions.disconnect}
                              </button>
                            ) : null}
                            {!connector.connected && connector.connect ? (
                              <button
                                type="button"
                                onClick={() => handleConnectorAction(connector, "connect")}
                                disabled={connectorBusy === `${connector.id}-connect`}
                                className="rounded-full border border-[var(--swimm-primary-500)] bg-[var(--swimm-primary-500)]/10 px-3 py-1 text-xs font-semibold text-[var(--swimm-primary-700)] transition hover:bg-[var(--swimm-primary-500)]/20 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {connectorBusy === `${connector.id}-connect`
                                  ? profileCopy.account.actions.processing
                                  : profileCopy.account.actions.connect}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-[var(--swimm-neutral-400)]">
                      {profileCopy.account.connectionsNote}
                    </p>
                    {connectorError ? (
                      <div className="rounded-xl border border-[var(--swimm-down)]/30 bg-[var(--swimm-down)]/10 px-3 py-2 text-xs text-[var(--swimm-down)]">
                        {connectorError}
                      </div>
                    ) : null}
                  </div>

                  {accountError ? (
                    <div className="rounded-2xl border border-[var(--swimm-down)]/30 bg-[var(--swimm-down)]/10 px-4 py-3 text-sm text-[var(--swimm-down)]">{accountError}</div>
                  ) : accountState === "success" ? (
                    <div className="rounded-2xl border border-[var(--swimm-up)]/30 bg-[var(--swimm-up)]/10 px-4 py-3 text-sm text-[var(--swimm-up)]">{profileCopy.account.success}</div>
                  ) : null}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={accountState === "saving"}
                      className="inline-flex items-center justify-center rounded-full border border-[var(--swimm-primary-500)] bg-[var(--swimm-primary-500)] px-6 py-3 text-sm font-semibold text-[var(--swimm-navy-900)] shadow-[var(--swimm-glow)] transition hover:bg-[var(--swimm-primary-700)] hover:text-white disabled:cursor-not-allowed disabled:border-[var(--swimm-neutral-300)] disabled:bg-[var(--swimm-neutral-300)]/40 disabled:text-[var(--swimm-neutral-500)]"
                    >
                      {accountState === "saving" ? profileCopy.account.actions.saving : profileCopy.account.actions.save}
                    </button>
                  </div>
                </form>
              ) : null}

            </div>
          </div>
        )}
      </main>
    </div>
  );
}
