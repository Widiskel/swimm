"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";

import { SiteHeader } from "@/components/SiteHeader";
import { useLanguage } from "@/providers/language-provider";
import { useUserSettings, type UserSettings } from "@/providers/user-settings-provider";

const MAX_LENGTH = 128;

const normalizeInput = (value: string) => value.slice(0, MAX_LENGTH);

const buildInitialState = (settings: UserSettings | null) => ({
  binanceApiKey: settings?.binanceApiKey ?? "",
  binanceApiSecret: settings?.binanceApiSecret ?? "",
  bybitApiKey: settings?.bybitApiKey ?? "",
  bybitApiSecret: settings?.bybitApiSecret ?? "",
});

export default function ProfilePage() {
  const { ready, authenticated, login } = usePrivy();
  const { messages } = useLanguage();
  const profileCopy = messages.profile;
  const { settings, status, error, save } = useUserSettings();

  const [form, setForm] = useState(buildInitialState(settings));
  const [submitState, setSubmitState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isSaving = submitState === "saving";

  useEffect(() => {
    setForm(buildInitialState(settings));
  }, [settings]);

  const handleChange = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = normalizeInput(event.target.value ?? "");
    setForm((prev) => ({ ...prev, [field]: nextValue }));
    if (submitState === "success" || submitState === "error") {
      setSubmitState("idle");
      setSubmitError(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authenticated) {
      setSubmitState("error");
      setSubmitError(profileCopy.errors.sessionRequired);
      return;
    }
    setSubmitState("saving");
    setSubmitError(null);
    try {
      await save({
        binanceApiKey: form.binanceApiKey.trim() ? form.binanceApiKey.trim() : null,
        binanceApiSecret: form.binanceApiSecret.trim() ? form.binanceApiSecret.trim() : null,
        bybitApiKey: form.bybitApiKey.trim() ? form.bybitApiKey.trim() : null,
        bybitApiSecret: form.bybitApiSecret.trim() ? form.bybitApiSecret.trim() : null,
        updatedAt: settings?.updatedAt ?? null,
      });
      setSubmitState("success");
    } catch (saveError) {
      setSubmitState("error");
      setSubmitError(saveError instanceof Error ? saveError.message : profileCopy.errors.saveFailed);
    }
  };

  const updatedLabel = useMemo(() => {
    if (!settings?.updatedAt) {
      return profileCopy.meta.neverUpdated;
    }
    try {
      const formatter = new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      return profileCopy.meta.lastUpdated.replace("{timestamp}", formatter.format(new Date(settings.updatedAt)));
    } catch {
      return profileCopy.meta.lastUpdated.replace("{timestamp}", settings.updatedAt);
    }
  }, [profileCopy.meta.lastUpdated, profileCopy.meta.neverUpdated, settings?.updatedAt]);

  const showLoader = status === "loading" && !settings;

  return (
    <div className="min-h-screen bg-[var(--swimm-neutral-100)] text-[var(--swimm-navy-900)]">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 pb-20 pt-12">
        <header className="space-y-3">
          <span className="inline-flex items-center rounded-full border border-[var(--swimm-primary-500)] bg-[var(--swimm-primary-500)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--swimm-primary-700)]">
            {profileCopy.badge}
          </span>
          <h1 className="text-3xl font-semibold text-[var(--swimm-navy-900)]">{profileCopy.title}</h1>
          <p className="max-w-2xl text-sm text-[var(--swimm-neutral-500)]">{profileCopy.description}</p>
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
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8 rounded-3xl border border-[var(--swimm-neutral-300)] bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-2 border-b border-[var(--swimm-neutral-200)] pb-6">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--swimm-neutral-300)]">
                {profileCopy.meta.title}
              </div>
              <div className="text-sm text-[var(--swimm-neutral-500)]">{showLoader ? profileCopy.loading : updatedLabel}</div>
              <div className="text-sm text-[var(--swimm-neutral-400)]">{profileCopy.meta.hint}</div>
            </div>

            <section className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-[var(--swimm-navy-900)]">{profileCopy.binance.title}</h2>
                <p className="text-sm text-[var(--swimm-neutral-500)]">{profileCopy.binance.description}</p>
                <label className="block text-sm text-[var(--swimm-neutral-600)]">
                  <span className="font-medium text-[var(--swimm-neutral-700)]">{profileCopy.binance.apiKey}</span>
                  <input
                    type="text"
                    value={form.binanceApiKey}
                    onChange={handleChange("binanceApiKey")}
                    placeholder={profileCopy.placeholders.apiKey}
                    className="mt-2 h-11 w-full rounded-2xl border border-[var(--swimm-neutral-300)] bg-white px-4 text-sm text-[var(--swimm-neutral-700)] outline-none transition focus:border-[var(--swimm-primary-600)] focus:ring-2 focus:ring-[var(--swimm-primary-500)]/30"
                    autoComplete="off"
                  />
                </label>
                <label className="block text-sm text-[var(--swimm-neutral-600)]">
                  <span className="font-medium text-[var(--swimm-neutral-700)]">{profileCopy.binance.apiSecret}</span>
                  <input
                    type="password"
                    value={form.binanceApiSecret}
                    onChange={handleChange("binanceApiSecret")}
                    placeholder={profileCopy.placeholders.apiSecret}
                    className="mt-2 h-11 w-full rounded-2xl border border-[var(--swimm-neutral-300)] bg-white px-4 text-sm text-[var(--swimm-neutral-700)] outline-none transition focus:border-[var(--swimm-primary-600)] focus:ring-2 focus:ring-[var(--swimm-primary-500)]/30"
                    autoComplete="off"
                  />
                </label>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-[var(--swimm-navy-900)]">{profileCopy.bybit.title}</h2>
                <p className="text-sm text-[var(--swimm-neutral-500)]">{profileCopy.bybit.description}</p>
                <label className="block text-sm text-[var(--swimm-neutral-600)]">
                  <span className="font-medium text-[var(--swimm-neutral-700)]">{profileCopy.bybit.apiKey}</span>
                  <input
                    type="text"
                    value={form.bybitApiKey}
                    onChange={handleChange("bybitApiKey")}
                    placeholder={profileCopy.placeholders.apiKey}
                    className="mt-2 h-11 w-full rounded-2xl border border-[var(--swimm-neutral-300)] bg-white px-4 text-sm text-[var(--swimm-neutral-700)] outline-none transition focus:border-[var(--swimm-primary-600)] focus:ring-2 focus:ring-[var(--swimm-primary-500)]/30"
                    autoComplete="off"
                  />
                </label>
                <label className="block text-sm text-[var(--swimm-neutral-600)]">
                  <span className="font-medium text-[var(--swimm-neutral-700)]">{profileCopy.bybit.apiSecret}</span>
                  <input
                    type="password"
                    value={form.bybitApiSecret}
                    onChange={handleChange("bybitApiSecret")}
                    placeholder={profileCopy.placeholders.apiSecret}
                    className="mt-2 h-11 w-full rounded-2xl border border-[var(--swimm-neutral-300)] bg-white px-4 text-sm text-[var(--swimm-neutral-700)] outline-none transition focus:border-[var(--swimm-primary-600)] focus:ring-2 focus:ring-[var(--swimm-primary-500)]/30"
                    autoComplete="off"
                  />
                </label>
              </div>
            </section>

            <div className="rounded-2xl border border-dashed border-[var(--swimm-neutral-300)] bg-[var(--swimm-neutral-100)] px-4 py-3 text-sm text-[var(--swimm-neutral-500)]">
              {profileCopy.disclaimer}
            </div>

            {submitError ? (
              <div className="rounded-2xl border border-[var(--swimm-down)]/30 bg-[var(--swimm-down)]/10 px-4 py-3 text-sm text-[var(--swimm-down)]">
                {submitError}
              </div>
            ) : submitState === "success" ? (
              <div className="rounded-2xl border border-[var(--swimm-up)]/30 bg-[var(--swimm-up)]/10 px-4 py-3 text-sm text-[var(--swimm-up)]">
                {profileCopy.success}
              </div>
            ) : null}

            {error && submitState !== "error" ? (
              <div className="rounded-2xl border border-[var(--swimm-down)]/30 bg-[var(--swimm-down)]/10 px-4 py-3 text-sm text-[var(--swimm-down)]">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-[var(--swimm-neutral-200)] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[var(--swimm-neutral-500)]">{profileCopy.meta.fallback}</p>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center justify-center rounded-full border border-[var(--swimm-primary-500)] bg-[var(--swimm-primary-500)] px-6 py-3 text-sm font-semibold text-[var(--swimm-navy-900)] shadow-[var(--swimm-glow)] transition hover:bg-[var(--swimm-primary-700)] hover:text-white disabled:cursor-not-allowed disabled:border-[var(--swimm-neutral-300)] disabled:bg-[var(--swimm-neutral-300)]/40 disabled:text-[var(--swimm-neutral-500)]"
              >
                {isSaving ? profileCopy.actions.saving : profileCopy.actions.save}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
