// Black-Scholes European Options Pricing and Greeks Engine
// Standard for Indian NSE Options (NIFTY, BANKNIFTY, etc.)

function erf(x) {
  // A&S formula 7.1.26 approximation for error function
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

function normCdf(x) {
  return (1.0 + erf(x / Math.SQRT2)) / 2.0;
}

function normPdf(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Calculate Black-Scholes Price & Greeks
 * @param {number} S - Current Underlying Spot Price (e.g. 24000)
 * @param {number} K - Strike Price (e.g. 24100)
 * @param {number} T - Time to Expiration in Years (e.g. 3 / 365)
 * @param {number} r - Risk-free interest rate (e.g. 0.065 for India RBI Repo rate)
 * @param {number} v - Volatility / IV as decimal (e.g. 0.14 for 14%)
 * @param {'CE' | 'PE'} type - Option Type ('CE' or 'PE')
 */
export function calculateGreeks(S, K, T, r = 0.065, v = 0.14, type = 'CE') {
  // Protect against edge cases near expiry
  if (T <= 0.0001) {
    const intrinsic = type === 'CE' ? Math.max(0, S - K) : Math.max(0, K - S);
    return {
      price: intrinsic,
      delta: type === 'CE' ? (S >= K ? 1.0 : 0.0) : (S <= K ? -1.0 : 0.0),
      gamma: 0,
      theta: 0,
      vega: 0,
      iv: v,
      intrinsicValue: intrinsic,
      extrinsicValue: 0,
    };
  }

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + (v * v) / 2) * T) / (v * sqrtT);
  const d2 = d1 - v * sqrtT;

  const nd1 = normCdf(d1);
  const nd2 = normCdf(d2);
  const n_minus_d1 = normCdf(-d1);
  const n_minus_d2 = normCdf(-d2);
  const npdf_d1 = normPdf(d1);

  let price = 0;
  let delta = 0;
  let theta = 0;

  if (type === 'CE') {
    price = S * nd1 - K * Math.exp(-r * T) * nd2;
    delta = nd1;
    // Daily theta (change in price per day decay)
    const term1 = -(S * npdf_d1 * v) / (2 * sqrtT);
    const term2 = -r * K * Math.exp(-r * T) * nd2;
    theta = (term1 + term2) / 365;
  } else {
    price = K * Math.exp(-r * T) * n_minus_d2 - S * n_minus_d1;
    delta = nd1 - 1; // Negative delta for puts
    const term1 = -(S * npdf_d1 * v) / (2 * sqrtT);
    const term2 = r * K * Math.exp(-r * T) * n_minus_d2;
    theta = (term1 + term2) / 365;
  }

  // Gamma is same for Call and Put
  const gamma = npdf_d1 / (S * v * sqrtT);

  // Vega per 1 percentage point change in IV
  const vega = (S * sqrtT * npdf_d1) / 100;

  const intrinsicValue = type === 'CE' ? Math.max(0, S - K) : Math.max(0, K - S);
  const extrinsicValue = Math.max(0, price - intrinsicValue);

  return {
    price: Math.max(0.05, Number(price.toFixed(2))),
    delta: Number(delta.toFixed(3)),
    gamma: Number(gamma.toFixed(5)),
    theta: Number(theta.toFixed(2)),
    vega: Number(vega.toFixed(2)),
    iv: Number((v * 100).toFixed(1)),
    intrinsicValue: Number(intrinsicValue.toFixed(2)),
    extrinsicValue: Number(extrinsicValue.toFixed(2)),
  };
}

/**
 * Solve for Implied Volatility using Newton-Raphson
 */
export function calculateImpliedVolatility(marketPrice, S, K, T, r = 0.065, type = 'CE') {
  if (T <= 0 || marketPrice <= 0.05) return 0.14;

  let v = 0.16; // Initial guess 16% IV
  const maxIterations = 50;
  const tolerance = 0.01;

  for (let i = 0; i < maxIterations; i++) {
    const res = calculateGreeks(S, K, T, r, v, type);
    const diff = res.price - marketPrice;
    if (Math.abs(diff) < tolerance) {
      return v;
    }
    // Derivative w.r.t volatility is Vega * 100
    const vega = res.vega * 100;
    if (vega < 1e-4) break;
    v = v - diff / vega;
    if (v <= 0.01) v = 0.01;
    if (v >= 3.0) v = 3.0; // Max 300% IV
  }

  return v;
}
