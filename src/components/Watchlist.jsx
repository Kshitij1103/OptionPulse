import React from 'react';
import { ArrowUpRight, ArrowDownRight, Layers, TrendingUp, TrendingDown, Zap, ShoppingCart } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { formatINR } from '../utils/formatters';

export function Watchlist({
  indices = {},
  vix = {},
  selectedSymbol,
  onSelectSymbol,
  onNavigateOptionChain,
  onOpenOrder,
}) {
  const currentIndex = indices[selectedSymbol] || indices.NIFTY;

  if (!currentIndex) return null;

  const isUp = (currentIndex.change || 0) >= 0;
  const historyData = currentIndex.history || [];
  const strikeStep = currentIndex.strikeStep || 50;
  const atmStrike = Math.round((currentIndex.ltp || 24000) / strikeStep) * strikeStep;

  // Approximate ATM option prices for quick action
  const estCallPrice = Math.max(15, Number(((currentIndex.ltp * 0.0055) + 30).toFixed(1)));
  const estPutPrice = Math.max(15, Number(((currentIndex.ltp * 0.0052) + 28).toFixed(1)));

  return (
    <div className="p-3 pb-24 space-y-4">
      {/* Selected Index Hero Card */}
      <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base text-white">{currentIndex.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold uppercase">
                {currentIndex.exchange}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-mono-numbers text-2xl font-black text-white">
                ₹{currentIndex.ltp?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span
                className={`font-mono-numbers text-xs font-bold flex items-center ${
                  isUp ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {isUp ? '+' : ''}
                {currentIndex.change?.toFixed(2)} ({isUp ? '+' : ''}
                {currentIndex.pChange?.toFixed(2)}%)
              </span>
            </div>
          </div>

          <button
            onClick={() => onNavigateOptionChain(selectedSymbol)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition active:scale-95"
          >
            <Layers className="w-4 h-4" />
            <span>Option Chain</span>
          </button>
        </div>

        {/* Mini Chart Header & Waveform */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-400 font-bold uppercase tracking-wider">Live Intraday Chart</span>
            </div>
            <span className="font-mono-numbers text-[10px] text-slate-400">
              {historyData.length > 0 ? `Tick: ${historyData[historyData.length - 1].time}` : 'Ticking...'}
            </span>
          </div>

          <div className="h-36 w-full">
            {historyData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <YAxis domain={['dataMin - 5', 'dataMax + 5']} hide />
                  <XAxis dataKey="time" hide />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900/95 border border-slate-700 px-2.5 py-1.5 rounded-xl shadow-xl text-xs font-mono-numbers">
                            <span className="text-slate-400 mr-2">{payload[0].payload.time}</span>
                            <span className="font-bold text-white">₹{Number(payload[0].value).toFixed(2)}</span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke={isUp ? '#10b981' : '#f43f5e'}
                    strokeWidth={2.5}
                    isAnimationActive={false}
                    fillOpacity={1}
                    fill="url(#chartGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Streaming real-time chart points...
              </div>
            )}
          </div>
        </div>

        {/* OHLC Stats Grid */}
        <div className="grid grid-cols-4 gap-1 pt-2 border-t border-slate-800 text-center font-mono-numbers">
          <div className="p-1">
            <div className="text-[9px] text-slate-500 uppercase">Open</div>
            <div className="text-[11px] font-bold text-slate-200">₹{currentIndex.open?.toFixed(1)}</div>
          </div>
          <div className="p-1">
            <div className="text-[9px] text-slate-500 uppercase">High</div>
            <div className="text-[11px] font-bold text-emerald-400">₹{currentIndex.high?.toFixed(1)}</div>
          </div>
          <div className="p-1">
            <div className="text-[9px] text-slate-500 uppercase">Low</div>
            <div className="text-[11px] font-bold text-rose-400">₹{currentIndex.low?.toFixed(1)}</div>
          </div>
          <div className="p-1">
            <div className="text-[9px] text-slate-500 uppercase">Prev Close</div>
            <div className="text-[11px] font-bold text-slate-200">₹{currentIndex.close?.toFixed(1)}</div>
          </div>
        </div>
      </div>

      {/* ⚡ Quick Trade ATM Options Card (Instant Buy Call / Buy Put) */}
      <div className="p-3.5 bg-gradient-to-r from-slate-900 to-slate-950 rounded-2xl border border-slate-800 space-y-2.5 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Quick Trade ATM Options ({selectedSymbol})</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono-numbers font-semibold">
            ATM: {atmStrike}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Buy Call (CE) Button */}
          <button
            onClick={() =>
              onOpenOrder({
                symbol: selectedSymbol,
                strikePrice: atmStrike,
                optionType: 'CE',
                ltp: estCallPrice,
                delta: 0.52,
              })
            }
            className="p-3 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/40 text-left transition active:scale-95 group shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-400 uppercase">
                BUY CALL
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
            </div>
            <div className="mt-1.5">
              <div className="text-xs font-extrabold text-white">{atmStrike} CE</div>
              <div className="text-[11px] font-mono-numbers font-bold text-emerald-400 mt-0.5">
                ~₹{estCallPrice}
              </div>
            </div>
          </button>

          {/* Buy Put (PE) Button */}
          <button
            onClick={() =>
              onOpenOrder({
                symbol: selectedSymbol,
                strikePrice: atmStrike,
                optionType: 'PE',
                ltp: estPutPrice,
                delta: -0.48,
              })
            }
            className="p-3 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/40 text-left transition active:scale-95 group shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-400 uppercase">
                BUY PUT
              </span>
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-400 group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition" />
            </div>
            <div className="mt-1.5">
              <div className="text-xs font-extrabold text-white">{atmStrike} PE</div>
              <div className="text-[11px] font-mono-numbers font-bold text-rose-400 mt-0.5">
                ~₹{estPutPrice}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Indices Watchlist List */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Major Indian Indices</h3>
        <div className="space-y-2">
          {Object.values(indices).map((idx) => {
            const up = (idx.change || 0) >= 0;
            const isSelected = selectedSymbol === idx.symbol;

            return (
              <div
                key={idx.symbol}
                onClick={() => onSelectSymbol(idx.symbol)}
                className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-blue-950/20 border-blue-500/40 shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/40'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-white">{idx.name}</span>
                    <span className="text-[10px] text-slate-400">Lot: {idx.lotSize}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono-numbers">
                    Step: {idx.strikeStep} pts
                  </span>
                </div>

                <div className="text-right">
                  <div className="font-mono-numbers text-sm font-extrabold text-slate-100">
                    ₹{idx.ltp?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div
                    className={`font-mono-numbers text-[11px] font-bold flex items-center justify-end ${
                      up ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {up ? '+' : ''}
                    {idx.change?.toFixed(1)} ({up ? '+' : ''}
                    {idx.pChange?.toFixed(2)}%)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Market Sentiment / Volatility Meter */}
      <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200">Volatility & Greeks Regime</div>
            <div className="text-[10px] text-slate-400">
              INDIA VIX @ {vix.ltp || '14.15'} • {vix.ltp > 18 ? 'High IV (Great for Option Sellers)' : 'Moderate IV (Balanced Buying & Selling)'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
