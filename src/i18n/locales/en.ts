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
    modeLabel: "Market focus",
    modeHint: "Pick between crypto assets or precious metals",
    providerLabel: "Data provider",
    providerHint: "Choose the source exchange or feed",
    modeOptions: {
      spot: "Spot",
      futures: "Futures",
    },
    assetOptions: {
      crypto: "Crypto",
      gold: "Gold",
    },
    cryptoMarketModeLabel: "Market type",
    cryptoMarketModeHint: "Choose between spot markets or perpetual futures",
    providerOptions: {
      binance: "Binance",
      bybit: "Bybit",
      twelvedata: "Twelve Data",
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
        twelvedata: "Twelve Data",
      },
    },
    errors: {
      unsupportedPair: "Pair is not supported. Sample pairs: {samples}",
      invalidInterval: "Invalid chart interval.",
      loadPairs: "Failed to load tradable pairs from the provider.",
    },
  },
  agentApi: {
    history: {
      header: "Personal history ({pair}, {timeframe})",
      savedPlans: "Saved plans: {total} (Buy: {buy} | Sell: {sell})",
      verdictSummary: "Verdicts — Accurate: {accurate}, Missed: {inaccurate}, Pending: {pending}",
      successRate: "Success rate: {value}",
      successRatePending: "Success rate: Not enough data",
      feedbackMissing: "(no feedback)",
      verdict: {
        accurate: "Accurate",
        inaccurate: "Missed",
        unknown: "Pending",
      },
    },
    marketAnalytics: {
      missingNarrative: "No candle data available.",
      missingForecast: "Unable to build a forecast without price history.",
      bullishSma: "Bullish signal: fast SMA is above slow SMA.",
      bearishSma: "Bearish signal: fast SMA is below slow SMA.",
      volatilityLabel: "Volatility {timeframe}",
      priceRangeLabel: "Price range",
      sessionChangeLabel: "Change since session start",
      atrLine: "ATR(14): {value} ({percent}% of price)",
      volatilityBucket: {
        low: "Volatility regime: low (tight range conditions).",
        medium: "Volatility regime: medium (two-way participation).",
        high: "Volatility regime: high (expect wider swings).",
        unknown: "Volatility regime: unknown (insufficient data).",
      },
      volatilityBucketName: {
        low: "low",
        medium: "moderate",
        high: "elevated",
        unknown: "unknown",
      },
      smaRelation: {
        above: "Bullish crossover (fast above slow).",
        below: "Bearish crossover (fast below slow).",
        flat: "Flat/indecisive crossover.",
      },
      momentum: {
        bullish: "bullish",
        bearish: "bearish",
        neutral: "neutral",
      },
      chartNarrative:
        "Price on the {timeframe} timeframe is {momentum} with the latest close at {price} USDT.",
      forecast: {
        positive:
          "Positive momentum dominates; watch for consolidation before trend continuation.",
        negative:
          "Selling pressure remains; a bullish catalyst is needed for reversal.",
        flat: "Sideways movement; wait for a breakout to confirm the next direction.",
      },
      focus: {
        bullishBreakout:
          "Treat the move as a bullish breakout; plan for continuation but define invalidation near prior resistance.",
        bearishBreakout:
          "Bearish pressure suggests a breakdown; look for continuation shorts while marking reclaim levels.",
        momentumLong:
          "Momentum is skewed long; stalk pullbacks into moving averages before taking continuation entries.",
        momentumShort:
          "Momentum is skewed short; wait for relief bounces to fade while tracking nearby support.",
        rangePlay:
          "Price is ranging; frame mean-reversion trades with tight risk until volatility expands.",
      },
      keyMetrics: {
        close: "Last close: {value} USDT",
        change: "Session change: {value}%",
        smaSignal: "SMA signal: {value}",
        atr: "ATR(14): {value} ({percent}% of price)",
        volatility: "Volatility regime: {value}",
      },
    },
    fundamentals: {
      priceUnavailable: "Latest price information is unavailable.",
      changeUnavailable: "24h price change has not been calculated.",
      macroReminder:
        "Align the {timeframe} strategy with current macro and on-chain context before execution.",
    },
    userPrompt: {
      placeholders: {
        urls: "(No URLs provided)",
        dataset: "(No dataset uploaded)",
        manual: "(No manual notes)",
        technical: "(No technical summary)",
        tavilySummary: "(No Tavily summary)",
        tavilyResults: "(No Tavily search results)",
        tavilyArticles: "(No Tavily article extracts)",
        promptSeries: "(No candle data)",
        history: "(No personal history saved for this pair)",
        unknownDataset: "Unknown",
        datasetPreviewLabel: "Content (truncated)",
        keyMetrics: "(Key metrics unavailable)",
        analysisFocus: "(No focus hint available)",
        cryptoNews: "(No CryptoPanic headlines)",
      },
      datasetNameLabel: "Dataset name",
      tavily: {
        urlLabel: "URL",
        publishedLabel: "Published",
        summaryLabel: "Summary",
        excerptLabel: "Excerpt",
        rawExcerptLabel: "Excerpt (raw)",
      },
      news: {
        sourceLabel: "Source",
        publishedLabel: "Published",
        urlLabel: "URL",
        sentimentLabel: "Sentiment",
        sentimentUnknown: "N/A",
        sentimentValues: {
          bullish: "Bullish",
          neutral: "Neutral",
          bearish: "Bearish",
        },
      },
      timeframeGuidance:
        "Timeframe directive: operate on {timeframe}. Keep entries within ±{entry}% of market price, place stops around {stop}%, and step targets by roughly {target}%.",
      dataMode: {
        scrape: "Scrape news URLs",
        upload: "Upload dataset",
        manual: "Manual notes",
      },
      labels: {
        objective: "Analysis objective",
        dataMode: "Active data mode",
        urls: "News URLs",
        manual: "Manual notes",
        dataset: "Custom dataset",
        history: "User history",
        pair: "Pair under analysis",
        timeframe: "Target timeframe",
        summary: "Market data snapshot for {pair}",
        keyMetrics: "Key metrics snapshot",
        analysisFocus: "Focus checklist",
        narrative: "Price narrative",
        forecast: "Internal forecast",
        promptSeries: "Candle data (ISO|O/H/L/C/V)",
        technical: "Technical snapshot",
        tavilySummary: "Tavily summary",
        tavilyResults: "Tavily search results",
        tavilyArticles: "Tavily article extracts",
        cryptoNews: "CryptoPanic headlines",
        instructions: "Instructions",
      },
      instructions:
        "Perform sentiment, news, and market analysis for {pair}; surface tradable insights.\nProduce base, bullish, and bearish price scenarios for {pair} on the {timeframe} timeframe.\nProvide supporting technical & fundamental notes plus a risk-aware execution plan (entries, targets, stop, sizing).\nRespond in JSON only, using natural English throughout all strings.",
    },
    tradePlan: {
      holdSizingNotes:
        "No execution plan provided. Wait for additional confirmation before opening a position.",
      holdRationale:
        "Momentum is unclear. Reassess once price breaks a key area.",
      sizingNotes: {
        long: "Risk per position should stay ≤ 2% of equity; scale into the trade gradually.",
        short: "Confirm borrow availability for shorts and keep position sizing conservative.",
        neutral: "Hold execution until additional signals confirm direction.",
      },
      rationaleFallback:
        "Validate the trade setup with order flow and macro headlines before execution.",
    },
    payload: {
      rationaleMissing:
        "The model did not supply a rationale. Add more objective detail for a follow-up analysis run.",
      summaryMissing:
        "Analysis could not be generated. Rerun the agent with richer context.",
      nextStepsDefault:
        "Validate the trading plan against live charts and order-book data.\nRefresh macro/news context and rerun the agent if needed.",
    },
    systemPrompt: {
      languageReminder: "All strings must be written in natural English.",
      coreGuidelines:
        "- Anchor every conclusion to the supplied market and news data.\n- Keep numeric fields as numbers (confidence between 0 and 1) and avoid fabricating data that conflicts with inputs.\n- Highlight missing context explicitly instead of guessing levels or catalysts.",
      example:
        "Example JSON:\n{\n  \"summary\": \"Price is holding the mid-range after a 2% rally; liquidity is clustered near 68k.\",\n  \"decision\": {\n    \"action\": \"hold\",\n    \"confidence\": 0.48,\n    \"timeframe\": \"4H\",\n    \"rationale\": \"Momentum is slowing and order flow is mixed; wait for a range break before committing risk.\"\n  },\n  \"market\": {\n    \"pair\": \"BTCUSDT\",\n    \"chart\": {\n      \"interval\": \"5m\",\n      \"points\": [],\n      \"narrative\": \"Short-term candles show higher lows, but volume is tapering.\",\n      \"forecast\": \"Likely to consolidate unless buyers absorb offers above 68.5k.\"\n    },\n    \"technical\": [\"SMA7 is above SMA21\"],\n    \"fundamental\": [\"24h volume has normalised; no major news catalysts active.\"]\n  },\n  \"tradePlan\": {\n    \"bias\": \"neutral\",\n    \"entries\": [],\n    \"entry\": null,\n    \"stopLoss\": null,\n    \"takeProfits\": [],\n    \"executionWindow\": \"-\",\n    \"sizingNotes\": \"Risk <=2% until breakout confirms direction.\",\n    \"rationale\": \"Wait for breakout confirmation or new macro catalyst before sizing up.\"\n  },\n  \"highlights\": [\"Order book shows stacked offers near 68.5k\"],\n  \"nextSteps\": [\"Monitor ETF flows after NY open\"]\n}",
    },
    errors: {
      invalidJson: "Invalid JSON payload",
      objectiveRequired: "Analysis objective is required.",
      missingApiKey: "Sentient Models API key is not configured.",
      missingContent: "Sentient Models API did not return any content.",
      timeout: "Request to Sentient Models timed out.",
      generic: "Sentient Models integration failed.",
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
      ohlcCapturedAt: "Captured at",
      ohlcOpen: "Open",
      ohlcHigh: "High",
      ohlcLow: "Low",
      ohlcClose: "Close",
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
    news: {
      title: "Market headlines",
      empty: "No recent headlines available for this pair.",
      rateLimit: "CryptoPanic rate limit reached; headlines may be incomplete.",
      sourceLabel: "Source",
      publishedLabel: "Published",
      openLink: "Open article",
      sentimentLabel: "Sentiment",
      sentimentUnknown: "-",
      sentimentValue: {
        bullish: "Bullish",
        neutral: "Neutral",
        bearish: "Bearish",
      },
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
    sizingCalc: {
      title: "Position sizing",
      equityLabel: "Account equity",
      riskPercentLabel: "Risk per trade (%)",
      leverageLabel: "Leverage (x)",
      recommendedAllocation: "Recommended allocation",
      recommendedMargin: "Recommended margin",
      positionSizeLabel: "Position size",
      notionalLabel: "Notional value",
      marginLabel: "Margin required",
      riskAmountLabel: "Risk at stop",
      entryPriceLabel: "Entry price",
      stopPriceLabel: "Stop loss",
      manualPlanTitle: "Manual planner",
      manualAllocationLabel: "Manual allocation",
      manualMarginLabel: "Manual margin",
      manualEntryPriceLabel: "Manual entry price",
      pnlHeader: "Profit / loss projection",
      targetColumn: "Scenario",
      priceColumn: "Exit price",
      recommendedColumn: "Recommended PnL",
      manualColumn: "Manual PnL",
      pnlEmpty: "Targets are not available to project PnL.",
      stopLabel: "Stop loss",
      note: "Sizing is an estimate. Confirm fees, tick sizes, and contract rules with your exchange.",
    },
    disclaimer: {
      title: "Use SWIMM responsibly",
      body:
        "SWIMM delivers analytical guidance only. Market risk remains entirely yours — verify each plan, adjust sizing, and never trade without an independent decision.",
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
    updatedToast: "Fresh analysis ready · {time}",
    agentFailure: "The agent failed to respond.",
    agentGenericError: "Something went wrong while running the agent. Please try again.",
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
    introduction: {
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
      metrics: [
        {
          value: "2.3s",
          label: "Agent turnaround",
          caption: "Average response time across supported pairs",
        },
        {
          value: "40+",
          label: "Actionable signals",
          caption: "Daily long/short playbooks across crypto & metals",
        },
        {
          value: "3",
          label: "Data providers",
          caption: "Binance, Bybit, and Twelve Data feeds in one view",
        },
      ],
    },
    why: {
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
    spotlight: {
      badge: "Feature spotlight",
      title: "Gold analysis in one click",
      description:
        "Analyze spot gold (XAUUSD) with the same SWIMM agent — stream candles, then generate entries, targets, stops, and narrative.",
      cta: "Open Gold analysis",
      tags: ["Live candles", "LLM trade plans", "Risk parameters"],
    },
    providers: {
      heading: "Integrated market coverage",
      description:
        "Institutional-grade pricing, liquidity depth, and macro context aggregated into a single analytic surface.",
      items: [
        "Binance spot & futures data",
        "Bybit derivatives order flow",
        "Twelve Data metals & FX feed",
      ],
    },
    preview: {
      title: "Live agent snapshot",
      subtitle: "Illustrative SWIMM output refreshed every closed candle.",
      rows: [
        "BTCUSDT • 1H bias LONG",
        "Confidence 72%  |  Risk per trade 1.2%",
        "Entry 67,250  |  Stop 65,980  |  Targets 67,880 / 68,540",
        "Narrative: Higher lows supported by increasing spot bid volume.",
      ],
      footer: "Auto-updates with real-time candles, order flow, and breaking news.",
    },
    gettingStarted: {
      heading: "Getting started with SWIMM",
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
          title: "Pick pair & timeframe",
          description:
            "Switch from scalps to swings across supported symbols in seconds.",
        },
        {
          id: "03",
          title: "Execute with confidence",
          description:
            "Follow AI-backed entries, targets, and risk parameters.",
        },
      ],
    },
    disclaimer: {
      heading: "Trade responsibly",
      body:
        "SWIMM provides analytical insights, not trading instructions. Review every recommendation against your own research, risk tolerance, and market conditions before entering a position.",
    },
    footer: {
      copyright: "Soon You Will Make Money",
      navDashboard: "Analysis",
      navHistory: "History",
    },
  },
};

export default en;
