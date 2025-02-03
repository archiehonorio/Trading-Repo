// trading-grid.js
export function initializeTradingGrid() {
  const priceCheckbox = document.getElementById("market-price-checkbox");
  const priceInput = document.getElementById("price-input");
  let markPriceAvailable = false;

  if (!priceCheckbox || !priceInput) {
    console.warn("Trading grid elements not found");
    return;
  }

  // Handle initial state
  priceCheckbox.disabled = true;
  priceInput.placeholder = "Waiting for mark price...";

  document.addEventListener("markPriceUpdate", () => {
    if (!markPriceAvailable) {
      markPriceAvailable = true;
      priceCheckbox.disabled = false;
      priceInput.placeholder = "";
    }
  });

  priceCheckbox.addEventListener("change", (e) => {
    if (e.target.checked) {
      if (window.markPrice) {
        priceInput.value = window.markPrice.toFixed(4);
        priceInput.disabled = true;
      } else {
        console.warn("Mark price not available yet");
        priceCheckbox.checked = false;
        priceInput.disabled = false;
      }
    } else {
      priceInput.value = "";
      priceInput.disabled = false;
    }
  });

  // Real-time updates
  document.addEventListener("markPriceUpdate", (e) => {
    if (priceInput.disabled) {
      priceInput.value = e.detail.price.toFixed(4);
    }
  });
}
