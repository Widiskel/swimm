export function HeroSection() {
  return (
    <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-8 shadow-2xl shadow-sky-500/10">
      <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/50 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-sky-300">
        Live Market Intelligence
      </span>
      <h2 className="mt-6 text-3xl font-semibold leading-tight text-slate-50 md:text-4xl">
        Pilih pair crypto favorit Anda, pantau chart real-time, dan dapatkan
        analisa agen instan.
      </h2>
      <p className="mt-4 text-base text-slate-300">
        Web Analytic AI menggabungkan harga live Binance, order flow, serta
        pencarian berita terbaru dari Tavily untuk menghasilkan rekomendasi
        trading yang terstruktur dan mudah dieksekusi.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-sm font-semibold text-slate-200">
            Streaming Chart
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Candlestick live + order book Binance dengan pembaruan otomatis
            setiap 30 detik.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-sm font-semibold text-slate-200">
            LLM Market Reasoning
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Agen AI menyintesis sinyal teknikal, fundamental, dan headline
            terbaru.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-sm font-semibold text-slate-200">
            Trade Plan Siap Eksekusi
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Entry zone, 5 target TP, stop loss, sizing, dan catatan pendukung
            tersedia sekaligus.
          </p>
        </div>
      </div>
    </div>
  );
}
