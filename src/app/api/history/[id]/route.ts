import { NextRequest, NextResponse } from "next/server";
import { ObjectId, type Filter, type Collection } from "mongodb";

import {
  ALLOWED_VERDICTS,
  HISTORY_COLLECTION,
  MAX_FEEDBACK_LENGTH,
  buildError,
  mapHistoryDoc,
  type HistoryDocument,
  type Verdict,
} from "../route";
import { getMongoDb } from "@/lib/mongodb";
import { getSessionFromCookie, toSessionResponse } from "@/lib/session";

const decodeFallbackId = (value: string) => {
  const lastDash = value.lastIndexOf("-");
  if (lastDash <= 0 || lastDash === value.length - 1) {
    return null;
  }
  const timestamp = Number(value.slice(lastDash + 1));
  if (!Number.isFinite(timestamp)) {
    return null;
  }
  const sessionId = value.slice(0, lastDash);
  if (!sessionId) {
    return null;
  }
  return {
    sessionId,
    createdAt: new Date(timestamp),
  };
};

const buildFallbackFilter = (
  sessionId: string,
  createdAt: Date,
  userId: string
): Filter<HistoryDocument> => {
  const toleranceMs = 1000;
  return {
    sessionId,
    userId,
    createdAt: {
      $gte: new Date(createdAt.getTime() - toleranceMs),
      $lte: new Date(createdAt.getTime() + toleranceMs),
    },
  };
};

const sanitizeSessionId = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const sanitizeCreatedAt = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return new Date(parsed);
};

const buildCandidateFilters = (
  id: string,
  userId: string,
  hintSessionId?: string,
  hintCreatedAt?: Date
) => {
  const filters: Filter<HistoryDocument>[] = [];

  if (ObjectId.isValid(id)) {
    filters.push({ _id: new ObjectId(id), userId });
  }

  const fallback = decodeFallbackId(id);
  if (fallback) {
    filters.push(
      buildFallbackFilter(fallback.sessionId, fallback.createdAt, userId)
    );
  }

  if (hintSessionId && hintCreatedAt) {
    filters.push(buildFallbackFilter(hintSessionId, hintCreatedAt, userId));
  }

  return filters;
};

const findMatchingDocument = async (
  collection: Collection<HistoryDocument>,
  filters: Filter<HistoryDocument>[]
) => {
  for (const filter of filters) {
    const doc = await collection.findOne(filter);
    if (doc) {
      return { doc, filter } as const;
    }
  }
  return null;
};

const sanitizeVerdict = (input: unknown): Verdict | undefined => {
  if (typeof input !== "string") {
    return undefined;
  }
  const lower = input.toLowerCase();
  return ALLOWED_VERDICTS.has(lower as Verdict)
    ? (lower as Verdict)
    : undefined;
};

const sanitizeFeedback = (input: unknown): string | null | undefined => {
  if (typeof input === "undefined") {
    return undefined;
  }
  if (input === null) {
    return null;
  }
  const text = String(input).slice(0, MAX_FEEDBACK_LENGTH).trim();
  return text.length > 0 ? text : null;
};

const sanitizeExecuted = (input: unknown): boolean | null | undefined => {
  if (typeof input === "undefined") {
    return undefined;
  }
  if (typeof input === "boolean") {
    return input;
  }
  if (typeof input === "string") {
    const lower = input.toLowerCase();
    if (lower === "true") {
      return true;
    }
    if (lower === "false") {
      return false;
    }
  }
  return null;
};

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookie();
  if (!session) {
    return buildError("Session required.", 401);
  }

  const { id } = await context.params;
  if (!id) {
    return buildError("Invalid history entry id.", 400);
  }

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return buildError("Payload must be an object.");
  }

  const verdict = sanitizeVerdict((payload as { verdict?: unknown }).verdict);
  const feedback = sanitizeFeedback(
    (payload as { feedback?: unknown }).feedback
  );
  const executed = sanitizeExecuted(
    (payload as { executed?: unknown }).executed
  );
  const hintSessionId = sanitizeSessionId(
    (payload as { sessionId?: unknown }).sessionId
  );
  const hintCreatedAt = sanitizeCreatedAt(
    (payload as { createdAt?: unknown }).createdAt
  );

  if (
    typeof verdict === "undefined" &&
    typeof feedback === "undefined" &&
    typeof executed === "undefined"
  ) {
    return buildError("Nothing to update.");
  }

  if (
    typeof verdict === "undefined" &&
    "verdict" in (payload as Record<string, unknown>)
  ) {
    return buildError("Verdict must be one of: accurate, inaccurate, unknown.");
  }

  const db = await getMongoDb();
  const collection = db.collection<HistoryDocument>(HISTORY_COLLECTION);

  const updateFields: Partial<HistoryDocument> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };

  if (typeof verdict !== "undefined") {
    updateFields.verdict = verdict;
  }
  if (typeof feedback !== "undefined") {
    updateFields.feedback = feedback;
  }
  if (typeof executed !== "undefined") {
    updateFields.executed = executed;
  }

  const filters = buildCandidateFilters(
    id,
    session.userId,
    hintSessionId,
    hintCreatedAt
  );

  if (filters.length === 0) {
    return buildError("Invalid history entry id.", 400);
  }

  const candidate = await findMatchingDocument(collection, filters);
  if (!candidate) {
    return buildError("History entry not found.", 404);
  }

  const { doc: existing, filter: matchedFilter } = candidate;
  const primaryFilter = existing._id
    ? ({ _id: existing._id } as Filter<HistoryDocument>)
    : matchedFilter;

  await collection.updateOne(primaryFilter, { $set: updateFields });
  const updatedDoc = await collection.findOne(primaryFilter);
  if (!updatedDoc) {
    return buildError("History entry not found.", 404);
  }

  const sessionData = toSessionResponse(session);
  return NextResponse.json({ entry: mapHistoryDoc(updatedDoc, sessionData) });
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookie();
  if (!session) {
    return buildError("Session required.", 401);
  }

  const { id } = await context.params;
  if (!id) {
    return buildError("Invalid history entry id.", 400);
  }

  const db = await getMongoDb();
  const collection = db.collection<HistoryDocument>(HISTORY_COLLECTION);

  const filters = buildCandidateFilters(id, session.userId);
  if (filters.length === 0) {
    return buildError("History entry not found.", 404);
  }

  const candidate = await findMatchingDocument(collection, filters);
  if (!candidate) {
    return buildError("History entry not found.", 404);
  }

  const sessionData = toSessionResponse(session);
  return NextResponse.json({
    entry: mapHistoryDoc(candidate.doc, sessionData),
  });
}
