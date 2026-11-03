// Angel One SmartAPI Integration Service
// 100% Free Live Indian Market Data & Options WebSocket Feed

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SESSION_FILE = path.join(__dirname, 'angel_session.json');

export function generateTOTP(secret) {
  if (!secret) return '';
  const cleanSecret = secret.replace(/\s/g, '').toUpperCase();
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (let i = 0; i < cleanSecret.length; i++) {
    const val = base32chars.indexOf(cleanSecret[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substr(i, 8), 2));
  }
  const key = Buffer.from(bytes);
  const epoch = Math.floor(Date.now() / 1000);
  const time = Buffer.alloc(8);
  time.writeBigInt64BE(BigInt(Math.floor(epoch / 30)));
  const hmac = crypto.createHmac('sha1', key).update(time).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (
    ((hmac[offset] & 0x7f) << 24 |
      (hmac[offset + 1] & 0xff) << 16 |
      (hmac[offset + 2] & 0xff) << 8 |
      (hmac[offset + 3] & 0xff)) %
    1000000
  );
  return code.toString().padStart(6, '0');
}

export class AngelService {
  constructor(config = {}) {
    this.apiKey = config.apiKey || 'YzqZSKf4';
    this.clientCode = config.clientCode || 'STSB1143';
    this.mpin = config.mpin || '';
    this.totpSecret = config.totpSecret || 'NKJJ3IIQNIPQOE4UY6I6NNKOLQ';
    this.jwtToken = '';
    this.feedToken = '';
    this.refreshToken = '';
    this.isConnected = false;
    this.lastChecked = null;
    this.lastFeedTime = null;
    this.baseUrl = 'https://apiconnect.angelone.in';
    this.scripCache = new Map();

    this.loadSession();
  }

  loadSession() {
    try {
      if (fs.existsSync(SESSION_FILE)) {
        const raw = fs.readFileSync(SESSION_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (data.jwtToken) {
          this.apiKey = data.apiKey || this.apiKey;
          this.clientCode = data.clientCode || this.clientCode;
          this.totpSecret = data.totpSecret || this.totpSecret;
          if (data.mpin) this.mpin = data.mpin;
          this.jwtToken = data.jwtToken;
          this.feedToken = data.feedToken || '';
          this.refreshToken = data.refreshToken || '';
          this.isConnected = Boolean(data.isConnected);
          this.lastChecked = data.savedAt || Date.now();
          console.log(`[AngelService] Loaded saved session for ${this.clientCode} (connected: ${this.isConnected})`);
        }
      }
    } catch (err) {
      console.warn('[AngelService] Error loading session file:', err.message);
    }
  }

  saveSession() {
    try {
      const data = {
        apiKey: this.apiKey,
        clientCode: this.clientCode,
        totpSecret: this.totpSecret,
        mpin: this.mpin || '',
        jwtToken: this.jwtToken,
        feedToken: this.feedToken,
        refreshToken: this.refreshToken,
        isConnected: this.isConnected,
        savedAt: Date.now(),
      };
      fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[AngelService] Error saving session file:', err.message);
    }
  }

  updateCredentials({ apiKey, clientCode, mpin, totpSecret }) {
    if (apiKey) this.apiKey = apiKey.trim();
    if (clientCode) this.clientCode = clientCode.trim();
    if (mpin) this.mpin = mpin.trim();
    if (totpSecret) this.totpSecret = totpSecret.trim();
  }

  async login(oneTimeOtp = null) {
    if (!this.apiKey || !this.clientCode || !this.mpin) {
      return {
        success: false,
        message: 'Missing credentials. Need API Key, Client Code, and MPIN/Password.',
      };
    }

    const totpCode = oneTimeOtp || generateTOTP(this.totpSecret);
    if (!totpCode) {
      return {
        success: false,
        message: 'TOTP Secret Key or 6-digit TOTP code is required for Angel One SmartAPI login.',
      };
    }

    try {
      const res = await fetch(`${this.baseUrl}/rest/auth/angelbroking/user/v1/loginByPassword`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '192.168.1.6',
          'X-ClientPublicIP': '223.185.36.94',
          'X-MACAddress': 'fe80::1',
          'X-PrivateKey': this.apiKey,
        },
        body: JSON.stringify({
          clientcode: this.clientCode,
          password: this.mpin,
          totp: totpCode,
        }),
        signal: AbortSignal.timeout(8000),
      });

      const data = await res.json();
      console.log('Angel One API login response:', res.status, data.status ? 'SUCCESS' : data.message);

      if (data.status && data.data?.jwtToken) {
        this.jwtToken = data.data.jwtToken;
        this.feedToken = data.data.feedToken;
        this.refreshToken = data.data.refreshToken;
        this.isConnected = true;
        this.lastChecked = Date.now();
        this.saveSession();
        return {
          success: true,
          message: 'Angel One SmartAPI Authenticated Successfully!',
          data: {
            clientCode: this.clientCode,
            feedToken: this.feedToken,
          },
        };
      } else {
        this.isConnected = false;
        this.saveSession();
        return {
          success: false,
          message: data.message || 'Angel One Authentication Failed (check Client Code, MPIN or TOTP)',
        };
      }
    } catch (err) {
      this.isConnected = false;
      return {
        success: false,
        message: `Angel One connection error: ${err.message}`,
      };
    }
  }

  isTokenExpired(resStatus, data) {
    if (resStatus === 401 || resStatus === 403) return true;
    if (!data) return false;
    if (data.errorCode === 'AG8001' || data.errorcode === 'AG8001') return true;
    if (data.errorCode === 'AB4030' || data.errorcode === 'AB4030') return false; // unfetched market data, not token error
    if (!data.status && typeof data.message === 'string') {
      const msg = data.message.toLowerCase();
      if (msg.includes('token') || msg.includes('jwt') || msg.includes('invalid') || msg.includes('session') || msg.includes('unauthorized')) {
        return true;
      }
    }
    if (data.success === false && typeof data.message === 'string') {
      const msg = data.message.toLowerCase();
      if (msg.includes('token') || msg.includes('jwt') || msg.includes('invalid')) {
        return true;
      }
    }
    return false;
  }

  async renewSession() {
    if (this.renewalPromise) return this.renewalPromise;

    this.renewalPromise = (async () => {
      try {
        if (this.refreshToken) {
          try {
            const res = await fetch(`${this.baseUrl}/rest/auth/angelbroking/jwt/v1/generateTokens`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-UserType': 'USER',
                'X-SourceID': 'WEB',
                'X-ClientLocalIP': '192.168.1.6',
                'X-ClientPublicIP': '223.185.36.94',
                'X-MACAddress': 'fe80::1',
                'X-PrivateKey': this.apiKey,
                'Authorization': `Bearer ${this.refreshToken}`,
              },
              body: JSON.stringify({
                refreshToken: this.refreshToken,
              }),
              signal: AbortSignal.timeout(6000),
            });

            const data = await res.json();
            if (data.status && data.data?.jwtToken) {
              this.jwtToken = data.data.jwtToken;
              this.feedToken = data.data.feedToken || this.feedToken;
              this.refreshToken = data.data.refreshToken || this.refreshToken;
              this.isConnected = true;
              this.lastChecked = Date.now();
              this.saveSession();
              console.log('[AngelService] Session renewed successfully with refreshToken');
              return true;
            }
          } catch (err) {
            console.warn('[AngelService] Refresh token renew failed:', err.message);
          }
        }

        if (this.mpin && (this.totpSecret || this.clientCode)) {
          console.log('[AngelService] Auto-authenticating with saved TOTP secret & MPIN...');
          const loginRes = await this.login();
          return Boolean(loginRes.success);
        }
        return false;
      } finally {
        this.renewalPromise = null;
      }
    })();

    return this.renewalPromise;
  }

  // Fetch live index quotes for NIFTY 50, BANKNIFTY, FINNIFTY, SENSEX
  async fetchIndexQuotes() {
    if (!this.isConnected || !this.jwtToken) return null;

    try {
      const res = await fetch(`${this.baseUrl}/rest/secure/angelbroking/market/v1/quote/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '192.168.1.6',
          'X-ClientPublicIP': '223.185.36.94',
          'X-MACAddress': 'fe80::1',
          'X-PrivateKey': this.apiKey,
          'Authorization': `Bearer ${this.jwtToken}`,
        },
        body: JSON.stringify({
          mode: 'FULL',
          exchangeTokens: {
            NSE: ['99926000', '99926009', '99926037'],
            BSE: ['99919000'],
          },
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (res.status === 401 || res.status === 403) {
        console.warn('[AngelService] JWT expired (401/403), renewing...');
        const renewed = await this.renewSession();
        if (renewed) return this.fetchIndexQuotes();
        return null;
      }

      const data = await res.json();
      if (this.isTokenExpired(res.status, data)) {
        console.warn(`[AngelService] Token expired (${data.errorCode || data.message}), auto-renewing session...`);
        const renewed = await this.renewSession();
        if (renewed) return this.fetchIndexQuotes();
        return null;
      }

      if (!data.status || !data.data?.fetched) return null;

      const indices = {};
      for (const item of data.data.fetched) {
        const token = item.symbolToken;
        const sym = (item.tradingSymbol || '').toUpperCase();
        let key = null;

        if (token === '99926000' || sym.includes('NIFTY 50')) {
          key = 'NIFTY';
        } else if (token === '99926009' || sym.includes('BANK')) {
          key = 'BANKNIFTY';
        } else if (token === '99926037' || sym.includes('FIN SERVICE')) {
          key = 'FINNIFTY';
        } else if (token === '99919000' || sym.includes('SENSEX')) {
          key = 'SENSEX';
        }

        if (key && item.ltp > 0) {
          indices[key] = {
            symbol: key,
            ltp: Number(item.ltp.toFixed(2)),
            open: item.open > 0 ? Number(item.open.toFixed(2)) : Number(item.ltp.toFixed(2)),
            high: item.high > 0 ? Number(item.high.toFixed(2)) : Number(item.ltp.toFixed(2)),
            low: item.low > 0 ? Number(item.low.toFixed(2)) : Number(item.ltp.toFixed(2)),
            close: item.close > 0 ? Number(item.close.toFixed(2)) : Number(item.ltp.toFixed(2)),
            change: Number((item.netChange || (item.ltp - item.close)).toFixed(2)),
            pChange: Number((item.percentChange || (((item.ltp - item.close) / item.close) * 100)).toFixed(2)),
            exchFeedTime: item.exchFeedTime || new Date().toISOString(),
          };
          this.lastFeedTime = item.exchFeedTime;
        }
      }

      this.lastChecked = Date.now();
      return indices;
    } catch (err) {
      console.error('[AngelService] Error fetching index quotes:', err.message);
      return null;
    }
  }

  // Search instrument scrips (e.g. NIFTY03NOV26)
  async searchScrip(exchange, searchscrip) {
    if (!this.isConnected || !this.jwtToken) return [];
    const cacheKey = `${exchange}_${searchscrip.toUpperCase()}`;
    if (this.scripCache.has(cacheKey)) {
      return this.scripCache.get(cacheKey);
    }

    try {
      const res = await fetch(`${this.baseUrl}/rest/secure/angelbroking/order/v1/searchScrip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '192.168.1.6',
          'X-ClientPublicIP': '223.185.36.94',
          'X-MACAddress': 'fe80::1',
          'X-PrivateKey': this.apiKey,
          'Authorization': `Bearer ${this.jwtToken}`,
        },
        body: JSON.stringify({
          exchange,
          searchscrip,
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (res.status === 401 || res.status === 403) {
        const renewed = await this.renewSession();
        if (renewed) return this.searchScrip(exchange, searchscrip);
        return [];
      }

      const data = await res.json();
      if (this.isTokenExpired(res.status, data)) {
        const renewed = await this.renewSession();
        if (renewed) return this.searchScrip(exchange, searchscrip);
        return [];
      }

      if (data.status && Array.isArray(data.data)) {
        this.scripCache.set(cacheKey, data.data);
        return data.data;
      }
      return [];
    } catch (err) {
      console.warn('[AngelService] Error in searchScrip:', err.message);
      return [];
    }
  }

  // Fetch full quotes for a list of NFO tokens
  async fetchOptionQuotes(tokens = []) {
    if (!this.isConnected || !this.jwtToken || tokens.length === 0) return {};

    try {
      const res = await fetch(`${this.baseUrl}/rest/secure/angelbroking/market/v1/quote/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '192.168.1.6',
          'X-ClientPublicIP': '223.185.36.94',
          'X-MACAddress': 'fe80::1',
          'X-PrivateKey': this.apiKey,
          'Authorization': `Bearer ${this.jwtToken}`,
        },
        body: JSON.stringify({
          mode: 'FULL',
          exchangeTokens: {
            NFO: tokens.slice(0, 50),
          },
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (res.status === 401 || res.status === 403) {
        const renewed = await this.renewSession();
        if (renewed) return this.fetchOptionQuotes(tokens);
        return {};
      }

      const data = await res.json();
      if (this.isTokenExpired(res.status, data)) {
        const renewed = await this.renewSession();
        if (renewed) return this.fetchOptionQuotes(tokens);
        return {};
      }

      const quoteMap = {};
      if (data.status && data.data?.fetched) {
        for (const item of data.data.fetched) {
          quoteMap[item.symbolToken] = {
            tradingSymbol: item.tradingSymbol,
            ltp: item.ltp,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            change: item.netChange,
            pChange: item.percentChange,
            openInterest: item.opnInterest || 0,
            volume: item.tradeVolume || 0,
            bid: item.depth?.buy?.[0]?.price || Number((item.ltp * 0.998).toFixed(2)),
            ask: item.depth?.sell?.[0]?.price || Number((item.ltp * 1.002).toFixed(2)),
            exchFeedTime: item.exchFeedTime,
          };
        }
      }
      return quoteMap;
    } catch (err) {
      console.warn('[AngelService] Error fetching option quotes:', err.message);
      return {};
    }
  }
}
