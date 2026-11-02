// Market Data Engine for Indian Options (NSE / BSE)
// Connects to live quotes, generates real-time option chains, and provides 24/7 continuous tick simulation

import { calculateGreeks } from './greeks.js';
import { DhanService } from './dhanFeed.js';

export const INDICES_CONFIG = {
  NIFTY: {
    symbol: 'NIFTY',
    name: 'NIFTY 50',
    exchange: 'NSE',
    lotSize: 25,
    strikeStep: 50,
    basePrice: 24150.0,
    vixBase: 13.8,
    yahooTicker: '^NSEI',
  },
  BANKNIFTY: {
    symbol: 'BANKNIFTY',
    name: 'NIFTY BANK',
    exchange: 'NSE',
    lotSize: 15,
    strikeStep: 100,
    basePrice: 51280.0,
    vixBase: 15.2,
    yahooTicker: '^NSEBANK',
  },
  FINNIFTY: {
    symbol: 'FINNIFTY',
    name: 'NIFTY FINANCIAL',
    exchange: 'NSE',
    lotSize: 25,
    strikeStep: 50,
    basePrice: 23620.0,
    vixBase: 14.0,
    yahooTicker: 'NIFTY_FIN_SERVICE.NS',
  },
  SENSEX: {
    symbol: 'SENSEX',
    name: 'BSE SENSEX',
    exchange: 'BSE',
    lotSize: 10,
    strikeStep: 100,
    basePrice: 79800.0,
    vixBase: 13.5,
    yahooTicker: '^BSESN',
  },
};

export class MarketDataManager {
  constructor() {
    this.indices = {};
    this.optionChains = {};
    this.expiries = this.generateExpiries();
    this.listeners = new Set();
    this.vix = 14.15;
    this.vixChange = 0.25;
    this.marketStatus = this.checkMarketStatus();
    this.tickInterval = null;
    this.dhan = new DhanService();
    this.brokerConfig = {
      provider: 'NSE_LIVE_SIM', // 'NSE_LIVE_SIM' | 'DHAN'
      apiKey: '',
      clientId: '',
    };

    this.initIndices();
    this.startTickLoop();
    this.fetchLiveIndexQuotes();
    setInterval(() => this.fetchLiveIndexQuotes(), 30000);
  }

  generateExpiries() {
    const expiries = [];
    const now = new Date();

    // Find next Thursdays
    let candidate = new Date(now);
    let count = 0;
    while (expiries.length < 4 && count < 60) {
      if (candidate.getDay() === 4) { // Thursday
        const dateStr = candidate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const isoStr = candidate.toISOString().split('T')[0];
        expiries.push({ label: dateStr, value: isoStr, date: new Date(candidate) });
      }
      candidate.setDate(candidate.getDate() + 1);
      count++;
    }
    return expiries;
  }

  initIndices() {
    for (const [key, config] of Object.entries(INDICES_CONFIG)) {
      this.indices[key] = {
        symbol: config.symbol,
        name: config.name,
        exchange: config.exchange,
        lotSize: config.lotSize,
        strikeStep: config.strikeStep,
        ltp: config.basePrice,
        open: config.basePrice - 45,
        high: config.basePrice + 110,
        low: config.basePrice - 80,
        close: config.basePrice - 15,
        change: 15.0,
        pChange: 0.06,
        history: this.generateInitialHistory(config.basePrice),
        lastTickTime: Date.now(),
      };
      this.buildAllOptionChains(key);
    }
  }

  generateInitialHistory(base) {
    const pts = [];
    let p = base - 30;
    for (let i = 40; i >= 0; i--) {
      p += (Math.random() - 0.49) * (base * 0.001);
      pts.push({
        time: new Date(Date.now() - i * 60000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        price: Number(p.toFixed(2)),
      });
    }
    return pts;
  }

  checkMarketStatus() {
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istTime = new Date(utcTime + (3600000 * 5.5));

    const day = istTime.getDay();
    const hours = istTime.getHours();
    const minutes = istTime.getMinutes();
    const currentMins = hours * 60 + minutes;

    const isWeekday = day >= 1 && day <= 5;
    const isLiveHours = currentMins >= (9 * 60 + 15) && currentMins <= (15 * 60 + 30);

    return {
      isOpen: isWeekday && isLiveHours,
      session: !isWeekday ? 'Weekend' : (currentMins < 9 * 60 + 15 ? 'Pre-Market' : (currentMins > 15 * 60 + 30 ? 'Post-Market' : 'Regular Market')),
      istTimeStr: istTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      provider: this.dhan?.isConnected ? 'DHAN' : 'SIMULATION',
    };
  }

  async fetchLiveIndexQuotes() {
    try {
      const symbols = ['^NSEI', '^NSEBANK', '^BSESN', '^INDIAVIX'];
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}`;

      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const data = await res.json();
        const results = data?.quoteResponse?.result || [];
        for (const item of results) {
          if (item.symbol === '^NSEI' && this.indices.NIFTY) {
            this.updateIndexWithLiveQuote('NIFTY', item);
          } else if (item.symbol === '^NSEBANK' && this.indices.BANKNIFTY) {
            this.updateIndexWithLiveQuote('BANKNIFTY', item);
          } else if (item.symbol === '^BSESN' && this.indices.SENSEX) {
            this.updateIndexWithLiveQuote('SENSEX', item);
          } else if (item.symbol === '^INDIAVIX') {
            this.vix = item.regularMarketPrice || this.vix;
            this.vixChange = item.regularMarketChange || this.vixChange;
          }
        }
      }
    } catch {
      // Keep running smoothly
    }
  }

  updateIndexWithLiveQuote(key, quote) {
    const idx = this.indices[key];
    if (!idx || !quote.regularMarketPrice) return;

    idx.ltp = Number(quote.regularMarketPrice.toFixed(2));
    idx.open = quote.regularMarketOpen || idx.open;
    idx.high = quote.regularMarketDayHigh || idx.high;
    idx.low = quote.regularMarketDayLow || idx.low;
    idx.close = quote.regularMarketPreviousClose || idx.close;
    idx.change = Number((idx.ltp - idx.close).toFixed(2));
    idx.pChange = Number(((idx.change / idx.close) * 100).toFixed(2));

    this.buildAllOptionChains(key);
  }

  buildAllOptionChains(symbolKey) {
    for (let i = 0; i < this.expiries.length; i++) {
      this.buildOptionChain(symbolKey, i);
    }
  }

  buildOptionChain(symbolKey, expiryIndex = 0) {
    const idx = this.indices[symbolKey];
    if (!idx) return;

    const expiry = this.expiries[expiryIndex] || this.expiries[0];
    const daysToExpiry = Math.max(0.5, (expiry.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const T = daysToExpiry / 365.0;

    const atmStrike = Math.round(idx.ltp / idx.strikeStep) * idx.strikeStep;
    const strikesToShow = 20; // 20 strikes each side = 41 total strikes
    const strikes = [];

    const startStrike = atmStrike - (strikesToShow * idx.strikeStep);
    const endStrike = atmStrike + (strikesToShow * idx.strikeStep);

    const baseIV = (this.vix || 14.0) / 100;

    for (let strike = startStrike; strike <= endStrike; strike += idx.strikeStep) {
      const moneyness = Math.abs(strike - idx.ltp) / idx.ltp;
      const callIv = baseIV + (strike < idx.ltp ? moneyness * 0.15 : moneyness * 0.2);
      const putIv = baseIV + (strike > idx.ltp ? moneyness * 0.15 : moneyness * 0.25);

      const callGreeks = calculateGreeks(idx.ltp, strike, T, 0.065, callIv, 'CE');
      const putGreeks = calculateGreeks(idx.ltp, strike, T, 0.065, putIv, 'PE');

      const distFromAtm = Math.abs(strike - atmStrike) / idx.strikeStep;
      const oiFactor = Math.max(0.1, 1 - (distFromAtm * 0.04));
      const baseOi = Math.round((idx.symbol === 'NIFTY' ? 4500000 : 1800000) * oiFactor);

      strikes.push({
        strikePrice: strike,
        isAtm: strike === atmStrike,
        call: {
          symbol: `${idx.symbol}${expiry.label.replace(/ /g, '')}${strike}CE`,
          type: 'CE',
          strikePrice: strike,
          ltp: callGreeks.price,
          change: Number((((callGreeks.price - (callGreeks.price * 0.96)) / (callGreeks.price * 0.96)) * 100).toFixed(2)),
          openInterest: Math.round(baseOi * (0.8 + Math.random() * 0.4)),
          oiChange: Math.round((Math.random() - 0.4) * (baseOi * 0.1)),
          volume: Math.round(baseOi * 0.4 * (0.7 + Math.random() * 0.6)),
          iv: callGreeks.iv,
          delta: callGreeks.delta,
          gamma: callGreeks.gamma,
          theta: callGreeks.theta,
          vega: callGreeks.vega,
          bid: Number((callGreeks.price - 0.1).toFixed(2)),
          ask: Number((callGreeks.price + 0.1).toFixed(2)),
        },
        put: {
          symbol: `${idx.symbol}${expiry.label.replace(/ /g, '')}${strike}PE`,
          type: 'PE',
          strikePrice: strike,
          ltp: putGreeks.price,
          change: Number((((putGreeks.price - (putGreeks.price * 1.04)) / (putGreeks.price * 1.04)) * 100).toFixed(2)),
          openInterest: Math.round(baseOi * (0.75 + Math.random() * 0.5)),
          oiChange: Math.round((Math.random() - 0.4) * (baseOi * 0.1)),
          volume: Math.round(baseOi * 0.35 * (0.7 + Math.random() * 0.6)),
          iv: putGreeks.iv,
          delta: putGreeks.delta,
          gamma: putGreeks.gamma,
          theta: putGreeks.theta,
          vega: putGreeks.vega,
          bid: Number((putGreeks.price - 0.1).toFixed(2)),
          ask: Number((putGreeks.price + 0.1).toFixed(2)),
        },
      });
    }

    if (!this.optionChains[symbolKey]) {
      this.optionChains[symbolKey] = {};
    }
    this.optionChains[symbolKey][expiry.value] = {
      symbol: symbolKey,
      spotPrice: idx.ltp,
      atmStrike,
      expiry: expiry.value,
      expiryLabel: expiry.label,
      strikes,
      lastUpdated: Date.now(),
    };
  }

  startTickLoop() {
    this.tickInterval = setInterval(() => {
      this.marketStatus = this.checkMarketStatus();

      for (const key of Object.keys(this.indices)) {
        const idx = this.indices[key];
        const shock = (Math.random() - 0.495) * (idx.ltp * 0.00035);
        const oldLtp = idx.ltp;
        idx.ltp = Number((idx.ltp + shock).toFixed(2));
        idx.high = Math.max(idx.high, idx.ltp);
        idx.low = Math.min(idx.low, idx.ltp);
        idx.change = Number((idx.ltp - idx.close).toFixed(2));
        idx.pChange = Number(((idx.change / idx.close) * 100).toFixed(2));
        idx.lastTickDirection = idx.ltp >= oldLtp ? 'up' : 'down';
        idx.lastTickTime = Date.now();

        const lastHist = idx.history[idx.history.length - 1];
        const nowTimeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        if (lastHist && lastHist.time === nowTimeStr) {
          lastHist.price = idx.ltp;
        } else {
          idx.history.push({ time: nowTimeStr, price: idx.ltp });
          if (idx.history.length > 50) idx.history.shift();
        }

        // Recompute all option chains
        this.buildAllOptionChains(key);
      }

      this.vix = Number(Math.max(9.0, Math.min(28.0, this.vix + (Math.random() - 0.49) * 0.04)).toFixed(2));

      this.notifyListeners({
        type: 'TICK',
        indices: this.indices,
        vix: { ltp: this.vix, change: this.vixChange },
        marketStatus: this.marketStatus,
      });
    }, 1500);
  }

  getOptionContract(symbolKey, strikePrice, type, expiryValue) {
    const idx = this.indices[symbolKey] || this.indices.NIFTY;
    const strike = Number(strikePrice);
    const chainObj = this.optionChains[symbolKey];

    // Find expiry or fallback
    const expiryKey = expiryValue && chainObj?.[expiryValue] ? expiryValue : (chainObj ? Object.keys(chainObj)[0] : this.expiries[0]?.value);
    const chain = chainObj ? (chainObj[expiryKey] || Object.values(chainObj)[0]) : null;

    if (chain) {
      const row = chain.strikes?.find((s) => s.strikePrice === strike);
      if (row) {
        return type === 'CE' ? row.call : row.put;
      }
    }

    // Dynamic fallback generation using Black-Scholes so an order NEVER fails!
    const expiryObj = this.expiries.find(e => e.value === expiryKey) || this.expiries[0];
    const daysToExpiry = Math.max(0.5, (expiryObj.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const T = daysToExpiry / 365.0;
    const baseIV = (this.vix || 14.0) / 100;
    const moneyness = Math.abs(strike - idx.ltp) / idx.ltp;
    const iv = type === 'CE' ? baseIV + moneyness * 0.18 : baseIV + moneyness * 0.22;
    const greeks = calculateGreeks(idx.ltp, strike, T, 0.065, iv, type);

    return {
      symbol: `${symbolKey}${expiryObj.label.replace(/ /g, '')}${strike}${type}`,
      type,
      strikePrice: strike,
      ltp: greeks.price,
      change: 0.5,
      openInterest: 1500000,
      oiChange: 25000,
      volume: 450000,
      iv: greeks.iv,
      delta: greeks.delta,
      gamma: greeks.gamma,
      theta: greeks.theta,
      vega: greeks.vega,
      bid: Number((greeks.price - 0.1).toFixed(2)),
      ask: Number((greeks.price + 0.1).toFixed(2)),
    };
  }

  notifyListeners(data) {
    for (const listener of this.listeners) {
      try {
        listener(data);
      } catch {
        // ignore
      }
    }
  }

  addListener(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}
