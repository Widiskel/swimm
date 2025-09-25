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
    },
  },
  hero: {
    badge: "Live Market Intelligence",
    heading: "Track live crypto markets, then let the agent build trade-ready plans instantly.",
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
      "Pick a pair, then click \"Show chart\" to stream candlesticks. Timeframe can be adjusted inside the chart card.",
    selectLabel: "Trading pair",
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
      indicatorsTitle: "Indicators",
      indicatorHint: "Indicator overlays are visible on the chart",
      hoverPrompt: "Hover over a candlestick",
      hoverClose: "Close",
      hoverOpen: "Open",
      hoverHigh: "High",
      hoverLow: "Low",
      loading: "Loading chart...",
      emptyState: "Select a pair and click \"Show chart\" to load candlesticks.",
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
    analysisNote: "Analysis will use {pair} with timeframe {timeframe}.",
    analyzeButton: "Analyze",
    analyzingButton: "Analyzing...",
  },
  analysis: {
    heading: "Agent analysis for {pair} ({timeframe})",
    confidence: "Confidence {value}% · Action {action}",
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
      body2: "Automate order execution on your preferred exchange once you validate the recommendations.",
    },
  },
  analysisFallback: {
    summary: "Analysis could not be generated. Please rerun the agent with richer data.",
    rationale: "The model did not provide a rationale. Add more objective details for the next attempt.",
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
    envMissing:
      "Set NEXT_PUBLIC_PRIVY_APP_ID to enable authentication.",
  },
  analysisPage: {
    connectingTitle: "Checking your sign-in status...",
    connectingSubtitle: "Please wait while we verify access to protected tools.",
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
      "Store and compare every agent output to evaluate strategy consistency. History is saved locally on this device.",
    signInButton: "Sign in",
    title: "Analysis history",
    subtitle:
      "History lives locally on this device. Clear it whenever you want to start fresh.",
    clearButton: "Clear history",
    metrics: {
      totalAnalyses: "Total analyses",
      buySignals: "Buy signals",
      sellHoldSignals: "Sell / hold signals",
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
      noSizingNotes: "No sizing notes",
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
        "SWIMM harnesses Fireworks LLM to analyse structure, sentiment, and liquidity across supported pairs.",
      ctaPrimaryAuthenticated: "Launch analysis dashboard",
      ctaPrimaryGuest: "Sign in & start",
      ctaSecondaryAuthenticated: "Review history",
      ctaSecondaryGuest: "Explore features",
      privyWaiting:
        "Waiting for Privy connection... buttons activate once authentication is ready.",
    },
    highlights: [
      {
        title: "Multi-Pair Forecasting",
        description: "AI projections across BTC, ETH, SOL, and rotating assets.",
      },
      {
        title: "Unified Sentiment",
        description: "Blend scraped headlines, briefs, and custom data for balanced decisions.",
      },
      {
        title: "Trade Plans",
        description: "Entries, targets, stops, and sizing guidance aligned to your timeframe.",
      },
    ],
    features: {
      heading: "Why traders choose SWIMM",
      description:
        "Each briefing blends technical signals, catalysts, and AI projections to minimise bias.",
      cta: "View the dashboard",
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
          description: "Every call ships with realistic targets and protective stops.",
        },
        {
          title: "Live Binance Feed",
          description: "Stream candlesticks for majors and track new listings effortlessly.",
        },
        {
          title: "Timeframe Control",
          description: "Flip from 5-minute scalps to daily swings without losing context.",
        },
        {
          title: "Persistent History",
          description: "Compare past calls stored locally and iterate your playbook.",
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
          description: "Secure login via email or wallet unlocks SWIMM analytics.",
        },
        {
          id: "02",
          title: "Pick Pair & Timeframe",
          description: "Switch from scalps to swings across supported symbols in seconds.",
        },
        {
          id: "03",
          title: "Execute with Confidence",
          description: "Follow AI-backed entries, targets, and risk parameters.",
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
