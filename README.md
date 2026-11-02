# ⚡ OptionPulse - Indian Market Virtual Options Trading App

A mobile-first virtual options trading application designed specifically for the **Indian Stock Market (NSE / BSE)**. Practice options buying and selling in live market conditions or 24/7 market replay with ₹10,00,000 (10 Lakhs) virtual money, real Black-Scholes Greeks, interactive Option Chains, and multi-leg strategy payoff analysis.

---

## 🌟 Key Features

### 1. 🇮🇳 Indian Market Universe & Accurate Lot Sizes
- **NIFTY 50** (Lot size: 25)
- **BANKNIFTY** (Lot size: 15)
- **FINNIFTY** (Lot size: 25)
- **SENSEX** (Lot size: 10)
- **INDIA VIX** Live Volatility Index

### 2. 📊 Live NSE Option Chain
- Full matrix view with Calls (CE) on the left, Strike Prices in center, and Puts (PE) on the right.
- In-The-Money (ITM) visual shading (standard Indian broker layout).
- ATM (At-The-Money) automatic highlighting.
- Toggle between **LTP & Change %**, **Greeks (Delta, Theta, IV)**, and **OI & Volume**.
- Weekly & Monthly Expiry selector.

### 3. 🧠 Black-Scholes Pricing & Greeks Engine
- Real-time calculations of:
  - **Delta ($\Delta$)**: Price sensitivity
  - **Gamma ($\Gamma$)**: Acceleration of delta
  - **Theta ($\Theta$)**: Daily time decay
  - **Vega ($\nu$)**: Sensitivity to 1% IV change
  - **Implied Volatility (IV)** & Volatility Smile

### 4. 💼 Realistic Paper Trading & Margin System
- Starting virtual capital: **₹10,00,000 (10 Lakhs)** (configurable/resettable).
- Realistic Margin Requirements:
  - **Option Buying**: Premium × Lot Size
  - **Option Selling (Writing)**: SPAN + Exposure Margin (~₹1.15L - ₹1.25L per lot) with multi-leg hedge benefits.
- Real-time Mark-to-Market (MTM) P&L updates with color-coded live ticks.
- Portfolio Net Greeks: Net Delta and Net Daily Theta earnings.
- One-click **"Square Off All"** panic exit button.
- Limit Orders & Automatic Stop-Loss (SL) / Target (TP) execution.

### 5. 📈 Strategy Builder & Payoff Visualizer
- Pre-built popular strategies:
  - **Bull Call Spread** (Defined risk bullish)
  - **Bear Put Spread** (Defined risk bearish)
  - **Short Straddle** (Delta-neutral theta harvesting)
  - **Iron Condor** (4-leg range-bound income)
  - **Long Straddle** (Volatility breakout)
- Interactive Payoff at Expiry curve with Max Profit, Max Loss, and Breakeven strike calculations.
- **1-Click Multi-Leg Execution**: Place all legs directly into your portfolio at once!

### 6. 📱 Mobile-First UI & 24/7 Replay Mode
- Designed for mobile touch: bottom navigation, slide-up Buy/Sell drawers, quick `+1L`, `+2L`, `+5L` lot stepper pills.
- **24/7 Practice Mode**: When markets are closed (after 3:30 PM IST or weekends), the continuous tick engine simulates real market fluctuations so you can practice anytime.
- **Installable on your iPhone or Android phone**: Simply open the local network link (e.g., `http://192.168.1.6:5173`) in Safari or Chrome and tap **"Add to Home Screen"**.

---

## 🚀 Quick Start

To launch OptionPulse:

```bash
# Start both backend and frontend simultaneously:
npm run dev
```

Or run them individually:

```bash
# Terminal 1 - Backend Server (Port 3001)
npm run server

# Terminal 2 - Frontend Vite App (Port 5173)
npm run client
```

### Accessing the App:
- **On this Mac**: Open [http://localhost:5173](http://localhost:5173)
- **On your Mobile Phone (Same Wi-Fi)**: Open `http://<your-local-ip>:5173` (e.g. `http://192.168.1.6:5173`)
