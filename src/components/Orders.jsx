import React, { useState } from 'react';
import { FileText, CheckCircle, Clock, X, Award, TrendingUp, TrendingDown } from 'lucide-react';
import { formatINR } from '../utils/formatters';

export function Orders({ account = {}, onCancelOrder }) {
  const [activeTab, setActiveTab] = useState('open'); // 'open' | 'executed' | 'stats'
  const [cancellingId, setCancellingId] = useState(null);

  const orders = account.orders || [];
  const trades = account.trades || [];
  const stats = account.stats || {};

  const openOrders = orders.filter((o) => o.status === 'OPEN');
  const completedOrders = orders.filter((o) => o.status === 'COMPLETE');

  const handleCancel = async (orderId) => {
    setCancellingId(orderId);
    try {
      await onCancelOrder(orderId);
    } catch (err) {
      alert(err.message);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="p-3 pb-24 space-y-4">
      {/* Segmented Tab Controls */}
      <div className="grid grid-cols-3 p-1 bg-slate-900 rounded-2xl border border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('open')}
          className={`py-2 rounded-xl transition ${
            activeTab === 'open' ? 'bg-blue-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Open ({openOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('executed')}
          className={`py-2 rounded-xl transition ${
            activeTab === 'executed' ? 'bg-blue-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Executed ({completedOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`py-2 rounded-xl transition ${
            activeTab === 'stats' ? 'bg-blue-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Stats & Edge
        </button>
      </div>

      {/* Tab 1: Open Limit Orders */}
      {activeTab === 'open' && (
        <div>
          {openOrders.length === 0 ? (
            <div className="p-10 text-center bg-slate-900/40 rounded-3xl border border-slate-800/80">
              <Clock className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">No Open Limit Orders</p>
              <p className="text-xs text-slate-500 mt-1">
                Limit orders waiting for trigger price will show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {openOrders.map((order) => {
                const isBuy = order.action === 'BUY';
                return (
                  <div
                    key={order.id}
                    className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isBuy ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {order.action}
                        </span>
                        <span className="font-bold text-sm text-white">{order.symbol}</span>
                        <span className="text-xs text-slate-300">
                          {order.strikePrice} {order.optionType}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                        PENDING LIMIT
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                      <div className="font-mono-numbers text-slate-400">
                        <span>{order.quantity} Qty @ </span>
                        <span className="font-bold text-white">₹{order.limitPrice}</span>
                      </div>

                      <button
                        onClick={() => handleCancel(order.id)}
                        disabled={cancellingId === order.id}
                        className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-semibold border border-rose-800/40 flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{cancellingId === order.id ? 'Cancelling...' : 'Cancel'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Executed Trades */}
      {activeTab === 'executed' && (
        <div>
          {completedOrders.length === 0 ? (
            <div className="p-10 text-center bg-slate-900/40 rounded-3xl border border-slate-800/80">
              <FileText className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">No Executed Orders Yet</p>
              <p className="text-xs text-slate-500 mt-1">Place an order to see your trade log.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {completedOrders.map((order) => {
                const isBuy = order.action === 'BUY';
                const timeStr = new Date(order.executedAt || order.placedAt).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                return (
                  <div
                    key={order.id}
                    className="p-3 bg-slate-900/70 rounded-2xl border border-slate-800/80 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                            isBuy ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {order.action}
                        </span>
                        <span className="font-extrabold text-xs text-white">{order.symbol}</span>
                        <span className="text-[11px] text-slate-300">
                          {order.strikePrice} {order.optionType}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 font-mono-numbers">
                        <span>{order.quantity} Qty ({order.lots} Lots)</span>
                        <span className="mx-1">•</span>
                        <span>{timeStr}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono-numbers text-xs font-bold text-white">
                        ₹{(order.executedPrice || order.price).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-emerald-400 font-bold flex items-center justify-end gap-1 mt-0.5">
                        <CheckCircle className="w-3 h-3" />
                        <span>FILLED</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Trading Statistics & Win Rate */}
      {activeTab === 'stats' && (
        <div className="space-y-3">
          <div className="p-4 bg-slate-900/80 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Paper Trading Discipline</span>
              </h3>
              <span className="text-xs font-mono-numbers text-slate-400">
                {stats.totalTrades || 0} Trades
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Win Rate</div>
                <div className="font-mono-numbers text-2xl font-black text-emerald-400 mt-1">
                  {stats.winRate || 0}%
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {stats.winningTrades || 0} Wins / {stats.losingTrades || 0} Losses
                </div>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Best Trade</div>
                <div className="font-mono-numbers text-xl font-bold text-emerald-400 mt-1 flex items-center justify-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  <span>{formatINR(stats.bestTrade || 0, { compact: true })}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Max Drawdown: {formatINR(stats.worstTrade || 0, { compact: true })}
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-950/20 rounded-2xl border border-blue-500/20 text-xs text-blue-200">
              <p className="font-semibold">💡 Options Psychology Tip:</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Virtual trading allows you to test your risk-reward ratio without emotional stress. Never risk more than 2% of your capital on a single option buying trade.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
