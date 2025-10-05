import { randomBytes } from "crypto";
import { Filter } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import {
  HISTORY_COLLECTION,
  type HistoryDocument,
  buildError,
  mapHistoryDoc,
} from "../../route";
import {
  buildCandidateFilters,
  findMatchingDocument,
} from "../route";
import { getMongoDb } from "@/lib/mongodb";
import { getSessionFromCookie, toSessionResponse } from "@/lib/session";

const generateShareId = () => randomBytes(16).toString("hex");

export async function POST(
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
  if (!filters.length) {
    return buildError("History entry not found.", 404);
  }

  const candidate = await findMatchingDocument(collection, filters);
  if (!candidate) {
    return buildError("History entry not found.", 404);
  }

  const { doc, filter: matchedFilter } = candidate;
  if (doc.userId !== session.userId) {
    return buildError("Not authorised to share this entry.", 403);
  }

  const primaryFilter = doc._id
    ? ({ _id: doc._id } as Filter<HistoryDocument>)
    : matchedFilter;

  const shareId = generateShareId();
  const now = new Date();

  await collection.updateOne(primaryFilter, {
    $set: {
      shareId,
      shareCreatedAt: now,
      updatedAt: now,
    },
  });

  const updatedDoc = await collection.findOne(primaryFilter);
  if (!updatedDoc) {
    return buildError("History entry not found.", 404);
  }

  const sessionData = toSessionResponse(session);
  return NextResponse.json({
    entry: mapHistoryDoc(updatedDoc, sessionData),
  });
}

export async function DELETE(
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
  if (!filters.length) {
    return buildError("History entry not found.", 404);
  }

  const candidate = await findMatchingDocument(collection, filters);
  if (!candidate) {
    return buildError("History entry not found.", 404);
  }

  const { doc, filter: matchedFilter } = candidate;
  if (doc.userId !== session.userId) {
    return buildError("Not authorised to update this entry.", 403);
  }

  const primaryFilter = doc._id
    ? ({ _id: doc._id } as Filter<HistoryDocument>)
    : matchedFilter;

  const now = new Date();

  await collection.updateOne(primaryFilter, {
    $set: {
      shareId: null,
      shareCreatedAt: null,
      updatedAt: now,
    },
  });

  const updatedDoc = await collection.findOne(primaryFilter);
  if (!updatedDoc) {
    return buildError("History entry not found.", 404);
  }

  const sessionData = toSessionResponse(session);
  return NextResponse.json({ entry: mapHistoryDoc(updatedDoc, sessionData) });
}
