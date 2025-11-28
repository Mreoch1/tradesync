'use client'

import { useEffect, useState } from 'react'

interface SyncStatus {
  isAuthenticated: boolean
  isSyncing: boolean
  isUpToDate: boolean
  lastSyncTime: string | null
  error: string | null
  teamCount: number
}

export default function SyncStatusIndicator() {
  const [status, setStatus] = useState<SyncStatus>({
    isAuthenticated: false,
    isSyncing: false,
    isUpToDate: false,
    lastSyncTime: null,
    error: null,
    teamCount: 0,
  })

  useEffect(() => {
    // Check authentication status
    const checkAuth = () => {
      const tokens = sessionStorage.getItem('yahoo_tokens')
      const lastSyncTime = sessionStorage.getItem('yahoo_last_sync_time')
      const leagueKey = sessionStorage.getItem('yahoo_league_key')
      
      return {
        isAuthenticated: !!tokens,
        lastSyncTime: lastSyncTime,
        hasLeagueKey: !!leagueKey,
      }
    }

    // Listen for sync status updates
    const handleSyncUpdate = () => {
      const auth = checkAuth()
      const teams = JSON.parse(sessionStorage.getItem('fantasy_teams') || '[]')
      
      setStatus({
        isAuthenticated: auth.isAuthenticated,
        isSyncing: false, // Will be updated by YahooSync component
        isUpToDate: !!auth.lastSyncTime,
        lastSyncTime: auth.lastSyncTime,
        error: null,
        teamCount: teams.length,
      })
    }

    // Listen for custom events from YahooSync
    const handleYahooSyncEvent = (e: CustomEvent) => {
      const detail = e.detail as Partial<SyncStatus>
      setStatus(prev => ({ ...prev, ...detail }))
    }

    // Initial check
    handleSyncUpdate()

    // Listen for storage changes
    window.addEventListener('storage', handleSyncUpdate)
    window.addEventListener('yahooSyncStatus', handleYahooSyncEvent as EventListener)
    window.addEventListener('teamsUpdated', handleSyncUpdate)
    window.addEventListener('teamsStorageUpdated', handleSyncUpdate)

    return () => {
      window.removeEventListener('storage', handleSyncUpdate)
      window.removeEventListener('yahooSyncStatus', handleYahooSyncEvent as EventListener)
      window.removeEventListener('teamsUpdated', handleSyncUpdate)
      window.removeEventListener('teamsStorageUpdated', handleSyncUpdate)
    }
  }, [])

  // Determine status color and icon
  const getStatusDisplay = () => {
    if (!status.isAuthenticated) {
      return {
        color: 'text-gray-400',
        bgColor: 'bg-gray-500',
        icon: (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        ),
        label: 'Not Connected',
        tooltip: 'Yahoo Fantasy Sports not authenticated',
      }
    }

    if (status.isSyncing) {
      return {
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500',
        icon: (
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ),
        label: 'Syncing...',
        tooltip: 'Syncing with Yahoo Fantasy Sports...',
      }
    }

    if (status.error) {
      return {
        color: 'text-red-400',
        bgColor: 'bg-red-500',
        icon: (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        ),
        label: 'Error',
        tooltip: status.error,
      }
    }

    if (status.isUpToDate) {
      return {
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500',
        icon: (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        ),
        label: 'Synced',
        tooltip: `Last synced: ${status.lastSyncTime || 'Unknown'} | ${status.teamCount} teams`,
      }
    }

    return {
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500',
      icon: (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      ),
      label: 'Needs Sync',
      tooltip: 'Connected but not synced yet',
    }
  }

  const statusDisplay = getStatusDisplay()

  return (
    <div className="flex items-center gap-2 group relative">
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${statusDisplay.bgColor} ${statusDisplay.color} transition-all`}
        title={statusDisplay.tooltip}
      >
        {statusDisplay.icon}
        <span className="text-xs font-medium hidden sm:inline">{statusDisplay.label}</span>
      </div>
      {status.teamCount > 0 && (
        <span className="text-xs text-slate-300 hidden md:inline">
          {status.teamCount} teams
        </span>
      )}
      {status.lastSyncTime && status.isUpToDate && (
        <span className="text-xs text-slate-400 hidden lg:inline">
          {status.lastSyncTime}
        </span>
      )}
    </div>
  )
}

