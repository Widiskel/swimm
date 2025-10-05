import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import type { AgentResponse } from "@/features/analysis/types";
import type {
  HistorySnapshot,
  HistorySnapshotCandle,
  HistoryVerdict,
} from "@/features/history/types";
import {
  DEFAULT_PROVIDER,
  isCexProvider,
  type CexProvider,
} from "@/features/market/exchanges";
import {
  DEFAULT_MARKET_MODE,
  isMarketMode,
  type MarketMode,
} from "@/features/market/constants";
import { fetchBinanceCandles } from "@/features/market/exchanges/binance";
import { fetchBybitCandles } from "@/features/market/exchanges/bybit";
import { fetchGoldCandles } from "@/features/market/exchanges/twelvedata";
import type { MarketCandle } from "@/features/market/types";
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
const SNAPSHOT_EXTENSION_LIMIT = 720;

const TIMEFRAME_TO_MS: Record<string, number> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

type HistorySnapshotDocument = {
  timeframe: string;
  capturedAt: Date;
  candles: HistorySnapshotCandle[];
  result?: {
    type: "entry" | "target" | "stop";
    index?: number;
  } | null;
  extensionStartTime?: number | null;
  entryCandles?: HistorySnapshotCandle[];
  targetCandles?: HistorySnapshotCandle[];
  stopCandles?: HistorySnapshotCandle[];
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
  shareId?: string | null;
  shareCreatedAt?: Date | null;
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
  verdict: HistoryVerdict;
  feedback?: string | null;
  executed: boolean | null;
  snapshot: HistorySnapshot | null;
  shareId: string | null;
  shareCreatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const buildError = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export const normalizeSnapshotResult = (
  value: HistorySnapshotDocument["result"]
): HistorySnapshot["result"] => {
  if (!value) {
    return null;
  }
  if (value.type === "entry") {
    return { type: "entry" };
  }
  if (value.type === "stop") {
    return { type: "stop" };
  }
  if (value.type === "target") {
    const index =
      typeof value.index === "number" && Number.isFinite(value.index)
        ? Math.max(0, Math.floor(value.index))
        : 0;
    return { type: "target", index };
  }
  return null;
};

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
  provider: doc.provider === "gold" ? "twelvedata" : doc.provider,
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
        result: normalizeSnapshotResult(doc.snapshot.result ?? null),
        extensionStartTime: doc.snapshot.extensionStartTime ?? null,
        entryCandles: doc.snapshot.entryCandles,
        targetCandles: doc.snapshot.targetCandles,
        stopCandles: doc.snapshot.stopCandles,
      }
    : null,
  shareId: doc.shareId ?? null,
  shareCreatedAt: doc.shareCreatedAt ? doc.shareCreatedAt.toISOString() : null,
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
      verdict: HistoryVerdict;
      feedback: string | null;
      executed: boolean | null;
      snapshot: HistorySnapshotDocument | null;
    };

const formatSnapshotValue = (value: number) => Number(value.toFixed(2));

const normalizeSnapshotCandles = (
  candles: HistorySnapshotCandle[]
): HistorySnapshotCandle[] => {
  if (!candles.length) {
    return [];
  }
  const map = new Map<number, HistorySnapshotCandle>();
  for (const candle of candles) {
    if (!candle || typeof candle.time !== "number" || !Number.isFinite(candle.time)) {
      continue;
    }
    map.set(Math.floor(candle.time), {
      time: Math.floor(candle.time),
      open: formatSnapshotValue(candle.open),
      high: formatSnapshotValue(candle.high),
      low: formatSnapshotValue(candle.low),
      close: formatSnapshotValue(candle.close),
    });
  }
  return Array.from(map.values()).sort((a, b) => a.time - b.time);
};

const sanitizeSnapshotCandleList = (
  raw: unknown,
  limit: number
): HistorySnapshotCandle[] => {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [];
  }
  const source = limit > 0 ? raw.slice(-limit) : raw;
  const normalized: HistorySnapshotCandle[] = [];
  for (const item of source) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const { time, openTime, open, high, low, close } = item as {
      time?: unknown;
      openTime?: unknown;
      open?: unknown;
      high?: unknown;
      low?: unknown;
      close?: unknown;
    };
    const tsFromTime =
      typeof time === "number" && Number.isFinite(time) ? Math.floor(time) : null;
    const tsFromOpenTime =
      typeof openTime === "number" && Number.isFinite(openTime)
        ? Math.floor(openTime / 1000)
        : null;
    const timestamp = tsFromTime ?? tsFromOpenTime;
    const openValue = typeof open === "number" && Number.isFinite(open)
      ? formatSnapshotValue(open)
      : null;
    const highValue = typeof high === "number" && Number.isFinite(high)
      ? formatSnapshotValue(high)
      : null;
    const lowValue = typeof low === "number" && Number.isFinite(low)
      ? formatSnapshotValue(low)
      : null;
    const closeValue = typeof close === "number" && Number.isFinite(close)
      ? formatSnapshotValue(close)
      : null;
    if (
      timestamp === null ||
      openValue === null ||
      highValue === null ||
      lowValue === null ||
      closeValue === null
    ) {
      continue;
    }
    normalized.push({
      time: timestamp,
      open: openValue,
      high: highValue,
      low: lowValue,
      close: closeValue,
    });
  }
  return normalizeSnapshotCandles(normalized);
};

const collectEntryPrices = (tradePlan: AgentResponse["tradePlan"] | null | undefined) => {
  const values: number[] = [];
  if (!tradePlan) {
    return values;
  }
  if (Array.isArray(tradePlan.entries)) {
    for (const item of tradePlan.entries) {
      if (typeof item === "number" && Number.isFinite(item)) {
        values.push(item);
      }
    }
  }
  if (typeof tradePlan.entry === "number" && Number.isFinite(tradePlan.entry)) {
    values.push(tradePlan.entry);
  }
  return values;
};

const collectTargetPrices = (tradePlan: AgentResponse["tradePlan"] | null | undefined) => {
  const targets: number[] = [];
  if (!tradePlan) {
    return targets;
  }
  if (Array.isArray(tradePlan.takeProfits)) {
    for (const target of tradePlan.takeProfits) {
      if (typeof target === "number" && Number.isFinite(target)) {
        targets.push(target);
      }
    }
  }
  return targets;
};

const inferTradeDirection = (
  tradePlan: AgentResponse["tradePlan"] | null | undefined,
  decisionAction?: string | null
): "long" | "short" | null => {
  if (!tradePlan) {
    return null;
  }
  if (tradePlan.bias === "long" || tradePlan.bias === "short") {
    return tradePlan.bias;
  }
  const action = decisionAction?.toLowerCase();
  if (action === "buy") {
    return "long";
  }
  if (action === "sell") {
    return "short";
  }

  const entryPrices = collectEntryPrices(tradePlan);
  const entryPrice = entryPrices.length
    ? entryPrices.reduce((sum, value) => sum + value, 0) / entryPrices.length
    : null;
  const targets = collectTargetPrices(tradePlan);

  if (entryPrice !== null && targets.length) {
    const maxTarget = Math.max(...targets);
    const minTarget = Math.min(...targets);
    if (maxTarget > entryPrice) {
      return "long";
    }
    if (minTarget < entryPrice) {
      return "short";
    }
  }

  if (
    entryPrice !== null &&
    typeof tradePlan.stopLoss === "number" &&
    Number.isFinite(tradePlan.stopLoss)
  ) {
    if (tradePlan.stopLoss < entryPrice) {
      return "long";
    }
    if (tradePlan.stopLoss > entryPrice) {
      return "short";
    }
  }

  return null;
};

const computeEntryRange = (
  tradePlan: AgentResponse["tradePlan"] | null | undefined
) => {
  const entries = collectEntryPrices(tradePlan);
  if (!entries.length) {
    return null as null | { min: number; max: number };
  }
  return {
    min: Math.min(...entries),
    max: Math.max(...entries),
  };
};

const computeStopPrice = (tradePlan: AgentResponse["tradePlan"] | null | undefined) => {
  if (!tradePlan) {
    return null;
  }
  return typeof tradePlan.stopLoss === "number" && Number.isFinite(tradePlan.stopLoss)
    ? tradePlan.stopLoss
    : null;
};

const candleHitsEntryRange = (
  candle: HistorySnapshotCandle,
  range: { min: number; max: number } | null
) => {
  if (!range) {
    return false;
  }
  return candle.low <= range.max && candle.high >= range.min;
};

const toSnapshotCandleFromMarket = (candle: MarketCandle): HistorySnapshotCandle => ({
  time: Math.floor(candle.openTime / 1000),
  open: formatSnapshotValue(candle.open),
  high: formatSnapshotValue(candle.high),
  low: formatSnapshotValue(candle.low),
  close: formatSnapshotValue(candle.close),
});

type ComparisonParams = {
  provider: string;
  pair: string;
  timeframe: string;
  mode: MarketMode;
  startTimeSec: number | null;
};

const fetchComparisonCandles = async ({
  provider,
  pair,
  timeframe,
  mode,
  startTimeSec,
}: ComparisonParams): Promise<HistorySnapshotCandle[]> => {
  const normalizedProvider = provider === "gold" ? "twelvedata" : provider;
  const normalizedTimeframe = timeframe.toLowerCase();
  if (!TIMEFRAME_TO_MS[normalizedTimeframe]) {
    return [];
  }
  const symbol = pair.replace(/[^A-Z0-9]/g, "");
  const startTimeMs = startTimeSec !== null ? startTimeSec * 1000 : undefined;

  try {
    if (normalizedProvider === "bybit") {
      const candles = await fetchBybitCandles(
        symbol,
        normalizedTimeframe,
        {
          limit: SNAPSHOT_EXTENSION_LIMIT,
          startTime: startTimeMs,
        },
        undefined,
        mode
      );
      return normalizeSnapshotCandles(candles.map(toSnapshotCandleFromMarket));
    }

    if (normalizedProvider === "twelvedata") {
      const candles = await fetchGoldCandles(
        symbol,
        normalizedTimeframe,
        Math.max(SNAPSHOT_EXTENSION_LIMIT, SNAPSHOT_MAX_CANDLES)
      );
      const filtered = startTimeSec !== null
        ? candles.filter((item) => item.openTime / 1000 > startTimeSec)
        : candles;
      return normalizeSnapshotCandles(filtered.map(toSnapshotCandleFromMarket));
    }

    const candles = await fetchBinanceCandles(
      symbol,
      normalizedTimeframe,
      {
        limit: SNAPSHOT_EXTENSION_LIMIT,
        startTime: startTimeMs,
      },
      undefined,
      mode
    );
    return normalizeSnapshotCandles(candles.map(toSnapshotCandleFromMarket));
  } catch (error) {
    console.warn("Failed to fetch comparison candles", {
      provider: normalizedProvider,
      timeframe: normalizedTimeframe,
      error,
    });
    return [];
  }
};

type EnrichmentParams = {
  snapshot: HistorySnapshotDocument | null;
  tradePlan: AgentResponse["tradePlan"] | null | undefined;
  pair: string;
  provider: string;
  mode: MarketMode;
  timeframe: string;
  decisionAction?: string | null;
};

export const enrichSnapshotWithTradePlan = async ({
  snapshot,
  tradePlan,
  pair,
  provider,
  mode,
  timeframe,
  decisionAction,
}: EnrichmentParams): Promise<HistorySnapshotDocument | null> => {
  if (!snapshot || !tradePlan) {
    return snapshot;
  }

  const normalizedTimeframe = (snapshot.timeframe || timeframe || "").toLowerCase();
  if (!TIMEFRAME_TO_MS[normalizedTimeframe]) {
    return snapshot;
  }

  const baseCandles = normalizeSnapshotCandles(snapshot.candles ?? []);
  if (!baseCandles.length) {
    return snapshot;
  }

  const direction = inferTradeDirection(tradePlan, decisionAction);
  const entryRange = computeEntryRange(tradePlan);
  const targetLevels = collectTargetPrices(tradePlan);
  const targetMeta = targetLevels
    .map((value, index) => ({ value, index }))
    .filter((item) => typeof item.value === "number" && Number.isFinite(item.value));
  const stopPrice = computeStopPrice(tradePlan);

  const highestTargetMeta = targetMeta.length
    ? targetMeta.reduce((acc, item) => {
        if (!acc) {
          return item;
        }
        return direction === "short"
          ? item.value < acc.value
            ? item
            : acc
          : item.value > acc.value
          ? item
          : acc;
      }, targetMeta[0])
    : null;

  const baseTime = baseCandles[baseCandles.length - 1]?.time ?? null;

  if (!direction || (targetMeta.length === 0 && stopPrice === null)) {
    return {
      ...snapshot,
      timeframe: normalizedTimeframe,
      candles: baseCandles,
    };
  }

  const recordEvents = (source: HistorySnapshotCandle[]) => {
    const entryMap = new Map<number, HistorySnapshotCandle>();
    const targetMap = new Map<number, { candle: HistorySnapshotCandle; meta: { value: number; index: number } }>();
    const stopMap = new Map<number, HistorySnapshotCandle>();

    let highestTargetTime: number | null = null;
    let highestTargetIndex: number | null = null;
    let earliestStopTime: number | null = null;

    const withinBaseWindow = (time: number) =>
      baseTime === null || time >= baseTime;

    for (const candle of source) {
      const time = candle.time;
      if (!withinBaseWindow(time)) {
        continue;
      }

      if (entryRange && candleHitsEntryRange(candle, entryRange)) {
        if (!entryMap.has(time)) {
          entryMap.set(time, candle);
        }
      }

      for (const meta of targetMeta) {
        const hit =
          direction === "short"
            ? candle.low <= meta.value
            : candle.high >= meta.value;
        if (!hit) {
          continue;
        }
        if (!targetMap.has(meta.index)) {
          targetMap.set(meta.index, { candle, meta });
        }
        if (!highestTargetMeta) {
          continue;
        }
        const currentBest = highestTargetIndex !== null ? targetMap.get(highestTargetIndex) : null;
        if (!currentBest) {
          highestTargetIndex = meta.index;
          highestTargetTime = candle.time;
          continue;
        }
        const bestMeta = currentBest.meta;
        const isBetter =
          direction === "short"
            ? meta.value < bestMeta.value
            : meta.value > bestMeta.value;
        if (isBetter) {
          highestTargetIndex = meta.index;
          highestTargetTime = candle.time;
        } else if (meta.index === highestTargetMeta.index && highestTargetTime === null) {
          highestTargetIndex = meta.index;
          highestTargetTime = candle.time;
        }
      }

      if (stopPrice !== null && earliestStopTime === null) {
        const stopHitOccurred =
          direction === "short"
            ? candle.high >= stopPrice
            : candle.low <= stopPrice;
        if (stopHitOccurred) {
          earliestStopTime = time;
          if (!stopMap.has(time)) {
            stopMap.set(time, candle);
          }
        }
      }
    }

    return {
      entryCandles: normalizeSnapshotCandles(Array.from(entryMap.values())),
      targetCandles: normalizeSnapshotCandles(
        Array.from(targetMap.values()).map((item) => item.candle)
      ),
      stopCandles: normalizeSnapshotCandles(Array.from(stopMap.values())),
      highestTargetTime,
      highestTargetIndex,
      earliestStopTime,
    };
  };

  let combinedCandles = [...baseCandles];
  let analysis = recordEvents(combinedCandles);

  while (
    analysis.highestTargetTime === null &&
    analysis.earliestStopTime === null &&
    combinedCandles.length < SNAPSHOT_MAX_CANDLES + SNAPSHOT_EXTENSION_LIMIT
  ) {
    const lastKnownTime = combinedCandles[combinedCandles.length - 1]?.time ?? null;
    const comparisonCandles = await fetchComparisonCandles({
      provider,
      pair,
      timeframe: normalizedTimeframe,
      mode,
      startTimeSec: typeof lastKnownTime === "number" ? lastKnownTime : null,
    });

    const filtered = comparisonCandles.filter((candle) => {
      if (!Number.isFinite(candle.time)) {
        return false;
      }
      if (lastKnownTime !== null && candle.time <= lastKnownTime) {
        return false;
      }
      return true;
    });

    if (!filtered.length) {
      break;
    }

    combinedCandles = normalizeSnapshotCandles([
      ...combinedCandles,
      ...filtered,
    ]);
    analysis = recordEvents(combinedCandles);
  }

  const { entryCandles, targetCandles, stopCandles } = analysis;
  const cutoffTime = (() => {
    const stopTime = analysis.earliestStopTime;
    const targetTime = analysis.highestTargetTime;
    const fallbackTime = combinedCandles[combinedCandles.length - 1]?.time ?? baseTime;
    if (stopTime !== null && targetTime !== null) {
      return Math.min(stopTime, targetTime);
    }
    if (stopTime !== null) {
      return stopTime;
    }
    if (targetTime !== null) {
      return targetTime;
    }
    return fallbackTime;
  })();

  let extensionStartTime: number | null = null;

  const boundedCandles = (() => {
    if (cutoffTime === null) {
      return combinedCandles.slice(
        0,
        Math.min(
          combinedCandles.length,
          SNAPSHOT_MAX_CANDLES + SNAPSHOT_EXTENSION_LIMIT
        )
      );
    }
    let cutoffIndex = -1;
    for (let index = 0; index < combinedCandles.length; index += 1) {
      if (combinedCandles[index].time <= cutoffTime) {
        cutoffIndex = index;
      } else {
        break;
      }
    }
    if (cutoffIndex < 0) {
      return combinedCandles.slice(
        0,
        Math.min(
          combinedCandles.length,
          SNAPSHOT_MAX_CANDLES + SNAPSHOT_EXTENSION_LIMIT
        )
      );
    }
    const endIndex = Math.min(
      cutoffIndex + 1,
      combinedCandles.length - 1
    );
    if (baseTime !== null) {
      const extIndex = combinedCandles.findIndex((item) => item.time > baseTime);
      if (extIndex !== -1) {
        extensionStartTime = combinedCandles[extIndex].time;
      }
    }
    return combinedCandles.slice(
      0,
      Math.min(
        endIndex + 1,
        SNAPSHOT_MAX_CANDLES + SNAPSHOT_EXTENSION_LIMIT
      )
    );
  })();

  const normalizeMarkers = (list: HistorySnapshotCandle[]) => {
    if (cutoffTime === null) {
      return list;
    }
    return list.filter((item) => item.time <= cutoffTime);
  };

  return {
    ...snapshot,
    timeframe: normalizedTimeframe,
    candles: boundedCandles,
    result:
      analysis.earliestStopTime !== null &&
      (analysis.highestTargetTime === null || analysis.earliestStopTime <= analysis.highestTargetTime)
        ? { type: "stop" }
        : analysis.highestTargetTime !== null && analysis.highestTargetIndex !== null
        ? { type: "target", index: analysis.highestTargetIndex }
        : entryCandles.length
        ? { type: "entry" }
        : null,
    extensionStartTime,
    entryCandles: normalizeMarkers(entryCandles).length
      ? normalizeMarkers(entryCandles)
      : undefined,
    targetCandles: normalizeMarkers(targetCandles).length
      ? normalizeMarkers(targetCandles)
      : undefined,
    stopCandles: normalizeMarkers(stopCandles).length
      ? normalizeMarkers(stopCandles)
      : undefined,
  };
};

const sanitizeSnapshot = (value: unknown): HistorySnapshotDocument | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const {
    timeframe,
    capturedAt,
    at,
    candles,
    entryCandles,
    targetCandles,
    stopCandles,
    result,
  } = value as {
    timeframe?: unknown;
    capturedAt?: unknown;
    at?: unknown;
    candles?: unknown;
    entryCandles?: unknown;
    targetCandles?: unknown;
    stopCandles?: unknown;
    result?: unknown;
  };

  if (!Array.isArray(candles) || candles.length === 0) {
    return null;
  }

  const normalizedCandles = sanitizeSnapshotCandleList(
    candles,
    SNAPSHOT_MAX_CANDLES
  );

  if (!normalizedCandles.length) {
    return null;
  }

  const timeframeLabel =
    typeof timeframe === "string" && timeframe.trim().length > 0 ? timeframe.trim() : "";
  const capturedRaw = capturedAt ?? at;
  const capturedDate =
    typeof capturedRaw === "string" || capturedRaw instanceof Date
      ? new Date(capturedRaw as string | Date)
      : new Date(normalizedCandles[normalizedCandles.length - 1].time * 1000);
  const capturedAtDate = Number.isNaN(capturedDate.getTime())
    ? new Date(normalizedCandles[normalizedCandles.length - 1].time * 1000)
    : capturedDate;

  const entryMarkers = sanitizeSnapshotCandleList(entryCandles, 120);
  const targetMarkers = sanitizeSnapshotCandleList(targetCandles, 120);
  const stopMarkers = sanitizeSnapshotCandleList(stopCandles, 120);
  const normalizedResult = (() => {
    if (!result || typeof result !== "object") {
      return null;
    }
    const { type, index } = result as {
      type?: unknown;
      index?: unknown;
    };
    if (type === "entry") {
      return { type: "entry" as const };
    }
    if (type === "stop") {
      return { type: "stop" as const };
    }
    if (type === "target") {
      const parsedIndex = Number(index);
      if (Number.isFinite(parsedIndex)) {
        return { type: "target" as const, index: Math.max(0, Math.floor(parsedIndex)) };
      }
    }
    return null;
  })();

  return {
    timeframe: timeframeLabel,
    capturedAt: capturedAtDate,
    candles: normalizedCandles,
    result: normalizedResult,
    extensionStartTime:
      typeof (value as { extensionStartTime?: unknown }).extensionStartTime === "number"
        ? Number((value as { extensionStartTime?: number }).extensionStartTime)
        : null,
    entryCandles: entryMarkers.length ? entryMarkers : undefined,
    targetCandles: targetMarkers.length ? targetMarkers : undefined,
    stopCandles: stopMarkers.length ? stopMarkers : undefined,
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
    executed,
    snapshot,
  } = payload as {
    pair?: unknown;
    timeframe?: unknown;
    provider?: unknown;
    mode?: unknown;
    response?: unknown;
    verdict?: unknown;
    feedback?: unknown;
    executed?: unknown;
    snapshot?: unknown;
  };

  if (typeof pair !== "string" || pair.trim().length === 0) {
    return { error: "Pair is required." };
  }
  if (typeof timeframe !== "string" || timeframe.trim().length === 0) {
    return { error: "Timeframe is required." };
  }
  if (!response || typeof response !== "object") {
    return { error: "Agent response is required." };
  }

  const providerString = typeof provider === "string" ? provider.toLowerCase() : DEFAULT_PROVIDER;
  const normalizedProvider = isCexProvider(providerString as CexProvider)
    ? (providerString as CexProvider)
    : providerString === "gold"
    ? "twelvedata"
    : DEFAULT_PROVIDER;
  const normalizedMode = isMarketMode((mode as MarketMode) ?? null)
    ? (mode as MarketMode)
    : DEFAULT_MARKET_MODE;
  const normalizedVerdict = ALLOWED_VERDICTS.has((verdict as HistoryVerdict) ?? "unknown")
    ? ((verdict as HistoryVerdict) ?? "unknown")
    : "unknown";
  const sanitizedFeedback =
    typeof feedback === "string"
      ? feedback.slice(0, MAX_FEEDBACK_LENGTH)
      : feedback != null
      ? String(feedback).slice(0, MAX_FEEDBACK_LENGTH)
      : null;
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
    response: response as AgentResponse,
    verdict: normalizedVerdict,
    feedback: sanitizedFeedback,
    executed: normalizedExecuted,
    snapshot: normalizedSnapshot,
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

    const enrichedDocs = await Promise.all(
      docs.map(async (doc) => {
        if (!doc.snapshot || !doc.response?.tradePlan) {
          return doc;
        }
        const enriched = await enrichSnapshotWithTradePlan({
          snapshot: doc.snapshot,
          tradePlan: doc.response.tradePlan,
          pair: doc.pair,
          provider: doc.provider,
          mode: doc.mode ?? DEFAULT_MARKET_MODE,
          timeframe: doc.timeframe,
          decisionAction: doc.decision?.action ?? null,
        });
        if (!enriched) {
          return doc;
        }
        return { ...doc, snapshot: enriched } satisfies HistoryDocument;
      })
    );

    const sessionData = toSessionResponse(session);
    const entries = enrichedDocs.map((doc) => mapHistoryDoc(doc, sessionData));

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

    const enrichedSnapshot = await enrichSnapshotWithTradePlan({
      snapshot: validated.snapshot,
      tradePlan: validated.response.tradePlan,
      pair: validated.pair,
      provider: validated.provider,
      mode: validated.mode,
      timeframe: validated.timeframe,
      decisionAction: validated.response.decision?.action ?? null,
    });

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
      snapshot: enrichedSnapshot,
      shareId: null,
      shareCreatedAt: null,
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
