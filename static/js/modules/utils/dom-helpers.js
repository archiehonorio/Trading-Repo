// utils/dom-helpers.js
export function createOrdersTable(ordersContainer) {
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

export function createPositionsTable(positionsContainer) {
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

export function updateOrders(orders) {
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

export function updatePositions(positions) {
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

export function showErrorMessage(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 5000);
}
