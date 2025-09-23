# Web Analytic AI

Dashboard analitik berita crypto dengan agen AI yang menyusun rekomendasi trading (buy/sell/hold).
Aplikasi dibangun menggunakan Next.js (App Router) + Tailwind dan terintegrasi dengan Fireworks API
(model `accounts/sentientfoundation/models/dobby-unhinged-llama-3-3-70b-new`) serta snapshot pasar Binance
untuk pasangan BTC/USDT.

## Fitur utama
- Input objektif analisa, daftar URL scraping, dataset kustom, dan catatan manual.
- Agen AI berbasis Fireworks yang merangkum sentimen dan memberikan keputusan trading terstruktur.
- Highlight temuan, confidence, timeframe, dan next steps siap eksekusi.
- Pemilihan timeframe forecasting (5m sampai 1D) untuk menyesuaikan horizon analisa dan proyeksi harga.
- Snapshot harga Binance BTC/USDT otomatis masuk ke prompt agen.
- UI gelap responsif dengan fokus pada alur riset trader.

## Prasyarat
- Node.js 18+ dan npm.
- Akun Fireworks dengan API key aktif.
- API key & secret Binance (direkomendasikan untuk header otorisasi, meski endpoint harga publik dapat berjalan tanpa keduanya).

## Konfigurasi lingkungan
Buat file `.env.local` di root proyek dan isi variabel berikut:

```env
FIREWORKS_API_KEY=your_fireworks_api_key
# Opsional: override model bawaan Fireworks
# FIREWORKS_MODEL=accounts/.../model-name

# Binance spot
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_api_secret
# Opsional: override simbol & URL
# BINANCE_SYMBOL=BTCUSDT
# BINANCE_API_URL=https://api.binance.com
```

Semua variabel hanya dibaca di sisi server (`/api/agent`), sehingga kredensial tetap aman.

## Menjalankan secara lokal
```bash
npm install
npm run dev
```
Buka `http://localhost:3000` lalu masukkan objective + sumber data untuk mencoba agen.

## Alur backend
- Endpoint server (`src/app/api/agent/route.ts`) mengirim prompt terstruktur ke Fireworks Chat Completions API.
- Sebelum ke Fireworks, server mengambil snapshot harga Binance BTC/USDT (`src/lib/binance.ts`) dan memasukkannya
  ke prompt sebagai konteks pasar real-time.
- Model diwajibkan merespon dalam format JSON sesuai skema aplikasi, lalu respons dipost-proses untuk memastikan
  action, confidence (0-1), dan daftar highlight/next steps valid.

Jika permintaan gagal (timeout, kredensial salah, atau Binance tidak tersedia), antarmuka akan menampilkan pesan error
sehingga pengguna bisa memperbaiki konfigurasi dan menjalankan ulang agen.

## Pengembangan lanjutan
- Integrasikan modul scraping nyata atau pipeline ingestion untuk mengisi daftar URL otomatis.
- Sambungkan ke data on-chain / teknikal dan perkuat prompt dengan ringkasan statistik tersebut.
- Tambahkan penyimpanan historis keputusan agent dan automasi eksekusi ke exchange favorit.
