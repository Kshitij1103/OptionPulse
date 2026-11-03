// Virtual Trading Paper Engine for Indian Options
// Handles orders, margin calculations, P&L, stop-loss / target triggers, and persistent account state

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.join(__dirname, 'store.json');

const DEFAULT_INITIAL_CAPITAL = 1000000; // ₹10,00,000 (10 Lakhs)

export class TradingEngine {
  constructor(marketData) {
    this.marketData = marketData;
    this.account = this.loadState();

    // Listen to market ticks to update MTM P&L and trigger SL/TP / Limit orders
    this.marketData.addListener((tick) => this.onMarketTick(tick));
  }

  loadState() {
    try {
      if (fs.existsSync(STORE_PATH)) {
        const raw = fs.readFileSync(STORE_PATH, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Failed to load state, creating fresh account:', err);
    }

    const defaultState = {
      initialCapital: DEFAULT_INITIAL_CAPITAL,
      cashBalance: DEFAULT_INITIAL_CAPITAL,
      availableMargin: DEFAULT_INITIAL_CAPITAL,
      usedMargin: 0,
      realizedPnL: 0,
      unrealizedPnL: 0,
      totalPnL: 0,
      positions: [], // Active open positions
      orders: [],    // Order history & open limit orders
      trades: [],    // Executed trade log
      allowOffMarketTrading: false, // Strict: Orders only during live market hours (9:15 AM - 3:30 PM IST)
      stats: {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        bestTrade: 0,
        worstTrade: 0,
      },
    };
    this.saveState(defaultState);
    return defaultState;
  }

  saveState(state = this.account) {
    try {
      fs.writeFileSync(STORE_PATH, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving account state:', err);
    }
  }

  resetAccount(newCapital = DEFAULT_INITIAL_CAPITAL) {
    this.account = {
      initialCapital: newCapital,
      cashBalance: newCapital,
      availableMargin: newCapital,
      usedMargin: 0,
      realizedPnL: 0,
      unrealizedPnL: 0,
      totalPnL: 0,
      positions: [],
      orders: [],
      trades: [],
      stats: {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        bestTrade: 0,
        worstTrade: 0,
      },
    };
    this.saveState();
    return this.getAccountSummary();
  }

  calculateMarginRequired(order) {
    const { symbol, strikePrice, type, action, quantity, price } = order;

    // Check if this order reduces/closes an existing opposite position
    const oppAction = action === 'BUY' ? 'SELL' : 'BUY';
    const existing = this.account.positions.find(
      (p) =>
        p.symbol === symbol &&
        Number(p.strikePrice) === Number(strikePrice) &&
        p.optionType === type &&
        p.action === oppAction
    );

    // If squaring off or reducing existing position, margin required is ZERO!
    const netQuantity = existing ? Math.max(0, quantity - existing.quantity) : quantity;
    if (netQuantity <= 0) {
      return 0;
    }

    const lotPrice = price || 100;
    if (action === 'BUY') {
      // Long options: Margin = Premium paid
      return netQuantity * lotPrice;
    } else {
      // Short options: SPAN + Exposure margin per lot
      const marginPerLot = symbol === 'BANKNIFTY' ? 125000 : (symbol === 'NIFTY' ? 115000 : 105000);
      const lotSize = this.marketData.indices[symbol]?.lotSize || 25;
      const lots = netQuantity / lotSize;
      return lots * marginPerLot;
    }
  }

  placeOrder(orderReq) {
    const marketStatus = this.marketData.checkMarketStatus();
    if (!marketStatus.isOpen && !this.account.allowOffMarketTrading) {
      throw new Error(
        `Orders can only be placed and executed during market hours (09:15 AM - 03:30 PM IST, Monday - Friday). Market is currently in ${marketStatus.session}.`
      );
    }

    const {
      symbol,
      strikePrice,
      optionType, // 'CE' | 'PE'
      action,     // 'BUY' | 'SELL'
      lots,
      orderType = 'MARKET', // 'MARKET' | 'LIMIT'
      limitPrice,
      productType = 'MIS',  // 'MIS' (Intraday) | 'NRML' (Overnight)
      targetPrice = null,
      stopLossPrice = null,
      expiry = null,
    } = orderReq;

    const idx = this.marketData.indices[symbol];
    if (!idx) {
      throw new Error(`Invalid index symbol: ${symbol}`);
    }

    const lotSize = idx.lotSize;
    const quantity = lots * lotSize;

    // Get current contract details from market
    const contract = this.marketData.getOptionContract(symbol, strikePrice, optionType, expiry);
    if (!contract) {
      throw new Error(`Option strike ${strikePrice} ${optionType} not found in market data.`);
    }

    const currentLtp = contract.ltp;
    const executionPrice = orderType === 'MARKET' ? currentLtp : Number(limitPrice);

    const requiredMargin = this.calculateMarginRequired({
      symbol,
      strikePrice,
      type: optionType,
      action,
      quantity,
      price: executionPrice,
    });

    if (this.account.availableMargin < requiredMargin) {
      throw new Error(`Insufficient margin! Required: ₹${requiredMargin.toLocaleString('en-IN')}, Available: ₹${this.account.availableMargin.toLocaleString('en-IN')}`);
    }

    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
    const newOrder = {
      id: orderId,
      symbol,
      contractSymbol: contract.symbol,
      strikePrice: Number(strikePrice),
      optionType,
      action,
      lots: Number(lots),
      lotSize,
      quantity,
      orderType,
      productType,
      price: executionPrice,
      limitPrice: orderType === 'LIMIT' ? Number(limitPrice) : null,
      targetPrice: targetPrice ? Number(targetPrice) : null,
      stopLossPrice: stopLossPrice ? Number(stopLossPrice) : null,
      requiredMargin,
      status: orderType === 'MARKET' ? 'COMPLETE' : 'OPEN',
      placedAt: new Date().toISOString(),
      executedAt: orderType === 'MARKET' ? new Date().toISOString() : null,
      expiry: expiry || this.marketData.expiries[0]?.value,
    };

    this.account.orders.unshift(newOrder);

    if (orderType === 'MARKET') {
      this.executeOrder(newOrder, executionPrice);
    }

    this.saveState();
    return newOrder;
  }

  executeOrder(order, execPrice) {
    order.status = 'COMPLETE';
    order.executedAt = new Date().toISOString();
    order.executedPrice = execPrice;

    // Add to trades log
    this.account.trades.unshift({
      tradeId: `TRD-${Date.now().toString(36).toUpperCase()}`,
      orderId: order.id,
      symbol: order.symbol,
      contractSymbol: order.contractSymbol,
      strikePrice: order.strikePrice,
      optionType: order.optionType,
      action: order.action,
      quantity: order.quantity,
      price: execPrice,
      timestamp: new Date().toISOString(),
    });

    // Check if this closes or reduces an opposite position
    const oppAction = order.action === 'BUY' ? 'SELL' : 'BUY';
    const existingIndex = this.account.positions.findIndex(
      (p) =>
        p.symbol === order.symbol &&
        p.strikePrice === order.strikePrice &&
        p.optionType === order.optionType &&
        p.expiry === order.expiry &&
        p.action === oppAction
    );

    if (existingIndex !== -1) {
      // Closing / squaring off position
      const pos = this.account.positions[existingIndex];
      const closeQty = Math.min(pos.quantity, order.quantity);

      // Realized PnL calculation
      let tradePnL = 0;
      if (pos.action === 'BUY') {
        // Bought earlier at pos.avgPrice, Selling now at execPrice
        tradePnL = (execPrice - pos.avgPrice) * closeQty;
      } else {
        // Sold earlier at pos.avgPrice, Buying back now at execPrice
        tradePnL = (pos.avgPrice - execPrice) * closeQty;
      }

      this.account.realizedPnL += tradePnL;
      this.account.cashBalance += tradePnL;

      // Update trade statistics
      this.account.stats.totalTrades++;
      if (tradePnL >= 0) {
        this.account.stats.winningTrades++;
        this.account.stats.bestTrade = Math.max(this.account.stats.bestTrade, tradePnL);
      } else {
        this.account.stats.losingTrades++;
        this.account.stats.worstTrade = Math.min(this.account.stats.worstTrade, tradePnL);
      }
      this.account.stats.winRate = Number(
        ((this.account.stats.winningTrades / this.account.stats.totalTrades) * 100).toFixed(1)
      );

      if (pos.quantity === closeQty) {
        // Fully closed position
        this.account.positions.splice(existingIndex, 1);
      } else {
        // Partially closed
        pos.quantity -= closeQty;
        pos.lots = pos.quantity / pos.lotSize;
      }
    } else {
      // Adding new position or increasing existing same-side position
      const sameIndex = this.account.positions.findIndex(
        (p) =>
          p.symbol === order.symbol &&
          p.strikePrice === order.strikePrice &&
          p.optionType === order.optionType &&
          p.expiry === order.expiry &&
          p.action === order.action
      );

      if (sameIndex !== -1) {
        const pos = this.account.positions[sameIndex];
        const totalCost = pos.avgPrice * pos.quantity + execPrice * order.quantity;
        pos.quantity += order.quantity;
        pos.lots = pos.quantity / pos.lotSize;
        pos.avgPrice = Number((totalCost / pos.quantity).toFixed(2));
        pos.targetPrice = order.targetPrice || pos.targetPrice;
        pos.stopLossPrice = order.stopLossPrice || pos.stopLossPrice;
      } else {
        const contract = this.marketData.getOptionContract(
          order.symbol,
          order.strikePrice,
          order.optionType,
          order.expiry
        );

        this.account.positions.push({
          id: `POS-${Date.now().toString(36).toUpperCase()}`,
          symbol: order.symbol,
          contractSymbol: order.contractSymbol,
          strikePrice: order.strikePrice,
          optionType: order.optionType,
          action: order.action,
          lots: order.lots,
          lotSize: order.lotSize,
          quantity: order.quantity,
          avgPrice: execPrice,
          ltp: execPrice,
          pnl: 0,
          pnlPercent: 0,
          targetPrice: order.targetPrice,
          stopLossPrice: order.stopLossPrice,
          productType: order.productType,
          expiry: order.expiry,
          delta: contract?.delta || (order.optionType === 'CE' ? 0.5 : -0.5),
          theta: contract?.theta || -5.0,
          iv: contract?.iv || 14.0,
          openedAt: new Date().toISOString(),
        });
      }
    }

    this.recalculateAccount();
  }

  squareOffPosition(positionId, forceAllowOffMarket = false) {
    const marketStatus = this.marketData.checkMarketStatus();
    if (!marketStatus.isOpen && !this.account.allowOffMarketTrading && !forceAllowOffMarket) {
      throw new Error(
        `Positions can only be squared off during market hours (09:15 AM - 03:30 PM IST). Market is currently in ${marketStatus.session}.`
      );
    }

    const posIndex = this.account.positions.findIndex((p) => p.id === positionId);
    if (posIndex === -1) throw new Error('Position not found');

    const pos = this.account.positions[posIndex];
    const contract = this.marketData.getOptionContract(pos.symbol, pos.strikePrice, pos.optionType, pos.expiry);
    const exitPrice = contract ? contract.ltp : pos.ltp;

    // Realized PnL calculation
    let tradePnL = 0;
    if (pos.action === 'BUY') {
      tradePnL = (exitPrice - pos.avgPrice) * pos.quantity;
    } else {
      tradePnL = (pos.avgPrice - exitPrice) * pos.quantity;
    }

    this.account.realizedPnL += tradePnL;
    this.account.cashBalance += tradePnL;

    // Record exit order & trade log
    const exitAction = pos.action === 'BUY' ? 'SELL' : 'BUY';
    const orderId = `ORD-EXIT-${Date.now().toString(36).toUpperCase()}`;
    this.account.orders.unshift({
      id: orderId,
      symbol: pos.symbol,
      contractSymbol: pos.contractSymbol,
      strikePrice: pos.strikePrice,
      optionType: pos.optionType,
      action: exitAction,
      lots: pos.lots,
      lotSize: pos.lotSize,
      quantity: pos.quantity,
      orderType: 'MARKET',
      productType: pos.productType,
      price: exitPrice,
      executedPrice: exitPrice,
      requiredMargin: 0,
      status: 'COMPLETE',
      placedAt: new Date().toISOString(),
      executedAt: new Date().toISOString(),
      expiry: pos.expiry,
    });

    this.account.trades.unshift({
      tradeId: `TRD-${Date.now().toString(36).toUpperCase()}`,
      orderId,
      symbol: pos.symbol,
      contractSymbol: pos.contractSymbol,
      strikePrice: pos.strikePrice,
      optionType: pos.optionType,
      action: exitAction,
      quantity: pos.quantity,
      price: exitPrice,
      pnl: Number(tradePnL.toFixed(2)),
      timestamp: new Date().toISOString(),
    });

    // Update trade statistics
    this.account.stats.totalTrades++;
    if (tradePnL >= 0) {
      this.account.stats.winningTrades++;
      this.account.stats.bestTrade = Math.max(this.account.stats.bestTrade, tradePnL);
    } else {
      this.account.stats.losingTrades++;
      this.account.stats.worstTrade = Math.min(this.account.stats.worstTrade, tradePnL);
    }
    this.account.stats.winRate = Number(
      ((this.account.stats.winningTrades / this.account.stats.totalTrades) * 100).toFixed(1)
    );

    // Remove the position
    this.account.positions.splice(posIndex, 1);
    this.recalculateAccount();
    this.saveState();

    return {
      success: true,
      message: `Squared off ${pos.contractSymbol} @ ₹${exitPrice.toFixed(2)} (P&L: ₹${tradePnL.toFixed(2)})`,
      account: this.getAccountSummary(),
    };
  }

  squareOffAll(forceAllowOffMarket = false) {
    const marketStatus = this.marketData.checkMarketStatus();
    if (!marketStatus.isOpen && !this.account.allowOffMarketTrading && !forceAllowOffMarket) {
      throw new Error(
        `Positions can only be squared off during market hours (09:15 AM - 03:30 PM IST). Market is currently in ${marketStatus.session}.`
      );
    }

    const count = this.account.positions.length;
    while (this.account.positions.length > 0) {
      const pos = this.account.positions[0];
      this.squareOffPosition(pos.id, true);
    }
    return {
      success: true,
      count,
      message: `Squared off all ${count} positions`,
      account: this.getAccountSummary(),
    };
  }

  setAllowOffMarketTrading(allow) {
    this.account.allowOffMarketTrading = Boolean(allow);
    this.saveState();
    return this.getAccountSummary();
  }

  cancelOrder(orderId) {
    const order = this.account.orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order not found');
    if (order.status !== 'OPEN') throw new Error(`Cannot cancel order in ${order.status} state`);

    order.status = 'CANCELLED';
    this.saveState();
    return order;
  }

  onMarketTick() {
    const marketStatus = this.marketData.checkMarketStatus();
    const canExecute = marketStatus.isOpen || this.account.allowOffMarketTrading;
    let stateChanged = false;

    // 1. Check open limit orders (ONLY execute during live market hours)
    if (canExecute) {
      for (const order of this.account.orders) {
        if (order.status === 'OPEN' && order.orderType === 'LIMIT') {
          const contract = this.marketData.getOptionContract(
            order.symbol,
            order.strikePrice,
            order.optionType,
            order.expiry
          );
          if (!contract) continue;

          let shouldExecute = false;
          if (order.action === 'BUY' && contract.ltp <= order.limitPrice) {
            shouldExecute = true;
          } else if (order.action === 'SELL' && contract.ltp >= order.limitPrice) {
            shouldExecute = true;
          }

          if (shouldExecute) {
            this.executeOrder(order, order.limitPrice);
            stateChanged = true;
          }
        }
      }
    }

    // 2. Update active positions LTP, MTM P&L, and check SL / TP triggers
    let totalUnrealized = 0;
    const positionsToSquareOff = [];

    for (const pos of this.account.positions) {
      const contract = this.marketData.getOptionContract(pos.symbol, pos.strikePrice, pos.optionType, pos.expiry);
      if (!contract) continue;

      pos.ltp = contract.ltp;
      pos.delta = contract.delta;
      pos.theta = contract.theta;
      pos.iv = contract.iv;

      if (pos.action === 'BUY') {
        pos.pnl = Number(((pos.ltp - pos.avgPrice) * pos.quantity).toFixed(2));
      } else {
        pos.pnl = Number(((pos.avgPrice - pos.ltp) * pos.quantity).toFixed(2));
      }

      pos.pnlPercent = Number((((pos.ltp - pos.avgPrice) / pos.avgPrice) * 100 * (pos.action === 'BUY' ? 1 : -1)).toFixed(2));
      totalUnrealized += pos.pnl;

      // Check Target or Stop-Loss triggers
      if (canExecute) {
        if (pos.targetPrice && pos.action === 'BUY' && pos.ltp >= pos.targetPrice) {
          positionsToSquareOff.push({ pos, reason: 'Target Reached (Profit)' });
        } else if (pos.stopLossPrice && pos.action === 'BUY' && pos.ltp <= pos.stopLossPrice) {
          positionsToSquareOff.push({ pos, reason: 'Stop Loss Hit' });
        } else if (pos.targetPrice && pos.action === 'SELL' && pos.ltp <= pos.targetPrice) {
          positionsToSquareOff.push({ pos, reason: 'Target Reached (Profit)' });
        } else if (pos.stopLossPrice && pos.action === 'SELL' && pos.ltp >= pos.stopLossPrice) {
          positionsToSquareOff.push({ pos, reason: 'Stop Loss Hit' });
        }
      }
    }

    if (canExecute && positionsToSquareOff.length > 0) {
      for (const { pos } of positionsToSquareOff) {
        try {
          this.squareOffPosition(pos.id, true);
          stateChanged = true;
        } catch (err) {
          console.error('Auto SL/TP error:', err);
        }
      }
    }

    this.account.unrealizedPnL = Number(totalUnrealized.toFixed(2));
    this.recalculateAccount();

    if (stateChanged) {
      this.saveState();
    }
  }

  recalculateAccount() {
    let usedMargin = 0;

    for (const pos of this.account.positions) {
      usedMargin += this.calculateMarginRequired({
        symbol: pos.symbol,
        strikePrice: pos.strikePrice,
        type: pos.optionType,
        action: pos.action,
        quantity: pos.quantity,
        price: pos.avgPrice,
      });
    }

    this.account.usedMargin = usedMargin;
    this.account.availableMargin = Math.max(0, this.account.cashBalance - usedMargin + this.account.unrealizedPnL);
    this.account.totalPnL = Number((this.account.realizedPnL + this.account.unrealizedPnL).toFixed(2));
  }

  getAccountSummary() {
    // Calculate portfolio Greeks
    let netDelta = 0;
    let netTheta = 0;

    for (const pos of this.account.positions) {
      const direction = pos.action === 'BUY' ? 1 : -1;
      netDelta += (pos.delta || 0) * pos.quantity * direction;
      netTheta += (pos.theta || 0) * pos.quantity * direction;
    }

    return {
      ...this.account,
      allowOffMarketTrading: Boolean(this.account.allowOffMarketTrading),
      netDelta: Number(netDelta.toFixed(2)),
      netTheta: Number(netTheta.toFixed(2)),
      totalPortfolioValue: Number((this.account.cashBalance + this.account.unrealizedPnL).toFixed(2)),
    };
  }
}
