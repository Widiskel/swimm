import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

const binanceSpotTarget =
  process.env.BINANCE_TARGET ?? "https://api.binance.com";
const binanceFuturesTarget =
  process.env.BINANCE_FUTURES_TARGET ?? "https://fapi.binance.com";
const binanceDeliveryTarget =
  process.env.BINANCE_DELIVERY_TARGET ?? "https://dapi.binance.com";
const bybitTarget = process.env.BYBIT_TARGET ?? "https://api.bybit.com";

const logProxyRequest = (label) => (proxyReq, req) => {
  console.log(`[${label}] ${req.method} ${req.originalUrl}`);
  proxyReq.setHeader("x-forwarded-host", "swimm-proxy");
};

const logProxyResponse = (label) => (proxyRes, req) => {
  console.log(
    `[${label}] ${req.method} ${req.originalUrl} -> ${proxyRes.statusCode}`
  );
};

app.use(
  "/binance",
  createProxyMiddleware({
    target: binanceSpotTarget,
    changeOrigin: true,
    pathRewrite: { "^/binance": "" },
    followRedirects: true,
    router: (req) => {
      const path = req.originalUrl.replace(/^\/binance/, "");
      if (path.startsWith("/fapi")) {
        return binanceFuturesTarget;
      }
      if (path.startsWith("/dapi")) {
        return binanceDeliveryTarget;
      }
      return binanceSpotTarget;
    },
    onProxyReq: logProxyRequest("BINANCE"),
    onProxyRes: logProxyResponse("BINANCE"),
  })
);

app.use(
  "/bybit",
  createProxyMiddleware({
    target: bybitTarget,
    changeOrigin: true,
    pathRewrite: { "^/bybit": "" },
    followRedirects: true,
    onProxyReq: logProxyRequest("BYBIT"),
    onProxyRes: logProxyResponse("BYBIT"),
  })
);

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => {
  console.log(`SWIMM proxy listening on ${port}`);
});
