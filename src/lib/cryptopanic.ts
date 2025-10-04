const API_ENDPOINT = "https://cryptopanic.com/api/developer/v2/posts/";
const SENSITIVE_QUERY_PARAMS = new Set([
  "auth_token",
  "api_key",
  "apikey",
  "token",
  "key",
]);
const RESPONSE_SNIPPET_LENGTH = 300;

export type CryptoPanicItem = {
  id: number;
  title: string;
  url: string;
  published_at: string;
  source?: {
    domain?: string;
    title?: string;
  };
};

export type CryptoHeadline = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
};

type CryptoPanicResponse = {
  results?: CryptoPanicItem[];
  error?: string;
};

const formatSource = (item: CryptoPanicItem) =>
  item.source?.title?.trim() || item.source?.domain?.trim() || "CryptoPanic";

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
        const publishedRaw = item.published_at ?? new Date().toISOString();
        let publishedAt: string;
        try {
          publishedAt = new Date(publishedRaw).toISOString();
        } catch {
          publishedAt = new Date().toISOString();
        }
        return {
          title: item.title?.trim() ?? "",
          url: item.url?.trim() ?? "",
          source: formatSource(item),
          publishedAt,
        };
      })
      .filter((item) => item.title && item.url);

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
