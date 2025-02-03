// core/state-manager.js
export class StateManager {
  constructor() {
    this.retryCount = 0;
    this.lastPositionUpdate = 0;
    this.lastOrderUpdate = 0;
    this.listenKey = null;
    this.userWebSocket = null;
  }

  setListenKey(key) {
    this.listenKey = key;
  }

  setUserWebSocket(ws) {
    this.userWebSocket = ws;
  }

  incrementRetryCount() {
    this.retryCount++;
  }

  resetRetryCount() {
    this.retryCount = 0;
  }

  updateLastPositionUpdate(time) {
    this.lastPositionUpdate = time;
  }

  updateLastOrderUpdate(time) {
    this.lastOrderUpdate = time;
  }
}
