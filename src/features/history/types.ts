export type HistoryVerdict = "accurate" | "inaccurate" | "unknown";

export type HistorySnapshotCandle = {
  time: number; // unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
};

export type HistorySnapshot = {
  timeframe: string;
  capturedAt: string; // ISO timestamp representing when the snapshot was captured
  candles: HistorySnapshotCandle[];
};
