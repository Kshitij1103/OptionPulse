import React, { useState } from 'react';
import { ChevronDown, ArrowUpRight, ArrowDownRight, Eye, Shield, Zap, RefreshCw } from 'lucide-react';
import { formatINR, formatOI, formatStrike } from '../utils/formatters';

export function OptionChain({
  chainData,
  selectedSymbol,
  expiries = [],
  selectedExpiry,
  onSelectExpiry,
  onOpenOrder,
  onAddToStrategy,
  onRetry,
}) {
  const [metricView, setMetricView] = useState('ltp'); // 'ltp' | 'greeks' | 'oi'
  const [strikeRange, setStrikeRange] = useState('near'); // 'near' (13 strikes) | 'all' (41 strikes)

  if (!chainData || !chainData.strikes || chainData.strikes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3 px-4 text-center">
        <div className="w-9 h-9 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-1" />
        <span className="text-sm font-semibold text-slate-200">
          Loading {selectedSymbol} Option Chain...
        </span>
        <p className="text-xs text-slate-500 max-w-xs">
          Connecting to live Indian derivatives feed. If it takes a moment, tap reload below.
        </p>
        <button
          onClick={onRetry}
          className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/30 flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reload Option Chain</span>
        </button>
      </div>
    );
  }

  const { strikes = [], spotPrice = 0, atmStrike = 0 } = chainData;

  // Filter strikes according to selected range
  let displayStrikes = strikes;
  if (strikeRange === 'near') {
    const atmIndex = strikes.findIndex((s) => s.strikePrice === atmStrike);
    if (atmIndex !== -1) {
      const start = Math.max(0, atmIndex - 6);
      const end = Math.min(strikes.length, atmIndex + 7);
      displayStrikes = strikes.slice(start, end);
    }
  }

  return (
    <div className="pb-24">
      {/* Controls Bar: Expiry selector & Metric toggles */}
      <div className="sticky top-[95px] z-20 bg-[#080b11] border-b border-slate-800/80 p-2.5 space-y-2 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          {/* Expiry Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedExpiry || chainData.expiry}
              onChange={(e) => onSelectExpiry(e.target.value)}
              className="appearance-none bg-slate-900 border border-slate-700 text-slate-100 text-[12px] font-semibold py-1.5 pl-3 pr-8 rounded-lg focus:outline-none focus:border-blue-500"
            >
              {expiries.map((exp) => (
                <option key={exp.value} value={exp.value}>
                  Expiry: {exp.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Metric View Segmented Control */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px] font-medium">
            <button
              onClick={() => setMetricView('ltp')}
              className={`px-2.5 py-1 rounded-md transition ${
                metricView === 'ltp' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              LTP
            </button>
            <button
              onClick={() => setMetricView('greeks')}
              className={`px-2.5 py-1 rounded-md transition ${
                metricView === 'greeks' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Greeks
            </button>
            <button
              onClick={() => setMetricView('oi')}
              className={`px-2.5 py-1 rounded-md transition ${
                metricView === 'oi' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              OI
            </button>
          </div>
        </div>

        {/* Spot and Range Pill */}
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span>Spot:</span>
            <span className="font-mono-numbers font-bold text-white text-[12px]">
              ₹{spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-300 font-semibold">
              ATM {atmStrike}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setStrikeRange('near')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                strikeRange === 'near' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              ATM ±6
            </button>
            <button
              onClick={() => setStrikeRange('all')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                strikeRange === 'all' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              All Strikes
            </button>
          </div>
        </div>

        {/* Quick User Instruction Pill */}
        <div className="px-2 py-1 rounded-lg bg-blue-950/40 border border-blue-500/20 text-[10px] text-blue-300 flex items-center justify-between">
          <span>👆 <strong>Tap any strike</strong> to Buy or Sell options instantly</span>
          <span className="text-slate-400 text-[9px] font-mono-numbers">{displayStrikes.length} strikes</span>
        </div>
      </div>

      {/* Table Headers */}
      <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2 px-1 bg-slate-900/60 border-b border-slate-800">
        <div className="col-span-5 text-left pl-2 text-emerald-400 flex items-center gap-1">
          <span>CALLS (CE)</span>
        </div>
        <div className="col-span-2 text-center text-slate-200">
          <span>STRIKE</span>
        </div>
        <div className="col-span-5 text-right pr-2 text-rose-400 flex items-center justify-end gap-1">
          <span>PUTS (PE)</span>
        </div>
      </div>

      {/* Strikes List */}
      <div className="divide-y divide-slate-800/40">
        {displayStrikes.map((row) => {
          const isAtm = row.isAtm;
          const isCallItm = row.strikePrice < spotPrice;
          const isPutItm = row.strikePrice > spotPrice;

          return (
            <div
              key={row.strikePrice}
              className={`grid grid-cols-12 items-center py-2 px-1 transition relative ${
                isAtm ? 'bg-blue-950/30 ring-1 ring-blue-500/30' : ''
              }`}
            >
              {/* Call Side (Left) */}
              <div
                onClick={() =>
                  onOpenOrder({
                    symbol: selectedSymbol,
                    strikePrice: row.strikePrice,
                    optionType: 'CE',
                    ltp: row.call.ltp,
                    expiry: selectedExpiry || chainData.expiry,
                    contractSymbol: row.call.symbol,
                    delta: row.call.delta,
                  })
                }
                className={`col-span-5 pr-2 pl-1.5 py-1.5 rounded-l-lg cursor-pointer transition active:scale-98 flex items-center justify-between border border-transparent hover:border-emerald-500/40 ${
                  isCallItm
                    ? 'bg-amber-500/10 hover:bg-amber-500/20'
                    : 'hover:bg-slate-800/60'
                }`}
              >
                {metricView === 'ltp' && (
                  <>
                    <div className="flex flex-col text-left">
                      <div className="flex items-center gap-1">
                        <span className="font-mono-numbers text-[13px] font-bold text-slate-100">
                          ₹{row.call.ltp.toFixed(2)}
                        </span>
                        <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-extrabold border border-emerald-500/30">
                          BUY
                        </span>
                      </div>
                      <span
                        className={`font-mono-numbers text-[10px] font-medium flex items-center ${
                          row.call.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {row.call.change >= 0 ? '+' : ''}
                        {row.call.change.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex flex-col items-end text-[10px] text-slate-400 font-mono-numbers">
                      <span>Δ {row.call.delta}</span>
                      <span className="text-slate-500 text-[9px]">IV {row.call.iv}%</span>
                    </div>
                  </>
                )}

                {metricView === 'greeks' && (
                  <>
                    <div className="flex flex-col text-left font-mono-numbers text-[11px]">
                      <span className="text-blue-300 font-semibold">Δ {row.call.delta}</span>
                      <span className="text-slate-400 text-[10px]">θ {row.call.theta}</span>
                    </div>
                    <div className="flex flex-col items-end font-mono-numbers text-[11px]">
                      <span className="text-emerald-400 font-bold">₹{row.call.ltp.toFixed(1)}</span>
                      <span className="text-amber-400 text-[10px]">IV {row.call.iv}%</span>
                    </div>
                  </>
                )}

                {metricView === 'oi' && (
                  <>
                    <div className="flex flex-col text-left font-mono-numbers text-[11px]">
                      <span className="text-slate-200 font-semibold">{formatOI(row.call.openInterest)}</span>
                      <span
                        className={`text-[9px] ${
                          row.call.oiChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {row.call.oiChange >= 0 ? '+' : ''}
                        {formatOI(row.call.oiChange)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end font-mono-numbers text-[11px]">
                      <span className="text-slate-100 font-bold">₹{row.call.ltp.toFixed(1)}</span>
                      <span className="text-slate-400 text-[9px]">Vol {formatOI(row.call.volume)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Center Strike Price */}
              <div className="col-span-2 flex flex-col items-center justify-center text-center">
                <span
                  className={`font-mono-numbers text-[12px] font-extrabold ${
                    isAtm ? 'text-blue-400 scale-105' : 'text-slate-200'
                  }`}
                >
                  {formatStrike(row.strikePrice)}
                </span>
                {isAtm && (
                  <span className="text-[8px] font-bold px-1 rounded bg-blue-500 text-slate-950 uppercase tracking-tighter">
                    ATM
                  </span>
                )}
              </div>

              {/* Put Side (Right) */}
              <div
                onClick={() =>
                  onOpenOrder({
                    symbol: selectedSymbol,
                    strikePrice: row.strikePrice,
                    optionType: 'PE',
                    ltp: row.put.ltp,
                    expiry: selectedExpiry || chainData.expiry,
                    contractSymbol: row.put.symbol,
                    delta: row.put.delta,
                  })
                }
                className={`col-span-5 pl-2 pr-1.5 py-1.5 rounded-r-lg cursor-pointer transition active:scale-98 flex items-center justify-between border border-transparent hover:border-rose-500/40 ${
                  isPutItm
                    ? 'bg-amber-500/10 hover:bg-amber-500/20'
                    : 'hover:bg-slate-800/60'
                }`}
              >
                {metricView === 'ltp' && (
                  <>
                    <div className="flex flex-col text-left text-[10px] text-slate-400 font-mono-numbers">
                      <span>Δ {row.put.delta}</span>
                      <span className="text-slate-500 text-[9px]">IV {row.put.iv}%</span>
                    </div>
                    <div className="flex flex-col items-end text-right">
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-400 font-extrabold border border-rose-500/30">
                          BUY
                        </span>
                        <span className="font-mono-numbers text-[13px] font-bold text-slate-100">
                          ₹{row.put.ltp.toFixed(2)}
                        </span>
                      </div>
                      <span
                        className={`font-mono-numbers text-[10px] font-medium flex items-center ${
                          row.put.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {row.put.change >= 0 ? '+' : ''}
                        {row.put.change.toFixed(1)}%
                      </span>
                    </div>
                  </>
                )}

                {metricView === 'greeks' && (
                  <>
                    <div className="flex flex-col text-left font-mono-numbers text-[11px]">
                      <span className="text-rose-400 font-bold">₹{row.put.ltp.toFixed(1)}</span>
                      <span className="text-amber-400 text-[10px]">IV {row.put.iv}%</span>
                    </div>
                    <div className="flex flex-col items-end font-mono-numbers text-[11px]">
                      <span className="text-rose-300 font-semibold">Δ {row.put.delta}</span>
                      <span className="text-slate-400 text-[10px]">θ {row.put.theta}</span>
                    </div>
                  </>
                )}

                {metricView === 'oi' && (
                  <>
                    <div className="flex flex-col text-left font-mono-numbers text-[11px]">
                      <span className="text-slate-100 font-bold">₹{row.put.ltp.toFixed(1)}</span>
                      <span className="text-slate-400 text-[9px]">Vol {formatOI(row.put.volume)}</span>
                    </div>
                    <div className="flex flex-col items-end font-mono-numbers text-[11px]">
                      <span className="text-slate-200 font-semibold">{formatOI(row.put.openInterest)}</span>
                      <span
                        className={`text-[9px] ${
                          row.put.oiChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {row.put.oiChange >= 0 ? '+' : ''}
                        {formatOI(row.put.oiChange)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
