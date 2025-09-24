"use client";

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

export function PairSelectionCard({
  selectedPair,
  onPairChange,
  onShowChart,
  pairs,
  isLoadingPairs,
}: PairSelectionCardProps) {
  const { t } = useLanguage();
  const hasPairs = pairs.length > 0;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8">
      <div>
        <h3 className="text-lg font-semibold text-slate-50">{t("Choose trading pair", "Pilih pair trading")}</h3>
        <p className="mt-1 text-sm text-slate-400">
          {t(
            "Select a pair then click \"Show chart\" to load live candlesticks. You can change timeframe directly on the chart panel.",
            "Pilih pair lalu klik \"Tampilkan chart\" untuk memuat candlestick live. Timeframe dapat diganti langsung di panel chart."
          )}
        </p>
      </div>
      <div className="mt-6 flex flex-col gap-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t("Trading pair", "Trading pair")}
          </label>
          <select
            className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
            value={selectedPair}
            onChange={(event) => onPairChange(event.target.value)}
            disabled={isLoadingPairs || !hasPairs}
          >
            {isLoadingPairs ? (
              <option>{t("Loading pairs...", "Memuat daftar pair...")}</option>
            ) : hasPairs ? (
              pairs.map((pair) => (
                <option key={pair.symbol} value={pair.symbol}>
                  {pair.label}
                </option>
              ))
            ) : (
              <option>{t("No pairs available", "Tidak ada pair tersedia")}</option>
            )}
          </select>
        </div>
        <button
          type="button"
          onClick={onShowChart}
          disabled={!hasPairs}
          className="inline-flex items-center justify-center rounded-full border border-sky-500 bg-sky-500/20 px-6 py-3 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
        >
          {t("Show chart", "Tampilkan chart")}
        </button>
      </div>
    </div>
  );
}
