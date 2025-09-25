export const CEX_PROVIDERS = ["binance", "bybit"] as const;
export type CexProvider = (typeof CEX_PROVIDERS)[number];
export const DEFAULT_PROVIDER: CexProvider = "binance";

export const isCexProvider = (value: string | null | undefined): value is CexProvider =>
  value === "binance" || value === "bybit";
