#!/usr/bin/env bash
# Quick launcher for OptionPulse Virtual Options Trading
cd "$(dirname "$0")"
echo "Building optimized client..."
npm run build
echo "Starting OptionPulse Unified Server..."
node server/index.js
