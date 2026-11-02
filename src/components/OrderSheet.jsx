import React, { useState } from 'react';
import { X, Plus, Minus, AlertCircle, ArrowUpRight, ArrowDownRight, ShieldCheck } from 'lucide-react';
import { formatINR } from '../utils/formatters';
import confetti from 'canvas-confetti';

export function OrderSheet({
  orderTarget, // { symbol, strikePrice, optionType, ltp, expiry, contractSymbol, delta }
  lotSize = 25,
  account = {},
  onClose,
  onSubmitOrder,
}) {
  if (!orderTarget) return null;

  const [action, setAction] = useState('BUY'); // 'BUY' | 'SELL'
  const [productType, setProductType] = useState('MIS'); // 'MIS' | 'NRML'
  const [orderType, setOrderType] = useState('MARKET'); // 'MARKET' | 'LIMIT'
  const [lots, setLots] = useState(1);
  const [limitPrice, setLimitPrice] = useState(orderTarget.ltp.toFixed(2));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [stopLossPrice, setStopLossPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const quantity = lots * lotSize;
  const execPrice = orderType === 'MARKET' ? orderTarget.ltp : Number(limitPrice) || orderTarget.ltp;

  // Margin calculation
  const marginPerLotSell = orderTarget.symbol === 'BANKNIFTY' ? 125000 : 115000;
  const approxMargin = action === 'BUY' ? quantity * execPrice : lots * marginPerLotSell;
  const currentAvailableMargin = typeof account.availableMargin === 'number' ? account.availableMargin : 1000000;
  const hasEnoughMargin = currentAvailableMargin >= approxMargin;

  const handleQuickAddLots = (amount) => {
    setLots((prev) => Math.max(1, prev + amount));
  };

  const handleSubmit = async () => {
    setErrorMessage('');
    if (!hasEnoughMargin) {
      setErrorMessage(`Insufficient virtual margin. Required: ${formatINR(approxMargin)}, Available: ${formatINR(currentAvailableMargin)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitOrder({
        symbol: orderTarget.symbol,
        strikePrice: orderTarget.strikePrice,
        optionType: orderTarget.optionType,
        action,
        lots,
        orderType,
        productType,
        limitPrice: orderType === 'LIMIT' ? Number(limitPrice) : null,
        targetPrice: targetPrice ? Number(targetPrice) : null,
        stopLossPrice: stopLossPrice ? Number(stopLossPrice) : null,
        expiry: orderTarget.expiry,
      });

      // Celebration effect on successful paper trade
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
      });

      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBuy = action === 'BUY';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-[#0e1422] border-t border-slate-700/80 rounded-t-3xl shadow-2xl overflow-hidden pb-8 safe-area-bottom animate-slide-up">
        {/* Top Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base text-white">{orderTarget.symbol}</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                orderTarget.optionType === 'CE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}>
                {orderTarget.strikePrice} {orderTarget.optionType}
              </span>
              <span className="text-slate-400 text-xs">Lot: {lotSize}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-400">LTP:</span>
              <span className="font-mono-numbers text-sm font-bold text-slate-100">
                ₹{orderTarget.ltp.toFixed(2)}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Action Segmented Toggle (BUY / SELL) */}
          <div className="grid grid-cols-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
            <button
              onClick={() => setAction('BUY')}
              className={`py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition ${
                isBuy
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              BUY (Long)
            </button>
            <button
              onClick={() => setAction('SELL')}
              className={`py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition ${
                !isBuy
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              SELL (Short)
            </button>
          </div>

          {/* Product & Order Type Options */}
          <div className="grid grid-cols-2 gap-2">
            {/* Product Type */}
            <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400 pl-2">Product:</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setProductType('MIS')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold ${
                    productType === 'MIS' ? 'bg-slate-700 text-white' : 'text-slate-400'
                  }`}
                >
                  MIS
                </button>
                <button
                  onClick={() => setProductType('NRML')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold ${
                    productType === 'NRML' ? 'bg-slate-700 text-white' : 'text-slate-400'
                  }`}
                >
                  NRML
                </button>
              </div>
            </div>

            {/* Order Type */}
            <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400 pl-2">Type:</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setOrderType('MARKET')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold ${
                    orderType === 'MARKET' ? 'bg-slate-700 text-white' : 'text-slate-400'
                  }`}
                >
                  MKT
                </button>
                <button
                  onClick={() => setOrderType('LIMIT')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold ${
                    orderType === 'LIMIT' ? 'bg-slate-700 text-white' : 'text-slate-400'
                  }`}
                >
                  LIMIT
                </button>
              </div>
            </div>
          </div>

          {/* Quantity / Lots Selector */}
          <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium">Lots / Quantity:</span>
                <div className="text-[11px] text-slate-400">
                  <span className="font-mono-numbers font-bold text-white text-sm">{quantity}</span> Qty ({lots} Lots)
                </div>
              </div>

              {/* Stepper buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLots((prev) => Math.max(1, prev - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-200 transition active:scale-95"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={lots}
                  onChange={(e) => setLots(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-12 text-center bg-slate-950 border border-slate-700 rounded-lg py-1 font-mono-numbers font-bold text-white text-sm focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => setLots((prev) => prev + 1)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-200 transition active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick lot pills */}
            <div className="flex items-center gap-1.5 pt-1">
              {[1, 2, 5, 10].map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleQuickAddLots(amt)}
                  className="flex-1 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-[10px] font-semibold text-slate-300 transition"
                >
                  +{amt}L
                </button>
              ))}
            </div>
          </div>

          {/* Limit Price Input (if LIMIT order) */}
          {orderType === 'LIMIT' && (
            <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium">Limit Price:</span>
                <div className="text-[10px] text-slate-500">Order executes at this price or better</div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-mono-numbers">₹</span>
                <input
                  type="number"
                  step="0.05"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  className="w-24 text-right bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-2 font-mono-numbers font-bold text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Optional Target / SL Drawer */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <span>{showAdvanced ? '− Hide' : '+ Set'} Stop Loss & Target (Auto Exit)</span>
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-2 gap-2 mt-2 p-2.5 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Target Price (₹):</label>
                  <input
                    type="number"
                    step="0.05"
                    placeholder="e.g. 150.0"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 font-mono-numbers text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Stop Loss (₹):</label>
                  <input
                    type="number"
                    step="0.05"
                    placeholder="e.g. 70.0"
                    value={stopLossPrice}
                    onChange={(e) => setStopLossPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 font-mono-numbers text-rose-400 font-bold focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Margin Info Pill */}
          <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px] flex items-center justify-between">
            <div>
              <span className="text-slate-400">Margin Req: </span>
              <span className="font-mono-numbers font-bold text-white">
                {formatINR(approxMargin)}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Available: </span>
              <span className={`font-mono-numbers font-bold ${hasEnoughMargin ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatINR(account.availableMargin || 0)}
              </span>
            </div>
          </div>

          {/* Big Action Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !hasEnoughMargin}
            className={`w-full py-3.5 rounded-2xl font-extrabold text-sm uppercase tracking-wider text-white shadow-xl transition active:scale-98 flex items-center justify-center gap-2 ${
              isBuy
                ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30 disabled:bg-slate-800 disabled:text-slate-500'
                : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30 disabled:bg-slate-800 disabled:text-slate-500'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Executing Trade...
              </span>
            ) : (
              <span>
                {action} {lots} {lots === 1 ? 'Lot' : 'Lots'} ({quantity} Qty) @ {orderType === 'MARKET' ? `₹${execPrice.toFixed(2)} (MKT)` : `₹${execPrice.toFixed(2)} (LMT)`}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
