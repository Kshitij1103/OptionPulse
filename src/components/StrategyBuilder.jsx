import React, { useState } from 'react';
import { Layers, ArrowRight, ShieldCheck, CheckCircle2, TrendingUp, AlertCircle, Play } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { formatINR } from '../utils/formatters';
import confetti from 'canvas-confetti';

const STRATEGY_PRESETS = [
  {
    id: 'BULL_CALL_SPREAD',
    name: 'Bull Call Spread',
    type: 'Bullish',
    description: 'Buy ATM Call + Sell OTM Call. Defined risk & limited reward.',
    legs: [
      { action: 'BUY', strikeOffset: 0, optionType: 'CE' },
      { action: 'SELL', strikeOffset: 1, optionType: 'CE' },
    ],
  },
  {
    id: 'BEAR_PUT_SPREAD',
    name: 'Bear Put Spread',
    type: 'Bearish',
    description: 'Buy ATM Put + Sell OTM Put. Profit when market falls with capped risk.',
    legs: [
      { action: 'BUY', strikeOffset: 0, optionType: 'PE' },
      { action: 'SELL', strikeOffset: -1, optionType: 'PE' },
    ],
  },
  {
    id: 'SHORT_STRADDLE',
    name: 'Short Straddle',
    type: 'Neutral / Rangebound',
    description: 'Sell ATM Call + Sell ATM Put. Maximum Theta decay profit if market stays flat.',
    legs: [
      { action: 'SELL', strikeOffset: 0, optionType: 'CE' },
      { action: 'SELL', strikeOffset: 0, optionType: 'PE' },
    ],
  },
  {
    id: 'IRON_CONDOR',
    name: 'Iron Condor',
    type: 'Neutral / Defined Risk',
    description: 'Sell OTM Put Spread + Sell OTM Call Spread. 4-leg high-probability income.',
    legs: [
      { action: 'BUY', strikeOffset: -2, optionType: 'PE' },
      { action: 'SELL', strikeOffset: -1, optionType: 'PE' },
      { action: 'SELL', strikeOffset: 1, optionType: 'CE' },
      { action: 'BUY', strikeOffset: 2, optionType: 'CE' },
    ],
  },
  {
    id: 'LONG_STRADDLE',
    name: 'Long Straddle',
    type: 'High Volatility',
    description: 'Buy ATM Call + Buy ATM Put. Huge gains if market makes big move either way.',
    legs: [
      { action: 'BUY', strikeOffset: 0, optionType: 'CE' },
      { action: 'BUY', strikeOffset: 0, optionType: 'PE' },
    ],
  },
];

export function StrategyBuilder({
  selectedSymbol,
  indices = {},
  chainData,
  account = {},
  marketStatus = {},
  onSubmitOrder,
  onNavigatePositions,
}) {
  const [selectedStrategyId, setSelectedStrategyId] = useState('BULL_CALL_SPREAD');
  const [lots, setLots] = useState(1);
  const [isExecuting, setIsExecuting] = useState(false);

  const isMarketOpen = Boolean(marketStatus.isOpen || account.allowOffMarketTrading);

  const idx = indices[selectedSymbol] || indices.NIFTY;
  const strikes = chainData?.strikes || [];
  const atmStrike = chainData?.atmStrike || 24150;
  const strikeStep = idx?.strikeStep || 50;
  const lotSize = idx?.lotSize || 25;

  const strategy = STRATEGY_PRESETS.find((s) => s.id === selectedStrategyId) || STRATEGY_PRESETS[0];

  // Resolve concrete legs based on current ATM and strikes
  const legs = strategy.legs.map((legDef) => {
    const targetStrike = atmStrike + legDef.strikeOffset * strikeStep;
    const strikeRow = strikes.find((s) => s.strikePrice === targetStrike);
    const contract = strikeRow ? (legDef.optionType === 'CE' ? strikeRow.call : strikeRow.put) : null;
    const ltp = contract ? contract.ltp : 120;

    return {
      ...legDef,
      strikePrice: targetStrike,
      contractSymbol: contract?.symbol || `${selectedSymbol}${targetStrike}${legDef.optionType}`,
      ltp,
      lots,
      lotSize,
      quantity: lots * lotSize,
    };
  });

  // Calculate Payoff Curve across potential expiry prices
  const payoffData = [];
  const priceRange = strikeStep * 8;
  const minPrice = atmStrike - priceRange;
  const maxPrice = atmStrike + priceRange;
  const steps = 25;
  const stepSize = (maxPrice - minPrice) / steps;

  let maxProfit = -Infinity;
  let maxLoss = Infinity;
  let breakevens = [];

  for (let p = minPrice; p <= maxPrice; p += stepSize) {
    let payoff = 0;
    for (const leg of legs) {
      let intrinsic = 0;
      if (leg.optionType === 'CE') {
        intrinsic = Math.max(0, p - leg.strikePrice);
      } else {
        intrinsic = Math.max(0, leg.strikePrice - p);
      }

      const pnlPerUnit = leg.action === 'BUY' ? intrinsic - leg.ltp : leg.ltp - intrinsic;
      payoff += pnlPerUnit * leg.quantity;
    }

    maxProfit = Math.max(maxProfit, payoff);
    maxLoss = Math.min(maxLoss, payoff);

    payoffData.push({
      spot: Math.round(p),
      payoff: Math.round(payoff),
    });
  }

  // Detect approximate breakeven points where payoff crosses 0
  for (let i = 0; i < payoffData.length - 1; i++) {
    const p1 = payoffData[i];
    const p2 = payoffData[i + 1];
    if ((p1.payoff <= 0 && p2.payoff >= 0) || (p1.payoff >= 0 && p2.payoff <= 0)) {
      breakevens.push(p1.spot);
    }
  }

  const handleExecuteAllLegs = async () => {
    setIsExecuting(true);
    try {
      for (const leg of legs) {
        await onSubmitOrder({
          symbol: selectedSymbol,
          strikePrice: leg.strikePrice,
          optionType: leg.optionType,
          action: leg.action,
          lots: leg.lots,
          orderType: 'MARKET',
          productType: 'NRML',
          expiry: chainData?.expiry,
        });
      }

      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.7 },
      });

      onNavigatePositions();
    } catch (err) {
      alert(`Error executing strategy: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="p-3 pb-24 space-y-4">
      {/* Strategy Selector Carousel */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          Pre-Built Options Strategies ({selectedSymbol})
        </h3>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {STRATEGY_PRESETS.map((strat) => {
            const isSelected = strat.id === selectedStrategyId;
            return (
              <button
                key={strat.id}
                onClick={() => setSelectedStrategyId(strat.id)}
                className={`shrink-0 px-3 py-2 rounded-2xl border text-left transition ${
                  isSelected
                    ? 'bg-blue-600/20 border-blue-500 shadow-md shadow-blue-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
                }`}
              >
                <div className="text-xs font-extrabold text-white">{strat.name}</div>
                <div className="text-[10px] text-blue-400 font-semibold mt-0.5">{strat.type}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Strategy Description & Metrics */}
      <div className="p-4 bg-slate-900/80 rounded-3xl border border-slate-800 space-y-3">
        <div>
          <h4 className="text-sm font-extrabold text-white">{strategy.name}</h4>
          <p className="text-xs text-slate-400 mt-0.5">{strategy.description}</p>
        </div>

        {/* Max Profit / Loss / Breakeven Pill Strip */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center font-mono-numbers">
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800">
            <div className="text-[9px] text-slate-500 uppercase font-semibold">Max Profit</div>
            <div className="text-xs font-extrabold text-emerald-400 mt-0.5">
              {maxProfit > 1000000 ? 'Unlimited' : formatINR(maxProfit, { compact: true })}
            </div>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800">
            <div className="text-[9px] text-slate-500 uppercase font-semibold">Max Loss</div>
            <div className="text-xs font-extrabold text-rose-400 mt-0.5">
              {maxLoss < -1000000 ? 'Unlimited' : formatINR(Math.abs(maxLoss), { compact: true })}
            </div>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800">
            <div className="text-[9px] text-slate-500 uppercase font-semibold">Breakeven</div>
            <div className="text-[11px] font-bold text-slate-200 mt-0.5">
              {breakevens.length > 0 ? breakevens.join(', ') : 'ATM'}
            </div>
          </div>
        </div>

        {/* Payoff Graph */}
        <div className="pt-2">
          <div className="text-[11px] font-bold text-slate-400 mb-1 flex items-center justify-between">
            <span>Payoff at Expiry Chart</span>
            <span className="text-[9px] text-slate-500 font-mono-numbers">Spot: ₹{idx?.ltp?.toFixed(0)}</span>
          </div>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={payoffData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <XAxis dataKey="spot" stroke="#64748b" tick={{ fontSize: 9 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 9 }} hide />
                <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                <ReferenceLine x={idx?.ltp} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: 'ATM', fill: '#60a5fa', fontSize: 10 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const spot = payload[0].payload.spot;
                      const val = payload[0].value;
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-2 rounded-lg text-xs font-mono-numbers">
                          <div className="text-slate-400">If {selectedSymbol} expires at ₹{spot}:</div>
                          <div className={`font-bold ${val >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            P&L: {formatINR(val, { showSign: true })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="payoff"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Legs List */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Strategy Legs</h4>
        {legs.map((leg, index) => {
          const isBuy = leg.action === 'BUY';
          return (
            <div
              key={index}
              className="p-3 bg-slate-900/70 rounded-2xl border border-slate-800 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                    isBuy ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {leg.action}
                </span>
                <div>
                  <span className="font-extrabold text-xs text-white">
                    {selectedSymbol} {leg.strikePrice} {leg.optionType}
                  </span>
                  <div className="text-[10px] text-slate-400 font-mono-numbers">
                    {leg.quantity} Qty ({leg.lots} Lot)
                  </div>
                </div>
              </div>

              <div className="text-right font-mono-numbers">
                <div className="text-xs font-bold text-white">₹{leg.ltp.toFixed(2)}</div>
                <div className="text-[10px] text-slate-500">LTP</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Market Closed Banner for Strategy */}
      {!isMarketOpen && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Market Closed ({marketStatus.session || 'Post-Market'}). Multi-leg strategies can only be executed during live market hours.</span>
        </div>
      )}

      {/* One-click Execute Strategy Button */}
      <button
        onClick={handleExecuteAllLegs}
        disabled={!isMarketOpen || isExecuting}
        className={`w-full py-3.5 rounded-2xl font-extrabold text-sm uppercase tracking-wider text-white shadow-xl transition active:scale-98 flex items-center justify-center gap-2 ${
          !isMarketOpen
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60 shadow-none'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-600/25'
        }`}
      >
        {isExecuting ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Executing {legs.length} Strategy Legs...
          </span>
        ) : !isMarketOpen ? (
          <span>Market Closed • Opens 09:15 AM IST</span>
        ) : (
          <>
            <Play className="w-4 h-4 fill-white" />
            <span>Execute {strategy.name} (1-Click)</span>
          </>
        )}
      </button>
    </div>
  );
}
