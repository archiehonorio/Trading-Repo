import { validateChartData } from "./utils.js";

/**
 * Sets up WebSocket connections for each timeframe and token.
 * @param {Object} timeframes - The timeframes configuration.
 * @param {Object} charts - The charts object to update.
 * @param {string} token - The token symbol (e.g., "XRPUSDT").
 */
export function setupWebSockets(timeframes, charts, token) {
  const webSockets = {};

  Object.entries(timeframes).forEach(([timeframe, config]) => {
    if (!charts[timeframe]) return;

    // Close existing WebSocket if it exists
    if (webSockets[timeframe]) {
      webSockets[timeframe].close();
      delete webSockets[timeframe];
    }

    // Create new WebSocket connection for futures
    const ws = new WebSocket(
      `wss://fstream.binance.com/ws/${token.toLowerCase()}${config.wsInterval}`
    );

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.k) {
        const kline = message.k;
        const newCandle = {
          time: Math.floor(kline.t / 1000),
          open: parseFloat(kline.o),
          high: parseFloat(kline.h),
          low: parseFloat(kline.l),
          close: parseFloat(kline.c),
        };

        // Update chart with new candle
        charts[timeframe].candlestickSeries.update(newCandle);
      }
    };

    webSockets[timeframe] = ws;
  });

  return webSockets;
}

/**
 * Sets up a WebSocket connection for a specific timeframe and token.
 * @param {string} timeframe - The timeframe (e.g., "1m").
 * @param {Object} config - The configuration for the timeframe.
 * @param {Object} charts - The charts object to update.
 * @param {string} token - The token symbol (e.g., "XRPUSDT").
 * @returns {WebSocket} The WebSocket instance.
 */
function setupWebSocket(timeframe, config, charts, token) {
  let ws = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const reconnectDelay = 5000;

  /**
   * Connects to the WebSocket and sets up event handlers.
   */
  function connect() {
    // Construct the WebSocket URL using the token and timeframe
    const wsUrl = `wss://fstream.binance.com/ws/${token.toLowerCase()}${
      config.wsInterval
    }`;
    ws = new WebSocket(wsUrl);

    // Handle incoming messages
    ws.onmessage = function (event) {
      try {
        const messageObject = JSON.parse(event.data);
        const candlestick = messageObject.k;

        // Validate the candlestick data
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

        // Update the candlestick chart
        charts[timeframe].candlestickSeries.update({
          time: Math.floor(candlestick.t / 1000),
          open: Number(parseFloat(candlestick.o).toFixed(4)),
          high: Number(parseFloat(candlestick.h).toFixed(4)),
          low: Number(parseFloat(candlestick.l).toFixed(4)),
          close: Number(parseFloat(candlestick.c).toFixed(4)),
        });

        // Update the volume chart
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

    // Handle WebSocket errors
    ws.onerror = function (error) {
      console.error(`WebSocket error for ${timeframe}:`, error);
    };

    // Handle WebSocket closure
    ws.onclose = function () {
      console.log(`WebSocket closed for ${timeframe}`);
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        setTimeout(connect, reconnectDelay); // Reconnect after a delay
      }
    };

    // Handle WebSocket connection opening
    ws.onopen = function () {
      console.log(`WebSocket connected for ${timeframe}`);
      reconnectAttempts = 0; // Reset reconnect attempts on successful connection
    };
  }

  // Initiate the WebSocket connection
  connect();
  return ws;
}
