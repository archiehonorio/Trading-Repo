import { initializeCharts } from "./modules/charts/chart-manager.js";
import { fetchDataForCharts } from "./modules/charts/chart-data-service.js";
import { setupWebSockets } from "./modules/services/websocket-service.js";
import { setupResizeHandling } from "./modules/utils/resize-handler.js";
import { initializeFormControls } from "./modules/forms/form.js"; // Add this import

import { CONFIG } from "./modules/config/constants.js";
import { StateManager } from "./modules/core/state-manager.js";
import {
  createOrdersTable,
  createPositionsTable,
  updateOrders,
  updatePositions,
  showErrorMessage,
} from "./modules/utils/dom-helpers.js";
import {
  fetchPositions,
  fetchOrders,
  getListenKey,
  keepListenKeyAlive,
} from "./modules/services/api/binance-service.js";

document.addEventListener("DOMContentLoaded", function () {
  const mainContainer = document.getElementById("container");
  if (!mainContainer) {
    console.error("Main container not found!");
    return;
  }

  // Initialize form controls
  initializeFormControls(); // Add this line

  const vR = 20;
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
  const charts = initializeCharts(mainContainer, timeframes);
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
        setTimeout(() => {
          if (
            config.visibleRange &&
            formattedData.length >= config.visibleRange
          ) {
            const startIndex = formattedData.length - config.visibleRange;
            const timeRange = {
              from: formattedData[startIndex].time,
              to: formattedData[formattedData.length - 1].time,
            };
            chart.candlestickChart.timeScale().setVisibleRange(timeRange);
            chart.volumeChart.timeScale().setVisibleRange(timeRange);
          } else {
            chart.candlestickChart.timeScale().fitContent();
            chart.volumeChart.timeScale().fitContent();
          }
        }, 250); // Short delay for chart rendering
      })
      .catch((error) => console.error(`Fetch error (${timeframe}):`, error));
  });
}

document.addEventListener("DOMContentLoaded", function () {
  const ordersContainer = document.getElementById("orders-container");
  const positionsContainer = document.getElementById("positions-container");

  const stateManager = new StateManager();

  // Initial table creation
  createOrdersTable(ordersContainer);
  createPositionsTable(positionsContainer);

  // Throttled fetch functions
  async function throttledFetchPositions() {
    const now = Date.now();
    if (now - stateManager.lastPositionUpdate >= CONFIG.POSITION_REFRESH_RATE) {
      try {
        const positions = await fetchPositions();
        updatePositions(
          positions.filter((position) => parseFloat(position.positionAmt) !== 0)
        );
        stateManager.updateLastPositionUpdate(now);
        stateManager.resetRetryCount();
      } catch (error) {
        console.error("Error fetching positions:", error);
        handleFetchError();
      }
    }
  }

  async function throttledFetchOrders() {
    const now = Date.now();
    if (now - stateManager.lastOrderUpdate >= CONFIG.ORDER_REFRESH_RATE) {
      try {
        const orders = await fetchOrders();
        updateOrders(orders);
        stateManager.updateLastOrderUpdate(now);
        stateManager.resetRetryCount();
      } catch (error) {
        console.error("Error fetching orders:", error);
        handleFetchError();
      }
    }
  }

  // Error handling with exponential backoff
  function handleFetchError() {
    stateManager.incrementRetryCount();
    if (stateManager.retryCount <= CONFIG.MAX_RETRY_COUNT) {
      const backoffDelay =
        CONFIG.RETRY_DELAY * Math.pow(2, stateManager.retryCount - 1);
      console.log(`Retrying in ${backoffDelay / 1000} seconds...`);
      setTimeout(() => {
        throttledFetchPositions();
        throttledFetchOrders();
      }, backoffDelay);
    } else {
      console.error(
        "Max retry attempts reached. Please check your connection."
      );
      showErrorMessage("Connection issues detected. Please refresh the page.");
    }
  }

  // WebSocket connection handler
  async function connectUserWebSocket() {
    try {
      if (!stateManager.listenKey) {
        stateManager.setListenKey(await getListenKey());
        if (!stateManager.listenKey) {
          console.error("Failed to get listen key");
          setTimeout(connectUserWebSocket, 5000);
          return;
        }
      }

      const userWebSocket = new WebSocket(
        `wss://fstream.binance.com/ws/${stateManager.listenKey}`
      );
      stateManager.setUserWebSocket(userWebSocket);

      userWebSocket.onopen = () => {
        console.log("WebSocket connected");
        throttledFetchPositions();
        throttledFetchOrders();
      };

      userWebSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.e === "ORDER_TRADE_UPDATE") {
          throttledFetchOrders();
          throttledFetchPositions();
        } else if (data.e === "ACCOUNT_UPDATE") {
          throttledFetchPositions();
        }
      };

      userWebSocket.onclose = () => {
        console.log("WebSocket connection closed. Reconnecting...");
        setTimeout(connectUserWebSocket, 5000);
      };

      userWebSocket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      setInterval(() => {
        if (userWebSocket && userWebSocket.readyState === WebSocket.OPEN) {
          userWebSocket.send(JSON.stringify({ method: "keepalive" }));
        }
      }, 30000);
    } catch (error) {
      console.error("Error in connectUserWebSocket:", error);
      setTimeout(connectUserWebSocket, 5000);
    }
  }

  // Start the auto-refresh system
  function startAutoRefresh() {
    throttledFetchPositions();
    throttledFetchOrders();

    setInterval(() => {
      throttledFetchPositions();
      throttledFetchOrders();
    }, CONFIG.POSITION_REFRESH_RATE);

    connectUserWebSocket();

    setInterval(
      () => keepListenKeyAlive(stateManager.listenKey),
      30 * 60 * 1000
    );
  }

  // Add refresh buttons
  function addRefreshButtons() {
    const ordersHeader = document.querySelector(
      "#orders-section .section-title"
    );
    const positionsHeader = document.querySelector(
      "#positions-section .section-title"
    );

    if (ordersHeader && positionsHeader) {
      const createRefreshButton = (onClick) => {
        const button = document.createElement("button");
        button.className = "refresh-button";
        button.innerHTML = '<i class="fas fa-sync-alt"></i>';
        button.onclick = onClick;
        return button;
      };

      ordersHeader.appendChild(createRefreshButton(throttledFetchOrders));
      positionsHeader.appendChild(createRefreshButton(throttledFetchPositions));
    }
  }

  // Initialize everything
  startAutoRefresh();
  addRefreshButtons();

  // Clean up on page unload
  window.addEventListener("beforeunload", () => {
    if (stateManager.userWebSocket) {
      stateManager.userWebSocket.close();
    }
  });
});
