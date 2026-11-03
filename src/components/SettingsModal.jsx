import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Smartphone, Key, Shield, HelpCircle, Check, Copy, ExternalLink, Zap, CheckCircle2, LogOut, Clock, Download } from 'lucide-react';
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

  const [activeBrokerTab, setActiveBrokerTab] = useState('angel'); // 'angel' | 'dhan'
  const [customCapital, setCustomCapital] = useState('1000000');

  // Angel One State
  const [angelApiKey, setAngelApiKey] = useState('YzqZSKf4');
  const [angelClientCode, setAngelClientCode] = useState('STSB1143');
  const [angelMpin, setAngelMpin] = useState('');
  const [showMpin, setShowMpin] = useState(false);
  const [angelTotp, setAngelTotp] = useState('');
  const [angelTotpSecret, setAngelTotpSecret] = useState('NKJJ3IIQNIPQOE4UY6I6NNKOLQ');
  const [angelStatus, setAngelStatus] = useState({ isConnected: false });
  const [isConnectingAngel, setIsConnectingAngel] = useState(false);
  const [isSyncingAngel, setIsSyncingAngel] = useState(false);
  const [angelMessage, setAngelMessage] = useState('');

  // Dhan State
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
      api.getAngelStatus().then((status) => {
        setAngelStatus(status);
        if (status.apiKey) setAngelApiKey(status.apiKey);
        if (status.clientCode) setAngelClientCode(status.clientCode);
      });

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

  const handleToggleTradingMode = async (allow) => {
    try {
      await api.setTradingMode(allow);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleConnectAngel = async () => {
    if (!angelClientCode || !angelMpin) {
      setAngelMessage('Please enter Client Code and MPIN / Password');
      return;
    }

    setIsConnectingAngel(true);
    setAngelMessage('');
    try {
      const res = await api.connectAngel({
        apiKey: angelApiKey,
        clientCode: angelClientCode,
        mpin: angelMpin,
        totpSecret: angelTotpSecret,
        totp: angelTotp,
      });

      if (res.success) {
        setAngelStatus({ isConnected: true, clientCode: angelClientCode });
        setAngelMessage('✅ ' + res.message);
      } else {
        setAngelMessage('❌ ' + (res.message || 'Authentication failed'));
      }
    } catch (err) {
      setAngelMessage('❌ Connection error: ' + err.message);
    } finally {
      setIsConnectingAngel(false);
    }
  };

  const handleSyncAngel = async () => {
    setIsSyncingAngel(true);
    setAngelMessage('');
    try {
      await api.syncAngelQuotes();
      setAngelMessage('✅ Market quotes refreshed from Angel One!');
      setTimeout(() => setAngelMessage(''), 3000);
    } catch (err) {
      setAngelMessage('❌ Sync failed: ' + err.message);
    } finally {
      setIsSyncingAngel(false);
    }
  };

  const handleDisconnectAngel = async () => {
    if (!confirm('Are you sure you want to disconnect from Angel One?')) return;
    try {
      await api.disconnectAngel();
      setAngelStatus({ isConnected: false });
      setAngelMessage('Disconnected from Angel One');
    } catch (err) {
      setAngelMessage('❌ Disconnect error: ' + err.message);
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
          <div className="p-3.5 bg-blue-950/20 rounded-2xl border border-blue-500/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-300 text-xs font-bold">
                <Smartphone className="w-4 h-4 text-blue-400" />
                <span>Mobile Phone & Native App</span>
              </div>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold px-2 py-0.5 rounded-full">
                Android APK & Web
              </span>
            </div>

            {/* Direct APK Download Button */}
            <a
              href="/OptionPulse.apk"
              download="OptionPulse.apk"
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-md shadow-emerald-900/30 active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>Download Native Android APK (OptionPulse.apk)</span>
            </a>

            <p className="text-[11px] text-slate-300">
              Or open in Safari / Chrome on same Wi-Fi:
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
              📲 <strong>Tip:</strong> Tap "Share" &gt; "Add to Home Screen" on iPhone, or install <strong>OptionPulse.apk</strong> on Android for full native performance!
            </p>
          </div>

          {/* Section 2: Live Market Broker Feeds (Angel One vs Dhan) */}
          <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Zap className="w-4 h-4 text-blue-400" />
                <span>Live Broker Market Feed</span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  angelStatus.isConnected || dhanStatus.isConnected
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${angelStatus.isConnected || dhanStatus.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <span>{angelStatus.isConnected ? 'ANGEL LIVE' : (dhanStatus.isConnected ? 'DHAN LIVE' : 'REPLAY MODE')}</span>
              </span>
            </div>

            {/* Broker Switcher Pills */}
            <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                onClick={() => setActiveBrokerTab('angel')}
                className={`py-1.5 rounded-lg transition ${
                  activeBrokerTab === 'angel'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Angel One (100% Free)
              </button>
              <button
                onClick={() => setActiveBrokerTab('dhan')}
                className={`py-1.5 rounded-lg transition ${
                  activeBrokerTab === 'dhan'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                DhanHQ (₹499)
              </button>
            </div>

            {/* TAB 1: Angel One */}
            {activeBrokerTab === 'angel' && (
              <div className="space-y-3 pt-1">
                {angelStatus.isConnected ? (
                  /* ALREADY CONNECTED VIEW */
                  <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white">Angel One SmartAPI</h4>
                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[9px] font-extrabold text-emerald-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              CONNECTED
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">Live Indian Market Data & Greeks Active</p>
                        </div>
                      </div>
                    </div>

                    {/* Connection details grid */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-[11px]">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Client Code:</span>
                        <span className="font-mono-numbers font-bold text-slate-200">
                          {angelStatus.clientCode || angelClientCode}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Exchange Feed:</span>
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          NSE & BSE Live
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">SmartAPI Key:</span>
                        <span className="font-mono-numbers text-slate-300 font-semibold">{angelApiKey}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Plan:</span>
                        <span className="text-blue-400 font-semibold">100% Free Lifetime</span>
                      </div>
                    </div>

                    {angelMessage && (
                      <div className="text-xs font-semibold p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200">
                        {angelMessage}
                      </div>
                    )}

                    {/* Actions: Sync Live Data & Disconnect */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={handleSyncAngel}
                        disabled={isSyncingAngel}
                        className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-98 shadow-md shadow-blue-600/20 disabled:bg-slate-800"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAngel ? 'animate-spin' : ''}`} />
                        <span>{isSyncingAngel ? 'Syncing...' : 'Sync Live Quotes'}</span>
                      </button>

                      <button
                        onClick={handleDisconnectAngel}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 hover:border-rose-500/30 border border-slate-700 text-slate-300 text-xs font-semibold transition active:scale-98 flex items-center gap-1"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* DISCONNECTED LOGIN FORM */
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400">SmartAPI Key:</label>
                      <input
                        type="text"
                        value={angelApiKey}
                        onChange={(e) => setAngelApiKey(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono-numbers text-white mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400">Client Code (User ID):</label>
                        <input
                          type="text"
                          placeholder="e.g. A123456"
                          value={angelClientCode}
                          onChange={(e) => setAngelClientCode(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono-numbers text-white mt-1 uppercase"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-semibold text-slate-400">4-Digit MPIN:</label>
                          <button
                            type="button"
                            onClick={() => setShowMpin(!showMpin)}
                            className="text-[9px] text-blue-400 font-semibold hover:underline"
                          >
                            {showMpin ? 'Hide' : 'Show'}
                          </button>
                        </div>
                        <input
                          type={showMpin ? 'text' : 'password'}
                          placeholder="e.g. 1234"
                          maxLength={6}
                          value={angelMpin}
                          onChange={(e) => setAngelMpin(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono-numbers text-white mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400">TOTP Secret (Auto-login):</label>
                        <input
                          type="password"
                          placeholder="Authenticator Secret"
                          value={angelTotpSecret}
                          onChange={(e) => setAngelTotpSecret(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono-numbers text-white mt-1"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-slate-400">OR Current 6-digit TOTP:</label>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="e.g. 123456"
                          value={angelTotp}
                          onChange={(e) => setAngelTotp(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono-numbers text-white mt-1"
                        />
                      </div>
                    </div>

                    {angelMessage && (
                      <div className="text-xs font-semibold p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200">
                        {angelMessage}
                      </div>
                    )}

                    <button
                      onClick={handleConnectAngel}
                      disabled={isConnectingAngel}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold uppercase tracking-wider transition active:scale-98 shadow-lg shadow-blue-600/20 disabled:bg-slate-800 disabled:text-slate-500 flex items-center justify-center gap-1.5"
                    >
                      {isConnectingAngel ? 'Connecting to Angel One...' : 'Verify & Connect Angel One Live Feed'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Dhan */}
            {activeBrokerTab === 'dhan' && (
              <div className="space-y-2 pt-1">
                <div>
                  <label className="text-[10px] font-semibold text-slate-400">Dhan Client ID (10-Digit):</label>
                  <input
                    type="text"
                    placeholder="e.g. 1000012345"
                    value={dhanClientId}
                    onChange={(e) => setDhanClientId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono-numbers text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-400">Dhan Access Token (JWT):</label>
                  <textarea
                    rows={2}
                    placeholder="Paste Dhan Access Token"
                    value={dhanAccessToken}
                    onChange={(e) => setDhanAccessToken(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono-numbers text-white mt-1 resize-none"
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
                  {isConnectingDhan ? 'Connecting...' : 'Connect Dhan Live Feed'}
                </button>
              </div>
            )}
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

          {/* Section: Exchange Market Hours Enforcement */}
          <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-xs font-bold text-slate-200">Execution Trading Hours</div>
                  <p className="text-[10px] text-slate-400">NSE / BSE Sessions: 09:15 AM – 03:30 PM IST</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${account.allowOffMarketTrading ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                {account.allowOffMarketTrading ? '24/7 Practice' : 'Strict Market Hours'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-[11px] text-slate-300">Allow Off-Market Orders (Practice Mode)</span>
              <button
                type="button"
                onClick={() => handleToggleTradingMode(!account.allowOffMarketTrading)}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${account.allowOffMarketTrading ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'}`}
              >
                <span className="w-5 h-5 rounded-full bg-white shadow-md" />
              </button>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              {account.allowOffMarketTrading 
                ? '⚠️ Practice Mode ON: Orders can be executed 24/7 even when exchange is closed.'
                : '🛡️ Strict Mode ON: Orders can only be placed & executed during live market hours.'}
            </p>
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
