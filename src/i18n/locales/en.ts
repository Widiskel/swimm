const en = {
  common: {
    close: "Close",
  },
  header: {
    logo: "WA",
    brand: "Web Analytic AI",
    tagline: "Crypto Pair Intelligence Suite",
    languageLabel: "Language",
  },
  siteHeader: {
    brandInitials: "SW",
    productBadge: "SWIMM",
    tagline: "Soon You Will Make Money",
    logoAlt: "SWIMM emblem",
    brandingAlt: "SWIMM wordmark",
    nav: {
      home: "Home",
      analysis: "Analysis",
      history: "History",
      profile: "Profile",
    },
    mobileMenuLabel: "Open navigation menu",
    mobileMenuCloseLabel: "Close navigation menu",
  },
  hero: {
    badge: "Live Market Intelligence",
    heading:
      "Track live crypto markets, then let the agent build trade-ready plans instantly.",
    description:
      "Web Analytic AI blends Binance price streaming, order flow, and up-to-the-minute Tavily headlines into structured guidance you can execute.",
    features: [
      {
        title: "Streaming Chart",
        description:
          "Live Binance candlesticks paired with an order book that refreshes automatically every 30 seconds.",
      },
      {
        title: "LLM Market Reasoning",
        description:
          "The agent fuses technicals, fundamentals, and the latest news to surface tradable insights.",
      },
      {
        title: "Ready-To-Execute Plan",
        description:
          "Entry zone, five take-profit targets, stop loss, position sizing, and narrative in one output.",
      },
    ],
  },
  pairSelection: {
    title: "Choose trading pair",
    description:
      'Pick a pair, then click "Show chart" to stream candlesticks. Timeframe can be adjusted inside the chart card.',
    selectLabel: "Trading pair",
    modeLabel: "Market mode",
    modeHint: "Choose between spot markets or perpetual futures",
    providerLabel: "CEX provider",
    providerHint: "Choose the exchange to source prices and order data",
    modeOptions: {
      spot: "Spot",
      futures: "Futures",
    },
    providerOptions: {
      binance: "Binance",
      bybit: "Bybit",
    },
    button: "Show chart",
    loading: "Loading pairs...",
    empty: "No pairs available",
    triggerLabel: "Open trading pair selector",
    modalTitle: "Select trading pair",
    searchPlaceholder: "Search by symbol or token name...",
    searchEmpty: "No pairs match your search.",
    noSelection: "Select a trading pair",
  },
  live: {
    card: {
      title: "Live chart",
      providerBadge: "Sourced from {provider}",
      indicatorsTitle: "Indicators",
      indicatorHint: "Indicator overlays are visible on the chart",
      hoverPrompt: "Hover over a candlestick",
      hoverClose: "Close",
      hoverOpen: "Open",
      hoverHigh: "High",
      hoverLow: "Low",
      loading: "Loading chart...",
      emptyState: 'Select a pair and click "Show chart" to load candlesticks.',
    },
    stats: {
      volumeBase: "24h volume",
      highLow: "24h high/low",
      lastUpdate: "Last update",
    },
    orderBook: {
      title: "Order book",
      bids: "Bids",
      asks: "Asks",
    },
    analysisNote:
      "Analysis will use {pair} from {provider} with timeframe {timeframe}.",
    analyzeButton: "Analyze",
    analyzingButton: "Analyzing...",
    errors: {
      fetchSnapshot: "Failed to retrieve market data from the provider.",
      renderChart: "Unable to display the chart. Please try again.",
    },
  },
  market: {
    summary: {
      unavailable: "{provider} market data is unavailable.",
      modeTitle: {
        spot: "{symbol} spot ({provider})",
        futures: "{symbol} futures ({provider})",
      },
      lastPrice: "Last price: {value}",
      change24h: "24h change: {value}%",
      highLow24h: "24h high/low: {high} / {low}",
      volume24hBase: "24h volume: {value} {asset}",
      volume24hQuote: "Quote volume: {value} USDT",
      weightedAverage: "Weighted average: {value}",
      lastUpdate: "Last update: {value}",
      providerLabel: {
        binance: "Binance",
        bybit: "Bybit",
      },
    },
    errors: {
      unsupportedPair: "Pair is not supported. Sample pairs: {samples}",
      invalidInterval: "Invalid chart interval.",
      loadPairs: "Failed to load tradable pairs from the provider.",
    },
  },
  analysis: {
    heading: "Agent analysis for {pair} ({timeframe})",
    confidence: "Confidence {value}% - Action {action}",
    summaryTitle: "Agent Summary",
    snapshot: {
      title: "Chart snapshot",
      description:
        "Visual trade plan overlay with entry, targets, and stop captured from the live chart.",
      legendEntry: "Entry",
      legendTarget: "Target",
      legendStop: "Stop",
      placeholder: "Snapshot chart will appear after the analysis is complete.",
    },
    chartInsight: {
      title: "Chart insight",
      forecast: "Forecast:",
      rangeStart: "Start",
      rangeEnd: "End",
    },
    technical: {
      title: "Supporting technicals",
      empty: "Technical summary not available.",
    },
    fundamental: {
      title: "Supporting fundamentals",
      empty: "Fundamental summary not available.",
    },
    highlights: {
      title: "Supporting notes",
      empty: "No supporting notes captured yet.",
    },
    tradePlan: {
      title: "Trade plan",
      entryZone: "Entry zone",
      noEntry: "Entry zone is not available yet.",
      targets: "Targets",
      noTargets: "Take-profit targets are not available yet.",
      stopLoss: "Stop loss",
      executionWindow: "Execution window",
      sizingNotes: "Sizing notes",
      narrativeTitle: "Supporting analysis",
      narrativeFallback: "Supporting analysis is not available yet.",
    },
    nextSteps: {
      title: "Next steps",
    },
    integration: {
      title: "Further integrations",
      body1:
        "Connect your own scraping endpoints, on-chain feeds, or favorite LLM providers (OpenAI, Claude, etc.) through the /api/agent route.",
      body2:
        "Automate order execution on your preferred exchange once you validate the recommendations.",
    },
    savePanel: {
      title: "Archive this analysis",

      description:
        "Store the full agent output in your history now and confirm the outcome once the trade has finished.",

      verdictLabel: "Prediction outcome",

      verdictOptions: {
        accurate: {
          label: "Accurate",

          description: "Price respected the plan and levels.",
        },

        inaccurate: {
          label: "Missed",

          description: "Price invalidated the thesis or levels.",
        },

        unknown: {
          label: "Too early",

          description: "Still waiting on price action to confirm.",
        },
      },

      feedbackLabel: "Feedback notes",

      feedbackPlaceholder:
        "Add context on why the trade worked or what you observed...",

      holdNotAllowed:
        "Hold signals cannot be saved. Save only actionable buy or sell plans.",

      feedbackHint:
        "Feedback helps refine future summaries and keeps your journal detailed. You can always add it later from History.",

      saveButton: "Save to history",

      savingButton: "Saving...",

      savedButton: "Saved",

      successMessage: "Report stored in your history. Update the verdict anytime from History.",

      loginPrompt: "Sign in to save analyses to your SWIMM account.",

      syncing: "Preparing your secure session...",

      genericError: "Unable to save the report. Try again.",

      hint: "Entries are stored privately. Update the verdict anytime from your History page.",
    },
  },
  profile: {
    badge: "Account",
    title: "Account & Exchange Settings",
    descriptions: {
      account:
        "Manage your personal information and linked login providers so the avatar and history reflect the right identity.",
      apiKey:
        "Link trading keys used for execution or portfolio access. Without keys, trading actions stay disabled and only public market tools are available.",
    },
    tabs: {
      account: "Account",
      apiKey: "API keys",
    },
    account: {
      title: "Account preferences",
      description:
        "Update your display name and review which sign-in providers are linked. Exchange wallets are not required here.",
      displayNameLabel: "Display name",
      displayNamePlaceholder: "Enter the name shown across SWIMM",
      displayNameHelp: "Used in notifications and collaborative reports.",
      connectionsTitle: "Linked providers",
      connectionsDescription:
        "Manage which social or email accounts can authenticate you.",
      connectionStatus: {
        connected: "Connected",
        notConnected: "Not connected",
      },
      actions: {
        save: "Save account changes",
        saving: "Saving...",
        connect: "Connect",
        disconnect: "Disconnect",
        processing: "Processing...",
      },
      success: "Account preferences updated.",
      connectionsNote: "Use the buttons below to link or unlink providers. You can also manage them through the regular sign-in flow.",
    },
    connections: {
      email: "Email",
      google: "Google",
      discord: "Discord",
    },
    loading: "Loading your profile...",
    success:
      "Settings saved. Future analyses will prioritise your personal keys.",
    disclaimer:
      "Keys stay encrypted and tied to your account. SWIMM will never place trades or move funds without your consent.",
    placeholders: {
      apiKey: "Enter API key",
      apiSecret: "Enter API secret",
    },
    binance: {
      title: "Binance credentials",
      description:
        "Use trade-enabled keys if you want SWIMM to sync positions or prepare executions. For market-only access, your workspace project key already covers price data.",
      apiKey: "API key",
      apiSecret: "API secret",
    },
    bybit: {
      title: "Bybit credentials",
      description:
        "Optional. Supply keys for account-aware tooling on Bybit. Leave blank when you only need the shared market feed.",
      apiKey: "API key",
      apiSecret: "API secret",
    },
    actions: {
      save: "Save settings",
      saving: "Saving...",
    },
    authRequired: {
      title: "Sign in to manage your profile",
      description:
        "Connect your Privy account to edit personal API keys and preferences.",
      cta: "Sign in",
    },
    meta: {
      title: "Profile overview",
      lastUpdated: "Last updated {timestamp}",
      neverUpdated: "No settings saved yet.",
      hint: "All keys are encrypted at rest and never shared across accounts.",
      fallback:
        "If you leave these fields blank, account-aware trading features stay disabled and only public market tools remain available.",
    },
    errors: {
      sessionRequired: "Please sign in before saving settings.",
      saveFailed: "Failed to save settings. Try again.",
    },
  },
  analysisFallback: {
    summary:
      "Analysis could not be generated. Please rerun the agent with richer data.",
    rationale:
      "The model did not provide a rationale. Add more objective details for the next attempt.",
  },
  agent: {
    errors: {
      unsupportedSymbol:
        "{symbol} is not supported by the {provider} data source.",
    },
  },
  auth: {
    connecting: "Preparing sign-in...",
    loginProcessing: "Processing...",
    login: "Sign in",
    logoutProcessing: "Signing out...",
    logout: "Sign out",
    loginError: "Login failed. Please try again.",
    logoutError: "Logout failed. Please try again.",
    authenticatedLabel: "Authenticated",
    defaultUser: "Account",
    envMissing: "Set NEXT_PUBLIC_PRIVY_APP_ID to enable authentication.",
  },
  analysisPage: {
    connectingTitle: "Checking your sign-in status...",
    connectingSubtitle:
      "Please wait while we verify access to protected tools.",
    protectedBadge: "Protected Area",
    signInHeading: "Sign in to run personalised trading analysis",
    signInDescription:
      "Real-time analytics unlock after you sign in. Launch the SWIMM agent for price forecasts and execution-ready playbooks.",
    signInButton: "Sign in",
    backHome: "Back to home",
  },
  history: {
    connecting: "Checking your sign-in status...",
    protectedBadge: "Protected Area",
    signInHeading: "Sign in to view your analysis history",
    signInDescription:
      "Store and compare every agent output in your SWIMM account. History is tied to your authenticated session.",
    signInButton: "Sign in",
    title: "Analysis history",
    subtitle:
      "Saved analyses live in the cloud with your verdict and feedback so you can review them anywhere.",
    retentionNote: "History stays available so SWIMM can keep learning from your outcomes.",
    loading: "Loading saved analyses...",
    metrics: {
      totalAnalyses: "Total analyses",
      buySignals: "Buy signals",
      sellSignals: "Sell signals",
      holdSignals: "Hold signals",
    },
    empty: {
      title: "No analyses saved yet",
      descriptionPrefix: "Run the agent on the ",
      linkText: "Analysis page",
      descriptionSuffix: " to store your latest recommendations.",
    },
    entryCard: {
      confidence: "Confidence",
      planTimeframe: "Plan timeframe",
      openInDashboard: "Open in analysis",
      entries: "Entries",
      takeProfits: "Take profits",
      stopLoss: "Stop loss",
      sizingNotes: "Sizing notes",
      noSizingNotes: "No sizing notes",
      provider: "Provider",
      tradePlanTitle: "Trade plan recap",
      noSignal: "NO SIGNAL",
      verdict: {
        accurate: "Accurate",
        inaccurate: "Missed",
        unknown: "Pending",
      },
      decision: {
        title: "Decision snapshot",
        action: "Action",
        timeframe: "Plan timeframe",
        confidence: "Confidence",
        noConfidence: "Confidence unavailable",
      },
      agentSummary: {
        title: "Agent narrative",
        rationale: "Rationale",
        forecast: "Forecast",
        noRationale: "No rationale shared.",
        noForecast: "No forecast provided.",
        noSummary: "No narrative summary provided.",
      },
      highlights: {
        title: "Key highlights",
        empty: "No highlights captured.",
        nextTitle: "Execution reminders",
        nextEmpty: "No next steps recorded.",
      },
      feedbackBlock: {
        title: "User feedback",
        empty: "No feedback left for this report.",
      },
    },
    feedbackPanel: {
      title: "How did this plan play out?",
      description:
        "Update the verdict after you've executed the trade so the agent can keep learning from real outcomes.",
      holdDisabled: "This plan didn't trigger a trade, so feedback isn't required.",
      verdictLabel: "Outcome verdict",
      feedbackLabel: "Execution notes",
      feedbackPlaceholder:
        "Share what happened after you followed (or skipped) the plan...",
      pendingHint: "Add context on fills, slippage, or reasons the plan succeeded or failed.",
      submitButton: "Submit feedback",
      updatingButton: "Saving feedback...",
      success: "Thanks! Your feedback has been saved.",
      genericError: "Unable to update feedback right now. Try again.",
    },
    dayGroup: {
      title: "Analyses on {date}",
      totals: {
        analyses: "Analyses",
        buy: "Buy",
        sell: "Sell",
        hold: "Hold",
      },
      toggle: {
        show: "Show details",
        hide: "Hide details",
      },
    },
    filters: {
      searchPlaceholder: "Search pair, timeframe, summary...",
      decisionLabel: "Decision",
      verdictLabel: "Verdict",
      pairLabel: "Pair",
      allOption: "All",
      dateLabel: "Date",
      decisionOptions: {
        buy: "Buy",
        sell: "Sell",
        hold: "Hold",
      },
      verdictOptions: {
        accurate: "Accurate",
        inaccurate: "Missed",
        unknown: "Pending",
      },
    },
    summaryRow: {
      entry: "{pair} • {timeframe}",
      format: "{decision} -> {verdict}",
      noDecision: "No decision",
      noVerdict: "No verdict",
    },
    detail: {
      backLink: "Back to history",
      loading: "Loading entry...",
      missingTitle: "Analysis not found",
      missingDescription: "We couldn't find this saved analysis. It may have been removed.",
      metaCreated: "Created",
      metaUpdated: "Last updated",
      decisionLabel: "Decision",
      verdictLabel: "Verdict",
    },
    executionSurvey: {
      title: "Did you execute this plan?",
      description:
        "Let us know if you took the trade so we can prompt for outcome feedback at the right time.",
      executedYes: "Yes, I executed it",
      executedNo: "No, kept it as reference",
      recordedYes: "Marked as executed. Tell us how it performed below.",
      recordedNo: "Saved as reference only. You can update this later if you take the trade.",
      updateError: "Unable to update execution status. Try again.",
    },
    executionBadge: {
      executed: "Executed",
    },
    liveComparison: {
      title: "Live chart",
      subtitle: "Current {pair} ({timeframe}) from {provider}.",
      lastUpdated: "Updated {time}",
      loading: "Loading live chart...",
      empty: "Live market data is unavailable.",
      error: "Unable to load live chart.",
      timeframeLabel: "Timeframe",
      indicatorsLabel: "Indicators",
    },
  },
  language: {
    english: "English",
    indonesian: "Bahasa Indonesia",
  },
  landing: {
    hero: {
      badge: "SWIMM Intelligence Hub",
      heading: "Multi-pair crypto intelligence with natural-language guidance.",
      description:
        "SWIMM harnesses Sentient Models (dobby-unhinged-llama) to analyse structure, sentiment, and liquidity across supported pairs.",
      ctaPrimaryAuthenticated: "Launch analytics",
      ctaPrimaryGuest: "Sign in & start",
      ctaSecondaryAuthenticated: "Review history",
      ctaSecondaryGuest: "Explore features",
      privyWaiting:
        "Waiting for Privy connection... buttons activate once authentication is ready.",
    },
    highlights: [
      {
        title: "Multi-Pair Forecasting",
        description:
          "AI projections across BTC, ETH, SOL, and rotating assets.",
      },
      {
        title: "Unified Sentiment",
        description:
          "Blend scraped headlines, briefs, and custom data for balanced decisions.",
      },
      {
        title: "Trade Plans",
        description:
          "Entries, targets, stops, and sizing guidance aligned to your timeframe.",
      },
    ],
    features: {
      heading: "Why traders choose SWIMM",
      description:
        "Each briefing blends technical signals, catalysts, and AI projections to minimise bias.",
      cta: "View analytics",
      cards: [
        {
          title: "Sentiment Fusion",
          description:
            "Scraped headlines surface into prioritised highlights for faster conviction.",
        },
        {
          title: "Adaptive Technicals",
          description:
            "Dynamic overlays, SMA, RSI, and volatility auto-adjust to timeframe.",
        },
        {
          title: "Risk Discipline",
          description:
            "Every call ships with realistic targets and protective stops.",
        },
        {
          title: "Live Binance Feed",
          description:
            "Stream candlesticks for majors and track new listings effortlessly.",
        },
        {
          title: "Timeframe Control",
          description:
            "Flip from 5-minute scalps to daily swings without losing context.",
        },
        {
          title: "Persistent History",
          description:
            "Compare past calls stored locally and iterate your playbook.",
        },
      ],
    },
    workflow: {
      heading: "Three simple steps",
      description:
        "SWIMM condenses research workflows into one command centre so you can execute decisively.",
      ctaAuthenticated: "Open analysis now",
      ctaGuest: "Preview features",
      steps: [
        {
          id: "01",
          title: "Authenticate with Privy",
          description:
            "Secure login via email or wallet unlocks SWIMM analytics.",
        },
        {
          id: "02",
          title: "Pick Pair & Timeframe",
          description:
            "Switch from scalps to swings across supported symbols in seconds.",
        },
        {
          id: "03",
          title: "Execute with Confidence",
          description:
            "Follow AI-backed entries, targets, and risk parameters.",
        },
      ],
    },
    footer: {
      copyright: "Soon You Will Make Money",
      navDashboard: "Analysis",
      navHistory: "History",
    },
  },
};

export default en;
