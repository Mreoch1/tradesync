'use client'

import SyncStatusIndicator from '@/components/SyncStatusIndicator'

export default function Header() {
  return (
    <header className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 shadow-lg sticky top-0 z-50 w-full backdrop-blur-sm bg-slate-900/95">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-4">
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight drop-shadow-sm">
              TradeSync
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <SyncStatusIndicator />
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse"></div>
            <span className="text-xs sm:text-sm text-slate-300 font-medium">v1.0.0</span>
          </div>
        </div>
      </div>
    </header>
  )
}
