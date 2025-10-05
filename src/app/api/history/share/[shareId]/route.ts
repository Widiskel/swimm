import { NextResponse } from "next/server";

import {
  HISTORY_COLLECTION,
  type HistoryDocument,
  buildError,
  normalizeSnapshotResult,
  enrichSnapshotWithTradePlan,
} from "../../route";
import { getMongoDb } from "@/lib/mongodb";
import {
  DEFAULT_MARKET_MODE,
  isMarketMode,
  type MarketMode,
} from "@/features/market/constants";

const mapSharedHistoryDoc = (doc: HistoryDocument) => {
  const mode: MarketMode = isMarketMode(doc.mode) ? doc.mode : DEFAULT_MARKET_MODE;
  return {
    id: doc._id ? doc._id.toHexString() : null,
    shareId: doc.shareId,
    pair: doc.pair,
    timeframe: doc.timeframe,
    provider: doc.provider === "gold" ? "twelvedata" : doc.provider,
    mode,
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
          result: normalizeSnapshotResult(doc.snapshot.result ?? null),
          extensionStartTime: doc.snapshot.extensionStartTime ?? null,
          entryCandles: doc.snapshot.entryCandles,
          targetCandles: doc.snapshot.targetCandles,
          stopCandles: doc.snapshot.stopCandles,
        }
      : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    shareCreatedAt: doc.shareCreatedAt ? doc.shareCreatedAt.toISOString() : null,
  };
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ shareId: string }> }
) {
  const { shareId } = await context.params;
  if (!shareId || typeof shareId !== "string" || shareId.trim().length === 0) {
    return buildError("Invalid share id.", 400);
  }

  const db = await getMongoDb();
  const collection = db.collection<HistoryDocument>(HISTORY_COLLECTION);
  const doc = await collection.findOne({ shareId: shareId.trim() });
  if (!doc) {
    return buildError("Shared analysis not found.", 404);
  }

  let hydratedDoc = doc;
  if (doc.snapshot && doc.response?.tradePlan) {
    const enriched = await enrichSnapshotWithTradePlan({
      snapshot: doc.snapshot,
      tradePlan: doc.response.tradePlan,
      pair: doc.pair,
      provider: doc.provider,
      mode: doc.mode ?? DEFAULT_MARKET_MODE,
      timeframe: doc.timeframe,
      decisionAction: doc.decision?.action ?? null,
    });
    if (enriched) {
      hydratedDoc = { ...doc, snapshot: enriched } satisfies HistoryDocument;
    }
  }

  return NextResponse.json({ entry: mapSharedHistoryDoc(hydratedDoc) });
}
