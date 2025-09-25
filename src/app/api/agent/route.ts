import { NextResponse } from "next/server";
import JSON5 from "json5";
import {
  fetchBinanceCandles,
  fetchBinanceMarketSummary,
  formatBinanceSummary,
  type BinanceCandle,
} from "@/lib/binance";
import {
  fetchTavilyExtract,
  fetchTavilySearch,
  type TavilyExtractedArticle,
  type TavilySearchData,
} from "@/lib/tavily";

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

const TIMEFRAME_TO_INTERVAL: Record<Timeframe, string> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  "4h": "4h",
  "1d": "1d",
};

const ALLOWED_SYMBOLS = new Set(["BTCUSDT", "ETHUSDT", "SOLUSDT", "HYPEUSDT"]);

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

const buildMarketAnalytics = (candles: BinanceCandle[], timeframe: Timeframe) => {
  if (candles.length === 0) {
    return {
      chartPoints: [] as ChartPoint[],
      technical: [] as string[],
      chartNarrative: "Data candle tidak tersedia.",
      chartForecast: "Tidak dapat melakukan forecasting tanpa data harga.",
      promptSeries: "",
      changePct: null as number | null,
      volatilityPct: null as number | null,
      high: null as number | null,
      low: null as number | null,
      lastClose: null as number | null,
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
      technical.push("Sinyal bullish: SMA cepat di atas SMA lambat.");
    } else if (smaShort < smaLong) {
      technical.push("Sinyal bearish: SMA cepat di bawah SMA lambat.");
    }
  }
  if (typeof rsi === "number") {
    technical.push(`RSI ${rsi.toFixed(1)}`);
  }
  if (typeof volatilityPct === "number") {
    technical.push(`Volatilitas ${timeframe.toUpperCase()}: ${volatilityPct.toFixed(2)}%`);
  }
  technical.push(`Rentang harga: ${low.toFixed(2)} - ${high.toFixed(2)}`);
  technical.push(`Perubahan sejak awal sesi: ${changePct.toFixed(2)}%`);

  const momentumLabel = changePct > 0 ? "bullish" : changePct < 0 ? "bearish" : "netral";
  const chartNarrative = `Harga ${timeframe.toUpperCase()} bergerak ${momentumLabel} dengan close terakhir ${last.close.toFixed(2)} USDT.`;
  const chartForecast =
    changePct > 0
      ? "Momentum positif mendominasi; waspadai konsolidasi sebelum kelanjutan tren."
      : changePct < 0
      ? "Tekanan jual masih terasa; butuh katalis positif untuk reversal."
      : "Pergerakan datar; tunggu breakout untuk konfirmasi arah berikutnya.";

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
    high,
    low,
    lastClose: last.close,
  };
};

const buildDefaultFundamentals = (summary: string, timeframe: Timeframe) => {
  const lines = summary.split("\n").map((line) => line.trim()).filter(Boolean);
  const priceLine = lines.find((line) => line.toLowerCase().includes("harga terakhir"));
  const changeLine = lines.find((line) => line.toLowerCase().includes("perubahan"));
  const volumeLine = lines.find((line) => line.toLowerCase().includes("volume"));

  const fundamentals = [
    priceLine ?? "Harga terakhir dari Binance tidak tersedia.",
    changeLine ?? "Perubahan 24 jam belum terhitung.",
  ];

  if (volumeLine) {
    fundamentals.push(volumeLine);
  }

  fundamentals.push(
    `Sinkronkan strategi ${timeframe.toUpperCase()} dengan agenda makro & on-chain terbaru sebelum eksekusi.`
  );

  return fundamentals;
};

const buildUserMessage = (params: {
  objective: string;
  dataMode: DataMode;
  urls: string[];
  manualNotes: string;
  datasetName?: string;
  datasetPreview: string;
  marketSummary: string;
  timeframe: Timeframe;
  marketAnalytics: {
    promptSeries: string;
    technical: string[];
    chartNarrative: string;
    chartForecast: string;
  };
  tavilySearch: TavilySearchData | null;
  tavilyArticles: TavilyExtractedArticle[];
  pairSymbol: string;
}) => {
  const formattedPair = formatPairLabel(params.pairSymbol);

  const urlList = params.urls.length
    ? params.urls.map((url, index) => `${index + 1}. ${url}`).join("\n")
    : "(Tidak ada URL yang diberikan)";

  const datasetBlock = params.datasetPreview
    ? `Nama Dataset: ${params.datasetName ?? "Tidak diketahui"}\nIsi (dipangkas):\n${excerpt(
        params.datasetPreview,
        2000
      )}`
    : "(Tidak ada dataset yang diunggah)";

  const manualBlock = params.manualNotes
    ? excerpt(params.manualNotes, 1600)
    : "(Tidak ada catatan manual)";

  const technicalBlock = params.marketAnalytics.technical.length
    ? params.marketAnalytics.technical.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "(Tidak ada ringkasan teknikal)";

  const tavilyAnswer = params.tavilySearch?.answer
    ? excerpt(params.tavilySearch.answer, 800)
    : "(Tidak ada ringkasan Tavily)";

  const tavilyResultsBlock = params.tavilySearch?.results?.length
    ? params.tavilySearch.results
        .map((result, index) => {
          const parts = [
            `${index + 1}. ${result.title}${
              typeof result.score === "number" && Number.isFinite(result.score)
                ? ` (score: ${result.score.toFixed(2)})`
                : ""
            }`,
            result.url ? `   URL: ${result.url}` : null,
            result.publishedDate ? `   Tanggal: ${result.publishedDate}` : null,
            result.content ? `   Ringkasan: ${excerpt(result.content, 320)}` : null,
          ];
          return parts.filter(Boolean).join("\n");
        })
        .join("\n\n")
    : "(Tidak ada hasil pencarian Tavily)";

  const tavilyArticlesBlock = params.tavilyArticles.length
    ? params.tavilyArticles
        .map((article, index) => {
          const parts = [
            `${index + 1}. ${article.title}`,
            article.url ? `   URL: ${article.url}` : null,
            article.publishedDate ? `   Tanggal: ${article.publishedDate}` : null,
            article.content
              ? `   Kutipan: ${excerpt(article.content, 320)}`
              : article.rawContent
              ? `   Kutipan (raw): ${excerpt(article.rawContent, 320)}`
              : null,
          ];
          return parts.filter(Boolean).join("\n");
        })
        .join("\n\n")
    : "(Tidak ada konten URL yang diekstrak Tavily)";

    return `Analysis objective (EN): ${params.objective}
Tujuan analisa (ID): ${params.objective}

Active data mode (EN): ${params.dataMode}
Mode sumber data (ID): ${params.dataMode}

News URLs (EN):
${urlList}
Daftar URL berita (ID):
${urlList}

Manual notes (EN):
${manualBlock}
Catatan manual (ID):
${manualBlock}

Custom dataset (EN):
${datasetBlock}
Dataset kustom (ID):
${datasetBlock}

Pair under analysis (EN):
${formattedPair} (${params.pairSymbol})
Pair yang dianalisis (ID):
${formattedPair} (${params.pairSymbol})

Target timeframe (EN):
${params.timeframe.toUpperCase()}
Timeframe target (ID):
${params.timeframe.toUpperCase()}

Binance market data for ${formattedPair} (EN):
${params.marketSummary}
Data pasar Binance untuk ${formattedPair} (ID):
${params.marketSummary}

Price narrative (EN):
${params.marketAnalytics.chartNarrative}
Narasi harga (ID):
${params.marketAnalytics.chartNarrative}

Internal forecast (EN):
${params.marketAnalytics.chartForecast}
Forecast internal (ID):
${params.marketAnalytics.chartForecast}

Candle data (ISO|O/H/L/C/V) (EN):
${params.marketAnalytics.promptSeries || "(No candle data)"}
Data candle (ISO|O/H/L/C/V) (ID):
${params.marketAnalytics.promptSeries || "(Data candle tidak tersedia)"}

Technical snapshot (EN):
${technicalBlock}
Ringkasan teknikal (ID):
${technicalBlock}

Tavily summary (EN):
${tavilyAnswer}
Ringkasan Tavily (ID):
${tavilyAnswer}

Tavily search results (EN):
${tavilyResultsBlock}
Hasil pencarian Tavily (ID):
${tavilyResultsBlock}

Tavily article extracts (EN):
${tavilyArticlesBlock}
Konten URL Tavily (ID):
${tavilyArticlesBlock}

Instructions (EN):
- Perform sentiment, news, and market analysis for ${formattedPair}; surface tradable insights.
- Produce base / bullish / bearish price scenarios for ${formattedPair} on timeframe ${params.timeframe.toUpperCase()}.
- Supply supporting technical & fundamental notes plus a risk-aware execution plan (entries, targets, stop, sizing).
- Respond with JSON only, English text first followed by Indonesian translation in each field.

Instruksi (ID):
- Lakukan analisa sentimen, berita, dan pasar untuk ${formattedPair}; tampilkan insight yang dapat dieksekusi.
- Sajikan skenario harga dasar / bullish / bearish untuk ${formattedPair} pada timeframe ${params.timeframe.toUpperCase()}.
- Lengkapi catatan teknikal & fundamental serta rencana eksekusi yang memperhatikan risiko (entry, target, stop, sizing).
- Jawab dalam JSON saja dengan teks Bahasa Inggris terlebih dahulu lalu terjemahan Bahasa Indonesia pada setiap field.`;
};

const buildSystemPrompt = () => `You are SWIMM (Soon You Will Make Money), a bilingual crypto markets analyst.
Always reply with valid JSON only.
Each string must contain English text first, followed by the Indonesian translation separated by " // ".
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
}`;

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
  const sanitizedSource = stripTrailingCommas(stripJsonComments(normalizedJsonString));
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
        console.warn("Fireworks JSON parse (after repair) failed", secondaryMessage);
        const stripped = stripArrayField(repaired, "points");
        if (stripped !== repaired) {
          try {
            return JSON5.parse(stripped) as Partial<AgentPayload>;
          } catch (tertiaryError) {
            const tertiaryMessage =
              tertiaryError instanceof Error
                ? tertiaryError.message
                : String(tertiaryError ?? "unknown error");
            console.warn("Fireworks JSON parse (after strip) failed", tertiaryMessage);
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
        console.warn("Fireworks JSON parse (original strip) failed", tertiaryMessage);
      }
    }

    const message = error instanceof Error ? error.message : String(error ?? "unknown error");
    console.warn(
      "Fireworks JSON parse failed",
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
  }
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

  const sizingNotesDefaultHold =
    "Tidak ada rencana eksekusi. Tunggu konfirmasi tambahan sebelum membuka posisi.";

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
        "Momentum belum jelas. Evaluasi ulang setelah harga menembus area kunci."
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
      ? "Risiko per posisi disarankan <= 2% dari ekuitas; gunakan position sizing bertahap."
      : bias === "short"
      ? "Pastikan modal siap untuk short dan lindungi dengan ukuran posisi konservatif."
      : "Tahan eksekusi sampai sinyal tambahan mengkonfirmasi arah.";

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
      "Validasi trade setup dengan order flow dan berita makro sebelum eksekusi."
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
  }
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
    "Model tidak memberikan rasionalisasi. Tambahkan detail objektif untuk analisa lanjutan."
  );

  const summary = ensureString(
    draft.summary,
    "Analisa tidak berhasil dibuat. Coba jalankan ulang agent dengan data yang lebih lengkap."
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

  const tradePlan = buildTradePlan(draft.tradePlan, action, marketSupport);

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
    nextSteps: nextSteps.length
      ? nextSteps
      : [
          "Validasi rencana trading dengan chart real-time dan order book.",
          "Perbarui data berita / on-chain, lalu jalankan ulang agent bila perlu.",
        ],
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
        : buildDefaultFundamentals(marketSupport.summary, preferredTimeframe),
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
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  if (!body.objective || body.objective.trim().length === 0) {
    return NextResponse.json(
      { error: "Objective analisa wajib diisi." },
      { status: 400 }
    );
  }

  const objective = body.objective.trim();

  const requestedSymbol = body.pairSymbol?.toUpperCase() ?? process.env.BINANCE_SYMBOL ?? "BTCUSDT";
  if (!ALLOWED_SYMBOLS.has(requestedSymbol)) {
    return NextResponse.json(
      { error: "Pair tidak didukung. Pilih salah satu dari BTCUSDT, ETHUSDT, SOLUSDT, HYPEUSDT." },
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
      { error: "Fireworks API key belum dikonfigurasi." },
      { status: 500 }
    );
  }

  const [[summaryData, candles], tavilySearch, tavilyArticles] = await Promise.all([
    Promise.all([
      fetchBinanceMarketSummary(symbol),
      fetchBinanceCandles(symbol, TIMEFRAME_TO_INTERVAL[timeframe], 500),
    ]),
    tavilySearchPromise,
    tavilyExtractPromise,
  ]);
  const resolvedSymbol = summaryData?.symbol ?? symbol;
  const marketSummary = formatBinanceSummary(summaryData);
  const marketAnalytics = buildMarketAnalytics(candles, timeframe);
  const resolvedLastPrice =
    (typeof marketAnalytics.lastClose === "number" && marketAnalytics.lastClose > 0
      ? marketAnalytics.lastClose
      : undefined) ?? (summaryData?.lastPrice && summaryData.lastPrice > 0 ? summaryData.lastPrice : 0);
  const marketContext: MarketContext = {
    symbol: resolvedSymbol,
    timeframe,
    interval: TIMEFRAME_TO_INTERVAL[timeframe],
    candles,
    lastPrice: resolvedLastPrice,
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
        temperature: 0.25,
        max_tokens: 1_000,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(),
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
              marketAnalytics: {
                promptSeries: marketAnalytics.promptSeries,
                technical: marketAnalytics.technical,
                chartNarrative: marketAnalytics.chartNarrative,
                chartForecast: marketAnalytics.chartForecast,
              },
              tavilySearch,
              tavilyArticles,
              pairSymbol: marketSupport.context.symbol,
            }),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `Fireworks API error (${response.status}): ${errorText || response.statusText}`
      );
    }

    const result = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Fireworks API tidak mengembalikan konten.");
    }

    const draft = parseModelPayload(content);
    const payload = buildAgentPayload(draft, objective, timeframe, marketSupport);

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Permintaan ke Fireworks melewati batas waktu."
        : error instanceof Error
        ? error.message
        : "Integrasi Fireworks gagal.";

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
