// Server Entrypoint: Express + WebSockets for Indian Virtual Options Trading
// Serves API, WebSockets, and the built React frontend directly on one single port

import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { MarketDataManager } from './marketData.js';
import { TradingEngine } from './tradingEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_PATH = path.join(__dirname, '../dist');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json());

const marketData = new MarketDataManager();
const tradingEngine = new TradingEngine(marketData);

// Broadcast to all active WebSocket clients
function broadcast(payload) {
  const msg = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// Hook market data updates into WebSocket broadcast
marketData.addListener((tick) => {
  broadcast({
    type: 'MARKET_TICK',
    data: tick,
    account: tradingEngine.getAccountSummary(),
  });
});

// Helper to get local network IP address
function getLocalNetworkIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const PORT = process.env.PORT || 3000;

// REST Endpoints
app.get('/api/network-info', (req, res) => {
  const ip = getLocalNetworkIp();
  res.json({
    localIp: ip,
    port: PORT,
    mobileUrl: `http://${ip}:${PORT}`,
  });
});

app.get('/api/market/indices', (req, res) => {
  res.json({
    indices: marketData.indices,
    vix: { ltp: marketData.vix, change: marketData.vixChange },
    expiries: marketData.expiries,
    marketStatus: marketData.marketStatus,
  });
});

app.get('/api/market/option-chain', (req, res) => {
  const symbol = (req.query.symbol || 'NIFTY').toUpperCase();
  const expiry = req.query.expiry || marketData.expiries[0]?.value;

  // Build and fetch option chain
  marketData.buildAllOptionChains(symbol);
  const chainObj = marketData.optionChains[symbol];
  const chain = chainObj ? (chainObj[expiry] || Object.values(chainObj)[0]) : null;

  if (!chain) {
    return res.status(404).json({ error: 'Option chain not found' });
  }

  res.json(chain);
});

app.get('/api/account', (req, res) => {
  res.json(tradingEngine.getAccountSummary());
});

app.post('/api/orders', (req, res) => {
  try {
    const order = tradingEngine.placeOrder(req.body);
    broadcast({
      type: 'ORDER_PLACED',
      order,
      account: tradingEngine.getAccountSummary(),
    });
    res.json({ success: true, order, account: tradingEngine.getAccountSummary() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/positions/:id/square-off', (req, res) => {
  try {
    const result = tradingEngine.squareOffPosition(req.params.id);
    broadcast({
      type: 'POSITION_SQUARED_OFF',
      account: tradingEngine.getAccountSummary(),
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/positions/square-off-all', (req, res) => {
  try {
    const result = tradingEngine.squareOffAll();
    broadcast({
      type: 'ALL_POSITIONS_SQUARED_OFF',
      account: tradingEngine.getAccountSummary(),
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/orders/:id/cancel', (req, res) => {
  try {
    const order = tradingEngine.cancelOrder(req.params.id);
    broadcast({
      type: 'ORDER_CANCELLED',
      order,
      account: tradingEngine.getAccountSummary(),
    });
    res.json({ success: true, order });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/account/reset', (req, res) => {
  const capital = Number(req.body.capital) || 1000000;
  const summary = tradingEngine.resetAccount(capital);
  broadcast({
    type: 'ACCOUNT_RESET',
    account: summary,
  });
  res.json({ success: true, account: summary });
});

app.post('/api/settings/broker', (req, res) => {
  const { provider, apiKey, clientId } = req.body;
  marketData.brokerConfig = {
    provider: provider || 'NSE_LIVE_SIM',
    apiKey: apiKey || '',
    clientId: clientId || '',
  };
  res.json({ success: true, brokerConfig: marketData.brokerConfig });
});

app.get('/api/settings/dhan', (req, res) => {
  res.json({
    isConnected: marketData.dhan.isConnected,
    clientId: marketData.dhan.clientId || '',
    hasToken: Boolean(marketData.dhan.accessToken),
    lastChecked: marketData.dhan.lastChecked,
  });
});

app.post('/api/settings/dhan', async (req, res) => {
  const { clientId, accessToken } = req.body;
  if (!clientId || !accessToken) {
    return res.status(400).json({ success: false, message: 'Client ID and Access Token are required' });
  }

  marketData.dhan.updateCredentials(clientId, accessToken);
  const testRes = await marketData.dhan.testConnection();

  if (testRes.success) {
    marketData.brokerConfig.provider = 'DHAN';
    broadcast({
      type: 'BROKER_STATUS',
      provider: 'DHAN',
      isConnected: true,
    });
  }

  res.json(testRes);
});

// WebSocket Connection
wss.on('connection', (ws) => {
  // Build chains for immediate delivery
  marketData.buildAllOptionChains('NIFTY');
  const defaultChain = marketData.optionChains['NIFTY']?.[marketData.expiries[0]?.value];

  ws.send(
    JSON.stringify({
      type: 'INIT',
      indices: marketData.indices,
      vix: { ltp: marketData.vix, change: marketData.vixChange },
      expiries: marketData.expiries,
      marketStatus: marketData.marketStatus,
      account: tradingEngine.getAccountSummary(),
      initialChain: defaultChain,
    })
  );
});

// Serve Frontend Static Build Directly (eliminates proxy EPERM issues)
if (fs.existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/ws')) {
      const indexPath = path.join(DIST_PATH, 'index.html');
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
    }
    next();
  });
}

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalNetworkIp();
  console.log(`🚀 OptionPulse Unified Server running on http://localhost:${PORT}`);
  console.log(`📱 Mobile Local Wi-Fi Access: http://${localIp}:${PORT}`);
});
