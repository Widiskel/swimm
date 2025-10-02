import { NextResponse } from "next/server";
import JSON5 from "json5";
import type { Filter } from "mongodb";
import {
  fetchBinanceCandles,
  fetchBinanceMarketSummary,
  formatBinanceSummary,
  isPairTradable,
  type BinanceCandle,
} from "@/features/market/exchanges/binance";
import {
  fetchBybitCandles,
  fetchBybitMarketSummary,
  formatBybitSummary,
  mapTimeframeToBybitIntervalSymbol,
  isBybitPairTradable,
} from "@/features/market/exchanges/bybit";
import { DEFAULT_PROVIDER, isCexProvider, type CexProvider } from "@/features/market/exchanges";
import {
  DEFAULT_MARKET_MODE,
  isMarketMode,
  type MarketMode,
} from "@/features/market/constants";
import {
  fetchTavilyExtract,
  fetchTavilySearch,
  type TavilyExtractedArticle,
  type TavilySearchData,
} from "@/lib/tavily";
import { getMongoDb } from "@/lib/mongodb";
import { getSessionFromCookie } from "@/lib/session";
import { getUserSettings } from "@/lib/user-settings";
import { getLanguageTag, isLocale, type Locale } from "@/i18n/messages";
import { translate, type Replacements } from "@/i18n/translate";
import type { AgentResponse } from "@/features/analysis/types";

type DataMode = "scrape" | "upload" | "manual";

type AgentRequest = {
  objective?: string;
  dataMode?: DataMode;
  urls?: string[];
  manualNotes?: string;
  datasetName?: string;
  datasetPreview?: string;
  timeframe?: string;
  pairSymbol?: string;
  provider?: string;
  locale?: string;
  mode?: string;
};

type AgentDecision = "buy" | "sell" | "hold";

type ChartPoint = {
  time: string;
  close: number;
};

type MarketContext = {
  symbol: string;
  timeframe: Timeframe;
  interval: string;
  candles: BinanceCandle[];
  lastPrice: number;
  mode: MarketMode;
};

type TradePlan = {
  bias: "long" | "short" | "neutral";
  entries: number[];
  entry: number | null;
  stopLoss: number | null;
  takeProfits: number[];
  executionWindow: string;
  sizingNotes: string;
  rationale: string;
};

type AgentPayload = {
  summary: string;
  decision: {
    action: AgentDecision;
    confidence: number;
    timeframe: string;
    rationale: string;
  };
  highlights: string[];
  nextSteps: string[];
  market: {
    pair: string;
    chart: {
      interval: string;
      points: ChartPoint[];
      narrative: string;
      forecast: string;
    };
    technical: string[];
    fundamental: string[];
  };
  tradePlan: TradePlan;
};

const FIREWORKS_API_URL = "https://api.fireworks.ai/inference/v1/chat/completions";
const DEFAULT_FIREWORKS_MODEL =
  "accounts/sentientfoundation/models/dobby-unhinged-llama-3-3-70b-new";

const ALLOWED_TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;
type Timeframe = (typeof ALLOWED_TIMEFRAMES)[number];
const DEFAULT_TIMEFRAME: Timeframe = "5m";

const tAgent = (locale: Locale, path: string, replacements?: Replacements) =>
  translate(locale, `agentApi.${path}`, replacements);

const CEX_INTERVAL_MAP: Record<Timeframe, string> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  "4h": "4h",
  "1d": "1d",
};

const pickFallbackTimeframe = (objective: string) => {
  const lower = objective.toLowerCase();
  if (/(scalp|intraday|1h|4h|harian)/i.test(lower)) {
    return "1D";
  }
  if (/(swing|mingguan|weekly|3d)/i.test(lower)) {
    return "1W";
  }
  if (/(makro|monthly|long term|jangka panjang)/i.test(lower)) {
    return "1M";
  }
  return "4H";
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const excerpt = (value: string, length = 1400) =>
  value.length > length ? `${value.slice(0, length)}...` : value;

const formatPairLabel = (rawSymbol: string) => {
  if (!rawSymbol) {
    return "UNKNOWN/PAIR";
  }
  const upper = rawSymbol.trim().toUpperCase();
  if (upper.includes("/") || upper.includes("-")) {
    return upper.replace(/-/g, "/");
  }
  const knownQuotes = ["USDT", "USDC", "BUSD", "BTC", "ETH", "EUR", "USD"];
  const quote = knownQuotes.find((item) => upper.endsWith(item));
  if (quote) {
    const base = upper.slice(0, upper.length - quote.length) || upper;
    return `${base}/${quote}`;
  }
  if (upper.length >= 6) {
    const base = upper.slice(0, upper.length - 3);
    const fallbackQuote = upper.slice(-3);
    return `${base}/${fallbackQuote}`;
  }
  return upper;
};
const normalizeTimeframe = (value?: string): Timeframe => {
  if (!value) {
    return DEFAULT_TIMEFRAME;
  }
  const normalized = value.trim().toLowerCase();
  const match = ALLOWED_TIMEFRAMES.find(
    (option) => option.toLowerCase() === normalized
  );
  return match ?? DEFAULT_TIMEFRAME;
};

const calculateSMA = (values: number[], period: number) => {
  if (period <= 0 || values.length < period) {
    return null;
  }
  const recent = values.slice(values.length - period);
  const total = recent.reduce((acc, item) => acc + item, 0);
  return total / period;
};

const calculateRSI = (candles: BinanceCandle[], period = 14) => {
  if (candles.length <= period) {
    return null;
  }
  let gains = 0;
  let losses = 0;
  for (let i = candles.length - period + 1; i < candles.length; i += 1) {
    const current = candles[i];
    const previous = candles[i - 1];
    const delta = current.close - previous.close;
    if (delta >= 0) {
      gains += delta;
    } else {
      losses += Math.abs(delta);
    }
  }
  const averageGain = gains / period;
  const averageLoss = losses / period;
  if (averageLoss === 0) {
    return 100;
  }
  const rs = averageGain / averageLoss;
  return 100 - 100 / (1 + rs);
};

const calculateVolatility = (values: number[]) => {
  if (values.length < 2) {
    return null;
  }
  const mean = values.reduce((acc, value) => acc + value, 0) / values.length;
  const variance =
    values.reduce((acc, value) => acc + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
};

const calculateATR = (candles: BinanceCandle[], period = 14) => {
  if (candles.length <= period) {
    return null;
  }
  let total = 0;
  for (let index = candles.length - period; index < candles.length; index += 1) {
    const current = candles[index];
    const previous = candles[index - 1];
    const highLow = current.high - current.low;
    const highClose = Math.abs(current.high - previous.close);
    const lowClose = Math.abs(current.low - previous.close);
    const trueRange = Math.max(highLow, highClose, lowClose);
    total += trueRange;
  }
  return total / period;
};

const HISTORY_COLLECTION = "agent_history";
const HISTORY_SAMPLE_LIMIT = 8;
type HistoryVerdict = "accurate" | "inaccurate" | "unknown";
type HistoryDocument = {
  userId: string;
  pair: string;
  timeframe: string;
  provider: string;
  decision: AgentResponse["decision"] | null;
  summary: string;
  response: AgentResponse;
  verdict: HistoryVerdict;
  feedback?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const buildHistoryInsightsForPrompt = async (
  userId: string,
  pair: string,
  timeframe: Timeframe,
  locale: Locale
) => {
  try {
    const db = await getMongoDb();
    const collection = db.collection<HistoryDocument>(HISTORY_COLLECTION);
    const match: Filter<HistoryDocument> = {
      userId,
      pair,
      $or: [
        { "decision.action": "buy" },
        { "decision.action": "sell" },
        { "response.decision.action": "buy" },
        { "response.decision.action": "sell" },
      ],
    };

    const docs = await collection
      .find(match)
      .sort({ createdAt: -1 })
      .limit(HISTORY_SAMPLE_LIMIT)
      .toArray();

    if (!docs.length) {
      return null;
    }

    const normalizedPair = formatPairLabel(pair);
    const dateFormatter = new Intl.DateTimeFormat(getLanguageTag(locale), {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });

    const buyCount = docs.filter((doc) => doc.decision?.action?.toLowerCase() === "buy" || doc.response.decision?.action?.toLowerCase() === "buy").length;
    const sellCount = docs.filter((doc) => doc.decision?.action?.toLowerCase() === "sell" || doc.response.decision?.action?.toLowerCase() === "sell").length;
    const verdictCounts = docs.reduce(
      (acc, doc) => {
        acc[doc.verdict] += 1;
        return acc;
      },
      { accurate: 0, inaccurate: 0, unknown: 0 } as Record<HistoryVerdict, number>
    );
    const observed = verdictCounts.accurate + verdictCounts.inaccurate;
    const successRate = observed > 0 ? Math.round((verdictCounts.accurate / observed) * 100) : null;

    const summaryLines = [
      tAgent(locale, "history.savedPlans", {
        total: docs.length,
        buy: buyCount,
        sell: sellCount,
      }),
      tAgent(locale, "history.verdictSummary", {
        accurate: verdictCounts.accurate,
        inaccurate: verdictCounts.inaccurate,
        pending: verdictCounts.unknown,
      }),
      successRate !== null
        ? tAgent(locale, "history.successRate", { value: `${successRate}%` })
        : tAgent(locale, "history.successRatePending"),
    ];

    const verdictLabel = (value: HistoryVerdict) =>
      tAgent(locale, `history.verdict.${value}`);

    const entryLines = docs.map((doc) => {
      const action = (doc.decision?.action ?? doc.response.decision?.action ?? "").toUpperCase() || "-";
      const createdAt = doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt);
      const dateLabel = Number.isNaN(createdAt.getTime()) ? "-" : dateFormatter.format(createdAt);
      const tf = doc.timeframe?.toUpperCase() ?? "-";
      const verdict = verdictLabel(doc.verdict);
      const feedbackSnippet = doc.feedback?.trim()
        ? excerpt(doc.feedback.trim(), 140)
        : tAgent(locale, "history.feedbackMissing");
      return `- ${dateLabel} | ${action} | TF ${tf} | ${verdict} | ${feedbackSnippet}`;
    });

    const header = tAgent(locale, "history.header", {
      pair: normalizedPair,
      timeframe: timeframe.toUpperCase(),
    });

    return [header, ...summaryLines, "", ...(entryLines.slice(0, HISTORY_SAMPLE_LIMIT))].join("\n");
  } catch (error) {
    console.error("Failed to build history insights", error);
    return null;
  }
};


const sanitizeChartPoints = (value: unknown): ChartPoint[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const map = item as Record<string, unknown>;
      const time = map.time;
      const close = map.close;
      if (typeof time !== "string") {
        return null;
      }
      const numericClose = ensureNumber(close);
      if (numericClose === null) {
        return null;
      }
      return { time, close: Number(numericClose.toFixed(2)) };
    })
    .filter((point): point is ChartPoint => Boolean(point));
};

const ensureNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const ensureNumericArray = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => ensureNumber(item))
    .filter((number): number is number => number !== null);
};

const ensureString = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim().length > 0 ? value : fallback;

const repairJsonString = (input: string) => {
  let inString = false;
  let result = "";

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const prev = input[i - 1];

    if (char === '"' && prev !== '\\') {
      inString = !inString;
      result += char;
      continue;
    }

    if (inString) {
      if (char === '\r') {
        if (input[i + 1] === '\n') {
          result += "\\n";
          i += 1;
        } else {
          result += "\\n";
        }
        continue;
      }
      if (char === '\n') {
        result += "\\n";
        continue;
      }
      if (char === '\t') {
        result += "\\t";
        continue;
      }
    }

    result += char;
  }

  return result;
};

const stripJsonComments = (input: string) => {
  let inString = false;
  let inSingleLineComment = false;
  let inMultiLineComment = false;
  let output = "";

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];
    const prev = input[i - 1];

    if (inSingleLineComment) {
      if (char === "\n") {
        inSingleLineComment = false;
        output += char;
      }
      continue;
    }

    if (inMultiLineComment) {
      if (char === "*" && next === "/") {
        inMultiLineComment = false;
        i += 1;
      }
      continue;
    }

    if (!inString && char === "/" && next === "/") {
      inSingleLineComment = true;
      i += 1;
      continue;
    }

    if (!inString && char === "/" && next === "*") {
      inMultiLineComment = true;
      i += 1;
      continue;
    }

    if (char === '"' && prev !== '\\') {
      inString = !inString;
    }

    output += char;
  }

  return output;
};

const stripTrailingCommas = (input: string) => {
  let inString = false;
  let output = "";

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const prev = input[i - 1];

    if (char === '"' && prev !== '\\') {
      inString = !inString;
      output += char;
      continue;
    }

    if (!inString && char === ',') {
      let j = i + 1;
      while (j < input.length) {
        const lookahead = input[j];
        if (lookahead === ' ' || lookahead === '\n' || lookahead === '\r' || lookahead === '\t') {
          j += 1;
          continue;
        }
        break;
      }

      const next = input[j];
      if (next === '}' || next === ']') {
        i = j - 1;
        continue;
      }
    }

    output += char;
  }

  return output;
};

const replaceLooseUndefined = (input: string) =>
  input
    .replace(/"([^"\\]*)"\s+undefined/gi, '"$1",')
    .replace(/:\s*undefined/gi, ": null");

const repairTruncatedFields = (input: string) =>
  input.replace(/":\s*"([^"\n]*?)\s+undefined/g, '": "$1"');

const autoCloseJson = (input: string) => {
  let output = input.trimEnd();

  while (output.endsWith(",")) {
    output = output.slice(0, -1).trimEnd();
  }

  let inString = false;
  let escapeNext = false;
  const stack: string[] = [];

  for (let i = 0; i < output.length; i += 1) {
    const char = output[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      stack.push('}');
      continue;
    }

    if (char === '[') {
      stack.push(']');
      continue;
    }

    if ((char === '}' || char === ']') && stack.length > 0) {
      const expected = stack[stack.length - 1];
      if (expected === char) {
        stack.pop();
      }
    }
  }

  if (inString) {
    output += '"';
  }

  if (stack.length === 0) {
    return output;
  }

  return `${output}${stack.reverse().join('')}`;
};

const ensureStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .slice(0, 12);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value
      .split(/\n|\r|ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢|\-/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  return [];
};

const buildMarketAnalytics = (
  candles: BinanceCandle[],
  timeframe: Timeframe,
  locale: Locale
) => {
  if (candles.length === 0) {
    return {
      chartPoints: [] as ChartPoint[],
      technical: [] as string[],
      chartNarrative: tAgent(locale, "marketAnalytics.missingNarrative"),
      chartForecast: tAgent(locale, "marketAnalytics.missingForecast"),
      promptSeries: "",
      changePct: null as number | null,
      volatilityPct: null as number | null,
      high: null as number | null,
      low: null as number | null,
      lastClose: null as number | null,
      atrPct: null as number | null,
      keyMetrics: [] as string[],
      analysisFocus: "",
    };
  }

  const trimmed = candles.slice(-120);
  const closes = trimmed.map((item) => item.close);
  const last = trimmed[trimmed.length - 1];
  const first = trimmed[0];
  const high = Math.max(...trimmed.map((item) => item.high));
  const low = Math.min(...trimmed.map((item) => item.low));
  const changePct = ((last.close - first.open) / first.open) * 100;
  const smaShortPeriod = Math.min(7, closes.length);
  const smaLongPeriod = Math.min(21, closes.length);
  const smaShort = calculateSMA(closes, smaShortPeriod);
  const smaLong = calculateSMA(closes, smaLongPeriod);
  const rsi = calculateRSI(trimmed);
  const volatilityRaw = calculateVolatility(closes.slice(-Math.min(30, closes.length)));
  const volatilityPct = volatilityRaw ? (volatilityRaw / last.close) * 100 : null;
  const atr = calculateATR(trimmed);
  const atrPct = atr ? (atr / last.close) * 100 : null;
  const chartPoints: ChartPoint[] = trimmed.slice(-60).map((item) => ({
    time: new Date(item.openTime).toISOString(),
    close: Number(item.close.toFixed(2)),
  }));

  const technical: string[] = [];
  if (typeof smaShort === "number" && typeof smaLong === "number") {
    technical.push(
      `SMA${smaShortPeriod}: ${smaShort.toFixed(2)} | SMA${smaLongPeriod}: ${smaLong.toFixed(2)}`
    );
    if (smaShort > smaLong) {
      technical.push(tAgent(locale, "marketAnalytics.bullishSma"));
    } else if (smaShort < smaLong) {
      technical.push(tAgent(locale, "marketAnalytics.bearishSma"));
    }
  }
  if (typeof rsi === "number") {
    technical.push(`RSI ${rsi.toFixed(1)}`);
  }
  if (typeof volatilityPct === "number") {
    technical.push(
      `${tAgent(locale, "marketAnalytics.volatilityLabel", {
        timeframe: timeframe.toUpperCase(),
      })}: ${volatilityPct.toFixed(2)}%`
    );
  }
  technical.push(
    `${tAgent(locale, "marketAnalytics.priceRangeLabel")}: ${low.toFixed(2)} - ${high.toFixed(2)}`
  );
  technical.push(
    `${tAgent(locale, "marketAnalytics.sessionChangeLabel")}: ${changePct.toFixed(2)}%`
  );
  if (typeof atr === "number" && typeof atrPct === "number") {
    technical.push(
      tAgent(locale, "marketAnalytics.atrLine", {
        value: atr.toFixed(2),
        percent: atrPct.toFixed(2),
      })
    );
  }

  const momentumLabel =
    changePct > 0
      ? tAgent(locale, "marketAnalytics.momentum.bullish")
      : changePct < 0
      ? tAgent(locale, "marketAnalytics.momentum.bearish")
      : tAgent(locale, "marketAnalytics.momentum.neutral");
  const smaRelationKey: "above" | "below" | "flat" =
    typeof smaShort === "number" && typeof smaLong === "number"
      ? smaShort > smaLong
        ? "above"
        : smaShort < smaLong
        ? "below"
        : "flat"
      : "flat";

  const volatilityBucket: "low" | "medium" | "high" | "unknown" = (() => {
    if (typeof atrPct !== "number" || Number.isNaN(atrPct)) {
      return "unknown";
    }
    if (atrPct < 1.2) {
      return "low";
    }
    if (atrPct < 2.5) {
      return "medium";
    }
    return "high";
  })();

  const volatilityDescriptor = tAgent(locale, `marketAnalytics.volatilityBucket.${volatilityBucket}`);
  if (volatilityDescriptor && !technical.includes(volatilityDescriptor)) {
    technical.push(volatilityDescriptor);
  }

  const smaDescriptor = tAgent(locale, `marketAnalytics.smaRelation.${smaRelationKey}`);

  const focusKey: "bullishBreakout" | "bearishBreakout" | "momentumLong" | "momentumShort" | "rangePlay" = (() => {
    if (typeof changePct !== "number" || Number.isNaN(changePct)) {
      return "rangePlay";
    }
    if (changePct >= 2.5) {
      return "bullishBreakout";
    }
    if (changePct <= -2.5) {
      return "bearishBreakout";
    }
    if (changePct >= 1.2 && (volatilityBucket === "medium" || volatilityBucket === "high")) {
      return "momentumLong";
    }
    if (changePct <= -1.2 && (volatilityBucket === "medium" || volatilityBucket === "high")) {
      return "momentumShort";
    }
    if (Math.abs(changePct) <= 0.7 && volatilityBucket === "low") {
      return "rangePlay";
    }
    return changePct >= 0 ? "momentumLong" : "momentumShort";
  })();

  const analysisFocus = tAgent(locale, `marketAnalytics.focus.${focusKey}`, {
    timeframe: timeframe.toUpperCase(),
  });

  const volatilityName = tAgent(locale, `marketAnalytics.volatilityBucketName.${volatilityBucket}`);
  const keyMetrics = [
    tAgent(locale, "marketAnalytics.keyMetrics.close", { value: last.close.toFixed(2) }),
    tAgent(locale, "marketAnalytics.keyMetrics.change", { value: changePct.toFixed(2) }),
    tAgent(locale, "marketAnalytics.keyMetrics.smaSignal", { value: smaDescriptor }),
  ];
  if (typeof atr === "number" && typeof atrPct === "number") {
    keyMetrics.push(
      tAgent(locale, "marketAnalytics.keyMetrics.atr", {
        value: atr.toFixed(2),
        percent: atrPct.toFixed(2),
      })
    );
  }
  keyMetrics.push(
    tAgent(locale, "marketAnalytics.keyMetrics.volatility", { value: volatilityName })
  );

  const chartNarrative = tAgent(locale, "marketAnalytics.chartNarrative", {
    timeframe: timeframe.toUpperCase(),
    momentum: momentumLabel,
    price: last.close.toFixed(2),
  });
  const chartForecast = changePct > 0
    ? tAgent(locale, "marketAnalytics.forecast.positive")
    : changePct < 0
    ? tAgent(locale, "marketAnalytics.forecast.negative")
    : tAgent(locale, "marketAnalytics.forecast.flat");

  const promptSeries = trimmed
    .slice(-60)
    .map(
      (item) =>
        `${new Date(item.openTime).toISOString()}|O:${item.open.toFixed(2)} H:${item.high.toFixed(2)} L:${item.low.toFixed(2)} C:${item.close.toFixed(2)} V:${item.volume.toFixed(2)}`
    )
    .join("\n");

  return {
    chartPoints,
    technical,
    chartNarrative,
    chartForecast,
    promptSeries,
    changePct,
    volatilityPct,
    atrPct,
    high,
    low,
    lastClose: last.close,
    keyMetrics,
    analysisFocus,
  };
};

const buildDefaultFundamentals = (summary: string, timeframe: Timeframe, locale: Locale) => {
  const lines = summary.split("\n").map((line) => line.trim()).filter(Boolean);
  const priceLine = lines.find((line) => {
    const lower = line.toLowerCase();
    return lower.includes("harga terakhir") || lower.includes("last price");
  });
  const changeLine = lines.find((line) => {
    const lower = line.toLowerCase();
    return lower.includes("perubahan") || lower.includes("change");
  });
  const volumeLine = lines.find((line) => line.toLowerCase().includes("volume"));

  const fundamentals = [
    priceLine ?? tAgent(locale, "fundamentals.priceUnavailable"),
    changeLine ?? tAgent(locale, "fundamentals.changeUnavailable"),
  ];

  if (volumeLine) {
    fundamentals.push(volumeLine);
  }

  fundamentals.push(
    tAgent(locale, "fundamentals.macroReminder", { timeframe: timeframe.toUpperCase() })
  );

  return fundamentals;
};


const buildUserMessage = (
  params: {
    objective: string;
    dataMode: DataMode;
    urls: string[];
    manualNotes: string;
    datasetName?: string;
    datasetPreview: string;
    marketSummary: string;
    timeframe: Timeframe;
    historyInsights?: string | null;
    marketAnalytics: {
      promptSeries: string;
      technical: string[];
      chartNarrative: string;
      chartForecast: string;
      keyMetrics: string[];
      analysisFocus: string;
    };
    tavilySearch: TavilySearchData | null;
    tavilyArticles: TavilyExtractedArticle[];
    pairSymbol: string;
  },
  locale: Locale
) => {
  const formattedPair = formatPairLabel(params.pairSymbol);
  const placeholders = {
    urls: tAgent(locale, "userPrompt.placeholders.urls"),
    dataset: tAgent(locale, "userPrompt.placeholders.dataset"),
    manual: tAgent(locale, "userPrompt.placeholders.manual"),
    technical: tAgent(locale, "userPrompt.placeholders.technical"),
    tavilySummary: tAgent(locale, "userPrompt.placeholders.tavilySummary"),
    tavilyResults: tAgent(locale, "userPrompt.placeholders.tavilyResults"),
    tavilyArticles: tAgent(locale, "userPrompt.placeholders.tavilyArticles"),
    promptSeries: tAgent(locale, "userPrompt.placeholders.promptSeries"),
    history: tAgent(locale, "userPrompt.placeholders.history"),
    unknownDataset: tAgent(locale, "userPrompt.placeholders.unknownDataset"),
    datasetPreviewLabel: tAgent(locale, "userPrompt.placeholders.datasetPreviewLabel"),
    keyMetrics: tAgent(locale, "userPrompt.placeholders.keyMetrics"),
    analysisFocus: tAgent(locale, "userPrompt.placeholders.analysisFocus"),
  } as const;

  const dataModeMap: Record<DataMode, string> = {
    scrape: tAgent(locale, "userPrompt.dataMode.scrape"),
    upload: tAgent(locale, "userPrompt.dataMode.upload"),
    manual: tAgent(locale, "userPrompt.dataMode.manual"),
  };

  const urlList = params.urls.length
    ? params.urls.map((url, index) => `${index + 1}. ${url}`).join("\n")
    : placeholders.urls;

  const datasetBlock = params.datasetPreview
    ? `${tAgent(locale, "userPrompt.datasetNameLabel")}: ${
        params.datasetName ?? placeholders.unknownDataset
      }\n${placeholders.datasetPreviewLabel}:\n${excerpt(params.datasetPreview, 2000)}`
    : placeholders.dataset;

  const historyBlock = params.historyInsights?.trim().length
    ? params.historyInsights
    : placeholders.history;

  const manualBlock = params.manualNotes
    ? excerpt(params.manualNotes, 1600)
    : placeholders.manual;

  const technicalBlock = params.marketAnalytics.technical.length
    ? params.marketAnalytics.technical.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : placeholders.technical;

  const keyMetricsBlock = params.marketAnalytics.keyMetrics.length
    ? params.marketAnalytics.keyMetrics
        .map((item, index) => `${index + 1}. ${item}`)
        .join("\n")
    : placeholders.keyMetrics;

  const analysisFocusBlock = params.marketAnalytics.analysisFocus
    ? params.marketAnalytics.analysisFocus
    : placeholders.analysisFocus;

  const tavilyAnswer = params.tavilySearch?.answer
    ? excerpt(params.tavilySearch.answer, 800)
    : placeholders.tavilySummary;

  const tavilyResultsBlock = params.tavilySearch?.results?.length
    ? params.tavilySearch.results
        .map((result, index) => {
          const parts = [
            `${index + 1}. ${result.title}${
              typeof result.score === "number" && Number.isFinite(result.score)
                ? ` (score: ${result.score.toFixed(2)})`
                : ""
            }`,
            result.url
              ? `   ${tAgent(locale, "userPrompt.tavily.urlLabel")}: ${result.url}`
              : null,
            result.publishedDate
              ? `   ${tAgent(locale, "userPrompt.tavily.publishedLabel")}: ${result.publishedDate}`
              : null,
            result.content
              ? `   ${tAgent(locale, "userPrompt.tavily.summaryLabel")}: ${excerpt(
                  result.content,
                  320
                )}`
              : null,
          ];
          return parts.filter(Boolean).join("\n");
        })
        .join("\n\n")
    : placeholders.tavilyResults;

  const tavilyArticlesBlock = params.tavilyArticles.length
    ? params.tavilyArticles
        .map((article, index) => {
          const parts = [
            `${index + 1}. ${article.title}`,
            article.url
              ? `   ${tAgent(locale, "userPrompt.tavily.urlLabel")}: ${article.url}`
              : null,
            article.publishedDate
              ? `   ${tAgent(locale, "userPrompt.tavily.publishedLabel")}: ${article.publishedDate}`
              : null,
            article.content
              ? `   ${tAgent(locale, "userPrompt.tavily.excerptLabel")}: ${excerpt(
                  article.content,
                  320
                )}`
              : article.rawContent
              ? `   ${tAgent(locale, "userPrompt.tavily.rawExcerptLabel")}: ${excerpt(
                  article.rawContent,
                  320
                )}`
              : null,
          ];
          return parts.filter(Boolean).join("\n");
        })
        .join("\n\n")
    : placeholders.tavilyArticles;

  const labels = {
    objective: tAgent(locale, "userPrompt.labels.objective"),
    dataMode: tAgent(locale, "userPrompt.labels.dataMode"),
    urls: tAgent(locale, "userPrompt.labels.urls"),
    manual: tAgent(locale, "userPrompt.labels.manual"),
    dataset: tAgent(locale, "userPrompt.labels.dataset"),
    history: tAgent(locale, "userPrompt.labels.history"),
    pair: tAgent(locale, "userPrompt.labels.pair"),
    timeframe: tAgent(locale, "userPrompt.labels.timeframe"),
    summary: tAgent(locale, "userPrompt.labels.summary", { pair: formattedPair }),
    keyMetrics: tAgent(locale, "userPrompt.labels.keyMetrics"),
    analysisFocus: tAgent(locale, "userPrompt.labels.analysisFocus"),
    narrative: tAgent(locale, "userPrompt.labels.narrative"),
    forecast: tAgent(locale, "userPrompt.labels.forecast"),
    promptSeries: tAgent(locale, "userPrompt.labels.promptSeries"),
    technical: tAgent(locale, "userPrompt.labels.technical"),
    tavilySummary: tAgent(locale, "userPrompt.labels.tavilySummary"),
    tavilyResults: tAgent(locale, "userPrompt.labels.tavilyResults"),
    tavilyArticles: tAgent(locale, "userPrompt.labels.tavilyArticles"),
    instructions: tAgent(locale, "userPrompt.labels.instructions"),
  } as const;

  const instructions = tAgent(locale, "userPrompt.instructions", {
    pair: formattedPair,
    timeframe: params.timeframe.toUpperCase(),
  })
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  const lines = [
    `${labels.objective}: ${params.objective}`,
    "",
    `${labels.dataMode}: ${dataModeMap[params.dataMode] ?? params.dataMode}`,
    "",
    `${labels.urls}:`,
    urlList,
    "",
    `${labels.manual}:`,
    manualBlock,
    "",
    `${labels.dataset}:`,
    datasetBlock,
    "",
    `${labels.history}:`,
    historyBlock,
    "",
    `${labels.pair}: ${formattedPair} (${params.pairSymbol})`,
    `${labels.timeframe}: ${params.timeframe.toUpperCase()}`,
    "",
    `${labels.summary}:`,
    params.marketSummary,
    "",
    `${labels.keyMetrics}:`,
    keyMetricsBlock,
    "",
    `${labels.analysisFocus}:`,
    analysisFocusBlock,
    "",
    `${labels.narrative}:`,
    params.marketAnalytics.chartNarrative,
    "",
    `${labels.forecast}:`,
    params.marketAnalytics.chartForecast,
    "",
    `${labels.promptSeries}:`,
    params.marketAnalytics.promptSeries || placeholders.promptSeries,
    "",
    `${labels.technical}:`,
    technicalBlock,
    "",
    `${labels.tavilySummary}:`,
    tavilyAnswer,
    "",
    `${labels.tavilyResults}:`,
    tavilyResultsBlock,
    "",
    `${labels.tavilyArticles}:`,
    tavilyArticlesBlock,
    "",
    `${labels.instructions}:`,
    ...instructions.map((item) => `- ${item}`),
  ];

  return lines.join("\n");
};

const buildSystemPrompt = (locale: Locale) => {
  const languageReminder = tAgent(locale, "systemPrompt.languageReminder");
  const coreGuidelines = tAgent(locale, "systemPrompt.coreGuidelines");
  const exampleBlock = tAgent(locale, "systemPrompt.example");

  return `You are SWIMM (Soon You Will Make Money), a crypto markets analyst.
Always reply with valid JSON only. ${languageReminder}
${coreGuidelines ? `\n${coreGuidelines}` : ""}
Schema:
{
  "summary": string,
  "decision": {
    "action": "buy" | "sell" | "hold",
    "confidence": number (0-1),
    "timeframe": string,
    "rationale": string
  },
  "market": {
    "pair": string,
    "chart": {
      "interval": string,
      "points": Array<{ "time": string, "close": number }>,
      "narrative": string,
      "forecast": string
    },
    "technical": string[],
    "fundamental": string[]
  },
  "tradePlan": {
    "bias": "long" | "short" | "neutral",
    "entries": number[],
    "entry": number | null,
    "stopLoss": number | null,
    "takeProfits": number[],
    "executionWindow": string,
    "sizingNotes": string,
    "rationale": string
  },
  "highlights": string[],
  "nextSteps": string[]
}${exampleBlock ? `\n\n${exampleBlock}` : ""}`;
};

const stripCodeFences = (content: string) => {
  const trimmed = content.trim();
  if (trimmed.startsWith("```")) {
    const fenceEnd = trimmed.lastIndexOf("```\n");
    if (fenceEnd !== -1) {
      return trimmed.slice(trimmed.indexOf("\n") + 1, fenceEnd).trim();
    }
    return trimmed.replace(/```[a-zA-Z]*|```/g, "").trim();
  }
  return trimmed;
};

const stripArrayField = (input: string, fieldName: string) => {
  const key = `"${fieldName}"`;
  let searchStart = 0;
  let output = input;

  while (searchStart < output.length) {
    const keyIndex = output.indexOf(key, searchStart);
    if (keyIndex === -1) {
      break;
    }

    let cursor = keyIndex + key.length;
    while (cursor < output.length && /\s/.test(output[cursor])) {
      cursor += 1;
    }
    if (output[cursor] !== ':') {
      searchStart = cursor;
      continue;
    }
    cursor += 1;
    while (cursor < output.length && /\s/.test(output[cursor])) {
      cursor += 1;
    }
    if (output[cursor] !== '[') {
      searchStart = cursor;
      continue;
    }

    let inString = false;
    let depth = 0;
    const startBracket = cursor;

    for (; cursor < output.length; cursor += 1) {
      const char = output[cursor];
      const prev = output[cursor - 1];

      if (char === '"' && prev !== '\\') {
        inString = !inString;
        continue;
      }
      if (inString) {
        continue;
      }
      if (char === '[') {
        depth += 1;
        continue;
      }
      if (char === ']') {
        depth -= 1;
        if (depth === 0) {
          const endBracket = cursor;
          output =
            output.slice(0, startBracket) +
            '[]' +
            output.slice(endBracket + 1);
          searchStart = startBracket + 2;
          break;
        }
      }
    }

    if (depth !== 0) {
      break;
    }
  }

  return output;
};

const parseModelPayload = (content: string) => {
  const cleaned = stripCodeFences(content);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Response does not contain JSON object");
  }

  const originalJsonString = cleaned.slice(start, end + 1);
  const normalizedJsonString = repairJsonString(originalJsonString);
  const withoutComments = stripJsonComments(normalizedJsonString);
  const withoutTrailingCommas = stripTrailingCommas(withoutComments);
  const withoutLooseUndefined = replaceLooseUndefined(withoutTrailingCommas);
  const repairedFields = repairTruncatedFields(withoutLooseUndefined);
  const sanitizedSource = autoCloseJson(repairedFields);
  const jsonString = sanitizedSource;
  try {
    return JSON5.parse(jsonString) as Partial<AgentPayload>;
  } catch (error) {
    const repaired = repairJsonString(jsonString);
    if (repaired !== jsonString) {
      try {
        return JSON5.parse(repaired) as Partial<AgentPayload>;
      } catch (secondaryError) {
        const secondaryMessage =
          secondaryError instanceof Error
            ? secondaryError.message
            : String(secondaryError ?? "unknown error");
        console.warn("Sentient JSON parse (after repair) failed", secondaryMessage);
        const stripped = stripArrayField(repaired, "points");
        if (stripped !== repaired) {
          try {
            return JSON5.parse(stripped) as Partial<AgentPayload>;
          } catch (tertiaryError) {
            const tertiaryMessage =
              tertiaryError instanceof Error
                ? tertiaryError.message
                : String(tertiaryError ?? "unknown error");
            console.warn("Sentient JSON parse (after strip) failed", tertiaryMessage);
          }
        }
      }
    }

    const strippedOriginal = stripArrayField(jsonString, "points");
    if (strippedOriginal !== jsonString) {
      try {
        return JSON5.parse(strippedOriginal) as Partial<AgentPayload>;
      } catch (tertiaryError) {
        const tertiaryMessage =
          tertiaryError instanceof Error
            ? tertiaryError.message
            : String(tertiaryError ?? "unknown error");
        console.warn("Sentient JSON parse (original strip) failed", tertiaryMessage);
      }
    }

    const message = error instanceof Error ? error.message : String(error ?? "unknown error");
    console.warn(
      "Sentient JSON parse failed",
      message,
      jsonString.slice(0, 400),
      jsonString === originalJsonString ? undefined : originalJsonString.slice(0, 400)
    );
    return { highlights: ["PARSE_WARNING: " + message] } as Partial<AgentPayload>;
  }
};

const buildTradePlan = (
  draft: Partial<TradePlan> | undefined,
  action: AgentDecision,
  marketSupport: {
    context: MarketContext;
    analytics: ReturnType<typeof buildMarketAnalytics>;
  },
  locale: Locale
): TradePlan => {
  const biasDraft = typeof draft?.bias === "string" ? draft.bias.toLowerCase() : null;
  const bias: "long" | "short" | "neutral" =
    biasDraft === "long" || biasDraft === "short" || biasDraft === "neutral"
      ? biasDraft
      : action === "buy"
      ? "long"
      : action === "sell"
      ? "short"
      : "neutral";

  const sizingNotesDefaultHold = tAgent(locale, "tradePlan.holdSizingNotes");

  if (action === "hold") {
    return {
      bias,
      entries: [],
      entry: null,
      stopLoss: null,
      takeProfits: [],
      executionWindow: ensureString(draft?.executionWindow, "-"),
      sizingNotes: ensureString(draft?.sizingNotes, sizingNotesDefaultHold),
      rationale: ensureString(
        draft?.rationale,
        tAgent(locale, "tradePlan.holdRationale")
      ),
    };
  }

  const entryArrayCandidate = ensureNumericArray((draft as Record<string, unknown>)?.entries);
  const entryCandidate = ensureNumber(draft?.entry);
  const marketPrice =
    (typeof marketSupport.context.lastPrice === "number" && marketSupport.context.lastPrice > 0
      ? marketSupport.context.lastPrice
      : marketSupport.analytics.lastClose) ?? null;

  const primaryEntry =
    entryCandidate ?? entryArrayCandidate[0] ?? (marketPrice !== null ? marketPrice : null);
  const normalizedPrimary =
    primaryEntry !== null ? Number(primaryEntry.toFixed(2)) : null;

  const fallbackEntries = normalizedPrimary !== null
    ? action === "buy"
      ? [Number((normalizedPrimary * 0.985).toFixed(2)), normalizedPrimary]
      : action === "sell"
      ? [normalizedPrimary, Number((normalizedPrimary * 1.015).toFixed(2))]
      : [normalizedPrimary]
    : [];

  const entries = (entryArrayCandidate.length
    ? entryArrayCandidate.map((value) => Number(value.toFixed(2)))
    : fallbackEntries
  ).slice(0, 4);

  const stopLossCandidate = ensureNumber(draft?.stopLoss);
  const fallbackStopLoss = normalizedPrimary !== null
    ? action === "buy"
      ? Number((normalizedPrimary * 0.96).toFixed(2))
      : action === "sell"
      ? Number((normalizedPrimary * 1.04).toFixed(2))
      : null
    : null;
  const stopLoss =
    stopLossCandidate !== null ? Number(stopLossCandidate.toFixed(2)) : fallbackStopLoss;

  const takeProfitCandidate = ensureNumericArray(draft?.takeProfits);
  const fallbackTakeProfits = normalizedPrimary !== null
    ? action === "buy"
      ? [1.02, 1.035, 1.05, 1.065, 1.08].map((multiplier) => normalizedPrimary * multiplier)
      : action === "sell"
      ? [0.98, 0.965, 0.95, 0.935, 0.92].map((multiplier) => normalizedPrimary * multiplier)
      : []
    : [];
  const takeProfits = (takeProfitCandidate.length ? takeProfitCandidate : fallbackTakeProfits)
    .map((value) => Number(value.toFixed(2)))
    .filter((value, index, array) => Number.isFinite(value) && array.indexOf(value) === index)
    .slice(0, 5);

  const executionWindow = ensureString(
    draft?.executionWindow,
    `${new Date().toISOString()} - ${new Date(Date.now() + 60 * 60 * 1000).toISOString()}`
  );

  const sizingNotesDefault =
    bias === "long"
      ? tAgent(locale, "tradePlan.sizingNotes.long")
      : bias === "short"
      ? tAgent(locale, "tradePlan.sizingNotes.short")
      : tAgent(locale, "tradePlan.sizingNotes.neutral");

  return {
    bias,
    entries,
    entry: entries[0] ?? normalizedPrimary,
    stopLoss,
    takeProfits,
    executionWindow,
    sizingNotes: ensureString(draft?.sizingNotes, sizingNotesDefault),
    rationale: ensureString(
      draft?.rationale,
      tAgent(locale, "tradePlan.rationaleFallback")
    ),
  };
};

const buildAgentPayload = (
  draft: Partial<AgentPayload>,
  objective: string,
  preferredTimeframe: Timeframe,
  marketSupport: {
    context: MarketContext;
    analytics: ReturnType<typeof buildMarketAnalytics>;
    summary: string;
  },
  locale: Locale
): AgentPayload => {
  const decision: Partial<AgentPayload["decision"]> = draft.decision ?? {};

  const action = ((): AgentDecision => {
    const actionRaw = decision.action as string | undefined;
    if (actionRaw === "buy" || actionRaw === "sell" || actionRaw === "hold") {
      return actionRaw;
    }
    if (typeof actionRaw === "string") {
      const lower = actionRaw.toLowerCase();
      if (lower.includes("buy")) {
        return "buy";
      }
      if (lower.includes("sell") || lower.includes("short")) {
        return "sell";
      }
    }
    return "hold";
  })();

  const confidenceRaw = typeof decision.confidence === "number" ? decision.confidence : 0.62;
  const timeframe =
    typeof decision.timeframe === "string" && decision.timeframe.trim().length > 0
      ? decision.timeframe
      : pickFallbackTimeframe(objective);
  const rationale = ensureString(
    decision.rationale,
    tAgent(locale, "payload.rationaleMissing")
  );

  const summary = ensureString(
    draft.summary,
    tAgent(locale, "payload.summaryMissing")
  );

  const baseHighlights = ensureStringArray(draft.highlights);
  const nextSteps = ensureStringArray(draft.nextSteps);

  const marketDraft: Partial<AgentPayload["market"]> = draft.market ?? {};
  const chartDraft: Partial<AgentPayload["market"]["chart"]> =
    (marketDraft as Record<string, unknown>).chart ?? {};
  const chartPoints = sanitizeChartPoints((chartDraft as Record<string, unknown>).points);
  const chartInterval = ensureString(
    (chartDraft as Record<string, unknown>).interval,
    marketSupport.context.interval
  );

  const tradePlan = buildTradePlan(draft.tradePlan, action, marketSupport, locale);

  const technical = ensureStringArray((marketDraft as Record<string, unknown>).technical);
  const fundamental = ensureStringArray((marketDraft as Record<string, unknown>).fundamental);
  const supportiveHighlights = baseHighlights.slice(0, 12);

  return {
    summary,
    decision: {
      action,
      confidence: clamp(confidenceRaw, 0, 1),
      timeframe,
      rationale,
    },
    highlights: supportiveHighlights,
    nextSteps: (() => {
      if (nextSteps.length) {
        return nextSteps;
      }
      return tAgent(locale, "payload.nextStepsDefault")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
    })(),
    market: {
      pair: marketSupport.context.symbol,
      chart: {
        interval: chartInterval,
        points: chartPoints.length ? chartPoints : marketSupport.analytics.chartPoints,
        narrative: ensureString(
          (chartDraft as Record<string, unknown>).narrative,
          marketSupport.analytics.chartNarrative
        ),
        forecast: ensureString(
          (chartDraft as Record<string, unknown>).forecast,
          marketSupport.analytics.chartForecast
        ),
      },
      technical: technical.length ? technical : marketSupport.analytics.technical,
      fundamental: fundamental.length
        ? fundamental
        : buildDefaultFundamentals(marketSupport.summary, preferredTimeframe, locale),
    },
    tradePlan,
  };
};

export async function POST(request: Request) {
  let body: AgentRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: tAgent("en", "errors.invalidJson") },
      { status: 400 }
    );
  }

  const locale: Locale =
    typeof body.locale === "string" && isLocale(body.locale) ? body.locale : "en";

  if (!body.objective || body.objective.trim().length === 0) {
    return NextResponse.json(
      { error: tAgent(locale, "errors.objectiveRequired") },
      { status: 400 }
    );
  }

  const objective = body.objective.trim();

  const session = await getSessionFromCookie();
  const settings = session ? await getUserSettings(session.userId) : null;

  const binanceAuth = settings?.binanceApiKey ? { apiKey: settings.binanceApiKey } : undefined;
  const bybitAuth = settings?.bybitApiKey ? { apiKey: settings.bybitApiKey } : undefined;

  const providerParam = typeof body.provider === "string" ? body.provider.toLowerCase() : DEFAULT_PROVIDER;
  const provider: CexProvider = isCexProvider(providerParam) ? providerParam : DEFAULT_PROVIDER;
  const modeParam = typeof body.mode === "string" ? body.mode.toLowerCase() : DEFAULT_MARKET_MODE;
  const mode: MarketMode = isMarketMode(modeParam) ? modeParam : DEFAULT_MARKET_MODE;

  const requestedSymbol = (() => {
    const explicit = body.pairSymbol?.toUpperCase();
    if (explicit && explicit.trim().length > 0) {
      return explicit;
    }
    if (provider === "bybit") {
      return mode === "futures"
        ? process.env.BYBIT_FUTURES_SYMBOL ?? process.env.BYBIT_SYMBOL ?? "BTCUSDT"
        : process.env.BYBIT_SYMBOL ?? "BTCUSDT";
    }
    return "BTCUSDT";
  })();

  const providerLabel = translate(locale, `market.summary.providerLabel.${provider}`);
  const isSupportedSymbol = provider === "bybit"
    ? await isBybitPairTradable(requestedSymbol, mode)
    : await isPairTradable(requestedSymbol, binanceAuth, mode);
  if (!isSupportedSymbol) {
    return NextResponse.json(
      {
        error: translate(locale, "agent.errors.unsupportedSymbol", {
          symbol: requestedSymbol,
          provider: providerLabel,
        }),
      },
      { status: 400 }
    );
  }

  const symbol = requestedSymbol;

  const urls = Array.isArray(body.urls)
    ? body.urls.filter((url) => typeof url === "string" && url.trim().length > 0)
    : [];
  const manualNotes = body.manualNotes?.trim() ?? "";
  const datasetPreview = body.datasetPreview?.trim() ?? "";
  const dataMode = body.dataMode ?? "scrape";
  const timeframe = normalizeTimeframe(body.timeframe);

  const historyInsightsPromise = session
    ? buildHistoryInsightsForPrompt(session.userId, symbol, timeframe, locale)
    : Promise.resolve(null);

  const tavilySearchPromise: Promise<TavilySearchData | null> =
    objective.length > 0
      ? fetchTavilySearch(objective, { maxResults: 6 })
      : Promise.resolve(null);
  const tavilyExtractPromise: Promise<TavilyExtractedArticle[]> =
    dataMode === "scrape" && urls.length > 0
      ? fetchTavilyExtract(urls)
      : Promise.resolve([] as TavilyExtractedArticle[]);

  const apiKey = process.env.FIREWORKS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: tAgent(locale, "errors.missingApiKey") },
      { status: 500 }
    );
  }

  const [[summaryData, candles], tavilySearch, tavilyArticles, historyInsights] = await Promise.all([
    (provider === "bybit"
      ? Promise.all([
          fetchBybitMarketSummary(symbol, bybitAuth, mode),
          fetchBybitCandles(
            symbol,
            timeframe,
            { limit: 500 },
            bybitAuth,
            mode
          ),
        ])
      : Promise.all([
          fetchBinanceMarketSummary(symbol, binanceAuth, mode),
          fetchBinanceCandles(
            symbol,
            CEX_INTERVAL_MAP[timeframe],
            { limit: 500 },
            binanceAuth,
            mode
          ),
        ])),
    tavilySearchPromise,
    tavilyExtractPromise,
    historyInsightsPromise,
  ]);
  const resolvedSymbol = summaryData?.symbol ?? symbol;
  const marketSummary =
    provider === "bybit"
      ? formatBybitSummary(summaryData, locale, mode)
      : formatBinanceSummary(summaryData, locale, mode);
  const marketAnalytics = buildMarketAnalytics(candles, timeframe, locale);
  const resolvedLastPrice =
    (typeof marketAnalytics.lastClose === "number" && marketAnalytics.lastClose > 0
      ? marketAnalytics.lastClose
      : undefined) ?? (summaryData?.lastPrice && summaryData.lastPrice > 0 ? summaryData.lastPrice : 0);
  const marketContext: MarketContext = {
    symbol: resolvedSymbol,
    timeframe,
    interval:
      provider === "bybit"
        ? mapTimeframeToBybitIntervalSymbol(timeframe)
        : CEX_INTERVAL_MAP[timeframe],
    candles,
    lastPrice: resolvedLastPrice,
    mode,
  };

  const marketSupport = {
    context: marketContext,
    analytics: marketAnalytics,
    summary: marketSummary,
  } as const;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const response = await fetch(FIREWORKS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.FIREWORKS_MODEL ?? DEFAULT_FIREWORKS_MODEL,
        temperature: 0.15,
        max_tokens: 1_000,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(locale),
          },
          {
            role: "user",
            content: buildUserMessage({
              objective,
              dataMode,
              urls,
              manualNotes,
              datasetName: body.datasetName,
              datasetPreview,
              marketSummary,
              timeframe,
              historyInsights,
              marketAnalytics: {
                promptSeries: marketAnalytics.promptSeries,
                technical: marketAnalytics.technical,
                chartNarrative: marketAnalytics.chartNarrative,
                chartForecast: marketAnalytics.chartForecast,
                keyMetrics: marketAnalytics.keyMetrics,
                analysisFocus: marketAnalytics.analysisFocus,
              },
              tavilySearch,
              tavilyArticles,
              pairSymbol: marketSupport.context.symbol,
            }, locale),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `Sentient Models error (${response.status}): ${errorText || response.statusText}`
      );
    }

    const result = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error(tAgent(locale, "errors.missingContent"));
    }

    const draft = parseModelPayload(content);
    const payload = buildAgentPayload(draft, objective, timeframe, marketSupport, locale);

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? tAgent(locale, "errors.timeout")
        : error instanceof Error
        ? error.message
        : tAgent(locale, "errors.generic");

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
