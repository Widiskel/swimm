import type { ISeriesApi, IPriceLine } from "lightweight-charts";

import type { OverlayLevel } from "../types";

export const updateOverlayPriceLines = (
  series: ISeriesApi<"Candlestick">,
  overlays: OverlayLevel[],
  storageRef: { current: IPriceLine[] }
) => {
  storageRef.current.forEach((line) => series.removePriceLine(line));
  storageRef.current = overlays.map((overlay) =>
    series.createPriceLine({
      price: overlay.price,
      color: overlay.color,
      lineStyle: overlay.lineStyle,
      lineWidth: overlay.lineWidth,
      axisLabelVisible: true,
      title: overlay.label,
    })
  );
};
