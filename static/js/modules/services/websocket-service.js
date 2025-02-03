import { validateChartData } from "../utils/validation.js";

export function setupWebSockets(timeframes, charts, token) {
  const webSockets = {};

  Object.entries(timeframes).forEach(([timeframe, config]) => {
    if (!charts[timeframe]) {
      console.error(`No chart found for timeframe: ${timeframe}`);
      return;
    }

    // Close existing WebSocket if present
    if (webSockets[timeframe]) {
      webSockets[timeframe].close();
      delete webSockets[timeframe];
    }

    const wsUrl = `wss://fstream.binance.com/ws/${token.toLowerCase()}${
      config.wsInterval
    }`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (!message.k) return;

        const rawCandle = {
          time: Math.floor(message.k.t / 1000),
          open: parseFloat(message.k.o),
          high: parseFloat(message.k.h),
          low: parseFloat(message.k.l),
          close: parseFloat(message.k.c),
        };

        // Validate using your existing utility
        const [validCandle] = validateChartData([rawCandle]);
        if (!validCandle) return;

        // Update chart
        if (charts[timeframe]?.candlestickSeries) {
          charts[timeframe].candlestickSeries.update(validCandle);
        }
      } catch (error) {
        console.error("WS message error:", error);
      }
    };

    ws.onerror = (error) => {
      console.error(`WebSocket error (${timeframe}):`, error);
    };

    ws.onclose = (event) => {
      console.log(`WebSocket closed (${timeframe}):`, event.code, event.reason);
    };

    webSockets[timeframe] = ws;
  });

  return webSockets;
}
