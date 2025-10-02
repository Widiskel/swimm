import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import type { AgentResponse } from "@/features/analysis/types";
import type {
  HistorySnapshot,
  HistorySnapshotCandle,
  HistoryVerdict,
} from "@/features/history/types";
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
export const ALLOWED_VERDICTS = new Set<HistoryVerdict>([
  "accurate",
  "inaccurate",
  "unknown",
]);

const SNAPSHOT_MAX_CANDLES = 240;

type HistorySnapshotDocument = {
  timeframe: string;
  capturedAt: Date;
  candles: HistorySnapshotCandle[];
};

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
  verdict: HistoryVerdict;
  feedback?: string | null;
  executed?: boolean | null;
  snapshot?: HistorySnapshotDocument | null;
  createdAt: Date;
  updatedAt: Date;\n  snapshot?: {timeframe: string;at: Date;candles: Array<{ openTime: number; open: number; high: number; low: number; close: number; volume?: number; closeTime?: number }>;\n  } | null;
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
  verdict: HistoryVerdict;
  feedback?: string | null;
  executed: boolean | null;
  snapshot: HistorySnapshot | null;
  createdAt: string;
  updatedAt: string;\n  snapshot?: {timeframe: string;at: string;candles: Array<{ openTime: number; open: number; high: number; low: number; close: number; volume?: number; closeTime?: number }>;\n  } | null;
};

export const buildError = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export const mapHistoryDoc = (
  doc: HistoryDocument,
  sessionData: ReturnType<typeof toSessionResponse>
): HistoryResponseItem => ({
  id: doc._id
    ? doc._id.toHexString()
    : `${doc.sessionId}-${doc.createdAt.getTime()}`,
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
  snapshot: doc.snapshot
    ? {
        timeframe: doc.snapshot.timeframe,
        capturedAt: doc.snapshot.capturedAt.toISOString(),
        candles: doc.snapshot.candles,
      }
    : null,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),\n  snapshot: doc.snapshot ? { timeframe: doc.snapshot.timeframe, at: doc.snapshot.at.toISOString(), candles: doc.snapshot.candles } : null,
});

type SanitizedHistoryPayload =
  | { error: string }
  | {
      pair: string;
      timeframe: string;
      provider: string;
      mode: MarketMode;
      response: AgentResponse;
      verdict: HistoryVerdict;
      feedback: string | null;
      snapshot?: {    timeframe: string;    at: string;    candles: Array<{ openTime: number; open: number; high: number; low: number; close: number; volume?: number; closeTime?: number }>;  };};

const sanitizeSnapshot = (value: unknown): HistorySnapshotDocument | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const { timeframe, capturedAt, candles } = value as {
    timeframe?: unknown;
    capturedAt?: unknown;
    candles?: unknown;
  };

  if (!Array.isArray(candles) || candles.length === 0) {
    return null;
  }

  const normalizedCandles: HistorySnapshotCandle[] = [];
  for (const raw of candles.slice(-SNAPSHOT_MAX_CANDLES)) {
    if (!raw || typeof raw !== "object") {
      continue;
    }
    const { time, open, high, low, close } = raw as {
      time?: unknown;
      open?: unknown;
      high?: unknown;
      low?: unknown;
      close?: unknown;
    };
    const timestamp = typeof time === "number" && Number.isFinite(time) ? Math.floor(time) : null;
    const openValue = typeof open === "number" && Number.isFinite(open) ? Number(open.toFixed(2)) : null;
    const highValue = typeof high === "number" && Number.isFinite(high) ? Number(high.toFixed(2)) : null;
    const lowValue = typeof low === "number" && Number.isFinite(low) ? Number(low.toFixed(2)) : null;
    const closeValue = typeof close === "number" && Number.isFinite(close) ? Number(close.toFixed(2)) : null;
    if (
      timestamp === null ||
      openValue === null ||
      highValue === null ||
      lowValue === null ||
      closeValue === null
    ) {
      continue;
    }
    normalizedCandles.push({
      time: timestamp,
      open: openValue,
      high: highValue,
      low: lowValue,
      close: closeValue,
    });
  }

  if (!normalizedCandles.length) {
    return null;
  }

  const timeframeLabel = typeof timeframe === "string" && timeframe.trim().length > 0
    ? timeframe.trim()
    : "";
  const capturedDate = typeof capturedAt === "string" || capturedAt instanceof Date
    ? new Date(capturedAt)
    : new Date(normalizedCandles[normalizedCandles.length - 1].time * 1000);
  const capturedAtDate = Number.isNaN(capturedDate.getTime())
    ? new Date(normalizedCandles[normalizedCandles.length - 1].time * 1000)
    : capturedDate;

  return {
    timeframe: timeframeLabel,
    capturedAt: capturedAtDate,
    candles: normalizedCandles,
  };
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
  } = payload as {pair?: string;timeframe?: string;provider?: string;response?: AgentResponse;verdict?: string;feedback?: string;snapshot?: { timeframe: string; at: string; candles: Array<{ openTime: number; open: number; high: number; low: number; close: number; volume?: number; closeTime?: number }> };\n  };

  if (!pair || typeof pair !== "string") {
    return { error: "Pair is required." };
  }
  if (!timeframe || typeof timeframe !== "string") {
    return { error: "Timeframe is required." };
  }
  if (!response || typeof response !== "object") {
    return { error: "Agent response is required." };
  }
  const normalizedProvider = isCexProvider(provider ?? null)
    ? provider!
    : DEFAULT_PROVIDER;
  const normalizedMode = isMarketMode(mode ?? null)
    ? (mode as MarketMode)
    : DEFAULT_MARKET_MODE;
  const normalizedVerdict = ALLOWED_VERDICTS.has(
    (verdict ?? "unknown") as HistoryVerdict
  )
    ? ((verdict ?? "unknown") as HistoryVerdict)
    : "unknown";
  const sanitizedFeedback =
    feedback?.toString().slice(0, MAX_FEEDBACK_LENGTH) ?? null;
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
  const normalizedSnapshot = sanitizeSnapshot(snapshot);

  return {
    pair: pair.trim().toUpperCase(),
    timeframe: timeframe.trim(),
    provider: normalizedProvider,
    mode: normalizedMode,
    response,
    verdict: verdict as Verdict,
    feedback: sanitizedFeedback,snapshot: (payload as any).snapshot && typeof (payload as any).snapshot === "object" ? {  timeframe: String((payload as any).snapshot.timeframe ?? timeframe).trim(),  at: new Date(String((payload as any).snapshot.at ?? new Date())).toISOString(),  candles: Array.isArray((payload as any).snapshot.candles) ? (payload as any).snapshot.candles.map((k: any) => ({    openTime: Number(k.openTime ?? 0), open: Number(k.open ?? 0), high: Number(k.high ?? 0), low: Number(k.low ?? 0), close: Number(k.close ?? 0), volume: Number(k.volume ?? 0), closeTime: Number(k.closeTime ?? k.openTime ?? 0)  })) : []} : undefined,
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

    const decisionAction = (
      validated.response.decision?.action ?? ""
    ).toLowerCase();
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
      response: validated.response,  snapshot: (validated as any).snapshot ? { timeframe: (validated as any).snapshot.timeframe, at: new Date((validated as any).snapshot.at), candles: (validated as any).snapshot.candles } : null,
      verdict: validated.verdict,
      feedback: validated.feedback,
      executed: validated.executed ?? null,
      snapshot: validated.snapshot,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(doc);
    const stored: HistoryDocument = {
      ...doc,
      _id: result.insertedId,
    };

    const sessionData = toSessionResponse(session);
    return NextResponse.json(
      { entry: mapHistoryDoc(stored, sessionData) },
      { status: 201 }
    );
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
