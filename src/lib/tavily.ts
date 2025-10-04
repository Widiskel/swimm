const TAVILY_SEARCH_URL = "https://api.tavily.com/search";
const TAVILY_EXTRACT_URL = "https://api.tavily.com/extract";
const RESPONSE_SNIPPET_LENGTH = 300;

const toStringOrUndefined = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

const toNumberOrNull = (value: unknown) => {
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

export type TavilySearchResult = {
  title: string;
  url: string;
  content: string;
  score: number | null;
  publishedDate?: string;
};

export type TavilySearchData = {
  answer: string | null;
  query: string;
  results: TavilySearchResult[];
};

export type TavilyExtractedArticle = {
  url: string;
  title: string;
  content: string;
  rawContent?: string;
  publishedDate?: string;
};

const sanitizeSearchResult = (raw: unknown): TavilySearchResult | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const map = raw as Record<string, unknown>;
  const url = toStringOrUndefined(map.url);
  const title = toStringOrUndefined(map.title) ?? url ?? "Tavily result";
  const content = toStringOrUndefined(map.content) ?? "";
  if (!url && !content) {
    return null;
  }
  return {
    title,
    url: url ?? "",
    content,
    score: toNumberOrNull(map.score),
    publishedDate: toStringOrUndefined(map.published_date),
  };
};

const sanitizeExtractResult = (raw: unknown): TavilyExtractedArticle | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const map = raw as Record<string, unknown>;
  const url = toStringOrUndefined(map.url);
  const content = toStringOrUndefined(map.content) ?? toStringOrUndefined(map.raw_content);
  if (!url && !content) {
    return null;
  }
  return {
    url: url ?? "",
    title: toStringOrUndefined(map.title) ?? url ?? "Tavily article",
    content: content ?? "",
    rawContent: toStringOrUndefined(map.raw_content),
    publishedDate: toStringOrUndefined(map.published_date),
  };
};

const getApiKey = () => {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    return null;
  }
  return apiKey.trim();
};

export const fetchTavilySearch = async (
  query: string,
  options: {
    maxResults?: number;
    searchDepth?: "basic" | "advanced";
  } = {}
): Promise<TavilySearchData | null> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return null;
  }

  try {
    const payload = {
      api_key: apiKey,
      query: trimmedQuery,
      search_depth: options.searchDepth ?? "advanced",
      max_results: options.maxResults ?? 6,
      include_answer: true,
      include_raw_content: true,
    };

    console.log("[Tavily] Request", {
      url: TAVILY_SEARCH_URL,
      body: { ...payload, api_key: "***" },
    });

    const response = await fetch(TAVILY_SEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responseSnippet = await response
      .clone()
      .text()
      .then((text) => text.slice(0, RESPONSE_SNIPPET_LENGTH))
      .catch(() => "");
    console.log(
      `[Tavily] Response ${response.status} ${response.statusText} ${responseSnippet}`
    );

    if (!response.ok) {
      console.error("Failed to fetch Tavily search", response.status, response.statusText);
      return null;
    }

    const searchPayload = (await response.json()) as Record<string, unknown>;
    const results = Array.isArray(searchPayload.results)
      ? searchPayload.results
          .map((item) => sanitizeSearchResult(item))
          .filter((item): item is TavilySearchResult => Boolean(item))
      : [];

    return {
      answer: toStringOrUndefined(searchPayload.answer) ?? null,
      query: trimmedQuery,
      results,
    };
  } catch (error) {
    console.error("Tavily search request failed", error);
    return null;
  }
};

export const fetchTavilyExtract = async (
  urls: string[],
  options: { maxUrls?: number } = {}
): Promise<TavilyExtractedArticle[]> => {
  const apiKey = getApiKey();
  if (!apiKey || urls.length === 0) {
    return [];
  }

  const sanitizedUrls = urls
    .map((url) => url.trim())
    .filter((url) => url.length > 0)
    .slice(0, options.maxUrls ?? 5);

  if (sanitizedUrls.length === 0) {
    return [];
  }

  try {
    const payload = {
      api_key: apiKey,
      urls: sanitizedUrls,
      include_images: false,
      include_html: false,
      include_links: false,
      include_raw_content: true,
    };

    console.log("[Tavily] Extract Request", {
      url: TAVILY_EXTRACT_URL,
      body: { ...payload, api_key: "***" },
    });

    const response = await fetch(TAVILY_EXTRACT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responseSnippet = await response
      .clone()
      .text()
      .then((text) => text.slice(0, RESPONSE_SNIPPET_LENGTH))
      .catch(() => "");
    console.log(
      `[Tavily] Extract Response ${response.status} ${response.statusText} ${responseSnippet}`
    );

    if (!response.ok) {
      console.error("Failed to extract Tavily content", response.status, response.statusText);
      return [];
    }

    const extractPayload = (await response.json()) as Record<string, unknown>;
    const results = Array.isArray(extractPayload.results)
      ? extractPayload.results
          .map((item) => sanitizeExtractResult(item))
          .filter((item): item is TavilyExtractedArticle => Boolean(item))
      : [];

    return results;
  } catch (error) {
    console.error("Tavily extract request failed", error);
    return [];
  }
};
