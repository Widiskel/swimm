# Web Analytic AI

Dashboard analitik berita crypto dengan agen AI yang menyusun rekomendasi trading (buy/sell/hold).
Aplikasi dibangun menggunakan Next.js (App Router) + Tailwind dan terintegrasi dengan Sentient Models (dobby-unhinged-llama)
(model `accounts/sentientfoundation/models/dobby-unhinged-llama-3-3-70b-new`) serta snapshot pasar Binance
untuk pasangan BTC/USDT.

## Fitur utama
- Pilih trading pair (BTC/USDT, ETH/USDT, SOL/USDT) dan timeframe langsung dari antarmuka.
- Chart candlestick Binance streaming lengkap dengan order book 10 level dan refresh otomatis.
- Agen AI berbasis Sentient Models (dobby-unhinged-llama) + Tavily yang merangkum sentimen, headline, dan kondisi teknikal secara real-time.
- Rencana trading siap eksekusi: zona entry, 5 target TP, stop loss, execution window, sizing, dan catatan pendukung.
- UI gelap responsif dengan fokus pada pemantauan pasar dan pengambilan keputusan cepat.

## Prasyarat
- Node.js 18+ dan npm.
- Akun Sentient Models dengan API key aktif.
- API key & secret Binance (direkomendasikan untuk header otorisasi, meski endpoint harga publik dapat berjalan tanpa keduanya).
- Tavily API key (opsional, mengaktifkan pencarian & ekstraksi berita otomatis).

## Konfigurasi lingkungan
Buat file `.env.local` di root proyek dan isi variabel berikut:

```env
FIREWORKS_API_KEY=your_fireworks_api_key
# Opsional: override model bawaan Sentient dobby-unhinged-llama
# FIREWORKS_MODEL=accounts/.../model-name

# Binance spot
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_api_secret
# Opsional: override simbol & URL
# BINANCE_SYMBOL=BTCUSDT
# BINANCE_API_URL=https://api.binance.com

# Tavily
TAVILY_API_KEY=your_tavily_api_key
```

Semua variabel hanya dibaca di sisi server (`/api/agent`), sehingga kredensial tetap aman.

## Menjalankan secara lokal
```bash
npm install
npm run dev
```
Buka `http://localhost:3000`, pilih trading pair, tentukan timeframe, klik **Tampilkan chart**, lalu tekan **Analys** untuk menjalankan agen.

## Alur backend
- Endpoint server (`src/app/api/agent/route.ts`) mengirim prompt terstruktur ke Sentient Models dobby-unhinged-llama dengan pair & timeframe yang dipilih pengguna.
- API market (`src/app/api/market/route.ts`) menyediakan candlestick + order book Binance via helper di `src/lib/binance.ts`, digunakan chart klien.
- Endpoint sesi (`src/app/api/session/route.ts`) menyiapkan cookie HttpOnly dan dokumen Mongo agar server mengenal pengguna; `/api/history` menangani simpan/ambil riwayat lengkap dengan verdict serta feedback.
- Jika `TAVILY_API_KEY` tersedia, server memanggil Tavily untuk mencari berita relevan sekaligus mengekstrak konten URL, lalu menyuntikkannya ke prompt.
- Model diwajibkan merespon dalam format JSON sesuai skema aplikasi, lalu respons dipost-proses untuk memastikan
  action, confidence (0-1), dan daftar highlight/next steps valid.

Jika permintaan gagal (timeout, kredensial salah, atau Binance tidak tersedia), antarmuka akan menampilkan pesan error
sehingga pengguna bisa memperbaiki konfigurasi dan menjalankan ulang agen.

## Pengembangan lanjutan
- Integrasikan modul scraping nyata atau pipeline ingestion untuk mengisi daftar URL otomatis.
- Sambungkan ke data on-chain / teknikal dan perkuat prompt dengan ringkasan statistik tersebut.
- Tambahkan penyimpanan historis keputusan agent dan automasi eksekusi ke exchange favorit.
