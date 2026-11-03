import React, { useState } from 'react';
import { Briefcase, AlertTriangle, ArrowUpRight, ArrowDownRight, RefreshCw, XCircle } from 'lucide-react';
import { formatINR } from '../utils/formatters';

export function Positions({
  account = {},
  marketStatus = {},
  onSquareOffPosition,
  onSquareOffAll,
  onNavigateOptionChain,
}) {
  const [confirmSquareOffAll, setConfirmSquareOffAll] = useState(false);
  const [squaringId, setSquaringId] = useState(null);

  const isMarketOpen = Boolean(marketStatus.isOpen || account.allowOffMarketTrading);
  const positions = account.positions || [];
  const unrealizedPnL = account.unrealizedPnL || 0;
  const realizedPnL = account.realizedPnL || 0;
  const totalPnL = account.totalPnL || 0;
  const isNetProfit = totalPnL >= 0;

  const handleSquareOffSingle = async (posId) => {
    if (!isMarketOpen) {
      alert(`Cannot exit positions while exchange is closed (${marketStatus.session || 'Post-Market'}). Orders and square-offs can only occur during market hours (09:15 AM – 03:30 PM IST).`);
      return;
    }
    setSquaringId(posId);
    try {
      await onSquareOffPosition(posId);
    } catch (err) {
      alert(err.message);
    } finally {
      setSquaringId(null);
    }
  };

  const handleSquareOffAll = async () => {
    if (!isMarketOpen) {
      alert(`Cannot exit positions while exchange is closed (${marketStatus.session || 'Post-Market'}). Orders and square-offs can only occur during market hours (09:15 AM – 03:30 PM IST).`);
      return;
    }
    try {
      await onSquareOffAll();
      setConfirmSquareOffAll(false);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="p-3 pb-24 space-y-4">
      {/* Hero MTM P&L Card */}
      <div
        className={`p-4 rounded-3xl border transition duration-300 relative overflow-hidden ${
          isNetProfit
            ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-500/30 shadow-lg shadow-emerald-500/5'
            : 'bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950 border-rose-500/30 shadow-lg shadow-rose-500/5'
        }`}
      >
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span>Total MTM P&L (Mark-to-Market)</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 font-semibold">
            {positions.length} Active {positions.length === 1 ? 'Leg' : 'Legs'}
          </span>
        </div>

        {/* Big Animated Number */}
        <div className="my-2">
          <div
            className={`font-mono-numbers text-3xl font-extrabold tracking-tight ${
              isNetProfit ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatINR(totalPnL, { showSign: true })}
          </div>
        </div>

        {/* Breakdown Row */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-400">Unrealized P&L: </span>
            <span
              className={`font-mono-numbers font-bold ${
                unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatINR(unrealizedPnL, { showSign: true })}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Realized P&L: </span>
            <span
              className={`font-mono-numbers font-bold ${
                realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatINR(realizedPnL, { showSign: true })}
            </span>
          </div>
        </div>

        {/* Portfolio Greeks Bar */}
        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/40 text-[11px] text-slate-400 font-mono-numbers">
          <div className="flex items-center gap-1">
            <span className="text-blue-400 font-semibold">Net Δ (Delta):</span>
            <span className="text-slate-200">{account.netDelta || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-amber-400 font-semibold">Daily θ (Theta):</span>
            <span className="text-slate-200">₹{(account.netTheta || 0).toFixed(1)}/day</span>
          </div>
        </div>
      </div>

      {/* Margin & Capital Bar */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2.5 bg-slate-900/60 rounded-2xl border border-slate-800/80">
          <div className="text-[10px] text-slate-400 font-semibold uppercase">Available Margin</div>
          <div className="font-mono-numbers font-bold text-xs text-white mt-0.5">
            {formatINR(account.availableMargin || 0, { compact: true })}
          </div>
        </div>
        <div className="p-2.5 bg-slate-900/60 rounded-2xl border border-slate-800/80">
          <div className="text-[10px] text-slate-400 font-semibold uppercase">Used Margin</div>
          <div className="font-mono-numbers font-bold text-xs text-amber-400 mt-0.5">
            {formatINR(account.usedMargin || 0, { compact: true })}
          </div>
        </div>
        <div className="p-2.5 bg-slate-900/60 rounded-2xl border border-slate-800/80">
          <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Capital</div>
          <div className="font-mono-numbers font-bold text-xs text-blue-400 mt-0.5">
            {formatINR(account.totalPortfolioValue || account.initialCapital || 0, { compact: true })}
          </div>
        </div>
      </div>

      {/* Header & Panic Exit Button */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Open Positions</h2>
        {positions.length > 0 && (
          <button
            onClick={() => setConfirmSquareOffAll(true)}
            className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 text-[11px] font-bold transition active:scale-95 flex items-center gap-1"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Square Off All</span>
          </button>
        )}
      </div>

      {/* Confirmation Modal for Square Off All */}
      {confirmSquareOffAll && (
        <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/60 space-y-2 animate-fade-in">
          <div className="flex items-center gap-2 text-rose-200 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Square off all {positions.length} positions at market price?</span>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSquareOffAll}
              className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 font-bold text-xs text-white transition"
            >
              Confirm Exit All
            </button>
            <button
              onClick={() => setConfirmSquareOffAll(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Positions List */}
      {positions.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/40 rounded-3xl border border-slate-800/80 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200">No Open Positions</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Your paper portfolio is clean. Open the Option Chain to place your first trade!
            </p>
          </div>
          <button
            onClick={onNavigateOptionChain}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg shadow-blue-600/30"
          >
            Open Option Chain
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {positions.map((pos) => {
            const isProfit = pos.pnl >= 0;
            const isLong = pos.action === 'BUY';

            return (
              <div
                key={pos.id}
                className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 hover:border-slate-700/80 transition space-y-2.5 shadow-sm"
              >
                {/* Top Row: Symbol, Strike, Action Tag, and PnL */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        isLong ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {pos.action}
                      </span>
                      <span className="font-extrabold text-sm text-white">{pos.symbol}</span>
                      <span className={`px-2 py-0.2 rounded text-[11px] font-bold ${
                        pos.optionType === 'CE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {pos.strikePrice} {pos.optionType}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">{pos.productType}</span>
                    </div>

                    <div className="text-[11px] text-slate-400 mt-1">
                      <span>{pos.lots} {pos.lots === 1 ? 'Lot' : 'Lots'} ({pos.quantity} Qty)</span>
                      <span className="mx-1.5">•</span>
                      <span>Avg: ₹{pos.avgPrice.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* PnL on Right */}
                  <div className="text-right">
                    <div
                      className={`font-mono-numbers text-base font-extrabold ${
                        isProfit ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatINR(pos.pnl, { showSign: true })}
                    </div>
                    <div
                      className={`font-mono-numbers text-[11px] font-semibold ${
                        isProfit ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isProfit ? '+' : ''}
                      {pos.pnlPercent}%
                    </div>
                  </div>
                </div>

                {/* Sub Row: LTP, Greeks, Target/SL */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px]">
                  <div className="flex items-center gap-2 font-mono-numbers">
                    <span className="text-slate-400">LTP:</span>
                    <span className="font-bold text-slate-100">₹{pos.ltp?.toFixed(2)}</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-blue-400 font-medium">Δ {pos.delta || 0}</span>
                  </div>

                  {/* Single Square Off Action */}
                  <button
                    onClick={() => handleSquareOffSingle(pos.id)}
                    disabled={squaringId === pos.id}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition active:scale-95 border border-slate-700/80"
                  >
                    {squaringId === pos.id ? 'Exiting...' : 'Exit'}
                  </button>
                </div>

                {/* Optional Target/SL tags if set */}
                {(pos.targetPrice || pos.stopLossPrice) && (
                  <div className="flex items-center gap-2 pt-1 text-[10px] font-mono-numbers text-slate-400">
                    {pos.targetPrice && (
                      <span className="text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
                        TP: ₹{pos.targetPrice}
                      </span>
                    )}
                    {pos.stopLossPrice && (
                      <span className="text-rose-400 bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-800/40">
                        SL: ₹{pos.stopLossPrice}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
