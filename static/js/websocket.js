import { validateChartData } from "./utils.js";

export function setupWebSockets(timeframes, charts) {
  const webSockets = {};
  Object.entries(timeframes).forEach(([timeframe, config]) => {
    if (charts[timeframe]) {
      webSockets[timeframe] = setupWebSocket(timeframe, config, charts);
    }
  });

  window.addEventListener("beforeunload", () => {
    Object.values(webSockets).forEach((ws) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
  });
}

function setupWebSocket(timeframe, config, charts) {
  let ws = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const reconnectDelay = 5000;

  function connect() {
    ws = new WebSocket(
      `wss://fstream.binance.com/ws/xrpusdt${config.wsInterval}`
    );

    ws.onmessage = function (event) {
      try {
        const messageObject = JSON.parse(event.data);
        const candlestick = messageObject.k;

        if (
          !candlestick ||
          !validateChartData([
            {
              time: candlestick.t / 1000,
              open: candlestick.o,
              high: candlestick.h,
              low: candlestick.l,
              close: candlestick.c,
            },
          ]).length
        ) {
          return;
        }

        charts[timeframe].candlestickSeries.update({
          time: Math.floor(candlestick.t / 1000),
          open: Number(parseFloat(candlestick.o).toFixed(4)),
          high: Number(parseFloat(candlestick.h).toFixed(4)),
          low: Number(parseFloat(candlestick.l).toFixed(4)),
          close: Number(parseFloat(candlestick.c).toFixed(4)),
        });

        charts[timeframe].volumeSeries.update({
          time: Math.floor(candlestick.t / 1000),
          value: Number(parseFloat(candlestick.v).toFixed(4)),
          color:
            parseFloat(candlestick.c) >= parseFloat(candlestick.o)
              ? "#26a69a"
              : "#ef5350",
        });
      } catch (error) {
        console.error(
          `Error processing WebSocket message for ${timeframe}:`,
          error
        );
      }
    };

    ws.onerror = function (error) {
      console.error(`WebSocket error for ${timeframe}:`, error);
    };

    ws.onclose = function () {
      console.log(`WebSocket closed for ${timeframe}`);
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        setTimeout(connect, reconnectDelay);
      }
    };

    ws.onopen = function () {
      console.log(`WebSocket connected for ${timeframe}`);
      reconnectAttempts = 0;
    };
  }

  connect();
  return ws;
}
