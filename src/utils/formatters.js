// Indian Currency and Options Formatting Utilities

export function formatINR(val, options = {}) {
  const num = Number(val) || 0;
  const { showSign = false, hideSymbol = false, compact = false } = options;

  if (compact) {
    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : (showSign && num > 0 ? '+' : '');
    const prefix = hideSymbol ? '' : '₹';
    if (abs >= 10000000) {
      return `${sign}${prefix}${(abs / 10000000).toFixed(2)} Cr`;
    }
    if (abs >= 100000) {
      return `${sign}${prefix}${(abs / 100000).toFixed(2)} L`;
    }
    if (abs >= 1000) {
      return `${sign}${prefix}${(abs / 1000).toFixed(1)} K`;
    }
    return `${sign}${prefix}${abs.toFixed(2)}`;
  }

  const sign = num < 0 ? '-' : (showSign && num > 0 ? '+' : '');
  const abs = Math.abs(num);
  const formatted = abs.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${sign}${hideSymbol ? '' : '₹'}${formatted}`;
}

export function formatOI(val) {
  const num = Number(val) || 0;
  const abs = Math.abs(num);
  if (abs >= 10000000) {
    return `${(num / 10000000).toFixed(2)}Cr`;
  }
  if (abs >= 100000) {
    return `${(num / 100000).toFixed(2)}L`;
  }
  if (abs >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}

export function formatStrike(strike) {
  return Number(strike).toLocaleString('en-IN');
}
