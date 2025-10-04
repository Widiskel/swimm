export type DataMode = "scrape" | "upload" | "manual";

export type ChartPoint = {
  time: string;
  close: number;
};

export type AgentResponse = {
  summary: string;
  decision: {
    action: "buy" | "sell" | "hold";
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
  tradePlan: {
    bias: "long" | "short" | "neutral";
    entries: number[];
    entry: number | null;
    stopLoss: number | null;
    takeProfits: number[];
    executionWindow: string;
    sizingNotes: string;
    rationale: string;
  };
  newsHeadlines?: Array<{
    title: string;
    url: string;
    source: string;
    publishedAt: string;
    description?: string | null;
    originalUrl?: string | null;
    image?: string | null;
    author?: string | null;
    sentimentScore?: number | null;
    sentimentLabel?: "bullish" | "neutral" | "bearish";
    panicScore1h?: number | null;
    votes?: {
      positive: number;
      negative: number;
      important: number;
      liked: number;
      disliked: number;
      lol: number;
      toxic: number;
      saved: number;
      comments: number;
    } | null;
  }>;
  newsRateLimited?: boolean;
};
