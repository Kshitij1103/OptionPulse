// Frontend API & WebSocket Client for Virtual Trading

function getApiBase() {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('optionpulse_server_url');
    if (saved) return saved.replace(/\/$/, '');

    // Check if running inside Capacitor Android APK (protocol is capacitor: or localhost without port 3000)
    const isCapacitor =
      window.location.protocol === 'capacitor:' ||
      (window.location.hostname === 'localhost' && (!window.location.port || window.location.port === '80'));

    if (isCapacitor) {
      return 'http://192.168.1.6:3000';
    }
  }
  return '';
}

async function requestWithFallback(endpoint, options = {}) {
  const base = getApiBase();
  const url = base ? `${base}${endpoint}` : endpoint;
  try {
    const res = await fetch(url, options);
    if (res.ok) return res;
    // If 404 or 500 and we are on port 5173, try direct port 3000
    if (window.location.port === '5173') {
      const fallbackUrl = `http://${window.location.hostname}:3000${endpoint}`;
      const fallbackRes = await fetch(fallbackUrl, options);
      if (fallbackRes.ok) return fallbackRes;
    }
    return res;
  } catch (err) {
    if (!base && window.location.port === '5173') {
      const fallbackUrl = `http://${window.location.hostname}:3000${endpoint}`;
      return fetch(fallbackUrl, options);
    }
    throw err;
  }
}

export const api = {
  async getIndices() {
    const res = await requestWithFallback('/api/market/indices');
    if (!res.ok) throw new Error('Failed to fetch indices');
    return res.json();
  },

  async getOptionChain(symbol, expiry) {
    const params = new URLSearchParams();
    if (symbol) params.append('symbol', symbol);
    if (expiry) params.append('expiry', expiry);
    const res = await requestWithFallback(`/api/market/option-chain?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch option chain');
    return res.json();
  },

  async getAccount() {
    const res = await requestWithFallback('/api/account');
    if (!res.ok) throw new Error('Failed to fetch account');
    return res.json();
  },

  async placeOrder(orderData) {
    const res = await requestWithFallback('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to place order');
    return data;
  },

  async squareOffPosition(positionId) {
    const res = await requestWithFallback(`/api/positions/${positionId}/square-off`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to square off position');
    return data;
  },

  async squareOffAll() {
    const res = await requestWithFallback('/api/positions/square-off-all', {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to square off all positions');
    return data;
  },

  async cancelOrder(orderId) {
    const res = await requestWithFallback(`/api/orders/${orderId}/cancel`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to cancel order');
    return data;
  },

  async resetAccount(capital) {
    const res = await requestWithFallback('/api/account/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capital }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reset account');
    return data;
  },

  async getNetworkInfo() {
    try {
      const res = await requestWithFallback('/api/network-info');
      if (!res.ok) return { localIp: window.location.hostname, mobileUrl: window.location.origin };
      return res.json();
    } catch {
      return { localIp: window.location.hostname, mobileUrl: window.location.origin };
    }
  },

  async setTradingMode(allowOffMarketTrading) {
    const res = await requestWithFallback('/api/settings/trading-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allowOffMarketTrading }),
    });
    return res.json();
  },

  async saveBrokerSettings(settings) {
    const res = await requestWithFallback('/api/settings/broker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.json();
  },

  async getDhanStatus() {
    try {
      const res = await requestWithFallback('/api/settings/dhan');
      if (!res.ok) return { isConnected: false };
      return res.json();
    } catch {
      return { isConnected: false };
    }
  },

  async connectDhan(credentials) {
    const res = await requestWithFallback('/api/settings/dhan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return res.json();
  },

  async getAngelStatus() {
    try {
      const res = await requestWithFallback('/api/settings/angel');
      if (!res.ok) return { isConnected: false, apiKey: 'YzqZSKf4' };
      return res.json();
    } catch {
      return { isConnected: false, apiKey: 'YzqZSKf4' };
    }
  },

  async connectAngel(credentials) {
    const res = await requestWithFallback('/api/settings/angel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return res.json();
  },

  async disconnectAngel() {
    const res = await requestWithFallback('/api/settings/angel/disconnect', {
      method: 'POST',
    });
    return res.json();
  },

  async syncAngelQuotes() {
    const res = await requestWithFallback('/api/market/sync-angel', {
      method: 'POST',
    });
    return res.json();
  },
};

export function connectWebSocket(onMessage, onError) {
  const base = getApiBase();
  let wsUrl = '';
  if (base.startsWith('http://')) {
    wsUrl = base.replace('http://', 'ws://') + '/ws';
  } else if (base.startsWith('https://')) {
    wsUrl = base.replace('https://', 'wss://') + '/ws';
  } else {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const port = window.location.port === '5173' ? '3000' : (window.location.port || '3000');
    wsUrl = `${protocol}//${window.location.hostname}:${port}/ws`;
  }
  let ws = null;
  let retryTimer = null;

  function init() {
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (err) {
          console.error('WS Parse Error', err);
        }
      };

      ws.onclose = () => {
        retryTimer = setTimeout(init, 3000);
      };

      ws.onerror = (err) => {
        if (onError) onError(err);
        ws.close();
      };
    } catch (e) {
      retryTimer = setTimeout(init, 3000);
    }
  }

  init();

  return () => {
    if (retryTimer) clearTimeout(retryTimer);
    if (ws) ws.close();
  };
}
