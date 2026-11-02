import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { OptionChain } from './components/OptionChain';
import { OrderSheet } from './components/OrderSheet';
import { Positions } from './components/Positions';
import { Orders } from './components/Orders';
import { Watchlist } from './components/Watchlist';
import { StrategyBuilder } from './components/StrategyBuilder';
import { SettingsModal } from './components/SettingsModal';
import { MobileWrapper } from './components/MobileWrapper';
import { api, connectWebSocket } from './utils/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('optionChain');
  const [selectedSymbol, setSelectedSymbol] = useState('NIFTY');
  const [selectedExpiry, setSelectedExpiry] = useState('');
  const [indices, setIndices] = useState({
    NIFTY: { symbol: 'NIFTY', name: 'NIFTY 50', exchange: 'NSE', lotSize: 25, strikeStep: 50, ltp: 24150, change: 15, pChange: 0.06 },
    BANKNIFTY: { symbol: 'BANKNIFTY', name: 'NIFTY BANK', exchange: 'NSE', lotSize: 15, strikeStep: 100, ltp: 51280, change: 45, pChange: 0.09 },
    FINNIFTY: { symbol: 'FINNIFTY', name: 'NIFTY FINANCIAL', exchange: 'NSE', lotSize: 25, strikeStep: 50, ltp: 23620, change: -10, pChange: -0.04 },
    SENSEX: { symbol: 'SENSEX', name: 'BSE SENSEX', exchange: 'BSE', lotSize: 10, strikeStep: 100, ltp: 79800, change: 80, pChange: 0.10 },
  });
  const [vix, setVix] = useState({ ltp: 14.15, change: 0.2 });
  const [expiries, setExpiries] = useState([]);
  const [marketStatus, setMarketStatus] = useState({ isOpen: true, session: 'Live Trading', istTimeStr: '15:15:00' });
  const [chainData, setChainData] = useState(null);
  const [account, setAccount] = useState({
    cashBalance: 1000000,
    availableMargin: 1000000,
    usedMargin: 0,
    unrealizedPnL: 0,
    realizedPnL: 0,
    totalPnL: 0,
    positions: [],
    orders: [],
    trades: [],
  });
  const [networkInfo, setNetworkInfo] = useState({});
  const [orderTarget, setOrderTarget] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileFrame, setIsMobileFrame] = useState(window.innerWidth > 768);

  const refreshOptionChain = useCallback(async (sym = selectedSymbol, exp = selectedExpiry) => {
    try {
      const chain = await api.getOptionChain(sym, exp);
      if (chain && chain.strikes) {
        setChainData(chain);
      }
    } catch (err) {
      console.warn('Option chain fetch error, retrying...', err);
    }
  }, [selectedSymbol, selectedExpiry]);

  // Initial Data Fetching
  useEffect(() => {
    async function loadInitialData() {
      // Fetch in parallel with individual safety
      api.getIndices().then((marketRes) => {
        if (marketRes?.indices) setIndices((prev) => ({ ...prev, ...marketRes.indices }));
        if (marketRes?.vix) setVix(marketRes.vix);
        if (marketRes?.expiries) {
          setExpiries(marketRes.expiries);
          const defaultExp = marketRes.expiries[0]?.value || '';
          setSelectedExpiry((curr) => curr || defaultExp);
        }
        if (marketRes?.marketStatus) setMarketStatus(marketRes.marketStatus);
      }).catch(console.warn);

      api.getAccount().then((accRes) => {
        if (accRes) setAccount(accRes);
      }).catch(console.warn);

      api.getNetworkInfo().then((netRes) => {
        if (netRes) setNetworkInfo(netRes);
      }).catch(console.warn);

      refreshOptionChain(selectedSymbol, selectedExpiry);
    }

    loadInitialData();
  }, []);

  // Fetch Option Chain when symbol or expiry changes
  useEffect(() => {
    refreshOptionChain(selectedSymbol, selectedExpiry);
  }, [selectedSymbol, selectedExpiry, refreshOptionChain]);

  // Real-time WebSocket connection
  useEffect(() => {
    const disconnect = connectWebSocket((msg) => {
      if (msg.type === 'INIT' || msg.type === 'MARKET_TICK') {
        if (msg.data?.indices) {
          setIndices((prev) => ({ ...prev, ...msg.data.indices }));
        } else if (msg.indices) {
          setIndices((prev) => ({ ...prev, ...msg.indices }));
        }

        if (msg.data?.vix) setVix(msg.data.vix);
        else if (msg.vix) setVix(msg.vix);

        if (msg.data?.marketStatus) setMarketStatus(msg.data.marketStatus);
        else if (msg.marketStatus) setMarketStatus(msg.marketStatus);

        if (msg.account) {
          setAccount(msg.account);
        }

        if (msg.initialChain && !chainData) {
          setChainData(msg.initialChain);
        }
      } else if (
        msg.type === 'ORDER_PLACED' ||
        msg.type === 'POSITION_SQUARED_OFF' ||
        msg.type === 'ALL_POSITIONS_SQUARED_OFF' ||
        msg.type === 'ACCOUNT_RESET'
      ) {
        if (msg.account) {
          setAccount(msg.account);
        }
      }
    });

    return disconnect;
  }, [chainData]);

  // Handle Placing Order
  const handlePlaceOrder = async (orderData) => {
    const res = await api.placeOrder(orderData);
    if (res.account) {
      setAccount(res.account);
    }
    return res;
  };

  // Handle Square Off Position
  const handleSquareOffPosition = async (posId) => {
    const res = await api.squareOffPosition(posId);
    if (res.account) {
      setAccount(res.account);
    }
    return res;
  };

  // Handle Square Off All
  const handleSquareOffAll = async () => {
    const res = await api.squareOffAll();
    if (res.account) {
      setAccount(res.account);
    }
    return res;
  };

  // Handle Cancel Order
  const handleCancelOrder = async (orderId) => {
    const res = await api.cancelOrder(orderId);
    if (res.account) {
      setAccount(res.account);
    }
    return res;
  };

  // Handle Reset Account
  const handleResetAccount = async (capital) => {
    const res = await api.resetAccount(capital);
    if (res.account) {
      setAccount(res.account);
    }
    return res;
  };

  const handleSaveBrokerSettings = async (settings) => {
    return api.saveBrokerSettings(settings);
  };

  const currentLotSize = indices[selectedSymbol]?.lotSize || 25;
  const openPositionsCount = account.positions?.length || 0;
  const openOrdersCount = account.orders?.filter((o) => o.status === 'OPEN').length || 0;

  return (
    <MobileWrapper isMobileFrame={isMobileFrame}>
      {/* App Header */}
      <Header
        indices={indices}
        vix={vix}
        marketStatus={marketStatus}
        account={account}
        selectedSymbol={selectedSymbol}
        onSelectSymbol={setSelectedSymbol}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isMobileFrame={isMobileFrame}
        onToggleFrame={() => setIsMobileFrame(!isMobileFrame)}
      />

      {/* Main Tab Screens */}
      <main className="flex-1 overflow-y-auto no-scrollbar">
        {activeTab === 'watchlist' && (
          <Watchlist
            indices={indices}
            vix={vix}
            selectedSymbol={selectedSymbol}
            onSelectSymbol={setSelectedSymbol}
            onNavigateOptionChain={(sym) => {
              if (sym) setSelectedSymbol(sym);
              setActiveTab('optionChain');
            }}
            onOpenOrder={(target) => setOrderTarget(target)}
          />
        )}

        {activeTab === 'optionChain' && (
          <OptionChain
            chainData={chainData}
            selectedSymbol={selectedSymbol}
            expiries={expiries}
            selectedExpiry={selectedExpiry}
            onSelectExpiry={setSelectedExpiry}
            onOpenOrder={(target) => setOrderTarget(target)}
            onAddToStrategy={() => setActiveTab('strategy')}
            onRetry={() => refreshOptionChain(selectedSymbol, selectedExpiry)}
          />
        )}

        {activeTab === 'positions' && (
          <Positions
            account={account}
            onSquareOffPosition={handleSquareOffPosition}
            onSquareOffAll={handleSquareOffAll}
            onNavigateOptionChain={() => setActiveTab('optionChain')}
          />
        )}

        {activeTab === 'orders' && (
          <Orders
            account={account}
            onCancelOrder={handleCancelOrder}
          />
        )}

        {activeTab === 'strategy' && (
          <StrategyBuilder
            selectedSymbol={selectedSymbol}
            indices={indices}
            chainData={chainData}
            account={account}
            onSubmitOrder={handlePlaceOrder}
            onNavigatePositions={() => setActiveTab('positions')}
          />
        )}
      </main>

      {/* Order Placement Bottom Drawer */}
      {orderTarget && (
        <OrderSheet
          orderTarget={orderTarget}
          lotSize={currentLotSize}
          account={account}
          onClose={() => setOrderTarget(null)}
          onSubmitOrder={handlePlaceOrder}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        account={account}
        networkInfo={networkInfo}
        onResetAccount={handleResetAccount}
        onSaveBrokerSettings={handleSaveBrokerSettings}
      />

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        openPositionsCount={openPositionsCount}
        openOrdersCount={openOrdersCount}
      />
    </MobileWrapper>
  );
}
