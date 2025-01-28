import { initializeCharts, fetchDataForCharts } from "./chart.js";
import { setupWebSockets } from "./websocket.js";
import { setupResizeHandling } from "./resize.js";

document.addEventListener("DOMContentLoaded", function () {
  const mainContainer = document.getElementById("container");
  if (!mainContainer) {
    console.error("Main container not found!");
    return;
  }

  const vR = 20; // Visible range for charts
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

  // Initialize charts and WebSockets
  let charts = initializeCharts(mainContainer, timeframes);
  let currentToken = document.getElementById("token-select").value;
  let webSockets = setupWebSockets(timeframes, charts, currentToken);

  // Load initial data
  fetchDataForCharts(timeframes, charts, currentToken);
  setupResizeHandling(charts, timeframes);

  // Update chart button handler
  document
    .getElementById("update-chart")
    .addEventListener("click", function () {
      const newToken = document.getElementById("token-select").value;

      // Close all existing WebSockets
      Object.entries(webSockets).forEach(([timeframe, ws]) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
          console.log(`Closed WebSocket for ${timeframe}`);
        }
      });
      webSockets = {}; // Clear existing references

      // Update historical data first
      updateChartsWithNewToken(newToken, charts, timeframes);

      // Reinitialize WebSockets after short delay
      setTimeout(() => {
        webSockets = setupWebSockets(timeframes, charts, newToken);
        currentToken = newToken;
        console.log(`Switched to ${newToken} futures`);
      }, 500);
    });
});

// Historical data update function
function updateChartsWithNewToken(token, charts, timeframes) {
  Object.entries(timeframes).forEach(([timeframe, config]) => {
    if (!charts[timeframe]) return;

    fetch(
      `http://127.0.0.1:5000/history?interval=${config.interval}&token=${token}`
    )
      .then((response) => response.json())
      .then((data) => {
        if (!data || !Array.isArray(data)) {
          console.warn(`No data for ${timeframe}`);
          return;
        }

        const formattedData = data.map((item) => ({
          time: Math.floor(item.time),
          open: Number(item.open),
          high: Number(item.high),
          low: Number(item.low),
          close: Number(item.close),
        }));

        const volumeData = data.map((item) => ({
          time: Math.floor(item.time),
          value: Number(item.volume),
          color: item.close >= item.open ? "#26a69a" : "#ef5350",
        }));

        const chart = charts[timeframe];
        chart.candlestickSeries.setData(formattedData);
        chart.volumeSeries.setData(volumeData);
        chart.candlestickChart.timeScale().fitContent();
        chart.volumeChart.timeScale().fitContent();
      })
      .catch((error) => console.error(`Fetch error (${timeframe}):`, error));
  });
}
