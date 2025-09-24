import {
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  LineStyle,
} from "lightweight-charts";

import {
  type IndicatorConfigItem,
  type IndicatorDataMap,
  type IndicatorKey,
  type IndicatorSeriesMap,
  type BollingerData,
  type BollingerSeriesRefs,
} from "../types";

const applyLineSeriesData = (
  series: ISeriesApi<"Line">,
  visible: boolean,
  data: LineData[]
) => {
  series.applyOptions({ visible });
  series.setData(visible ? data : []);
};

export const createIndicatorSeries = (
  chart: IChartApi,
  indicatorVisibility: Record<IndicatorKey, boolean>,
  config: IndicatorConfigItem[]
): IndicatorSeriesMap => {
  const map: IndicatorSeriesMap = {};
  for (const indicator of config) {
    const visible = indicatorVisibility[indicator.key];
    if (indicator.type === "bollinger") {
      const [basisColor, upperColor = basisColor, lowerColor = basisColor] =
        indicator.colors;
      const basis = chart.addLineSeries({
        color: basisColor,
        lineWidth: 1,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
        lineStyle: LineStyle.Solid,
        visible,
      });
      const upper = chart.addLineSeries({
        color: upperColor,
        lineWidth: 1,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
        lineStyle: LineStyle.Dotted,
        visible,
      });
      const lower = chart.addLineSeries({
        color: lowerColor,
        lineWidth: 1,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
        lineStyle: LineStyle.Dotted,
        visible,
      });
      map[indicator.key] = { basis, upper, lower } satisfies BollingerSeriesRefs;
    } else {
      const [color] = indicator.colors;
      const series = chart.addLineSeries({
        color,
        lineWidth: 2,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
        visible,
      });
      map[indicator.key] = series;
    }
  }
  return map;
};

export const updateIndicatorSeries = (
  seriesMap: IndicatorSeriesMap | undefined,
  dataMap: IndicatorDataMap,
  indicatorVisibility: Record<IndicatorKey, boolean>,
  config: IndicatorConfigItem[]
) => {
  if (!seriesMap) {
    return;
  }

  for (const indicator of config) {
    const entry = seriesMap[indicator.key];
    if (!entry) {
      continue;
    }
    const visible = indicatorVisibility[indicator.key];
    const data = dataMap[indicator.key];

    if (indicator.type === "bollinger") {
      const seriesGroup = entry as BollingerSeriesRefs;
      const payload = (data as BollingerData) ?? {
        basis: [],
        upper: [],
        lower: [],
      };
      applyLineSeriesData(seriesGroup.basis, visible, payload.basis ?? []);
      applyLineSeriesData(seriesGroup.upper, visible, payload.upper ?? []);
      applyLineSeriesData(seriesGroup.lower, visible, payload.lower ?? []);
    } else {
      applyLineSeriesData(
        entry as ISeriesApi<"Line">,
        visible,
        (data as LineData[]) ?? []
      );
    }
  }
};

export const buildIndicatorData = (
  candles: CandlestickData[],
  config: IndicatorConfigItem[]
): IndicatorDataMap => {
  const map: IndicatorDataMap = {};
  if (!candles.length) {
    return map;
  }

  const closeValues = candles.map((item) => item.close);
  const timeValues = candles.map((item) => item.time);

  const smaCache = new Map<number, LineData[]>();
  const emaCache = new Map<number, LineData[]>();
  const bollingerCache = new Map<number, BollingerData>();

  const computeSMA = (length: number) => {
    if (smaCache.has(length)) {
      return smaCache.get(length)!;
    }
    const result: LineData[] = [];
    let sum = 0;
    const queue: number[] = [];
    closeValues.forEach((value, index) => {
      queue.push(value);
      sum += value;
      if (queue.length > length) {
        sum -= queue.shift() ?? 0;
      }
      if (queue.length === length) {
        result.push({
          time: timeValues[index],
          value: Number((sum / length).toFixed(2)),
        });
      }
    });
    smaCache.set(length, result);
    return result;
  };

  const computeEMA = (length: number) => {
    if (emaCache.has(length)) {
      return emaCache.get(length)!;
    }
    const result: LineData[] = [];
    if (!closeValues.length) {
      emaCache.set(length, result);
      return result;
    }
    const multiplier = 2 / (length + 1);
    let ema: number | null = null;
    closeValues.forEach((value, index) => {
      if (ema === null) {
        if (index + 1 < length) {
          return;
        }
        const seed = closeValues.slice(index + 1 - length, index + 1);
        ema = seed.reduce((acc, curr) => acc + curr, 0) / length;
      } else {
        ema = value * multiplier + ema * (1 - multiplier);
      }
      if (ema !== null) {
        result.push({
          time: timeValues[index],
          value: Number(ema.toFixed(2)),
        });
      }
    });
    emaCache.set(length, result);
    return result;
  };

  const computeBollinger = (length: number, multiplier: number) => {
    if (bollingerCache.has(length)) {
      return bollingerCache.get(length)!;
    }
    const basis: LineData[] = [];
    const upper: LineData[] = [];
    const lower: LineData[] = [];
    for (let index = length - 1; index < closeValues.length; index += 1) {
      const window = closeValues.slice(index + 1 - length, index + 1);
      const mean = window.reduce((acc, value) => acc + value, 0) / length;
      const variance =
        window.reduce((acc, value) => acc + (value - mean) ** 2, 0) /
        window.length;
      const stdDev = Math.sqrt(variance);
      const time = timeValues[index];
      basis.push({ time, value: Number(mean.toFixed(2)) });
      upper.push({
        time,
        value: Number((mean + multiplier * stdDev).toFixed(2)),
      });
      lower.push({
        time,
        value: Number((mean - multiplier * stdDev).toFixed(2)),
      });
    }
    const payload: BollingerData = { basis, upper, lower };
    bollingerCache.set(length, payload);
    return payload;
  };

  for (const indicator of config) {
    if (indicator.type === "sma") {
      map[indicator.key] = computeSMA(indicator.length);
    } else if (indicator.type === "ema") {
      map[indicator.key] = computeEMA(indicator.length);
    } else if (indicator.type === "bollinger") {
      map[indicator.key] = computeBollinger(
        indicator.length,
        indicator.multiplier ?? 2
      );
    }
  }

  return map;
};
