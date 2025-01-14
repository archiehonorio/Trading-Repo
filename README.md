## Binance Websockets and Real-Time Lightweight Charts

The base endpoint is:
wss://stream.binance.com:9443
or
wss://stream.binance.com:443

Combined streams are accessed at /stream?streams=<streamName1>/<streamName2>/<streamName3>

---EXAMPLE---
/ws/<streamName>
/ws/btcusdt

<!-- This is for spot trading -->

wscat -c wss://stream.binance.com:9443/ws/btcusdt@trade

wss://stream.binance.com:9443/ws/btcusdt@trade

<!-- For Candle Stick Charts -->

wss://stream.binance.com:9443/ws/btcusdt@kline_5m

<!-- This is for futures trading -->

wss://fstream.binance.com/ws/btcusdt@aggTrade
wss://fstream.binance.com/ws/btcusdt@kline_5m
