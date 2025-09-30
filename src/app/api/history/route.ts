import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import type { AgentResponse } from "@/features/analysis/types";
import { DEFAULT_PROVIDER, isCexProvider } from "@/features/market/exchanges";
import {
  DEFAULT_MARKET_MODE,
  isMarketMode,
  type MarketMode,
} from "@/features/market/constants";
import { getMongoDb } from "@/lib/mongodb";
import { getSessionFromCookie, toSessionResponse } from "@/lib/session";

export const HISTORY_COLLECTION = "agent_history";
export const MAX_FEEDBACK_LENGTH = 2000;
export const ALLOWED_VERDICTS = new Set(["accurate", "inaccurate", "unknown"] as const);

export type Verdict = "accurate" | "inaccurate" | "unknown";

export type HistoryDocument = {
  _id?: ObjectId;
  sessionId: string;
  userId: string;
  pair: string;
  timeframe: string;
  provider: string;
  mode?: MarketMode;
  decision: AgentResponse["decision"] | null;
  summary: string;
  response: AgentResponse;
  verdict: Verdict;
  feedback?: string | null;
  executed?: boolean | null;
  createdAt: Date;
  updatedAt: Date;
};

export type HistoryResponseItem = {
  id: string;
  sessionId: string;
  session: ReturnType<typeof toSessionResponse>;
  pair: string;
  timeframe: string;
  provider: string;
  mode: MarketMode;
  decision: AgentResponse["decision"] | null;
  summary: string;
  response: AgentResponse;
  verdict: Verdict;
  feedback?: string | null;
  executed: boolean | null;
  createdAt: string;
  updatedAt: string;
};

export const buildError = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export const mapHistoryDoc = (
  doc: HistoryDocument,
  sessionData: ReturnType<typeof toSessionResponse>
): HistoryResponseItem => ({
  id: doc._id ? doc._id.toHexString() : `${doc.sessionId}-${doc.createdAt.getTime()}`,
  sessionId: doc.sessionId,
  session: sessionData,
  pair: doc.pair,
  timeframe: doc.timeframe,
  provider: doc.provider,
  mode: isMarketMode(doc.mode) ? doc.mode : DEFAULT_MARKET_MODE,
  decision: doc.decision,
  summary: doc.summary,
  response: doc.response,
  verdict: doc.verdict,
  feedback: doc.feedback ?? null,
  executed: typeof doc.executed === "boolean" ? doc.executed : null,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

type SanitizedHistoryPayload =
  | { error: string }
  | {
      pair: string;
      timeframe: string;
      provider: string;
      mode: MarketMode;
      response: AgentResponse;
      verdict: Verdict;
      feedback: string | null;
      executed: boolean | null;
    };

const sanitizePayload = (payload: unknown): SanitizedHistoryPayload => {
  if (!payload || typeof payload !== "object") {
    return { error: "Payload must be an object." };
  }

  const {
    pair,
    timeframe,
    provider,
    mode,
    response,
    verdict,
    feedback,
    executed,
  } = payload as {
    pair?: string;
    timeframe?: string;
    provider?: string;
    mode?: string;
    response?: AgentResponse;
    verdict?: string;
    feedback?: string;
    executed?: unknown;
  };

  if (!pair || typeof pair !== "string") {
    return { error: "Pair is required." };
  }
  if (!timeframe || typeof timeframe !== "string") {
    return { error: "Timeframe is required." };
  }
  if (!response || typeof response !== "object") {
    return { error: "Agent response is required." };
  }
  const normalizedProvider = isCexProvider(provider ?? null) ? provider! : DEFAULT_PROVIDER;
  const normalizedMode = isMarketMode(mode ?? null) ? (mode as MarketMode) : DEFAULT_MARKET_MODE;
  const normalizedVerdict = ALLOWED_VERDICTS.has((verdict ?? "unknown") as Verdict)
    ? ((verdict ?? "unknown") as Verdict)
    : "unknown";
  const sanitizedFeedback = feedback?.toString().slice(0, MAX_FEEDBACK_LENGTH) ?? null;
  const normalizedExecuted =
    typeof executed === "boolean"
      ? executed
      : typeof executed === "string"
      ? executed.toLowerCase() === "true"
        ? true
        : executed.toLowerCase() === "false"
        ? false
        : null
      : null;

  return {
    pair: pair.trim().toUpperCase(),
    timeframe: timeframe.trim(),
    provider: normalizedProvider,
    mode: normalizedMode,
    response,
    verdict: normalizedVerdict,
    feedback: sanitizedFeedback,
    executed: normalizedExecuted,
  };
};

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ entries: [], session: null });
    }

    const db = await getMongoDb();
    const collection = db.collection<HistoryDocument>(HISTORY_COLLECTION);
    const docs = await collection
      .find({ userId: session.userId })
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    const sessionData = toSessionResponse(session);
    const entries = docs.map((doc) => mapHistoryDoc(doc, sessionData));

    return NextResponse.json({ entries, session: sessionData });
  } catch (error) {
    console.error("Failed to load history", error);
    return buildError("Unable to load history.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return buildError("Session required.", 401);
    }

    const json = await request.json().catch(() => null);
    const validated = sanitizePayload(json);
    if ("error" in validated) {
      return buildError(validated.error);
    }

    const decisionAction = (validated.response.decision?.action ?? "").toLowerCase();
    if (decisionAction !== "buy" && decisionAction !== "sell") {
      return buildError("Only buy or sell signals can be saved.", 422);
    }

    const db = await getMongoDb();
    const collection = db.collection<HistoryDocument>(HISTORY_COLLECTION);
    const now = new Date();

    const doc: HistoryDocument = {
      sessionId: session.sessionId,
      userId: session.userId,
      pair: validated.pair,
      timeframe: validated.timeframe,
      provider: validated.provider,
      mode: validated.mode,
      decision: validated.response.decision ?? null,
      summary: validated.response.summary ?? "",
      response: validated.response,
      verdict: validated.verdict,
      feedback: validated.feedback,
      executed: validated.executed ?? null,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(doc);
    const stored: HistoryDocument = {
      ...doc,
      _id: result.insertedId,
    };

    const sessionData = toSessionResponse(session);
    return NextResponse.json({ entry: mapHistoryDoc(stored, sessionData) }, { status: 201 });
  } catch (error) {
    console.error("Failed to save history entry", error);
    return buildError("Unable to save history entry.", 500);
  }
}

export async function DELETE() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return buildError("Session required.", 401);
    }

    const db = await getMongoDb();
    const collection = db.collection<HistoryDocument>(HISTORY_COLLECTION);
    await collection.deleteMany({ userId: session.userId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to clear history", error);
    return buildError("Unable to clear history.", 500);
  }
}
