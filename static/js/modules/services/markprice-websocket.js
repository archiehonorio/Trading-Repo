// markprice-websocket.js
let markPriceWs = null;

export function setupMarkPriceWebSocket(token) {
  if (markPriceWs) closeMarkPriceWebSocket();

  const wsUrl = `wss://fstream.binance.com/ws/${token.toLowerCase()}@markPrice`;
  markPriceWs = new WebSocket(wsUrl);

  markPriceWs.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.p) {
        window.markPrice = parseFloat(message.p);
        document.dispatchEvent(
          new CustomEvent("markPriceUpdate", {
            detail: { price: window.markPrice },
          })
        );
      }
    } catch (error) {
      console.error("Mark price parsing error:", error);
    }
  };

  markPriceWs.onerror = (error) => {
    console.error("Mark price WebSocket error:", error);
  };

  markPriceWs.onclose = () => {
    console.log("Mark price WebSocket closed");
  };
}

export function closeMarkPriceWebSocket() {
  if (markPriceWs) {
    markPriceWs.close();
    markPriceWs = null;
  }
}
