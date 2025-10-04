const API_ENDPOINT = "https://cryptopanic.com/api/developer/v2/posts/";
const SENSITIVE_QUERY_PARAMS = new Set([
  "auth_token",
  "api_key",
  "apikey",
  "token",
  "key",
]);
const RESPONSE_SNIPPET_LENGTH = 300;

type CryptoPanicVotes = {
  negative?: number | null;
  positive?: number | null;
  important?: number | null;
  liked?: number | null;
  disliked?: number | null;
  lol?: number | null;
  toxic?: number | null;
  saved?: number | null;
  comments?: number | null;
};

export type CryptoSentimentLabel = "bullish" | "neutral" | "bearish";

export type CryptoHeadlineVotes = {
  positive: number;
  negative: number;
  important: number;
  liked: number;
  disliked: number;
  lol: number;
  toxic: number;
  saved: number;
  comments: number;
};

export type CryptoPanicItem = {
  id: number;
  title: string;
  url?: string | null;
  original_url?: string | null;
  slug?: string | null;
  description?: string | null;
  published_at?: string | null;
  created_at?: string | null;
  domain?: string | null;
  image?: string | null;
  panic_score?: number | null;
  panic_score_1h?: number | null;
  votes?: CryptoPanicVotes | null;
  author?: string | null;
  source?: {
    domain?: string | null;
    title?: string | null;
    region?: string | null;
    type?: string | null;
  } | null;
};

export type CryptoHeadline = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  description: string | null;
  originalUrl: string | null;
  image: string | null;
  author: string | null;
  sentimentScore: number | null;
  sentimentLabel: CryptoSentimentLabel;
  panicScore1h: number | null;
  votes: CryptoHeadlineVotes | null;
};

type CryptoPanicResponse = {
  results?: CryptoPanicItem[];
  error?: string;
};

const formatSource = (item: CryptoPanicItem) =>
  item.source?.title?.trim() ||
  item.source?.domain?.trim() ||
  item.domain?.trim() ||
  "CryptoPanic";

const toFiniteNumber = (value: unknown): number | null => {
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

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const normalizeVotes = (votes: CryptoPanicVotes | null | undefined): CryptoHeadlineVotes | null => {
  if (!votes || typeof votes !== "object") {
    return null;
  }
  const map = (value: unknown) => toFiniteNumber(value) ?? 0;
  const normalized: CryptoHeadlineVotes = {
    positive: map(votes.positive),
    negative: map(votes.negative),
    important: map(votes.important),
    liked: map(votes.liked),
    disliked: map(votes.disliked),
    lol: map(votes.lol),
    toxic: map(votes.toxic),
    saved: map(votes.saved),
    comments: map(votes.comments),
  };
  const total = Object.values(normalized).reduce((sum, value) => sum + value, 0);
  return total > 0 ? normalized : normalized;
};

const deriveSentimentFromVotes = (votes: CryptoHeadlineVotes | null): number | null => {
  if (!votes) {
    return null;
  }
  const totalDirectional = votes.positive + votes.negative;
  if (totalDirectional <= 0) {
    return null;
  }
  const delta = votes.positive - votes.negative;
  const normalized = ((delta / totalDirectional) + 1) / 2 * 100;
  return clampScore(normalized);
};

const mapSentimentLabel = (score: number | null): CryptoSentimentLabel => {
  if (score === null) {
    return "neutral";
  }
  if (score >= 66) {
    return "bullish";
  }
  if (score <= 33) {
    return "bearish";
  }
  return "neutral";
};

const resolveSentiment = (
  item: CryptoPanicItem,
  votes: CryptoHeadlineVotes | null
): { score: number | null; label: CryptoSentimentLabel; panicScore1h: number | null } => {
  const panicScoreRaw = toFiniteNumber(item.panic_score);
  if (panicScoreRaw !== null) {
    const score = clampScore(panicScoreRaw);
    const panicScore1h = (() => {
      const value = toFiniteNumber(item.panic_score_1h);
      return value !== null ? clampScore(value) : null;
    })();
    return { score, label: mapSentimentLabel(score), panicScore1h };
  }

  const derivedScore = deriveSentimentFromVotes(votes);
  const panicScore1h = (() => {
    const value = toFiniteNumber(item.panic_score_1h);
    return value !== null ? clampScore(value) : null;
  })();
  if (derivedScore !== null) {
    return { score: derivedScore, label: mapSentimentLabel(derivedScore), panicScore1h };
  }

  return { score: null, label: "neutral", panicScore1h };
};

const resolveNewsUrl = (item: CryptoPanicItem) => {
  const originalUrl = item.original_url?.trim();
  if (originalUrl) {
    return originalUrl;
  }
  const directUrl = item.url?.trim();
  if (directUrl) {
    return directUrl;
  }
  const slug = item.slug?.trim();
  if (slug) {
    return `https://cryptopanic.com/news/${slug}`;
  }
  if (typeof item.id === "number" && Number.isFinite(item.id)) {
    return `https://cryptopanic.com/a/${item.id}`;
  }
  return "";
};

export async function fetchCryptoPanicHeadlines(
  rawCurrency: string,
  limit = 5
): Promise<{ headlines: CryptoHeadline[]; limited: boolean }> {
  const apiKey = process.env.CRYPTOPANIC_API_KEY?.trim();
  const currency = rawCurrency?.trim().toUpperCase();
  if (!apiKey || !currency) {
    return { headlines: [], limited: false };
  }

  const url = new URL(API_ENDPOINT);
  url.searchParams.set("auth_token", apiKey);
  url.searchParams.set("currencies", currency);
  url.searchParams.set("kind", "news");
  url.searchParams.set("metadata", "true");
  url.searchParams.set("public", "true");

  const redactedUrl = (() => {
    const clone = new URL(url);
    clone.searchParams.forEach((value, key) => {
      if (SENSITIVE_QUERY_PARAMS.has(key.toLowerCase())) {
        clone.searchParams.set(key, "***");
      }
    });
    return clone.toString();
  })();

  try {
    console.log(`[CryptoPanic] Request ${redactedUrl}`);

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const responseSnippet = await response
      .clone()
      .text()
      .then((text) => text.slice(0, RESPONSE_SNIPPET_LENGTH))
      .catch(() => "");
    console.log(
      `[CryptoPanic] Response ${response.status} ${response.statusText} ${responseSnippet}`
    );

    if (response.status === 429) {
      return { headlines: [], limited: true };
    }

    if (!response.ok) {
      console.warn(
        "CryptoPanic request failed",
        response.status,
        await response.text().catch(() => "")
      );
      return { headlines: [], limited: false };
    }

    const payload = (await response.json()) as CryptoPanicResponse;
    const results = Array.isArray(payload.results) ? payload.results : [];

    const headlines = results
      .slice(0, limit)
      .map((item) => {
        const title = item.title?.trim();
        const url = resolveNewsUrl(item);
        if (!title || !url) {
          return null;
        }
        const votes = normalizeVotes(item.votes);
        const sentiment = resolveSentiment(item, votes);
        const publishedRaw = item.published_at ?? item.created_at ?? new Date().toISOString();
        let publishedAt: string;
        try {
          publishedAt = new Date(publishedRaw).toISOString();
        } catch {
          publishedAt = new Date().toISOString();
        }
        return {
          title,
          url,
          source: formatSource(item),
          publishedAt,
          description: item.description?.trim() || null,
          originalUrl: item.original_url?.trim() || null,
          image: item.image?.trim() || null,
          author: item.author?.trim() || null,
          sentimentScore: sentiment.score,
          sentimentLabel: sentiment.label,
          panicScore1h: sentiment.panicScore1h,
          votes,
        } satisfies CryptoHeadline;
      })
      .filter((item): item is CryptoHeadline => Boolean(item));

    return { headlines, limited: false };
  } catch (error) {
    console.error("Failed to fetch CryptoPanic headlines", error);
    return { headlines: [], limited: false };
  }
}

export const isCryptoSymbol = (symbol: string | null | undefined) => {
  if (!symbol) {
    return false;
  }
  const upper = symbol.trim().toUpperCase();
  return upper.length >= 2 && upper.length <= 10 && /^[A-Z0-9]+$/.test(upper);
};
