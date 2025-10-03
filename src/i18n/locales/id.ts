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
    modeLabel: "Fokus aset",
    modeHint: "Pilih antara aset kripto atau emas",
    providerLabel: "Provider data",
    providerHint: "Pilih sumber harga dan data pasar",
    modeOptions: {
      spot: "Spot",
      futures: "Futures",
    },
    assetOptions: {
      crypto: "Kripto",
      gold: "Emas",
    },
    cryptoMarketModeLabel: "Tipe pasar",
    cryptoMarketModeHint: "Pilih antara pasar spot atau futures",
    providerOptions: {
      binance: "Binance",
      bybit: "Bybit",
      twelvedata: "Twelve Data",
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
      modeTitle: {
        spot: "{symbol} spot ({provider})",
        futures: "{symbol} futures ({provider})",
      },
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
        twelvedata: "Twelve Data",
      },
    },
    errors: {
      unsupportedPair: "Pair tidak didukung. Contoh pair: {samples}",
      invalidInterval: "Interval chart tidak valid.",
      loadPairs: "Gagal memuat daftar pair dari provider.",
    },
  },
  agentApi: {
    history: {
      header: "Riwayat personal ({pair}, {timeframe})",
      savedPlans: "Total riwayat tersimpan: {total} (Buy: {buy} | Sell: {sell})",
      verdictSummary: "Verdict — Akurat: {accurate}, Melenceng: {inaccurate}, Pending: {pending}",
      successRate: "Rasio keberhasilan: {value}",
      successRatePending: "Rasio keberhasilan: Belum cukup data",
      feedbackMissing: "(tanpa catatan)",
      verdict: {
        accurate: "Akurat",
        inaccurate: "Melenceng",
        unknown: "Pending",
      },
    },
    marketAnalytics: {
      missingNarrative: "Data candle tidak tersedia.",
      missingForecast: "Tidak dapat melakukan forecasting tanpa data harga.",
      bullishSma: "Sinyal bullish: SMA cepat berada di atas SMA lambat.",
      bearishSma: "Sinyal bearish: SMA cepat berada di bawah SMA lambat.",
      volatilityLabel: "Volatilitas {timeframe}",
      priceRangeLabel: "Rentang harga",
      sessionChangeLabel: "Perubahan sejak awal sesi",
      atrLine: "ATR(14): {value} ({percent}% dari harga)",
      volatilityBucket: {
        low: "Rezim volatilitas: rendah (rentang sempit).",
        medium: "Rezim volatilitas: medium (arah dua sisi seimbang).",
        high: "Rezim volatilitas: tinggi (waspadai ayunan lebar).",
        unknown: "Rezim volatilitas: tidak diketahui (data kurang).",
      },
      volatilityBucketName: {
        low: "rendah",
        medium: "moderat",
        high: "tinggi",
        unknown: "tidak diketahui",
      },
      smaRelation: {
        above: "Crossover bullish (SMA cepat di atas SMA lambat).",
        below: "Crossover bearish (SMA cepat di bawah SMA lambat).",
        flat: "Crossover datar/tidak tegas.",
      },
      momentum: {
        bullish: "bullish",
        bearish: "bearish",
        neutral: "netral",
      },
      chartNarrative:
        "Harga timeframe {timeframe} bergerak {momentum} dengan penutupan terakhir {price} USDT.",
      forecast: {
        positive:
          "Momentum positif mendominasi; waspadai konsolidasi sebelum kelanjutan tren.",
        negative:
          "Tekanan jual masih terasa; butuh katalis positif untuk reversal.",
        flat: "Pergerakan datar; tunggu breakout untuk konfirmasi arah berikutnya.",
      },
      focus: {
        bullishBreakout:
          "Perlakukan pergerakan sebagai breakout bullish; siapkan skenario lanjutan dengan batas invalidasi di resistance sebelumnya.",
        bearishBreakout:
          "Tekanan bearish menandakan breakdown; susun rencana short lanjutan sambil memantau area reclaim.",
        momentumLong:
          "Momentum condong ke sisi long; incar pullback ke moving average sebelum melanjutkan posisi.",
        momentumShort:
          "Momentum condong ke sisi short; tunggu relief bounce untuk dijual dengan fokus ke support terdekat.",
        rangePlay:
          "Harga masih sideway; eksekusi mean reversion dengan risiko ketat sampai volatilitas meningkat.",
      },
      keyMetrics: {
        close: "Penutupan terakhir: {value} USDT",
        change: "Perubahan sesi: {value}%",
        smaSignal: "Sinyal SMA: {value}",
        atr: "ATR(14): {value} ({percent}% dari harga)",
        volatility: "Rezim volatilitas: {value}",
      },
    },
    fundamentals: {
      priceUnavailable: "Harga terakhir tidak tersedia.",
      changeUnavailable: "Perubahan harga 24 jam belum dihitung.",
      macroReminder:
        "Selaraskan strategi {timeframe} dengan konteks makro dan on-chain sebelum eksekusi.",
    },
    userPrompt: {
      placeholders: {
        urls: "(Tidak ada URL yang diberikan)",
        dataset: "(Tidak ada dataset yang diunggah)",
        manual: "(Tidak ada catatan manual)",
        technical: "(Tidak ada ringkasan teknikal)",
        tavilySummary: "(Tidak ada ringkasan Tavily)",
        tavilyResults: "(Tidak ada hasil pencarian Tavily)",
        tavilyArticles: "(Tidak ada konten Tavily yang diekstrak)",
        promptSeries: "(Data candle tidak tersedia)",
        history: "(Belum ada riwayat pengguna untuk pair ini)",
        unknownDataset: "Tidak diketahui",
        datasetPreviewLabel: "Isi (dipangkas)",
        keyMetrics: "(Metrik kunci belum tersedia)",
        analysisFocus: "(Belum ada fokus analisa)",
      },
      datasetNameLabel: "Nama dataset",
      tavily: {
        urlLabel: "URL",
        publishedLabel: "Tanggal",
        summaryLabel: "Ringkasan",
        excerptLabel: "Kutipan",
        rawExcerptLabel: "Kutipan (raw)",
      },
      dataMode: {
        scrape: "Scrape URL berita",
        upload: "Unggah dataset",
        manual: "Catatan manual",
      },
      labels: {
        objective: "Tujuan analisa",
        dataMode: "Mode sumber data aktif",
        urls: "Daftar URL berita",
        manual: "Catatan manual",
        dataset: "Dataset kustom",
        history: "Riwayat pengguna",
        pair: "Pair yang dianalisis",
        timeframe: "Timeframe target",
        summary: "Snapshot data pasar untuk {pair}",
        keyMetrics: "Metrik kunci",
        analysisFocus: "Fokus analisa",
        narrative: "Narasi harga",
        forecast: "Forecast internal",
        promptSeries: "Data candle (ISO|O/H/L/C/V)",
        technical: "Ringkasan teknikal",
        tavilySummary: "Ringkasan Tavily",
        tavilyResults: "Hasil pencarian Tavily",
        tavilyArticles: "Konten Tavily",
        instructions: "Instruksi",
      },
      instructions:
        "Lakukan analisa sentimen, berita, dan pasar untuk {pair}; tampilkan insight yang dapat dieksekusi.\nSajikan skenario harga dasar, bullish, dan bearish untuk {pair} pada timeframe {timeframe}.\nLengkapi catatan teknikal & fundamental serta rencana eksekusi yang memperhatikan risiko (entry, target, stop, sizing).\nBalas hanya dalam format JSON menggunakan Bahasa Indonesia yang alami.",
    },
    tradePlan: {
      holdSizingNotes:
        "Tidak ada rencana eksekusi. Tunggu konfirmasi tambahan sebelum membuka posisi.",
      holdRationale:
        "Momentum belum jelas. Evaluasi ulang setelah harga menembus area kunci.",
      sizingNotes: {
        long: "Risiko per posisi disarankan ≤ 2% dari ekuitas; bangun posisi secara bertahap.",
        short: "Pastikan modal siap untuk short dan gunakan ukuran posisi konservatif.",
        neutral: "Tahan eksekusi sampai sinyal tambahan mengkonfirmasi arah.",
      },
      rationaleFallback:
        "Validasi setup trading dengan order flow dan berita makro sebelum eksekusi.",
    },
    payload: {
      rationaleMissing:
        "Model tidak memberikan rasionalisasi. Tambahkan detail objektif untuk analisa lanjutan.",
      summaryMissing:
        "Analisa tidak berhasil dibuat. Coba jalankan ulang agent dengan data yang lebih lengkap.",
      nextStepsDefault:
        "Validasi rencana trading dengan chart real-time dan order book.\nPerbarui konteks berita atau makro, lalu jalankan ulang agent bila perlu.",
    },
    systemPrompt: {
      languageReminder: "All strings must be written in natural Indonesian.",
      coreGuidelines:
        "- Kaitkan setiap kesimpulan dengan data pasar dan berita yang diberikan.\n- Gunakan angka asli untuk nilai numerik (confidence 0-1) dan jangan membuat data yang bertentangan dengan input.\n- Jika data kurang, jelaskan keterbatasannya alih-alih menebak level atau katalis.",
      example:
        "Contoh JSON:\n{\n  \"summary\": \"Harga bertahan di area tengah setelah reli 2%; likuiditas menumpuk dekat 68k.\",\n  \"decision\": {\n    \"action\": \"hold\",\n    \"confidence\": 0.48,\n    \"timeframe\": \"4H\",\n    \"rationale\": \"Momentum melambat dan order flow campuran; tunggu break range sebelum menambah risiko.\"\n  },\n  \"market\": {\n    \"pair\": \"BTCUSDT\",\n    \"chart\": {\n      \"interval\": \"5m\",\n      \"points\": [],\n      \"narrative\": \"Candle jangka pendek membentuk higher low, tetapi volume menipis.\",\n      \"forecast\": \"Kemungkinan masih konsolidasi kecuali buyer menyerap offer di atas 68.5k.\"\n    },\n    \"technical\": [\"SMA7 berada di atas SMA21\"],\n    \"fundamental\": [\"Volume 24 jam kembali normal; belum ada katalis berita besar.\"]\n  },\n  \"tradePlan\": {\n    \"bias\": \"neutral\",\n    \"entries\": [],\n    \"entry\": null,\n    \"stopLoss\": null,\n    \"takeProfits\": [],\n    \"executionWindow\": \"-\",\n    \"sizingNotes\": \"Risiko <=2% sampai breakout mengonfirmasi arah.\",\n    \"rationale\": \"Tunggu konfirmasi breakout atau katalis makro baru sebelum menambah posisi.\"\n  },\n  \"highlights\": [\"Order book menunjukkan offer menumpuk dekat 68.5k\"],\n  \"nextSteps\": [\"Pantau arus ETF setelah pembukaan sesi New York\"]\n}",
    },
    errors: {
      invalidJson: "Payload JSON tidak valid",
      objectiveRequired: "Tujuan analisa wajib diisi.",
      missingApiKey: "Sentient Models API key belum dikonfigurasi.",
      missingContent: "Sentient Models API tidak mengembalikan konten.",
      timeout: "Permintaan ke Sentient Models melewati batas waktu.",
      generic: "Integrasi Sentient Models gagal.",
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
      ohlcCapturedAt: "Diambil pada",
      ohlcOpen: "Open",
      ohlcHigh: "High",
      ohlcLow: "Low",
      ohlcClose: "Close",
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
      empty: "Belum ada catatan pendukung.",
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
    sizingCalc: {
      title: "Perhitungan ukuran posisi",
      equityLabel: "Ekuitas akun",
      riskPercentLabel: "Risiko per transaksi (%)",
      leverageLabel: "Leverage (x)",
      recommendedAllocation: "Nominal rekomendasi",
      recommendedMargin: "Margin rekomendasi",
      positionSizeLabel: "Ukuran posisi",
      notionalLabel: "Nilai notional",
      marginLabel: "Margin yang dibutuhkan",
      riskAmountLabel: "Risiko di stop",
      entryPriceLabel: "Harga entry",
      stopPriceLabel: "Harga stop",
      manualPlanTitle: "Perhitungan manual",
      manualAllocationLabel: "Nominal manual",
      manualMarginLabel: "Margin manual",
      manualEntryPriceLabel: "Harga entry manual",
      pnlHeader: "Proyeksi profit / loss",
      targetColumn: "Skenario",
      priceColumn: "Harga keluar",
      recommendedColumn: "PnL rekomendasi",
      manualColumn: "PnL manual",
      pnlEmpty: "Target belum tersedia untuk menghitung PnL.",
      stopLabel: "Stop loss",
      note: "Perhitungan bersifat estimasi. Pastikan fee, tick size, dan aturan kontrak sesuai exchange Anda.",
    },
    disclaimer: {
      title: "Gunakan SWIMM secara bijak",
      body:
        "SWIMM memberikan insight analitis, bukan instruksi trading. Risiko pasar sepenuhnya menjadi tanggung jawab Anda — verifikasi setiap rencana, sesuaikan ukuran posisi, dan jangan mengeksekusi tanpa keputusan pribadi.",
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
      description:
        "Simpan output agen ke riwayat sekarang dan tetapkan hasilnya setelah trade selesai.",
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
      feedbackPlaceholder:
        "Tambahkan konteks mengapa trade berhasil atau tidak...",
      holdNotAllowed:
        "Sinyal hold tidak dapat disimpan. Simpan hanya rencana buy atau sell.",
      feedbackHint:
        "Feedback membantu memperkaya ringkasan berikutnya dan jurnal trading Anda. Anda bisa menambahkannya nanti dari halaman Riwayat.",
      saveButton: "Simpan ke riwayat",
      savingButton: "Menyimpan...",
      savedButton: "Tersimpan",
      successMessage: "Laporan tersimpan di riwayat Anda. Update verdict kapan saja dari halaman Riwayat.",
      loginPrompt: "Masuk untuk menyimpan analisa ke akun SWIMM Anda.",
      loginRequired: "Masuk untuk menyimpan analisa ke akun SWIMM Anda.",
      syncing: "Menyiapkan sesi aman Anda...",
      genericError: "Gagal menyimpan laporan. Coba lagi.",
      hint: "Riwayat tersimpan privat. Update verdict kapan saja dari halaman Riwayat.",
    },
  },
  profile: {
    badge: "Profil",
    title: "Pengaturan Akun & API Exchange",
    descriptions: {
      account:
        "Kelola informasi pribadi dan penyedia login yang terhubung agar avatar serta riwayat mencerminkan identitas yang benar.",
      apiKey:
        "Hubungkan API key untuk eksekusi order atau akses portofolio. Tanpa key, fitur trading tetap nonaktif dan hanya alat data pasar publik yang tersedia.",
    },
    tabs: {
      account: "Akun",
      apiKey: "API key",
    },
    account: {
      title: "Preferensi akun",
      description:
        "Perbarui nama tampilan dan tinjau penyedia login yang sudah terhubung. Dompet exchange tidak diperlukan di sini.",
      displayNameLabel: "Nama tampilan",
      displayNamePlaceholder: "Masukkan nama yang terlihat di SWIMM",
      displayNameHelp: "Digunakan pada notifikasi dan laporan kolaboratif.",
      connectionsTitle: "Penyedia login terhubung",
      connectionsDescription:
        "Atur akun sosial atau email mana yang dapat Anda gunakan untuk masuk.",
      connectionStatus: {
        connected: "Terhubung",
        notConnected: "Belum terhubung",
      },
      actions: {
        save: "Simpan perubahan akun",
        saving: "Menyimpan...",
        connect: "Hubungkan",
        disconnect: "Putuskan",
        processing: "Memproses...",
      },
      success: "Preferensi akun diperbarui.",
      connectionsNote: "Gunakan tombol di bawah untuk menautkan atau memutus penyedia login. Anda juga bisa memakai alur masuk biasa.",
    },
    connections: {
      email: "Email",
      google: "Google",
      discord: "Discord",
    },
    loading: "Memuat profil Anda...",
    success:
      "Pengaturan tersimpan. Analisa berikutnya akan memakai key pribadi Anda.",
    disclaimer:
      "Key terenkripsi dan hanya terikat pada akun Anda. SWIMM tidak akan mengeksekusi transaksi tanpa persetujuan Anda.",
    placeholders: {
      apiKey: "Masukkan API key",
      apiSecret: "Masukkan API secret",
    },
    binance: {
      title: "Kredensial Binance",
      description:
        "Masukkan key yang memiliki izin trading jika ingin sinkron saldo atau rencana eksekusi. Untuk data pasar saja, key proyek sudah mencukupi.",
      apiKey: "API key",
      apiSecret: "API secret",
    },
    bybit: {
      title: "Kredensial Bybit",
      description:
        "Opsional. Isi jika memerlukan fitur akun di Bybit. Kosongkan jika hanya memakai feed pasar bersama.",
      apiKey: "API key",
      apiSecret: "API secret",
    },
    actions: {
      save: "Simpan pengaturan",
      saving: "Menyimpan...",
    },
    authRequired: {
      title: "Masuk untuk mengelola profil",
      description:
        "Hubungkan akun Privy Anda untuk mengubah API key pribadi dan preferensi lainnya.",
      cta: "Masuk",
    },
    meta: {
      title: "Ringkasan profil",
      lastUpdated: "Terakhir diperbarui {timestamp}",
      neverUpdated: "Belum ada pengaturan yang disimpan.",
      hint: "Seluruh key dienkripsi dan tidak dibagikan ke akun lain.",
      fallback:
        "Jika dibiarkan kosong, fitur trading yang memerlukan akses akun tidak akan aktif dan Anda hanya mendapatkan alat data pasar publik.",
    },
    errors: {
      sessionRequired: "Silakan masuk sebelum menyimpan pengaturan.",
      saveFailed: "Gagal menyimpan pengaturan. Coba lagi.",
    },
  },
  analysisFallback: {
    summary:
      "Analisa tidak berhasil dibuat. Coba jalankan ulang agent dengan data yang lebih lengkap.",
    rationale:
      "Model tidak memberikan rasionalisasi. Tambahkan detail objektif untuk analisa lanjutan.",
  },
  agent: {
    errors: {
      unsupportedSymbol:
        "Symbol {symbol} tidak didukung oleh sumber data {provider}.",
    },
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
    retentionNote:
      "Riwayat disimpan agar SWIMM dapat terus belajar dari hasil trading Anda.",
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
    feedbackPanel: {
      title: "Bagaimana hasil rencana ini?",
      description:
        "Perbarui verdict setelah mengeksekusi trade agar agent dapat belajar dari hasil nyata.",
      holdDisabled: "Rencana ini tidak menghasilkan trade sehingga tidak perlu feedback.",
      verdictLabel: "Verdict hasil",
      feedbackLabel: "Catatan eksekusi",
      feedbackPlaceholder:
        "Bagikan apa yang terjadi setelah mengikuti (atau melewatkan) rencana ini...",
      pendingHint: "Tambahkan konteks soal entry, slippage, atau alasan rencana berhasil maupun gagal.",
      submitButton: "Kirim feedback",
      updatingButton: "Menyimpan feedback...",
      success: "Feedback tersimpan. Terima kasih!",
      genericError: "Tidak dapat memperbarui feedback. Coba lagi.",
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
      dateLabel: "Tanggal",
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
      entry: "{pair} • {timeframe}",
      format: "{decision} -> {verdict}",
      noDecision: "Tidak ada keputusan",
      noVerdict: "Tidak ada verdict",
    },
    detail: {
      backLink: "Kembali ke riwayat",
      loading: "Memuat entri...",
      missingTitle: "Analisa tidak ditemukan",
      missingDescription: "Kami tidak menemukan analisa ini. Mungkin sudah dihapus.",
      metaCreated: "Dibuat",
      metaUpdated: "Terakhir diperbarui",
      decisionLabel: "Keputusan",
      verdictLabel: "Verdict",
    },
    executionSurvey: {
      title: "Apakah rencana ini dieksekusi?",
      description:
        "Beritahu kami bila trade dijalankan supaya kami bisa meminta feedback saat waktunya tepat.",
      executedYes: "Ya, saya eksekusi",
      executedNo: "Tidak, hanya referensi",
      recordedYes: "Ditandai sebagai dieksekusi. Ceritakan hasilnya di bawah.",
      recordedNo: "Disimpan sebagai referensi. Anda bisa memperbarui nanti jika trade dijalankan.",
      updateError: "Tidak dapat memperbarui status eksekusi. Coba lagi.",
    },
    executionBadge: {
      executed: "Dieksekusi",
    },
    liveComparison: {
      title: "Chart live",
      subtitle: "Kondisi {pair} ({timeframe}) saat ini dari {provider}.",
      lastUpdated: "Diperbarui {time}",
      loading: "Memuat chart live...",
      empty: "Data market live belum tersedia.",
      error: "Chart live tidak dapat dimuat.",
      timeframeLabel: "Timeframe",
      indicatorsLabel: "Indikator",
    },
  },
  language: {
    english: "English",
    indonesian: "Bahasa Indonesia",
  },
  landing: {
    introduction: {
      badge: "Pusat Inteligensi SWIMM",
      heading: "Inteligensi kripto multi-pair dengan panduan bahasa natural.",
      description:
        "SWIMM memanfaatkan Sentient Models (dobby-unhinged-llama) untuk menganalisa struktur, sentimen, dan likuiditas di seluruh pair yang tersedia.",
      ctaPrimaryAuthenticated: "Mulai analitik",
      ctaPrimaryGuest: "Masuk & mulai",
      ctaSecondaryAuthenticated: "Lihat riwayat",
      ctaSecondaryGuest: "Jelajahi fitur",
      privyWaiting:
        "Menunggu koneksi Privy... tombol akan aktif setelah autentikasi siap.",
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
    },
    why: {
      heading: "Mengapa trader memilih SWIMM",
      description:
        "Setiap ringkasan menggabungkan sinyal teknikal, katalis, dan proyeksi AI untuk meminimalkan bias.",
      cta: "Lihat analitik",
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
    spotlight: {
      badge: "Sorotan fitur",
      title: "Analisa emas dalam sekali klik",
      description:
        "Analisa emas spot (XAUUSD) dengan agent SWIMM yang sama — stream candlestick lalu hasilkan entry, target, stop, dan narasi.",
      cta: "Buka analisa Emas",
      tags: ["Candlestick live", "Rencana AI", "Parameter risiko"],
    },
    gettingStarted: {
      heading: "Mulai bersama SWIMM",
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
          title: "Pilih pair & timeframe",
          description:
            "Beralih dari scalping ke swing pada simbol yang didukung hanya dalam detik.",
        },
        {
          id: "03",
          title: "Eksekusi percaya diri",
          description: "Ikuti entry, target, dan parameter risiko berbasis AI.",
        },
      ],
    },
    disclaimer: {
      heading: "Trading tetap tanggung jawab Anda",
      body:
        "SWIMM memberikan insight analitis, bukan instruksi trading. Tinjau ulang setiap rekomendasi dengan riset pribadi, toleransi risiko, dan kondisi pasar sebelum membuka posisi.",
    },
    footer: {
      copyright: "Soon you Will Make Money",
      navDashboard: "Analisis",
      navHistory: "Riwayat",
    },
  },
};

export default id;
