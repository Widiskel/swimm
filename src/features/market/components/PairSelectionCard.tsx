import { TRADING_PAIRS } from "../constants";

type PairSelectionCardProps = {
  selectedPair: string;
  onPairChange: (symbol: string) => void;
  onShowChart: () => void;
};

export function PairSelectionCard({
  selectedPair,
  onPairChange,
  onShowChart,
}: PairSelectionCardProps) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8">
      <div>
        <h3 className="text-lg font-semibold text-slate-50">Pilih trading pair</h3>
        <p className="mt-1 text-sm text-slate-400">
          Tentukan pair lalu klik <span className="text-sky-300">Tampilkan chart</span> untuk memuat candlestick live. Timeframe dapat diganti langsung di kartu chart.
        </p>
      </div>
      <div className="mt-6 flex flex-col gap-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Trading pair
          </label>
          <select
            className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
            value={selectedPair}
            onChange={(event) => onPairChange(event.target.value)}
          >
            {TRADING_PAIRS.map((pair) => (
              <option key={pair.symbol} value={pair.symbol}>
                {pair.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={onShowChart}
          className="inline-flex items-center justify-center rounded-full border border-sky-500 bg-sky-500/20 px-6 py-3 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/30"
        >
          Tampilkan chart
        </button>
      </div>
    </div>
  );
}
