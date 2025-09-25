"use client";

import { Fragment, useCallback, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import Fuse from "fuse.js";
import { motion } from "framer-motion";

import { useLanguage } from "@/providers/language-provider";

type TradingPair = {
  symbol: string;
  label: string;
};

type PairSelectionCardProps = {
  selectedPair: string;
  onPairChange: (symbol: string) => void;
  onShowChart: () => void;
  pairs: TradingPair[];
  isLoadingPairs: boolean;
};

const MotionDiv = motion.div;

export function PairSelectionCard({
  selectedPair,
  onPairChange,
  onShowChart,
  pairs,
  isLoadingPairs,
}: PairSelectionCardProps) {
  const { __ } = useLanguage();
  const hasPairs = pairs.length > 0;
  const [query, setQuery] = useState("");
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  const fuse = useMemo(
    () =>
      new Fuse(pairs, {
        keys: ["symbol", "label"],
        threshold: 0.3,
      }),
    [pairs]
  );

  const selectedPairOption = useMemo(
    () => pairs.find((pair) => pair.symbol === selectedPair) ?? null,
    [pairs, selectedPair]
  );

  const filteredPairs = useMemo(() => {
    if (!query.trim()) {
      return pairs;
    }
    return fuse.search(query).map((result) => result.item);
  }, [fuse, pairs, query]);

  const openSelector = useCallback(() => {
    if (!hasPairs) {
      return;
    }
    setIsSelectorOpen(true);
    setQuery("");
  }, [hasPairs]);

  const closeSelector = useCallback(() => {
    setIsSelectorOpen(false);
    setQuery("");
  }, []);

  const handlePairSelect = useCallback(
    (pair: TradingPair) => {
      onPairChange(pair.symbol);
      closeSelector();
    },
    [closeSelector, onPairChange]
  );

  return (
    <MotionDiv
      className="rounded-3xl border border-[var(--swimm-neutral-300)] bg-white p-8 shadow"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      data-aos="fade-up"
    >
      <div>
        <h3 className="text-lg font-semibold text-[var(--swimm-navy-900)]">
          {__("pairSelection.title")}
        </h3>
        <p className="mt-1 text-sm text-[var(--swimm-neutral-500)]">
          {__("pairSelection.description")}
        </p>
      </div>
      <div className="mt-6 flex flex-col gap-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--swimm-neutral-500)]">
            {__("pairSelection.selectLabel")}
          </label>
          <button
            type="button"
            onClick={openSelector}
            disabled={isLoadingPairs || !hasPairs}
            aria-label={__("pairSelection.triggerLabel")}
            className="mt-2 flex w-full items-center justify-between rounded-2xl border border-[var(--swimm-neutral-300)] bg-white px-4 py-3 text-left text-sm text-[var(--swimm-navy-900)] shadow-sm transition hover:border-[var(--swimm-primary-500)] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--swimm-primary-500)]/50 disabled:cursor-not-allowed disabled:border-[var(--swimm-neutral-300)] disabled:bg-[var(--swimm-neutral-300)]/30 disabled:text-[var(--swimm-neutral-500)]"
          >
            <span className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--swimm-neutral-500)]">
                {selectedPairOption?.symbol ?? "—"}
              </span>
              <span className="text-sm font-medium text-[var(--swimm-navy-900)]">
                {selectedPairOption?.label ?? __("pairSelection.noSelection")}
              </span>
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--swimm-primary-500)]/15 text-[var(--swimm-primary-700)] transition hover:bg-[var(--swimm-primary-500)]/25">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
          </button>
        </div>
        <button
          type="button"
          onClick={onShowChart}
          disabled={!hasPairs}
          className="inline-flex items-center justify-center rounded-full border border-[var(--swimm-primary-500)] bg-[var(--swimm-primary-500)] px-6 py-3 text-sm font-semibold text-[var(--swimm-navy-900)] shadow-[var(--swimm-glow)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[var(--swimm-primary-700)] hover:text-white disabled:cursor-not-allowed disabled:border-[var(--swimm-neutral-300)] disabled:bg-[var(--swimm-neutral-300)]/40 disabled:text-[var(--swimm-neutral-500)]"
        >
          {__("pairSelection.button")}
        </button>
      </div>

      <Transition appear show={isSelectorOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40" onClose={closeSelector}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-[var(--swimm-neutral-900)]/60 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center px-4 py-12">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-3xl bg-white p-6 text-left align-middle shadow-2xl transition-all">
                  <div className="flex items-start justify-between gap-6">
                    <Dialog.Title className="text-lg font-semibold text-[var(--swimm-navy-900)]">
                      {__("pairSelection.modalTitle")}
                    </Dialog.Title>
                    <button
                      type="button"
                      onClick={closeSelector}
                      aria-label={__("common.close")}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--swimm-neutral-100)] text-[var(--swimm-neutral-500)] transition hover:bg-[var(--swimm-primary-500)]/15 hover:text-[var(--swimm-primary-700)]"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-4 w-4"
                      >
                        <path d="M18 6 6 18" />
                        <path d="M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-4">
                    <div className="relative">
                      <input
                        type="text"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={__("pairSelection.searchPlaceholder")}
                        autoFocus
                        className="w-full rounded-2xl border border-[var(--swimm-neutral-300)] bg-white px-4 py-3 text-sm text-[var(--swimm-navy-900)] outline-none transition focus:border-[var(--swimm-primary-500)] focus:ring-2 focus:ring-[var(--swimm-primary-500)]/40"
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[var(--swimm-neutral-300)]">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="h-4 w-4"
                        >
                          <circle cx="11" cy="11" r="7" />
                          <path d="m20 20-3.5-3.5" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-4 max-h-72 overflow-auto rounded-2xl border border-[var(--swimm-neutral-300)] bg-white py-2 text-sm shadow-lg">
                      {isLoadingPairs ? (
                        <div className="px-4 py-2 text-[var(--swimm-neutral-500)]">
                          {__("pairSelection.loading")}
                        </div>
                      ) : filteredPairs.length === 0 ? (
                        <div className="px-4 py-2 text-[var(--swimm-neutral-500)]">
                          {query.trim() ? __("pairSelection.searchEmpty") : __("pairSelection.empty")}
                        </div>
                      ) : (
                        <ul className="space-y-1" role="listbox">
                          {filteredPairs.map((pair) => {
                            const isActive = selectedPairOption?.symbol === pair.symbol;
                            return (
                              <li key={pair.symbol}>
                                <button
                                  type="button"
                                  onClick={() => handlePairSelect(pair)}
                                  className={`flex w-full items-center justify-between rounded-xl px-4 py-2 text-left transition ${
                                    isActive
                                      ? "bg-[var(--swimm-primary-500)]/15 text-[var(--swimm-primary-700)]"
                                      : "text-[var(--swimm-neutral-500)] hover:bg-[var(--swimm-primary-500)]/10 hover:text-[var(--swimm-primary-700)]"
                                  }`}
                                  role="option"
                                  aria-selected={isActive}
                                >
                                  <div>
                                    <div className="text-sm font-semibold text-[var(--swimm-navy-900)]">
                                      {pair.symbol}
                                    </div>
                                    <div className="text-xs text-[var(--swimm-neutral-500)]">{pair.label}</div>
                                  </div>
                                  {isActive ? (
                                    <span className="rounded-full bg-[var(--swimm-primary-500)]/20 px-3 py-1 text-xs font-semibold text-[var(--swimm-primary-700)]">
                                      ✓
                                    </span>
                                  ) : null}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </MotionDiv>
  );
}
