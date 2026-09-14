# 🤖 Geno AI — Binance Trading Dashboard

A Flask dashboard for Binance: real-time candlestick charts over Binance websockets, spot / funding / futures wallet balances, open orders and positions, and limit-order trading.

**Stack:** Flask + Flask-SocketIO · python-binance · TA-Lib · Lightweight Charts

> ⚠️ This app places real orders with your Binance API key. Use a key restricted to your server's IP with withdrawals disabled.

## Run with Docker

```bash
cp .env.example .env     # fill in API_KEY, API_SECRET, APP_SECRET_KEY
docker compose up -d --build
```

Open http://localhost:5000

The image builds the TA-Lib C library (v0.6.4) and runs the app with gunicorn (one worker, threaded, as Flask-SocketIO expects).

### Deploy on Coolify

1. New resource → **Docker Compose** → this repo.
2. Put your domain on the `geno-ai` service (port **5000**).
3. Set `API_KEY`, `API_SECRET` and `APP_SECRET_KEY`.

> Binance blocks API access from some countries (HTTP 451, e.g. US-based servers). Pick a Contabo region where Binance is available.

---

## Binance websocket notes

The base endpoint is `wss://stream.binance.com:9443` (or `:443`). Combined streams are accessed at `/stream?streams=<streamName1>/<streamName2>`.

```
# Spot trades
wss://stream.binance.com:9443/ws/btcusdt@trade

# Candlestick charts
wss://stream.binance.com:9443/ws/btcusdt@kline_5m

# Futures
wss://fstream.binance.com/ws/btcusdt@aggTrade
wss://fstream.binance.com/ws/btcusdt@kline_5m
```
