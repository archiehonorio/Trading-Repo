import { initializeCharts } from "./chart.js";
import { setupWebSockets } from "./websocket.js";
import { setupResizeHandling } from "./resize.js";

document.addEventListener("DOMContentLoaded", function () {
  const mainContainer = document.getElementById("container");
  if (!mainContainer) {
    console.error("Main container not found!");
    return;
  }

  const vR = 20; // Reduced visible range for a more zoomed out view
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

  const charts = initializeCharts(mainContainer, timeframes);
  setupWebSockets(timeframes, charts);
  setupResizeHandling(charts, timeframes);
});
