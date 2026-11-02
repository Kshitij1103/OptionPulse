import React from 'react';

export function MobileWrapper({ children, isMobileFrame }) {
  if (!isMobileFrame) {
    return (
      <div className="min-h-screen bg-[#080b11] text-slate-100 flex flex-col max-w-lg mx-auto border-x border-slate-800/80 shadow-2xl relative">
        {children}
      </div>
    );
  }

  // Realistic iPhone 15 Pro Frame for Desktop Preview
  return (
    <div className="min-h-screen bg-[#03060c] py-6 px-4 flex items-center justify-center">
      {/* Smartphone Outer Bezel */}
      <div className="relative w-full max-w-[412px] h-[870px] bg-[#0c1017] rounded-[52px] p-3 shadow-[0_0_60px_-15px_rgba(0,0,0,0.9),0_0_0_12px_#1e293b,0_0_0_14px_#0f172a] border border-slate-700/60 overflow-hidden flex flex-col">
        {/* Dynamic Island Pill */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-40 flex items-center justify-between px-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#111827] ring-1 ring-slate-800" />
          <div className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse" />
        </div>

        {/* Screen Content */}
        <div className="relative flex-1 bg-[#080b11] rounded-[42px] overflow-y-auto no-scrollbar flex flex-col pt-3">
          {children}
        </div>

        {/* Home Indicator Bar */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-500/40 rounded-full z-40 pointer-events-none" />
      </div>
    </div>
  );
}
