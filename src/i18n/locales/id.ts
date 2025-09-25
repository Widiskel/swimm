const id = {
  common: {
    close: "Tutup",
  },
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
      profile: "Profil",
    },
    mobileMenuLabel: "Buka menu navigasi",
    mobileMenuCloseLabel: "Tutup menu navigasi",
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
    providerLabel: "CEX provider",
    providerHint: "Pilih bursa sumber harga dan data pasar",
    providerOptions: {
      binance: "Binance",
      bybit: "Bybit",
    },
    button: "Tampilkan chart",
    loading: "Memuat daftar pair...",
    empty: "Tidak ada pair tersedia",
    triggerLabel: "Buka pemilih trading pair",
    modalTitle: "Pilih trading pair",
    searchPlaceholder: "Cari berdasarkan simbol atau nama token...",
    searchEmpty: "Tidak ada pair yang cocok.",
    noSelection: "Pilih trading pair",
  },
  live: {
    card: {
      title: "Chart live",
      providerBadge: "Data dari {provider}",
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
      "Analisa akan menggunakan pair {pair} dari {provider} dengan timeframe {timeframe}.",
    analyzeButton: "Analisa",
    analyzingButton: "Analisa berjalan...",
    errors: {
      fetchSnapshot: "Gagal mengambil data pasar dari provider.",
      renderChart: "Gagal menampilkan chart. Coba lagi.",
    },
  },
  market: {
    summary: {
      unavailable: "Data pasar {provider} tidak tersedia.",
      spotTitle: "{symbol} spot ({provider})",
      lastPrice: "Harga terakhir: {value}",
      change24h: "Perubahan 24 jam: {value}%",
      highLow24h: "High/Low 24 jam: {high} / {low}",
      volume24hBase: "Volume 24 jam: {value} {asset}",
      volume24hQuote: "Volume (quote): {value} USDT",
      weightedAverage: "Average tertimbang: {value}",
      lastUpdate: "Update terakhir: {value}",
      providerLabel: {
        binance: "Binance",
        bybit: "Bybit",
      },
    },
    errors: {
      unsupportedPair: "Pair tidak didukung. Contoh pair: {samples}",
      invalidInterval: "Interval chart tidak valid.",
      loadPairs: "Gagal memuat daftar pair dari provider.",
    },
  },
  analysis: {
    heading: "Analisa agent untuk {pair} ({timeframe})",
    confidence: "Kepercayaan {value}% - Aksi {action}",
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
    savePanel: {
      title: "Arsipkan analisa ini",
      description: "Catat hasilnya dan simpan output agen ke riwayat akun Anda.",
      verdictLabel: "Hasil prediksi",
      verdictOptions: {
        accurate: {
          label: "Akurat",
          description: "Harga mengikuti rencana dan level.",
        },
        inaccurate: {
          label: "Melenceng",
          description: "Harga menembus atau menolak skenario.",
        },
        unknown: {
          label: "Belum pasti",
          description: "Masih menunggu konfirmasi pergerakan harga.",
        },
      },
      feedbackLabel: "Catatan feedback",
      feedbackPlaceholder: "Tambahkan konteks mengapa trade berhasil atau tidak...",
      holdNotAllowed: "Sinyal hold tidak dapat disimpan. Simpan hanya rencana buy atau sell.",
      feedbackHint: "Feedback membantu memperkaya ringkasan berikutnya dan journaling Anda.",
      saveButton: "Simpan ke riwayat",
      savingButton: "Menyimpan...",
      successMessage: "Laporan tersimpan di riwayat Anda.",
      loginPrompt: "Masuk untuk menyimpan analisa ke akun SWIMM Anda.",
      loginRequired: "Masuk untuk menyimpan analisa ke akun SWIMM Anda.",
      syncing: "Menyiapkan sesi aman Anda...",
      verdictRequired: "Pilih hasil prediksi sebelum menyimpan.",
      genericError: "Gagal menyimpan laporan. Coba lagi.",
      hint: "Riwayat tersimpan privat bersama verdict dan feedback Anda.",
    },
  },
  profile: {
    badge: "Profil",
    title: "Profil & API Key Exchange",
    description:
      "Hubungkan API key Binance dan Bybit milik Anda agar SWIMM dapat memprioritaskan data sesuai akun. Biarkan kosong untuk memakai key bawaan proyek.",
    loading: "Memuat profil Anda...",
    success: "Pengaturan tersimpan. Analisa berikutnya akan memakai key pribadi Anda.",
    disclaimer:
      "Key disimpan aman hanya untuk akun Anda. Kami hanya memakainya untuk permintaan data pasar dan tidak mengeksekusi transaksi.",
    placeholders: {
      apiKey: "Masukkan API key",
      apiSecret: "Masukkan API secret",
    },
    binance: {
      title: "Kredensial Binance",
      description: "Gunakan API key read-only dengan izin akses data pasar.",
      apiKey: "API key",
      apiSecret: "API secret",
    },
    bybit: {
      title: "Kredensial Bybit",
      description: "Opsional. Isi jika Anda ingin memakai feed data Bybit.",
      apiKey: "API key",
      apiSecret: "API secret",
    },
    actions: {
      save: "Simpan pengaturan",
      saving: "Menyimpan...",
    },
    authRequired: {
      title: "Masuk untuk mengelola profil",
      description: "Hubungkan akun Privy Anda untuk mengubah API key pribadi dan preferensi lainnya.",
      cta: "Masuk",
    },
    meta: {
      title: "Ringkasan profil",
      lastUpdated: "Terakhir diperbarui {timestamp}",
      neverUpdated: "Belum ada pengaturan yang disimpan.",
      hint: "Seluruh key dienkripsi dan tidak dibagikan ke akun lain.",
      fallback: "Jika dibiarkan kosong, SWIMM memakai API key default proyek.",
    },
    errors: {
      sessionRequired: "Silakan masuk sebelum menyimpan pengaturan.",
      saveFailed: "Gagal menyimpan pengaturan. Coba lagi.",
    },
  },  analysisFallback: {
    summary:
      "Analisa tidak berhasil dibuat. Coba jalankan ulang agent dengan data yang lebih lengkap.",
    rationale:
      "Model tidak memberikan rasionalisasi. Tambahkan detail objektif untuk analisa lanjutan.",
  },
  auth: {
    connecting: "Menyiapkan proses masuk...",
    loginProcessing: "Memproses...",
    login: "Masuk",
    logoutProcessing: "Keluar...",
    logout: "Keluar",
    loginError: "Login gagal. Silakan coba lagi.",
    logoutError: "Logout gagal. Silakan coba lagi.",
    authenticatedLabel: "Terautentikasi",
    defaultUser: "Akun",
    envMissing:
      "Setel NEXT_PUBLIC_PRIVY_APP_ID untuk mengaktifkan autentikasi.",
  },
  analysisPage: {
    connectingTitle: "Memeriksa status login Anda...",
    connectingSubtitle:
      "Harap tunggu, kami sedang memverifikasi akses Anda ke area terlindungi.",
    protectedBadge: "Area Terproteksi",
    signInHeading: "Masuk untuk menjalankan analisa trading terpersonalisasi",
    signInDescription:
      "Analisa realtime tersedia setelah Anda masuk. Akses agen SWIMM untuk forecasting harga dan playbook siap eksekusi.",
    signInButton: "Masuk",
    backHome: "Kembali ke beranda",
  },
  history: {
    connecting: "Memeriksa status login Anda...",
    protectedBadge: "Area Terproteksi",
    signInHeading: "Masuk untuk melihat riwayat analisa Anda",
    signInDescription:
      "Simpan dan bandingkan setiap output agen di akun SWIMM Anda. Riwayat terhubung dengan sesi autentikasi.",
    signInButton: "Masuk",
    title: "Riwayat analisa",
    subtitle:
      "Riwayat tersimpan di cloud bersama verdict dan feedback sehingga bisa ditinjau kapan saja.",
    clearButton: "Bersihkan riwayat",
    loading: "Memuat riwayat analisa...",
    metrics: {
      totalAnalyses: "Total analisa",
      buySignals: "Sinyal buy",
      sellSignals: "Sinyal sell",
      holdSignals: "Sinyal hold",
    },
    empty: {
      title: "Belum ada analisa tersimpan",
      descriptionPrefix: "Jalankan agen di halaman ",
      linkText: "Analisis",
      descriptionSuffix: " untuk menyimpan rekomendasi terbaru.",
    },
    entryCard: {
      confidence: "Kepercayaan",
      planTimeframe: "Timeframe rencana",
      openInDashboard: "Buka di analisa",
      entries: "Entry",
      takeProfits: "Take profit",
      stopLoss: "Stop loss",
      sizingNotes: "Catatan sizing",
      noSizingNotes: "Tidak ada catatan sizing",
      provider: "Provider",
      tradePlanTitle: "Rekap rencana trading",
      noSignal: "TIDAK ADA SINYAL",
      verdict: {
        accurate: "Akurat",
        inaccurate: "Melenceng",
        unknown: "Menunggu",
      },
      decision: {
        title: "Ringkasan keputusan",
        action: "Aksi",
        timeframe: "Timeframe rencana",
        confidence: "Kepercayaan",
        noConfidence: "Kepercayaan tidak tersedia",
      },
      agentSummary: {
        title: "Narasi agen",
        rationale: "Rasional",
        forecast: "Prakiraan",
        noRationale: "Tidak ada rasional yang dibagikan.",
        noForecast: "Tidak ada prakiraan yang dibagikan.",
        noSummary: "Tidak ada ringkasan narasi.",
      },
      highlights: {
        title: "Highlight utama",
        empty: "Tidak ada highlight yang tercatat.",
        nextTitle: "Pengingat eksekusi",
        nextEmpty: "Tidak ada langkah lanjutan.",
      },
      feedbackBlock: {
        title: "Feedback user",
        empty: "Belum ada feedback untuk laporan ini.",
      },
    },
    dayGroup: {
      title: "Analisa tanggal {date}",
      totals: {
        analyses: "Analisa",
        buy: "Buy",
        sell: "Sell",
        hold: "Hold",
      },
      toggle: {
        show: "Tampilkan detail",
        hide: "Sembunyikan detail",
      },
    },
    filters: {
      searchPlaceholder: "Cari pair, timeframe, atau ringkasan...",
      decisionLabel: "Keputusan",
      verdictLabel: "Verdict",
      pairLabel: "Pair",
      allOption: "Semua",
      decisionOptions: {
        buy: "Buy",
        sell: "Sell",
        hold: "Hold",
      },
      verdictOptions: {
        accurate: "Akurat",
        inaccurate: "Melenceng",
        unknown: "Menunggu",
      },
    },
    summaryRow: {
      entry: "{pair} ? {timeframe}",
      format: "{decision} -> {verdict}",
      noDecision: "Tidak ada keputusan",
      noVerdict: "Tidak ada verdict",
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
      navDashboard: "Analisis",
      navHistory: "Riwayat",
    },
  },
};

export default id;




