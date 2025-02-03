// services/api-service.js
import { CONFIG } from "../../config/constants.js";

export async function fetchPositions() {
  try {
    const response = await fetch("/get_positions");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching positions:", error);
    throw error;
  }
}

export async function fetchOrders() {
  try {
    const response = await fetch("/get_open_orders");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching orders:", error);
    throw error;
  }
}

export async function getListenKey() {
  try {
    const response = await fetch("/get_listen_key", {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.listenKey;
  } catch (error) {
    console.error("Error getting listen key:", error);
    throw error;
  }
}

export function keepListenKeyAlive(listenKey) {
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
