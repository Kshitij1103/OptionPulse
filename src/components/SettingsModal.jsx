import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Smartphone, Key, Shield, HelpCircle, Check, Copy, ExternalLink, Zap, CheckCircle2 } from 'lucide-react';
import { formatINR } from '../utils/formatters';
import { api } from '../utils/api';

export function SettingsModal({
  isOpen,
  onClose,
  account = {},
  networkInfo = {},
  onResetAccount,
}) {
  if (!isOpen) return null;

  const [customCapital, setCustomCapital] = useState('1000000');
  const [dhanClientId, setDhanClientId] = useState('');
  const [dhanAccessToken, setDhanAccessToken] = useState('');
  const [dhanStatus, setDhanStatus] = useState({ isConnected: false });
  const [isConnectingDhan, setIsConnectingDhan] = useState(false);
  const [dhanMessage, setDhanMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const mobileUrl = networkInfo.mobileUrl || `http://${window.location.hostname}:3000`;

  useEffect(() => {
    if (isOpen) {
      api.getDhanStatus().then((status) => {
        setDhanStatus(status);
        if (status.clientId) setDhanClientId(status.clientId);
      });
    }
  }, [isOpen]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(mobileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = async (amt) => {
    setIsResetting(true);
    try {
      await onResetAccount(amt);
      alert(`Virtual trading account reset to ₹${Number(amt).toLocaleString('en-IN')}`);
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleConnectDhan = async () => {
    if (!dhanClientId || !dhanAccessToken) {
      setDhanMessage('Please enter both Client ID and Access Token');
      return;
    }

    setIsConnectingDhan(true);
    setDhanMessage('');
    try {
      const res = await api.connectDhan({
        clientId: dhanClientId,
        accessToken: dhanAccessToken,
      });

      if (res.success) {
        setDhanStatus({ isConnected: true, clientId: dhanClientId });
        setDhanMessage('✅ ' + res.message);
      } else {
        setDhanMessage('❌ ' + (res.message || 'Connection failed'));
      }
    } catch (err) {
      setDhanMessage('❌ Connection error: ' + err.message);
    } finally {
      setIsConnectingDhan(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-[#0e1422] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">App & Virtual Trading Settings</h3>
              <p className="text-[11px] text-slate-400">Indian Market Options Engine</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Section 1: Mobile App Access */}
          <div className="p-3.5 bg-blue-950/20 rounded-2xl border border-blue-500/20 space-y-2">
            <div className="flex items-center gap-2 text-blue-300 text-xs font-bold">
              <Smartphone className="w-4 h-4 text-blue-400" />
              <span>Use on Your Mobile Phone</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Open Safari (iPhone) or Chrome (Android) on the same Wi-Fi and open this URL:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={mobileUrl}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono-numbers text-slate-100 select-all"
              />
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1 shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              📲 <strong>Tip:</strong> Tap "Share" &gt; "Add to Home Screen" on your phone to install it with full-screen native feel!
            </p>
          </div>

          {/* Section 2: Dhan Live Real-Time Market Feed */}
          <div className="p-3.5 bg-gradient-to-br from-amber-950/20 to-slate-900/80 rounded-2xl border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>DhanHQ Live Real-Time Feed</span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  dhanStatus.isConnected
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${dhanStatus.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <span>{dhanStatus.isConnected ? 'LIVE CONNECTED' : 'NOT CONNECTED'}</span>
              </span>
            </div>

            <p className="text-[11px] text-slate-300">
              Stream live tick-by-tick NSE option chains directly from Dhan's free API:
            </p>

            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400">Dhan Client ID (10-Digit ID):</label>
                <input
                  type="text"
                  placeholder="e.g. 1000012345"
                  value={dhanClientId}
                  onChange={(e) => setDhanClientId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono-numbers text-white mt-1 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400">Dhan Access Token (JWT):</label>
                <textarea
                  rows={2}
                  placeholder="Paste your Dhan Access Token from web.dhan.co"
                  value={dhanAccessToken}
                  onChange={(e) => setDhanAccessToken(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono-numbers text-white mt-1 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {dhanMessage && (
                <div className="text-xs font-semibold p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200">
                  {dhanMessage}
                </div>
              )}

              <button
                onClick={handleConnectDhan}
                disabled={isConnectingDhan}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold uppercase tracking-wider transition active:scale-98 shadow-lg shadow-amber-500/20 disabled:bg-slate-800 disabled:text-slate-500 flex items-center justify-center gap-1.5"
              >
                {isConnectingDhan ? (
                  <span>Verifying with Dhan...</span>
                ) : (
                  <span>Verify & Connect Dhan Live Feed</span>
                )}
              </button>
            </div>

            {/* How to get Dhan Token Guide */}
            <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 space-y-1">
              <div className="font-bold text-slate-300">How to get your free Dhan token (2 min):</div>
              <ol className="list-decimal pl-4 space-y-0.5">
                <li>Log in to <a href="https://web.dhan.co" target="_blank" rel="noreferrer" className="text-blue-400 underline">web.dhan.co</a> on your browser.</li>
                <li>Click your Profile icon at top right &gt; <strong>DhanHQ Trading APIs & Access</strong>.</li>
                <li>Click <strong>Generate Access Token</strong> & copy both Client ID and Token here!</li>
              </ol>
            </div>
          </div>

          {/* Section 3: Virtual Paper Capital Reset */}
          <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-200">Virtual Paper Capital</div>
              <span className="font-mono-numbers text-xs font-bold text-emerald-400">
                Current: {formatINR(account.availableMargin || 0, { compact: true })}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '₹1 Lakh', val: '100000' },
                { label: '₹5 Lakhs', val: '500000' },
                { label: '₹10 Lakhs', val: '1000000' },
              ].map((preset) => (
                <button
                  key={preset.val}
                  onClick={() => handleReset(preset.val)}
                  disabled={isResetting}
                  className="py-1.5 px-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold transition active:scale-95 border border-slate-700/60"
                >
                  Reset {preset.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="number"
                value={customCapital}
                onChange={(e) => setCustomCapital(e.target.value)}
                placeholder="Custom Amount"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono-numbers text-white focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => handleReset(customCapital)}
                disabled={isResetting}
                className="px-3 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-bold transition shrink-0"
              >
                Reset Custom
              </button>
            </div>
          </div>

          {/* Section 4: NSE Lot Sizes Quick Guide */}
          <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-[11px] space-y-1">
            <div className="font-bold text-slate-300">Official Indian Market Lot Sizes:</div>
            <div className="grid grid-cols-2 gap-1 text-slate-400 font-mono-numbers text-[10px]">
              <div>• NIFTY 50: 25 Qty / Lot</div>
              <div>• BANKNIFTY: 15 Qty / Lot</div>
              <div>• FINNIFTY: 25 Qty / Lot</div>
              <div>• SENSEX: 10 Qty / Lot</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
