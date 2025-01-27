document.addEventListener("DOMContentLoaded", function () {
  const ordersContainer = document.getElementById("orders-container");
  const positionsContainer = document.getElementById("positions-container");

  // Configuration for refresh rates and retry settings
  const CONFIG = {
    POSITION_REFRESH_RATE: 5000, // 5 seconds
    ORDER_REFRESH_RATE: 5000, // 5 seconds
    RETRY_DELAY: 10000, // 10 seconds on error
    MAX_RETRY_COUNT: 3, // Maximum number of retries on error
  };

  // State management
  let retryCount = 0;
  let lastPositionUpdate = 0;
  let lastOrderUpdate = 0;
  let listenKey = null;
  let userWebSocket = null;

  // Create tables for orders and positions
  function createOrdersTable() {
    const table = document.createElement("table");
    table.className = "balance-table";
    table.innerHTML = `
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Side</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="orders-body"></tbody>
        `;
    ordersContainer.innerHTML = ""; // Clear existing content
    ordersContainer.appendChild(table);
  }

  function createPositionsTable() {
    const table = document.createElement("table");
    table.className = "balance-table";
    table.innerHTML = `
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Position Size</th>
              <th>Entry Price</th>
              <th>Mark Price</th>
              <th>PnL</th>
            </tr>
          </thead>
          <tbody id="positions-body"></tbody>
        `;
    positionsContainer.innerHTML = ""; // Clear existing content
    positionsContainer.appendChild(table);
  }

  // Initial table creation
  createOrdersTable();
  createPositionsTable();

  // Throttled fetch functions
  async function throttledFetchPositions() {
    const now = Date.now();
    if (now - lastPositionUpdate >= CONFIG.POSITION_REFRESH_RATE) {
      try {
        const response = await fetch("/get_positions");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const positions = await response.json();
        updatePositions(
          positions.filter((position) => parseFloat(position.positionAmt) !== 0)
        );
        lastPositionUpdate = now;
        retryCount = 0; // Reset retry count on success
      } catch (error) {
        console.error("Error fetching positions:", error);
        handleFetchError();
      }
    }
  }

  async function throttledFetchOrders() {
    const now = Date.now();
    if (now - lastOrderUpdate >= CONFIG.ORDER_REFRESH_RATE) {
      try {
        const response = await fetch("/get_open_orders");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const orders = await response.json();
        updateOrders(orders);
        lastOrderUpdate = now;
        retryCount = 0; // Reset retry count on success
      } catch (error) {
        console.error("Error fetching orders:", error);
        handleFetchError();
      }
    }
  }

  // Error handling with exponential backoff
  function handleFetchError() {
    retryCount++;
    if (retryCount <= CONFIG.MAX_RETRY_COUNT) {
      const backoffDelay = CONFIG.RETRY_DELAY * Math.pow(2, retryCount - 1);
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

  function showErrorMessage(message) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
  }

  // Update orders display
  function updateOrders(orders) {
    console.log("Updating orders:", orders);
    const tbody = document.getElementById("orders-body");
    if (!tbody) {
      console.error("Orders tbody not found");
      return;
    }
    tbody.innerHTML = "";

    if (!Array.isArray(orders)) {
      console.error("Orders is not an array:", orders);
      return;
    }

    if (orders.length === 0) {
      const row = document.createElement("tr");
      row.innerHTML =
        '<td colspan="5" style="text-align: center;">No open orders</td>';
      tbody.appendChild(row);
      return;
    }

    orders.forEach((order) => {
      const row = document.createElement("tr");
      row.innerHTML = `
            <td>${order.symbol || order.s || "-"}</td>
            <td class="${order.side === "BUY" ? "positive" : "negative"}">${
        order.side || order.S || "-"
      }</td>
            <td>${parseFloat(order.price || order.p || 0).toFixed(4)}</td>
            <td>${parseFloat(order.origQty || order.q || 0).toFixed(4)}</td>
            <td>${order.status || order.X || "-"}</td>
          `;
      tbody.appendChild(row);
    });
  }

  // Update positions display
  function updatePositions(positions) {
    console.log("Updating positions:", positions);
    const tbody = document.getElementById("positions-body");
    if (!tbody) {
      console.error("Positions tbody not found");
      return;
    }
    tbody.innerHTML = "";

    if (!Array.isArray(positions)) {
      console.error("Positions is not an array:", positions);
      return;
    }

    let hasValidPositions = false;
    positions.forEach((position) => {
      const positionAmt = parseFloat(position.positionAmt || position.pa || 0);
      if (positionAmt !== 0) {
        hasValidPositions = true;
        const row = document.createElement("tr");
        const pnl = parseFloat(
          position.unPnl || position.unrealizedProfit || position.up || 0
        );
        const pnlClass = pnl >= 0 ? "positive" : "negative";
        const side = positionAmt > 0 ? "LONG" : "SHORT";
        const sideClass = positionAmt > 0 ? "positive" : "negative";

        row.innerHTML = `
              <td>${position.symbol || position.s || "-"}</td>
              <td class="${sideClass}">${side} ${Math.abs(positionAmt).toFixed(
          4
        )}</td>
              <td>${parseFloat(position.entryPrice || position.ep || 0).toFixed(
                4
              )}</td>
              <td>${parseFloat(position.markPrice || position.mp || 0).toFixed(
                4
              )}</td>
              <td class="${pnlClass}">${pnl.toFixed(4)} USDT</td>
            `;
        tbody.appendChild(row);
      }
    });

    if (!hasValidPositions) {
      const row = document.createElement("tr");
      row.innerHTML =
        '<td colspan="5" style="text-align: center;">No open positions</td>';
      tbody.appendChild(row);
    }
  }

  // Get listen key from backend
  async function getListenKey() {
    try {
      const response = await fetch("/get_listen_key", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("Listen key received:", data);
      return data.listenKey;
    } catch (error) {
      console.error("Error getting listen key:", error);
      return null;
    }
  }

  // Keep listen key alive
  function keepListenKeyAlive() {
    if (listenKey) {
      fetch("/keep_listen_key_alive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ listenKey }),
      }).catch((error) =>
        console.error("Error keeping listen key alive:", error)
      );
    }
  }

  // WebSocket connection handler
  async function connectUserWebSocket() {
    try {
      if (!listenKey) {
        listenKey = await getListenKey();
        if (!listenKey) {
          console.error("Failed to get listen key");
          setTimeout(connectUserWebSocket, 5000);
          return;
        }
      }

      userWebSocket = new WebSocket(
        `wss://fstream.binance.com/ws/${listenKey}`
      );

      userWebSocket.onopen = () => {
        console.log("WebSocket connected");
        // Fetch initial data
        throttledFetchPositions();
        throttledFetchOrders();
      };

      userWebSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.e === "ORDER_TRADE_UPDATE") {
          throttledFetchOrders();
          throttledFetchPositions(); // Also update positions as they might have changed
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

      // Keep-alive for WebSocket
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
    // Initial fetch
    throttledFetchPositions();
    throttledFetchOrders();

    // Set up periodic polling as backup
    setInterval(() => {
      throttledFetchPositions();
      throttledFetchOrders();
    }, CONFIG.POSITION_REFRESH_RATE);

    // Start WebSocket connection
    connectUserWebSocket();

    // Keep listen key alive every 30 minutes
    setInterval(keepListenKeyAlive, 30 * 60 * 1000);
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
        button.innerHTML = '<i class="fas fa-sync-alt"></i>'; // Using Font Awesome icon
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
    if (userWebSocket) {
      userWebSocket.close();
    }
  });
});
