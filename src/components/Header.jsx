import React from 'react';
import { Activity, Clock, ShieldCheck, Settings, Smartphone, Monitor } from 'lucide-react';
import { formatINR } from '../utils/formatters';

export function Header({
  indices = {},
  vix = { ltp: 14.1, change: 0 },
  marketStatus = {},
  account = {},
  selectedSymbol,
  onSelectSymbol,
  onOpenSettings,
  isMobileFrame,
  onToggleFrame,
}) {
  const indexList = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'SENSEX'];
  const netPnL = account.totalPnL || 0;
  const isProfit = netPnL >= 0;

  return (
    <header className="sticky top-0 z-30 bg-[#080b11]/90 backdrop-blur-md border-b border-slate-800/80 safe-area-top">
      {/* Top Status Strip */}
      <div className="px-3 py-1.5 flex items-center justify-between text-[11px] font-medium border-b border-slate-800/40 text-slate-400">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700/60">
            <span className={`inline-block w-2 h-2 rounded-full ${marketStatus.provider === 'DHAN' ? 'bg-amber-400 animate-pulse' : (marketStatus.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400')}`} />
            <span className="font-semibold text-slate-200">
              {marketStatus.provider === 'DHAN' ? 'DHAN LIVE' : (marketStatus.isOpen ? 'NSE LIVE' : 'REPLAY 24/7')}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-[10px] text-slate-400">{marketStatus.provider === 'DHAN' ? 'Direct Feed' : (marketStatus.session || 'Regular')}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-slate-400">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>IST {marketStatus.istTimeStr || '--:--'}</span>
          </div>
        </div>

        {/* Capital & PnL Quick Pill */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-0.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Net P&L:</span>
            <span
              className={`font-mono-numbers font-bold text-[12px] ${
                isProfit ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatINR(netPnL, { showSign: true })}
            </span>
          </div>

          {/* Desktop/Mobile Frame Toggle */}
          <button
            onClick={onToggleFrame}
            title={isMobileFrame ? 'Expand to Full View' : 'Switch to Mobile View'}
            className="p-1 rounded-md text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
          >
            {isMobileFrame ? <Monitor className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-1 rounded-md text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Horizontal Indices Scroll Ticker */}
      <div className="overflow-x-auto no-scrollbar py-2 px-2 flex items-center gap-2">
        {indexList.map((key) => {
          const idx = indices[key];
          if (!idx) return null;
          const isSelected = selectedSymbol === key;
          const isUp = (idx.change || 0) >= 0;

          return (
            <button
              key={key}
              onClick={() => onSelectSymbol(key)}
              className={`shrink-0 flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition text-left ${
                isSelected
                  ? 'bg-blue-600/20 border border-blue-500/50 shadow-sm shadow-blue-500/10'
                  : 'bg-slate-900/70 border border-slate-800/80 hover:bg-slate-800/60'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold tracking-tight text-white">{idx.name}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono-numbers text-[12px] font-bold text-slate-100">
                    {idx.ltp?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span
                    className={`font-mono-numbers text-[10px] font-semibold flex items-center ${
                      isUp ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isUp ? '+' : ''}
                    {idx.change?.toFixed(1)} ({isUp ? '+' : ''}
                    {idx.pChange?.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </button>
          );
        })}

        {/* INDIA VIX Badge */}
        <div className="shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/50 border border-slate-800/60 text-left">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">INDIA VIX</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono-numbers text-[11px] font-bold text-amber-400">
                {vix.ltp?.toFixed(2) || '14.10'}
              </span>
              <span className="text-[9px] text-slate-500">Vol</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
