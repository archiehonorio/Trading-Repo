import { initializeCharts } from "./chart.js";
import { setupWebSockets } from "./websocket.js";
import { setupResizeHandling } from "./resize.js";

document.addEventListener("DOMContentLoaded", function () {
  // Get the main container for the charts
  const mainContainer = document.getElementById("container");
  if (!mainContainer) {
    console.error("Main container not found!");
    return;
  }

  // Define the visible range for the charts
  const vR = 20; // Reduced visible range for a more zoomed out view

  // Define the timeframes and their configurations
  const timeframes = {
    "1m": {
      interval: "1m",
      wsInterval: "@kline_1m",
      container: "chart-1m",
      visibleRange: vR,
    },
    "3m": {
      interval: "3m",
      wsInterval: "@kline_3m",
      container: "chart-3m",
      visibleRange: vR,
    },
    "15m": {
      interval: "15m",
      wsInterval: "@kline_15m",
      container: "chart-15m",
      visibleRange: vR,
    },
    "4h": {
      interval: "4h",
      wsInterval: "@kline_4h",
      container: "chart-4h",
      visibleRange: vR,
    },
  };

  // Initialize the charts
  let charts = initializeCharts(mainContainer, timeframes);

  // Get the initial token from the dropdown
  let currentToken = document.getElementById("token-select").value;

  // Set up WebSocket connections for the initial token
  let webSockets = setupWebSockets(timeframes, charts, currentToken);

  // Set up resize handling for the charts
  setupResizeHandling(charts, timeframes);

  // Add an event listener to the "Update Chart" button
  document
    .getElementById("update-chart")
    .addEventListener("click", function () {
      // Get the new token from the dropdown
      const newToken = document.getElementById("token-select").value;

      // Close existing WebSocket connections
      Object.values(webSockets).forEach((ws) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      });

      // Update the charts with the new token
      updateChartsWithNewToken(newToken, charts, timeframes);

      // Reinitialize WebSocket connections for the new token
      webSockets = setupWebSockets(timeframes, charts, newToken);

      // Update the current token
      currentToken = newToken;
    });
});

/**
 * Updates the charts with data for a new token.
 * @param {string} token - The new token symbol (e.g., "BTCUSDT").
 * @param {Object} charts - The charts object to update.
 * @param {Object} timeframes - The timeframes configuration.
 */
function updateChartsWithNewToken(token, charts, timeframes) {
  Object.entries(timeframes).forEach(([timeframe, config]) => {
    if (!charts[timeframe]) return;

    // Fetch historical data for the new token
    fetch(
      `http://127.0.0.1:5000/history?interval=${config.interval}&token=${token}`
    )
      .then((response) => response.json())
      .then((data) => {
        if (!data || !Array.isArray(data) || data.length === 0) {
          console.warn(`No valid data returned for ${timeframe} interval.`);
          return;
        }

        // Format the candlestick data
        const formattedData = data.map((item) => ({
          time: Math.floor(item.time),
          open: Number(parseFloat(item.open).toFixed(4)),
          high: Number(parseFloat(item.high).toFixed(4)),
          low: Number(parseFloat(item.low).toFixed(4)),
          close: Number(parseFloat(item.close).toFixed(4)),
        }));

        // Format the volume data
        const volumeData = data
          .map((item) => ({
            time: Math.floor(item.time),
            value: Number(parseFloat(item.volume).toFixed(4)),
            color:
              parseFloat(item.close) >= parseFloat(item.open)
                ? "#26a69a"
                : "#ef5350",
          }))
          .filter((item) => item.time && !isNaN(item.value));

        // Update the chart with the new data
        const chart = charts[timeframe];
        chart.candlestickSeries.setData(formattedData);
        chart.volumeSeries.setData(volumeData);

        // Fit the content to the chart
        chart.candlestickChart.timeScale().fitContent();
        chart.volumeChart.timeScale().fitContent();
      })
      .catch((error) =>
        console.error(`Error fetching ${timeframe} chart data:`, error)
      );
  });
}
