import React from 'react';
import { LineChart, Layers, Briefcase, FileText, PieChart } from 'lucide-react';

export function BottomNav({ activeTab, onChangeTab, openPositionsCount = 0, openOrdersCount = 0 }) {
  const tabs = [
    { id: 'watchlist', label: 'Watchlist', icon: LineChart },
    { id: 'optionChain', label: 'Option Chain', icon: Layers },
    { id: 'positions', label: 'Positions', icon: Briefcase, badge: openPositionsCount },
    { id: 'orders', label: 'Orders', icon: FileText, badge: openOrdersCount },
    { id: 'strategy', label: 'Payoff & Greek', icon: PieChart },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#080b11]/95 backdrop-blur-lg border-t border-slate-800/80 safe-area-bottom">
      <div className="max-w-md mx-auto flex items-center justify-around px-1 py-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition duration-150 ${
                isActive
                  ? 'text-blue-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : 'scale-100'}`} />
                {tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 bg-blue-600 text-white text-[9px] font-bold rounded-full min-w-[16px] text-center shadow">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 ${isActive ? 'text-blue-400 font-bold' : 'text-slate-400'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-blue-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
