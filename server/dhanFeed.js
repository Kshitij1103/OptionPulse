// DhanHQ API Integration Service (v2)
// Connects to Dhan for real-time live Indian market option chains & index feeds

export const DHAN_SCRIP_MAP = {
  NIFTY: { id: 13, segment: 'IDX_I' },
  BANKNIFTY: { id: 25, segment: 'IDX_I' },
  FINNIFTY: { id: 27, segment: 'IDX_I' },
  SENSEX: { id: 51, segment: 'IDX_I' },
};

export class DhanService {
  constructor(config = {}) {
    this.clientId = config.clientId || '';
    this.accessToken = config.accessToken || '';
    this.isConnected = false;
    this.lastChecked = null;
    this.baseUrl = 'https://api.dhan.co/v2';
  }

  updateCredentials(clientId, accessToken) {
    this.clientId = clientId.trim();
    this.accessToken = accessToken.trim();
    this.isConnected = false;
  }

  async testConnection() {
    if (!this.clientId || !this.accessToken) {
      this.isConnected = false;
      return { success: false, message: 'Client ID or Access Token is missing' };
    }

    try {
      // Test with lightweight profile/fundlimit endpoint
      const res = await fetch(`${this.baseUrl}/fundlimit`, {
        method: 'GET',
        headers: {
          'client-id': this.clientId,
          'access-token': this.accessToken,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        this.isConnected = true;
        this.lastChecked = Date.now();
        return { success: true, message: 'Dhan API Connected Successfully!' };
      } else {
        const errorData = await res.json().catch(() => ({}));
        this.isConnected = false;
        return {
          success: false,
          message: errorData.errorDescription || errorData.message || `Dhan HTTP ${res.status}: Invalid Credentials`,
        };
      }
    } catch (err) {
      this.isConnected = false;
      return { success: false, message: `Dhan Connection Failed: ${err.message}` };
    }
  }

  async fetchOptionChain(symbolKey, expiryDate) {
    if (!this.isConnected && (!this.clientId || !this.accessToken)) {
      return null;
    }

    const scrip = DHAN_SCRIP_MAP[symbolKey] || DHAN_SCRIP_MAP.NIFTY;

    try {
      const res = await fetch(`${this.baseUrl}/optionchain`, {
        method: 'POST',
        headers: {
          'client-id': this.clientId,
          'access-token': this.accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          UnderlyingScrip: scrip.id,
          UnderlyingSeg: scrip.segment,
          Expiry: expiryDate, // YYYY-MM-DD
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      this.isConnected = true;
      return this.parseDhanOptionChain(symbolKey, data, expiryDate);
    } catch {
      return null;
    }
  }

  parseDhanOptionChain(symbolKey, dhanData, expiryDate) {
    // Transform Dhan v2 optionchain response into OptionPulse standard schema
    const ocData = dhanData.data?.oc || dhanData.data || {};
    const spotPrice = Number(dhanData.data?.last_price || dhanData.data?.spot || 0);

    const strikes = [];
    for (const [strikeStr, strikeObj] of Object.entries(ocData)) {
      const strikePrice = Number(strikeStr);
      const ce = strikeObj.ce || {};
      const pe = strikeObj.pe || {};

      strikes.push({
        strikePrice,
        isAtm: Math.abs(strikePrice - spotPrice) <= 25,
        call: {
          symbol: `${symbolKey}${strikePrice}CE`,
          type: 'CE',
          strikePrice,
          ltp: Number(ce.last_price || 0.05),
          change: Number(ce.change_percent || 0),
          openInterest: Number(ce.oi || 0),
          oiChange: Number(ce.oi_change || 0),
          volume: Number(ce.volume || 0),
          iv: Number(ce.iv || 14.0),
          delta: Number(ce.delta || 0.5),
          gamma: Number(ce.gamma || 0.001),
          theta: Number(ce.theta || -5),
          vega: Number(ce.vega || 10),
          bid: Number(ce.bid_price || ce.last_price || 0.05),
          ask: Number(ce.ask_price || ce.last_price || 0.05),
        },
        put: {
          symbol: `${symbolKey}${strikePrice}PE`,
          type: 'PE',
          strikePrice,
          ltp: Number(pe.last_price || 0.05),
          change: Number(pe.change_percent || 0),
          openInterest: Number(pe.oi || 0),
          oiChange: Number(pe.oi_change || 0),
          volume: Number(pe.volume || 0),
          iv: Number(pe.iv || 14.0),
          delta: Number(pe.delta || -0.5),
          gamma: Number(pe.gamma || 0.001),
          theta: Number(pe.theta || -5),
          vega: Number(pe.vega || 10),
          bid: Number(pe.bid_price || pe.last_price || 0.05),
          ask: Number(pe.ask_price || pe.last_price || 0.05),
        },
      });
    }

    strikes.sort((a, b) => a.strikePrice - b.strikePrice);

    return {
      symbol: symbolKey,
      spotPrice,
      atmStrike: strikes.find(s => s.isAtm)?.strikePrice || strikes[Math.floor(strikes.length / 2)]?.strikePrice,
      expiry: expiryDate,
      strikes,
      lastUpdated: Date.now(),
      source: 'DHAN_LIVE',
    };
  }
}
