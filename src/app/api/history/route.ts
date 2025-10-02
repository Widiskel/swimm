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
  updatedAt: Date;\n  snapshot?: {\n    timeframe: string;\n    at: Date;\n    candles: Array<{ openTime: number; open: number; high: number; low: number; close: number; volume?: number; closeTime?: number }>;\n  } | null;
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
  updatedAt: string;\n  snapshot?: {\n    timeframe: string;\n    at: string;\n    candles: Array<{ openTime: number; open: number; high: number; low: number; close: number; volume?: number; closeTime?: number }>;\n  } | null;
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
  updatedAt: doc.updatedAt.toISOString(),\n  snapshot: doc.snapshot ? { timeframe: doc.snapshot.timeframe, at: doc.snapshot.at.toISOString(), candles: doc.snapshot.candles } : null,
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
    \n      snapshot?: {\n        timeframe: string;\n        at: string;\n        candles: Array<{ openTime: number; open: number; high: number; low: number; close: number; volume?: number; closeTime?: number }>;\n      };\n    };

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
  } = payload as {\n    pair?: string;\n    timeframe?: string;\n    provider?: string;\n    response?: AgentResponse;\n    verdict?: string;\n    feedback?: string;\n    snapshot?: { timeframe: string; at: string; candles: Array<{ openTime: number; open: number; high: number; low: number; close: number; volume?: number; closeTime?: number }> };\n  };

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
    feedback: sanitizedFeedback,\n    snapshot: (payload as any).snapshot && typeof (payload as any).snapshot === "object" ? {\n      timeframe: String((payload as any).snapshot.timeframe ?? timeframe).trim(),\n      at: new Date(String((payload as any).snapshot.at ?? new Date())).toISOString(),\n      candles: Array.isArray((payload as any).snapshot.candles) ? (payload as any).snapshot.candles.map((k: any) => ({\n        openTime: Number(k.openTime ?? 0), open: Number(k.open ?? 0), high: Number(k.high ?? 0), low: Number(k.low ?? 0), close: Number(k.close ?? 0), volume: Number(k.volume ?? 0), closeTime: Number(k.closeTime ?? k.openTime ?? 0)\n      })) : []\n    } : undefined,
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
      response: validated.response,\n      snapshot: (validated as any).snapshot ? { timeframe: (validated as any).snapshot.timeframe, at: new Date((validated as any).snapshot.at), candles: (validated as any).snapshot.candles } : null,
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


