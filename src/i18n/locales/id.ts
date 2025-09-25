const id = {
  header: {
    logo: "WA",
    brand: "Web Analytic AI",
    tagline: "Crypto Pair Intelligence Suite",
    languageLabel: "Bahasa",
  },
  siteHeader: {
    brandInitials: "SW",
    productBadge: "SWIMM",
    tagline: "Soon you Will Make Money",
    logoAlt: "Lambang SWIMM",
    brandingAlt: "Logo SWIMM dengan teks",
    nav: {
      home: "Beranda",
      analysis: "Analisis",
      history: "Riwayat",
    },
  },
  hero: {
    badge: "Intelijen Pasar Live",
    heading:
      "Pantau pasar kripto secara langsung lalu biarkan agent menyiapkan rencana trading siap eksekusi.",
    description:
      "Web Analytic AI memadukan harga live Binance, order flow, dan headline Tavily terbaru menjadi panduan terstruktur yang siap dijalankan.",
    features: [
      {
        title: "Chart Streaming",
        description:
          "Candlestick Binance live plus order book yang otomatis diperbarui setiap 30 detik.",
      },
      {
        title: "LLM Market Reasoning",
        description:
          "Agent menggabungkan teknikal, fundamental, dan berita terbaru untuk menemukan insight trading.",
      },
      {
        title: "Rencana Eksekusi Lengkap",
        description:
          "Zona entry, lima target take-profit, stop loss, sizing, dan narasi analisa dalam satu paket.",
      },
    ],
  },
  pairSelection: {
    title: "Pilih trading pair",
    description:
      'Tentukan pair lalu klik "Tampilkan chart" untuk menampilkan candlestick. Timeframe bisa diganti langsung di kartu chart.',
    selectLabel: "Trading pair",
    button: "Tampilkan chart",
    loading: "Memuat daftar pair...",
    empty: "Tidak ada pair tersedia",
  },
  live: {
    card: {
      title: "Chart live",
      indicatorsTitle: "Indikator",
      indicatorHint: "Overlay indikator terlihat pada chart",
      hoverPrompt: "Arahkan kursor ke candlestick",
      hoverClose: "Close",
      hoverOpen: "Open",
      hoverHigh: "High",
      hoverLow: "Low",
      loading: "Memuat chart...",
      emptyState:
        'Pilih pair lalu klik "Tampilkan chart" untuk melihat candlestick.',
    },
    stats: {
      volumeBase: "Volume 24 jam",
      highLow: "High/Low 24 jam",
      lastUpdate: "Update terakhir",
    },
    orderBook: {
      title: "Order book",
      bids: "Bids",
      asks: "Asks",
    },
    analysisNote:
      "Analisa akan menggunakan pair {pair} dengan timeframe {timeframe}.",
    analyzeButton: "Analisa",
    analyzingButton: "Analisa berjalan...",
  },
  analysis: {
    heading: "Analisa agent untuk {pair} ({timeframe})",
    confidence: "Confidence {value}% · Aksi {action}",
    summaryTitle: "Ringkasan Agent",
    snapshot: {
      title: "Chart snapshot",
      description:
        "Overlay rencana trading dengan entry, target, dan stop yang diambil dari chart live.",
      legendEntry: "Entry",
      legendTarget: "Target",
      legendStop: "Stop",
      placeholder: "Chart snapshot akan muncul setelah analisa selesai.",
    },
    chartInsight: {
      title: "Highlight chart",
      forecast: "Forecast:",
      rangeStart: "Mulai",
      rangeEnd: "Selesai",
    },
    technical: {
      title: "Teknikal pendukung",
      empty: "Ringkasan teknikal belum tersedia.",
    },
    fundamental: {
      title: "Fundamental pendukung",
      empty: "Ringkasan fundamental belum tersedia.",
    },
    highlights: {
      title: "Catatan pendukung",
    },
    tradePlan: {
      title: "Trade plan",
      entryZone: "Zona entry",
      noEntry: "Zona entry belum tersedia.",
      targets: "Targets",
      noTargets: "Target take-profit belum tersedia.",
      stopLoss: "Stop loss",
      executionWindow: "Execution window",
      sizingNotes: "Sizing notes",
      narrativeTitle: "Analisa pendukung",
      narrativeFallback: "Analisa pendukung belum tersedia.",
    },
    nextSteps: {
      title: "Next steps",
    },
    integration: {
      title: "Integrasi lanjut",
      body1:
        "Hubungkan endpoint scraping Anda sendiri, data on-chain, atau provider LLM favorit (OpenAI, Claude, dll.) melalui route /api/agent.",
      body2:
        "Otomatiskan eksekusi order di exchange pilihan setelah rekomendasi tervalidasi.",
    },
  },
  analysisFallback: {
    summary:
      "Analisa tidak berhasil dibuat. Coba jalankan ulang agent dengan data yang lebih lengkap.",
    rationale:
      "Model tidak memberikan rasionalisasi. Tambahkan detail objektif untuk analisa lanjutan.",
  },
  auth: {
    connecting: "Menghubungkan Privy...",
    loginProcessing: "Memproses...",
    login: "Masuk / Daftar",
    logoutProcessing: "Keluar...",
    logout: "Keluar",
    loginError: "Login gagal. Silakan coba lagi.",
    logoutError: "Logout gagal. Silakan coba lagi.",
    authenticatedLabel: "Terautentikasi",
    defaultUser: "Pengguna Privy",
    envMissing:
      "Setel NEXT_PUBLIC_PRIVY_APP_ID untuk mengaktifkan autentikasi.",
  },
  analysisPage: {
    connectingTitle: "Menghubungkan layanan Privy...",
    connectingSubtitle:
      "Harap tunggu, kami sedang memverifikasi status autentikasi Anda.",
    protectedBadge: "Area Terproteksi",
    signInHeading: "Masuk untuk menjalankan analisa trading terpersonalisasi",
    signInDescription:
      "Analisa realtime tersedia setelah Anda masuk. Akses agen SWIMM untuk forecasting harga dan playbook siap eksekusi.",
    signInButton: "Masuk lewat Privy",
    backHome: "Kembali ke beranda",
  },
  history: {
    connecting: "Menghubungkan layanan Privy...",
    protectedBadge: "Area Terproteksi",
    signInHeading: "Masuk untuk melihat riwayat analisa Anda",
    signInDescription:
      "Simpan dan bandingkan setiap output agen untuk mengevaluasi konsistensi strategi. Riwayat tersimpan secara lokal di perangkat ini.",
    signInButton: "Masuk lewat Privy",
    title: "Riwayat analisa",
    subtitle:
      "Riwayat tersimpan di perangkat ini. Hapus saat ingin memulai dari awal.",
    clearButton: "Bersihkan riwayat",
    metrics: {
      totalAnalyses: "Total analisa",
      buySignals: "Sinyal buy",
      sellHoldSignals: "Sinyal sell / hold",
    },
    empty: {
      title: "Belum ada analisa tersimpan",
      descriptionPrefix: "Jalankan agen di halaman ",
      linkText: "Analisis",
      descriptionSuffix: " untuk menyimpan rekomendasi terbaru Anda.",
    },
    entryCard: {
      confidence: "Keyakinan",
      planTimeframe: "Timeframe rencana",
      openInDashboard: "Buka di dashboard",
      entries: "Entry",
      takeProfits: "Take profit",
      stopLoss: "Stop loss",
      noSizingNotes: "Tidak ada catatan sizing",
    },
  },
  language: {
    english: "English",
    indonesian: "Bahasa Indonesia",
  },
  landing: {
    hero: {
      badge: "Pusat Inteligensi SWIMM",
      heading: "Inteligensi kripto multi-pair dengan panduan bahasa natural.",
      description:
        "SWIMM memanfaatkan Fireworks LLM untuk menganalisa struktur, sentimen, dan likuiditas di seluruh pair yang tersedia.",
      ctaPrimaryAuthenticated: "Buka dashboard analisa",
      ctaPrimaryGuest: "Masuk & mulai",
      ctaSecondaryAuthenticated: "Lihat riwayat",
      ctaSecondaryGuest: "Jelajahi fitur",
      privyWaiting:
        "Menunggu koneksi Privy... tombol akan aktif setelah autentikasi siap.",
    },
    highlights: [
      {
        title: "Prakiraan Multi-Pair",
        description:
          "Proyeksi AI untuk BTC, ETH, SOL, dan aset yang bergantian.",
      },
      {
        title: "Sentimen Terpadu",
        description:
          "Gabungkan headline hasil scraping, ringkasan, dan data kustom untuk keputusan berimbang.",
      },
      {
        title: "Rencana Trading",
        description:
          "Entry, target, stop, dan panduan sizing yang selaras dengan timeframe Anda.",
      },
    ],
    features: {
      heading: "Mengapa trader memilih SWIMM",
      description:
        "Setiap ringkasan menggabungkan sinyal teknikal, katalis, dan proyeksi AI untuk meminimalkan bias.",
      cta: "Lihat dashboard",
      cards: [
        {
          title: "Fusi Sentimen",
          description:
            "Headline hasil scraping muncul sebagai highlight prioritas untuk mempercepat keyakinan.",
        },
        {
          title: "Teknikal Adaptif",
          description:
            "Overlay dinamis, SMA, RSI, dan volatilitas otomatis menyesuaikan timeframe.",
        },
        {
          title: "Disiplin Risiko",
          description:
            "Setiap rekomendasi menyertakan target realistis dan stop defensif.",
        },
        {
          title: "Data Binance Langsung",
          description:
            "Streaming candlestick untuk pair mayor dan memantau listing baru dengan mudah.",
        },
        {
          title: "Kontrol Timeframe",
          description:
            "Beralih dari scalp 5 menit ke swing harian tanpa kehilangan konteks.",
        },
        {
          title: "Riwayat Persisten",
          description:
            "Bandingkan sinyal terdahulu yang tersimpan lokal dan iterasikan strategi.",
        },
      ],
    },
    workflow: {
      heading: "Tiga langkah mudah",
      description:
        "SWIMM merampingkan workflow riset menjadi satu pusat komando sehingga Anda dapat mengeksekusi dengan mantap.",
      ctaAuthenticated: "Buka analisa sekarang",
      ctaGuest: "Lihat fitur",
      steps: [
        {
          id: "01",
          title: "Masuk lewat Privy",
          description:
            "Login aman via email atau wallet untuk membuka analisa SWIMM.",
        },
        {
          id: "02",
          title: "Pilih Pair & Timeframe",
          description:
            "Beralih dari scalping ke swing pada simbol yang didukung hanya dalam detik.",
        },
        {
          id: "03",
          title: "Eksekusi Percaya Diri",
          description: "Ikuti entry, target, dan parameter risiko berbasis AI.",
        },
      ],
    },
    footer: {
      copyright: "Soon you Will Make Money",
      navDashboard: "Dashboard",
      navHistory: "Riwayat",
    },
  },
};

export default id;
