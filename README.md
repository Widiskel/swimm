# Web Analytic AI

Web Analytic AI is a crypto intelligence dashboard powered by a Sentient Models agent. It streams market data, summarizes sentiment, and produces trade-ready plans (entries, targets, stop, sizing) for supported pairs.

## Features
- Live candlestick streams and order book snapshots for Binance and Bybit markets.
- AI-generated summaries using Sentient Models `dobby-unhinged-llama-3-3-70b-new` plus Tavily news context.
- Ready-to-execute trade plans: entry zone, five take-profit targets, stop loss, execution window, risk sizing, and supporting narrative.
- Multi-language UI (English/Indonesian) with responsive design.
- Historical archive with verdict + feedback tracking.

## Prerequisites
- Node.js 18+ and npm.
- Sentient Models (Fireworks) API key.
- Optional but recommended: Binance and Bybit API keys (public endpoints work without a secret but rate limits are higher with authenticated keys).
- Tavily API key (optional) for headline search and extraction.

## Environment setup
Create a `.env` file in the project root:

```env
FIREWORKS_API_KEY=your_fireworks_key
FIREWORKS_MODEL=accounts/sentientfoundation/models/dobby-unhinged-llama-3-3-70b-new

BINANCE_API_KEY=your_binance_key
BINANCE_API_SECRET=your_binance_secret
BINANCE_PROXY_URL=https://proxy.yourdomain.com/binance

BYBIT_API_KEY=your_bybit_key
BYBIT_API_SECRET=your_bybit_secret
BYBIT_PROXY_URL=https://proxy.yourdomain.com/bybit

TAVILY_API_KEY=your_tavily_key
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
MONGODB_URI=your_mongodb_connection
TWELVEDATA_API_KEY=your_twelvedata_key
```

Only `FIREWORKS_API_KEY` is strictly required locally; other values unlock market data, authentication, or news enrichment. `BINANCE_PROXY_URL` and `BYBIT_PROXY_URL` are optional—set them if your hosting region is blocked by the exchanges.

You can copy `.env.example` for a clean template.

## Local development
```bash
npm install
npm run dev
```
Visit `http://localhost:3000`, choose a trading pair/timeframe, click **Show chart**, then **Analyze**.

## Production build
```bash
npm run build
npm run start
```

## Architecture overview
- `src/app/api/agent/route.ts` builds the structured prompt and calls Sentient Models, injecting Tavily headlines if the key is provided.
- `src/app/api/market/route.ts` proxies Binance/Bybit/TwelveData and returns candles + order book + summary.
- `src/app/api/history/*` manages session-based storage of past analyses (MongoDB URI required).
- UI components live under `src/features/*` and use App Router + client components for interactivity.

## Handling CEX blocking
Binance/Bybit often return HTTP 403/451 to shared cloud IPs. Run the bundled reverse proxy on a VPS in an allowed region and point the app to it via `BINANCE_PROXY_URL` and `BYBIT_PROXY_URL`.

### Proxy server (Docker)
A ready-to-use proxy lives in `proxy-server/`:

```
proxy-server/
├── docker-compose.yml
└── proxy/
    ├── Dockerfile
    ├── index.js
    └── package.json
```

Deploy it on your server:
```bash
cd proxy-server
docker compose up -d
```
The proxy exposes:
- `http://<server>/binance/...` → `https://api.binance.com/...`
- `http://<server>/bybit/...` → `https://api.bybit.com/...`

Put TLS in front (Nginx/Traefik/Caddy) or host behind a load balancer, then set the environment variables to the HTTPS URL.

## Optional enhancements
- Feed additional data sources (on-chain metrics, alternative exchanges) into the analysis prompt.
- Add portfolio management or automated execution integrations.
- Extend the proxy to rotate multiple IPs for more resilient CEX access.

## License
MIT License (see `LICENSE` if available).
