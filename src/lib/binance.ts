const BINANCE_REST_URL = process.env.BINANCE_API_URL ?? "https://api.binance.com";
const DEFAULT_SYMBOL = process.env.BINANCE_SYMBOL ?? "BTCUSDT";

export type BinanceMarketSummary = {
  symbol: string;
  lastPrice: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
  weightedAvgPrice: number;
  openTime: string;
  closeTime: string;
};

type BinanceTicker24hResponse = {
  symbol: string;
  priceChangePercent: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  weightedAvgPrice: string;
  openTime: number;
  closeTime: number;
};

export type BinanceCandle = {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
};

type BinanceDepthResponse = {
  lastUpdateId: number;
  bids: [string, string][];
  asks: [string, string][];
};

export type BinanceOrderBookSide = {
  price: number;
  quantity: number;
};

const withHeaders = () => {
  const headers = new Headers({ "Content-Type": "application/json" });
  const apiKey = process.env.BINANCE_API_KEY;

  if (apiKey) {
    headers.set("X-MBX-APIKEY", apiKey);
  }

  return headers;
};

const parseTicker = (data: BinanceTicker24hResponse): BinanceMarketSummary => ({
  symbol: data.symbol,
  lastPrice: Number.parseFloat(data.lastPrice),
  priceChangePercent: Number.parseFloat(data.priceChangePercent),
  highPrice: Number.parseFloat(data.highPrice),
  lowPrice: Number.parseFloat(data.lowPrice),
  volume: Number.parseFloat(data.volume),
  quoteVolume: Number.parseFloat(data.quoteVolume),
  weightedAvgPrice: Number.parseFloat(data.weightedAvgPrice),
  openTime: new Date(data.openTime).toISOString(),
  closeTime: new Date(data.closeTime).toISOString(),
});

export const fetchBinanceCandles = async (
  symbol: string = DEFAULT_SYMBOL,
  interval: string = "5m",
  limit = 120
): Promise<BinanceCandle[]> => {
  try {
    const url = new URL("/api/v3/klines", BINANCE_REST_URL);
    url.searchParams.set("symbol", symbol.toUpperCase());
    url.searchParams.set("interval", interval);
    url.searchParams.set("limit", String(limit));

    const response = await fetch(url, {
      method: "GET",
      headers: withHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Binance API responded with ${response.status}`);
    }

    const payload = (await response.json()) as unknown[];
    return (payload as (readonly unknown[])[]).map((row) => ({
      openTime: Number(row[0]),
      open: Number.parseFloat(String(row[1])),
      high: Number.parseFloat(String(row[2])),
      low: Number.parseFloat(String(row[3])),
      close: Number.parseFloat(String(row[4])),
      volume: Number.parseFloat(String(row[5])),
      closeTime: Number(row[6]),
    }));
  } catch (error) {
    console.error("Failed to fetch Binance candles", error);
    return [];
  }
};

export const fetchBinanceMarketSummary = async (
  symbol: string = DEFAULT_SYMBOL
): Promise<BinanceMarketSummary | null> => {
  try {
    const url = new URL("/api/v3/ticker/24hr", BINANCE_REST_URL);
    url.searchParams.set("symbol", symbol.toUpperCase());

    const response = await fetch(url, {
      method: "GET",
      headers: withHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Binance API responded with ${response.status}`);
    }

    const payload = (await response.json()) as BinanceTicker24hResponse;
    return parseTicker(payload);
  } catch (error) {
    console.error("Failed to fetch Binance market summary", error);
    return null;
  }
};

export const fetchBinanceOrderBook = async (
  symbol: string = DEFAULT_SYMBOL,
  limit = 20
): Promise<{ bids: BinanceOrderBookSide[]; asks: BinanceOrderBookSide[] }> => {
  try {
    const url = new URL("/api/v3/depth", BINANCE_REST_URL);
    url.searchParams.set("symbol", symbol.toUpperCase());
    url.searchParams.set("limit", String(limit));

    const response = await fetch(url, {
      method: "GET",
      headers: withHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Binance depth API responded with ${response.status}`);
    }

    const payload = (await response.json()) as BinanceDepthResponse;
    const mapSide = (side: [string, string][]) =>
      side.map(([price, qty]) => ({
        price: Number.parseFloat(price),
        quantity: Number.parseFloat(qty),
      }));

    return {
      bids: mapSide(payload.bids),
      asks: mapSide(payload.asks),
    };
  } catch (error) {
    console.error("Failed to fetch Binance order book", error);
    return { bids: [], asks: [] };
  }
};

export const formatBinanceSummary = (
  summary: BinanceMarketSummary | null
): string => {
  if (!summary) {
    return "(Data pasar Binance tidak tersedia)";
  }

  const {
    symbol,
    lastPrice,
    priceChangePercent,
    highPrice,
    lowPrice,
    volume,
    quoteVolume,
    weightedAvgPrice,
    closeTime,
  } = summary;

  const baseAsset = symbol.replace(/USDT$/i, "");

  return [
    `${symbol} spot (Binance)`,
    `Harga terakhir: ${lastPrice.toFixed(2)}`,
    `Perubahan 24 jam: ${priceChangePercent.toFixed(2)}%`,
    `High/Low 24 jam: ${highPrice.toFixed(2)} / ${lowPrice.toFixed(2)}`,
    `Volume 24 jam: ${volume.toFixed(2)} ${baseAsset || symbol}`,
    `Volume (quote): ${quoteVolume.toFixed(2)} USDT`,
    `Average tertimbang: ${weightedAvgPrice.toFixed(2)}`,
    `Update terakhir: ${closeTime}`,
  ].join("\n");
};
