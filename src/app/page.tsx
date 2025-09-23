"use client";

import { useMemo, useState, type ChangeEvent } from "react";

type DataMode = "scrape" | "upload" | "manual";

type ChartPoint = {
  time: string;
  close: number;
};

type AgentResponse = {
  summary: string;
  decision: {
    action: "buy" | "sell" | "hold";
    confidence: number;
    timeframe: string;
    rationale: string;
  };
  highlights: string[];
  nextSteps: string[];
  market: {
    chart: {
      interval: string;
      points: ChartPoint[];
      narrative: string;
      forecast: string;
    };
    technical: string[];
    fundamental: string[];
  };
  tradePlan: {
    bias: "long" | "short" | "neutral";
    entries: number[];
    entry: number | null;
    stopLoss: number | null;
    takeProfits: number[];
    executionWindow: string;
    sizingNotes: string;
    rationale: string;
  };
};

const DATA_MODE_LABELS: Record<DataMode, string> = {
  scrape: "Scrape news URLs",
  upload: "Upload dataset",
  manual: "Manual notes",
};

const ACTION_COLORS: Record<AgentResponse["decision"]["action"], string> = {
  buy: "bg-emerald-500/10 text-emerald-300 border border-emerald-400/40",
  sell: "bg-rose-500/10 text-rose-200 border border-rose-400/40",
  hold: "bg-amber-500/10 text-amber-200 border border-amber-400/40",
};

const TIMEFRAME_OPTIONS = ["5m", "15m", "30m", "1h", "4h", "1d"] as const;

type TimeframeOption = (typeof TIMEFRAME_OPTIONS)[number];

const entryIcon = "➤" as const;
const targetIcons = ["🥇", "🥈", "🏁", "🎯"] as const;

export default function Home() {
  const [objective, setObjective] = useState(
    "Temukan sentimen berita terbaru untuk menentukan aksi trading BTC/USDT harian."
  );
  const [urlsInput, setUrlsInput] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [uploadedName, setUploadedName] = useState<string | undefined>();
  const [datasetPreview, setDatasetPreview] = useState("");
  const [timeframe, setTimeframe] = useState<TimeframeOption>("5m");
  const [dataMode, setDataMode] = useState<DataMode>("scrape");
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AgentResponse | null>(null);

  const parsedUrls = useMemo(
    () =>
      urlsInput
        .split(/\r?\n/)
        .map((url) => url.trim())
        .filter(Boolean),
    [urlsInput]
  );

  const canRunAgent =
    objective.trim().length > 0 &&
    (parsedUrls.length > 0 || datasetPreview || manualNotes.trim().length > 0);

  const priceFormatter = useMemo(
    () =>
      new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );
  const formatPrice = (value: number | null) =>
    typeof value === "number" && Number.isFinite(value)
      ? `${priceFormatter.format(value)} USDT`
      : "-";

  const formatDateTime = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleString("id-ID", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

  const chartPoints = useMemo(() => response?.market?.chart?.points ?? [], [response]);
  const sparkline = useMemo(() => {
    if (chartPoints.length < 2) {
      return { path: "", area: "", min: null as number | null, max: null as number | null };
    }
    const width = 240;
    const height = 80;
    const padding = 6;
    const closes = chartPoints.map((point) => point.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const range = max - min || 1;
    const coordinates = chartPoints.map((point, index) => {
      const x = (index / (chartPoints.length - 1)) * width;
      const y = height - ((point.close - min) / range) * (height - padding * 2) - padding;
      return { x, y };
    });
    const path = coordinates
      .map((coord, index) => `${index === 0 ? "M" : "L"}${coord.x.toFixed(2)} ${coord.y.toFixed(2)}`)
      .join(" ");
    const area = [
      `M${coordinates[0].x.toFixed(2)} ${height}`,
      ...coordinates.map((coord) => `L${coord.x.toFixed(2)} ${coord.y.toFixed(2)}`),
      `L${coordinates[coordinates.length - 1].x.toFixed(2)} ${height}`,
      "Z",
    ].join(" ");
    return { path, area, min, max };
  }, [chartPoints]);

  const tradeEntries = useMemo(() => {
    if (!response) {
      return [] as number[];
    }
    if (response.tradePlan?.entries && response.tradePlan.entries.length > 0) {
      return response.tradePlan.entries;
    }
    return response?.tradePlan?.entry !== null && response?.tradePlan?.entry !== undefined
      ? [response.tradePlan.entry]
      : [];
  }, [response]);
  const tradeTargets = response?.tradePlan?.takeProfits ?? [];
  const tradeStopLoss = response?.tradePlan?.stopLoss ?? null;
  const tradeExecutionWindow = response?.tradePlan?.executionWindow ?? "-";
  const tradeSizingNotes = response?.tradePlan?.sizingNotes ?? "-";
  const tradeRationale = response?.tradePlan?.rationale ?? "-";

  const chartStart = chartPoints[0]?.time;
  const chartEnd = chartPoints.length > 0 ? chartPoints[chartPoints.length - 1].time : undefined;
  const sparklineGradientId = "sparkline-gradient";

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadedName(file.name);
    setDataMode("upload");

    try {
      const text = await file.text();
      setDatasetPreview(text.slice(0, 4000));
      setError(null);
    } catch {
      setError("Gagal membaca file dataset. Coba lagi.");
    }
  };

  const handleRunAgent = async () => {
    if (!canRunAgent) {
      setError("Lengkapi data dan objektif analisa sebelum menjalankan agent.");
      return;
    }

    setIsRunning(true);
    setError(null);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objective,
          dataMode,
          urls: parsedUrls,
          manualNotes,
          datasetName: uploadedName,
          datasetPreview,
          timeframe,
        }),
      });

      if (!res.ok) {
        let message = "Agent gagal merespon";
        try {
          const errorPayload = (await res.json()) as { error?: unknown };
          if (errorPayload && typeof errorPayload.error === "string") {
            message = errorPayload.error;
          }
        } catch (parseError) {
          console.warn("Gagal membaca pesan error agent", parseError);
        }
        throw new Error(message);
      }

      const payload: AgentResponse = await res.json();
      setResponse(payload);
    } catch (runError) {
      console.error(runError);
      if (runError instanceof Error) {
        setError(runError.message);
      } else {
        setError("Terjadi masalah saat menjalankan agent. Coba ulangi.");
      }
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-lg font-semibold text-slate-950">
              WA
            </div>
            <div>
              <div className="text-sm uppercase tracking-[0.3em] text-slate-400">
                Web Analytic AI
              </div>
              <h1 className="text-xl font-semibold text-slate-100">
                Crypto News Decisioning Suite
              </h1>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <a
              className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
              href="#data"
            >
              Data sources
            </a>
            <a
              className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
              href="#agent"
            >
              AI Agent
            </a>
            <a
              className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
              href="#insights"
            >
              Insights
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12 space-y-12">
        <section className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-8 shadow-2xl shadow-sky-500/10">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/50 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-sky-300">
              Crypto Intelligence
            </span>
            <h2 className="mt-6 text-3xl font-semibold leading-tight text-slate-50 md:text-4xl">
              Analisa berita crypto, sinergikan dengan data internal, dan
              dapatkan keputusan trading otomatis.
            </h2>
            <p className="mt-4 text-base text-slate-300">
              Web Analytic AI menggabungkan scraping berita, data kustom,
              dan agen AI yang bertindak sebagai analis riset makro
              untuk memberikan rekomendasi buy/sell/hold yang dapat Anda percaya.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-sm font-semibold text-slate-200">
                  Multi-source Pipeline
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Gabungkan scraping web, data Anda sendiri, ataupun insight manual dalam satu alur.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-sm font-semibold text-slate-200">
                  Agent Research Loop
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Agen mengevaluasi sentimen, momentum, dan resiko untuk menyintesis rekomendasi.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-sm font-semibold text-slate-200">
                  Decision Traceability
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Lacak sumber berita dan alasan AI untuk kepercayaan dan audit yang lebih tinggi.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-900/40 p-8">
            <div>
              <h3 className="text-lg font-semibold text-slate-50">
                Objective analisa
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Tentukan fokus riset untuk agent. Bisa disesuaikan per aset, timeframe, dan gaya trading.
              </p>
            </div>
            <textarea
              className="mt-6 h-40 w-full resize-none rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
              value={objective}
              onChange={(event) => setObjective(event.target.value)}
            />
            <div className="mt-6">
              <div className="text-sm font-semibold text-slate-100">Timeframe forecasting</div>
              <p className="mt-1 text-xs text-slate-400">Pilih timeframe analisa (minimum 5 menit) agar proyeksi harga menyesuaikan horizon trading Anda.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {TIMEFRAME_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setTimeframe(option)}
                    className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                      timeframe === option
                        ? "border-sky-500 bg-sky-500/20 text-sky-200"
                        : "border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-600 hover:text-slate-100"
                    }`}
                  >
                    {option.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Contoh: &quot;Ukur sentimen harga Bitcoin dari 24 jam terakhir dan sarankan aksi jangka pendek.&quot;
            </p>
          </div>
        </section>

        <section id="data" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-slate-50">
                Manajemen data & scraping
              </h3>
              <p className="text-sm text-slate-400">
                Pilih sumber data yang ingin dianalisa agent. Integrasi scraping dapat disesuaikan.
              </p>
            </div>
            <span className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-400">
              {parsedUrls.length} URL aktif
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            {(Object.keys(DATA_MODE_LABELS) as DataMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDataMode(mode)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  dataMode === mode
                    ? "border-sky-500 bg-sky-500/20 text-sky-200"
                    : "border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-600 hover:text-slate-100"
                }`}
              >
                {DATA_MODE_LABELS[mode]}
              </button>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
              <h4 className="text-base font-semibold text-slate-100">
                Daftar URL berita (scraping)
              </h4>
              <p className="mt-1 text-xs text-slate-400">
                Masukkan satu URL per baris. Endpoint scraping backend dapat dihubungkan pada tahap deployment.
              </p>
              <textarea
                className="mt-4 h-48 w-full resize-none rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-200 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
                placeholder={`https://www.coindesk.com/... \nhttps://cointelegraph.com/...`}
                value={urlsInput}
                onChange={(event) => setUrlsInput(event.target.value)}
              />
              {parsedUrls.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    URL terdeteksi
                  </div>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {parsedUrls.map((url) => (
                      <li
                        key={url}
                        className="truncate rounded-lg bg-slate-950/50 px-3 py-2"
                        title={url}
                      >
                        {url}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
              <h4 className="text-base font-semibold text-slate-100">
                Dataset kustom & catatan manual
              </h4>
              <p className="mt-1 text-xs text-slate-400">
                Unggah CSV/JSON atau tempel catatan analis, angka on-chain, ataupun sinyal teknikal.
              </p>
              <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-6 text-center text-sm text-slate-300 transition hover:border-sky-500 hover:text-sky-300">
                <input
                  type="file"
                  accept=".csv,.json,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <span className="font-semibold">Upload dataset</span>
                <span className="mt-1 text-xs text-slate-500">
                  (.csv, .json, .txt sampai 4.000 karakter dibaca)
                </span>
                {uploadedName && (
                  <span className="mt-2 inline-flex rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs text-sky-200">
                    {uploadedName}
                  </span>
                )}
              </label>
              <textarea
                className="mt-4 h-40 w-full resize-none rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-200 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
                placeholder="Catatan manual, titik support/resistance, data inflow exchange..."
                value={manualNotes}
                onChange={(event) => setManualNotes(event.target.value)}
              />
              {datasetPreview && (
                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Preview dataset
                  </div>
                  <pre className="mt-2 max-h-40 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-[11px] text-slate-300">
                    {datasetPreview}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </section>

        <section
          id="agent"
          className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-slate-100">
                Jalankan agent intelijen crypto
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Agent akan membaca sumber, melakukan scoring sentimen, dan menyusun rekomendasi trading.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Timeframe target saat ini: {timeframe.toUpperCase()}. Forecast akan menghitung pergerakan pada horizon ini.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRunAgent}
              disabled={isRunning || !canRunAgent}
              className="inline-flex items-center justify-center rounded-full border border-sky-500 bg-sky-500/20 px-6 py-3 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800/60 disabled:text-slate-500"
            >
              {isRunning ? "Agent berjalan..." : "Jalankan agent"}
            </button>
          </div>
          {error && (
            <div className="mt-6 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}
          {!canRunAgent && !error && (
            <div className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Tambahkan minimal satu sumber data, internal dataset, atau catatan manual untuk menjalankan agent.
            </div>
          )}
          {response && (
            <div
              id="insights"
              className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]"
            >
              <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                    Ringkasan Agent
                  </div>
                  <div
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${ACTION_COLORS[response.decision.action]}`}
                  >
                    <span>Decision</span>
                    <span>{response.decision.action.toUpperCase()}</span>
                  </div>
                </div>
                <p className="mt-4 text-base text-slate-200">{response.summary}</p>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Confidence</div>
                    <div className="mt-1 text-2xl font-semibold text-slate-50">
                      {(response.decision.confidence * 100).toFixed(0)}%
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Timeframe: {response.decision.timeframe}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rationale utama</div>
                    <p className="mt-2 text-xs text-slate-300">{response.decision.rationale}</p>
                  </div>
                </div>
                <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <span>Market snapshot</span>
                    <span>{response.market.chart.interval.toUpperCase()}</span>
                  </div>
                  {sparkline.path ? (
                    <svg
                      className="mt-4 h-24 w-full"
                      viewBox="0 0 240 80"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id={sparklineGradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d={sparkline.area} fill={`url(#${sparklineGradientId})`} />
                      <path d={sparkline.path} stroke="#38bdf8" strokeWidth={2} fill="none" />
                    </svg>
                  ) : (
                    <div className="mt-4 text-xs text-slate-500">Grafik tidak tersedia.</div>
                  )}
                  <div className="mt-4 grid gap-2 text-[11px] text-slate-400 sm:grid-cols-2">
                    <div>Mulai: {formatDateTime(chartStart)}</div>
                    <div>Selesai: {formatDateTime(chartEnd)}</div>
                    <div>Min: {formatPrice(sparkline.min)}</div>
                    <div>Maks: {formatPrice(sparkline.max)}</div>
                  </div>
                  <p className="mt-4 text-xs text-slate-300">{response.market.chart.narrative}</p>
                  <p className="mt-2 text-xs text-slate-400">Forecast: {response.market.chart.forecast}</p>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Teknikal pendukung</div>
                    {response.market.technical.length ? (
                      <ul className="mt-3 space-y-2 text-xs text-slate-300">
                        {response.market.technical.map((item) => (
                          <li
                            key={item}
                            className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-xs text-slate-500">Ringkasan teknikal belum tersedia.</p>
                    )}
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Fundamental pendukung</div>
                    {response.market.fundamental.length ? (
                      <ul className="mt-3 space-y-2 text-xs text-slate-300">
                        {response.market.fundamental.map((item) => (
                          <li
                            key={item}
                            className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-xs text-slate-500">Ringkasan fundamental belum tersedia.</p>
                    )}
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Highlight temuan</div>
                  <ul className="space-y-2 text-sm text-slate-300">
                    {response.highlights.map((highlight) => (
                      <li
                        key={highlight}
                        className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                      >
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="space-y-6">
                <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
                  <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Trade plan</div>
                  <div className="mt-4 space-y-4 text-sm text-slate-300">
                    <div className="flex items-center justify-between">
                      <span>Bias</span>
                      <span className="uppercase text-slate-100">{response.tradePlan.bias.toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Entry levels</div>
                      {tradeEntries.length ? (
                        <ul className="mt-2 space-y-1 text-xs text-slate-300">
                          {tradeEntries.map((entry, index) => (
                            <li
                              key={`entry-${entry}-${index}`}
                              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2"
                            >
                              <span>{entryIcon}</span>
                              <span>{formatPrice(entry)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">Entry belum tersedia.</p>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Targets</div>
                      {tradeTargets.length ? (
                        <ul className="mt-2 space-y-1 text-xs text-slate-300">
                          {tradeTargets.map((target, index) => (
                            <li
                              key={`target-${target}-${index}`}
                              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2"
                            >
                              <span>{targetIcons[index] ?? "•"}</span>
                              <span>{formatPrice(target)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">Target profit belum tersedia.</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Stop loss</span>
                      <span>{formatPrice(tradeStopLoss)}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Execution window: <span className="text-slate-200">{tradeExecutionWindow}</span>
                    </div>
                    <p className="text-xs text-slate-400">Sizing: {tradeSizingNotes}</p>
                    <p className="text-xs text-slate-400">Catatan: {tradeRationale}</p>
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
                  <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Next steps</div>
                  <ul className="mt-4 space-y-3 text-sm text-slate-300">
                    {response.nextSteps.map((step) => (
                      <li
                        key={step}
                        className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3"
                      >
                        <span className="mt-1 h-2 w-2 rounded-full bg-sky-400" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 text-sm text-slate-400">
                  <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Integrasi lanjut</div>
                  <p className="mt-3">
                    Hubungkan endpoint scraping Anda sendiri, streaming data on-chain, atau model LLM favorit (OpenAI, Claude, dsb) melalui API route <code className="rounded bg-slate-800 px-1 py-0.5 text-[11px] text-slate-200">/api/agent</code>.
                  </p>
                  <p className="mt-2">
                    Tambahkan automation ke exchange pilihan untuk eksekusi trading berbasis rekomendasi.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

