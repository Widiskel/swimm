import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import type { AgentResponse } from "@/features/analysis/types";
import { DEFAULT_PROVIDER, isCexProvider } from "@/features/market/exchanges";
import { getMongoDb } from "@/lib/mongodb";
import { getSessionFromCookie, toSessionResponse } from "@/lib/session";

const HISTORY_COLLECTION = "agent_history";
const MAX_FEEDBACK_LENGTH = 2000;
const ALLOWED_VERDICTS = new Set(["accurate", "inaccurate", "unknown"] as const);

type Verdict = "accurate" | "inaccurate" | "unknown";

type HistoryDocument = {
  _id?: ObjectId;
  sessionId: string;
  userId: string;
  pair: string;
  timeframe: string;
  provider: string;
  decision: AgentResponse["decision"] | null;
  summary: string;
  response: AgentResponse;
  verdict: Verdict;
  feedback?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type HistoryResponseItem = {
  id: string;
  session: ReturnType<typeof toSessionResponse>;
  pair: string;
  timeframe: string;
  provider: string;
  decision: AgentResponse["decision"] | null;
  summary: string;
  response: AgentResponse;
  verdict: Verdict;
  feedback?: string | null;
  createdAt: string;
  updatedAt: string;
};

const buildError = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

const mapHistoryDoc = (
  doc: HistoryDocument,
  sessionData: ReturnType<typeof toSessionResponse>
): HistoryResponseItem => ({
  id: doc._id ? doc._id.toHexString() : `${doc.sessionId}-${doc.createdAt.getTime()}`,
  session: sessionData,
  pair: doc.pair,
  timeframe: doc.timeframe,
  provider: doc.provider,
  decision: doc.decision,
  summary: doc.summary,
  response: doc.response,
  verdict: doc.verdict,
  feedback: doc.feedback ?? null,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

type SanitizedHistoryPayload =
  | { error: string }
  | {
      pair: string;
      timeframe: string;
      provider: string;
      response: AgentResponse;
      verdict: Verdict;
      feedback: string | null;
    };

const sanitizePayload = (payload: unknown): SanitizedHistoryPayload => {
  if (!payload || typeof payload !== "object") {
    return { error: "Payload must be an object." };
  }

  const {
    pair,
    timeframe,
    provider,
    response,
    verdict,
    feedback,
  } = payload as {
    pair?: string;
    timeframe?: string;
    provider?: string;
    response?: AgentResponse;
    verdict?: string;
    feedback?: string;
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
  if (!verdict || !ALLOWED_VERDICTS.has(verdict as Verdict)) {
    return { error: "Verdict must be one of: accurate, inaccurate, unknown." };
  }

  const normalizedProvider = isCexProvider(provider ?? null) ? provider! : DEFAULT_PROVIDER;
  const sanitizedFeedback = feedback?.toString().slice(0, MAX_FEEDBACK_LENGTH) ?? null;

  return {
    pair: pair.trim().toUpperCase(),
    timeframe: timeframe.trim(),
    provider: normalizedProvider,
    response,
    verdict: verdict as Verdict,
    feedback: sanitizedFeedback,
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
      decision: validated.response.decision ?? null,
      summary: validated.response.summary ?? "",
      response: validated.response,
      verdict: validated.verdict,
      feedback: validated.feedback,
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


