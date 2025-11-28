'use client'

import { useState, useEffect } from 'react'
import { Team } from '@/types/teams'
import Button from './ui/Button'
import Card from './ui/Card'
import { getAuthorizationUrl } from '@/lib/yahooFantasyApi'

interface YahooSyncProps {
  onTeamsSynced: (teams: Team[]) => void
  gameKey?: string
}

interface YahooOAuthTokens {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  expires_at?: number
}

export default function YahooSync({ onTeamsSynced, gameKey = 'all' }: YahooSyncProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [tokens, setTokens] = useState<YahooOAuthTokens | null>(null)
  const [leagueKey, setLeagueKey] = useState('')
  const [leagues, setLeagues] = useState<Array<{ league_key: string; name: string }>>([])
  const [isUpToDate, setIsUpToDate] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)

  // Check if we have stored tokens on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('yahoo_tokens')
    const storedSyncTime = sessionStorage.getItem('yahoo_last_sync_time')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setTokens(parsed)
        setIsAuthenticated(true)
        // If we have a sync time, show as up to date
        if (storedSyncTime) {
          setIsUpToDate(true)
          setLastSyncTime(storedSyncTime)
        }
      } catch (e) {
        console.error('Failed to parse stored tokens:', e)
        setError('Failed to load stored authentication tokens')
      }
    }
  }, [])

  // Auto-sync when tokens are loaded and we have a saved league key
  // Also sync on page visibility change (when user returns to tab)
  useEffect(() => {
    if (!tokens || !isAuthenticated) return
    
    const savedLeagueKey = sessionStorage.getItem('yahoo_league_key')
    if (savedLeagueKey) {
      setLeagueKey(savedLeagueKey)
      // Auto-sync after a short delay to ensure everything is ready
      const autoSyncTimeout = setTimeout(() => {
        console.log('🔄 Auto-syncing league on page load:', savedLeagueKey)
        handleSyncLeagueWithKey(savedLeagueKey)
      }, 1000)
      
      // Also sync when page becomes visible (user returns to tab)
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && savedLeagueKey) {
          console.log('🔄 Page visible, auto-syncing league:', savedLeagueKey)
          handleSyncLeagueWithKey(savedLeagueKey)
        }
      }
      
      document.addEventListener('visibilitychange', handleVisibilityChange)
      
      return () => {
        clearTimeout(autoSyncTimeout)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    } else {
      // If no saved league key, try to get leagues and find atfh2
      const getLeaguesTimeout = setTimeout(() => {
        handleGetLeagues()
      }, 500)
      return () => clearTimeout(getLeaguesTimeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens, isAuthenticated])

  const handleAuthenticate = () => {
    const clientId = process.env.NEXT_PUBLIC_YAHOO_CLIENT_ID
    console.log('🔍 Debug - NEXT_PUBLIC_YAHOO_CLIENT_ID:', clientId ? 'Set' : 'NOT SET')
    console.log('🔍 Debug - process.env keys:', Object.keys(process.env).filter(k => k.includes('YAHOO')))
    
    if (!clientId) {
      setError('Yahoo Client ID not configured. Please set NEXT_PUBLIC_YAHOO_CLIENT_ID environment variable in Netlify and trigger a new deployment.')
      return
    }

    // Use the redirect URI based on current window location
    // This must EXACTLY match what's configured in Yahoo Developer Portal
    if (typeof window === 'undefined') {
      setError('Cannot authenticate: window object not available')
      return
    }

    // Build redirect URI from current window location
    // This MUST match exactly what the callback route uses: request.nextUrl.origin + '/api/auth/yahoo/callback'
    // Since Yahoo redirects to this URL, the origins should match
    const redirectUri = `${window.location.origin}/api/auth/yahoo/callback`
    
    // Validate redirect URI matches expected format
    if (!redirectUri.startsWith('https://')) {
      setError('OAuth requires HTTPS. Please access the app via HTTPS URL.')
      return
    }
    
    try {
      const authUrl = getAuthorizationUrl(clientId, redirectUri)
      console.log('OAuth authorization URL:', authUrl)
      window.location.href = authUrl
    } catch (err: any) {
      console.error('Failed to generate OAuth URL:', err)
      setError(err.message || 'Failed to start OAuth authentication')
    }
  }


  // Handle OAuth callback - extract tokens from URL query params
  useEffect(() => {
    if (typeof window === 'undefined') return

    const urlParams = new URLSearchParams(window.location.search)
    
    // Check for tokens in query params (from OAuth callback)
    const tokensParam = urlParams.get('yahoo_tokens')
    if (tokensParam) {
      try {
        // Decode base64 tokens
        const tokensJson = atob(tokensParam)
        const parsed = JSON.parse(tokensJson)
        setTokens(parsed)
        setIsAuthenticated(true)
        sessionStorage.setItem('yahoo_tokens', JSON.stringify(parsed))
        setSuccess('Successfully authenticated with Yahoo Fantasy Sports!')
        
        // Clean up URL by removing tokens from query params
        urlParams.delete('yahoo_tokens')
        urlParams.delete('state')
        const newUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : '')
        window.history.replaceState(null, '', newUrl)
        
        // Clear any existing league key to force fresh lookup and auto-sync to atfh2
        // The auto-sync useEffect (line 55) will trigger when tokens and isAuthenticated are set
        sessionStorage.removeItem('yahoo_league_key')
      } catch (err: any) {
        console.error('Failed to parse tokens from callback:', err)
        setError('Failed to process authentication tokens')
        // Clean up URL
        urlParams.delete('yahoo_tokens')
        const newUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : '')
        window.history.replaceState(null, '', newUrl)
      }
      return // Don't check for errors if we're processing tokens
    }

    // Check for OAuth errors in query params
    const yahooError = urlParams.get('yahoo_error')
    if (yahooError) {
      setError(yahooError)
      // Clean up URL
      urlParams.delete('yahoo_error')
      const newUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : '')
      window.history.replaceState(null, '', newUrl)
    }
  }, [])

  const handleSyncLeagueWithKey = async (keyToUse?: string) => {
    // Clear all existing teams/stats before syncing to ensure fresh data
    if (typeof window !== 'undefined') {
      const { teamManager } = await import('@/lib/teamManager')
      teamManager.clearAllTeams()
      console.log('🧹 Cleared all cached teams/stats before fresh sync')
    }
    const key = keyToUse || leagueKey
    if (!tokens || !key) {
      setError('Please select a league first')
      return
    }

    try {
      setIsSyncing(true)
      setError(null)
      setSuccess(null)
      
      // Dispatch sync status event - syncing started
      window.dispatchEvent(new CustomEvent('yahooSyncStatus', {
        detail: {
          isSyncing: true,
          isUpToDate: false,
          error: null,
        }
      }))

      const response = await fetch('/api/yahoo/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_league',
          leagueKey: key,
          gameKey,
          tokens,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync league')
      }

      if (data.action === 'token_refreshed') {
        setTokens(data.tokens)
        sessionStorage.setItem('yahoo_tokens', JSON.stringify(data.tokens))
        // Retry the request
        return handleSyncLeagueWithKey(key)
      }

      if (data.teams) {
        if (data.teams.length === 0) {
          setError('No teams were returned from the sync. The league may be empty, or there may be an issue parsing team data. Check server logs for details.')
          setIsUpToDate(false)
          // Dispatch sync status event
          window.dispatchEvent(new CustomEvent('yahooSyncStatus', {
            detail: {
              isSyncing: false,
              isUpToDate: false,
              error: 'No teams returned',
              teamCount: 0,
            }
          }))
        } else {
          onTeamsSynced(data.teams)
          setIsUpToDate(true)
          setSuccess(null) // Clear success message, we'll show up-to-date status instead
          const syncTime = new Date().toLocaleTimeString()
          setLastSyncTime(syncTime)
          // Store the league key and sync time for auto-sync on refresh
          if (key) {
            sessionStorage.setItem('yahoo_league_key', key)
            sessionStorage.setItem('yahoo_last_sync_time', syncTime)
          }
          // Dispatch sync status event
          window.dispatchEvent(new CustomEvent('yahooSyncStatus', {
            detail: {
              isSyncing: false,
              isUpToDate: true,
              lastSyncTime: syncTime,
              error: null,
              teamCount: data.teams.length,
            }
          }))
        }
      } else {
        setError('Sync completed but no teams data was returned. Check server logs for details.')
        setIsUpToDate(false)
        // Dispatch sync status event
        window.dispatchEvent(new CustomEvent('yahooSyncStatus', {
          detail: {
            isSyncing: false,
            isUpToDate: false,
            error: 'No teams data returned',
            teamCount: 0,
          }
        }))
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to sync league'
      console.error('Sync error details:', err)
      setError(`Error syncing league: ${errorMessage}. Check browser console and server logs for more details.`)
      // Dispatch sync status event - error
      window.dispatchEvent(new CustomEvent('yahooSyncStatus', {
        detail: {
          isSyncing: false,
          isUpToDate: false,
          error: errorMessage,
        }
      }))
    } finally {
      setIsSyncing(false)
    }
  }

  const handleGetLeagues = async () => {
    if (!tokens) return

    try {
      setIsSyncing(true)
      setError(null)

      const response = await fetch('/api/yahoo/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_leagues',
          gameKey,
          tokens,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch leagues')
      }

      if (data.action === 'token_refreshed') {
        setTokens(data.tokens)
        sessionStorage.setItem('yahoo_tokens', JSON.stringify(data.tokens))
        // Retry the request
        return handleGetLeagues()
      }

      const fetchedLeagues = data.leagues || []
      setLeagues(fetchedLeagues)
      setSuccess(`Found ${fetchedLeagues.length} leagues`)
      
      // Auto-select and sync "atfh2" league if available
      const atfh2League = fetchedLeagues.find((l: any) => l.name === 'atfh2' || l.league_key?.includes('atfh2'))
      if (atfh2League) {
        setLeagueKey(atfh2League.league_key)
        // Store league key for auto-sync on refresh
        sessionStorage.setItem('yahoo_league_key', atfh2League.league_key)
        // Auto-sync the league after a short delay
        setTimeout(() => {
          handleSyncLeagueWithKey(atfh2League.league_key)
        }, 500)
      } else {
        // If atfh2 not found, show error
        setError(`League "atfh2" not found. Found ${fetchedLeagues.length} league(s): ${fetchedLeagues.map((l: any) => l.name).join(', ')}`)
        setIsUpToDate(false)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch leagues')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSyncLeague = async () => {
    return handleSyncLeagueWithKey()
  }


  return (
    <Card>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Yahoo Fantasy Sports Sync</h2>
        
        {!isAuthenticated ? (
          <div className="space-y-4">
            <p className="text-gray-600">
              Yahoo Fantasy Sports will automatically sync when authenticated.
            </p>
            <Button
              onClick={handleAuthenticate}
              className="w-full"
              disabled={!process.env.NEXT_PUBLIC_YAHOO_CLIENT_ID}
            >
              {process.env.NEXT_PUBLIC_YAHOO_CLIENT_ID 
                ? 'Connect Yahoo Account' 
                : 'Yahoo Client ID Not Configured'}
            </Button>
            {!process.env.NEXT_PUBLIC_YAHOO_CLIENT_ID && (
              <div className="text-xs text-red-600 mt-2 space-y-1">
                <p>⚠️ NEXT_PUBLIC_YAHOO_CLIENT_ID environment variable is not set.</p>
                <p>This variable must be set in Netlify before building. Steps:</p>
                <ol className="list-decimal list-inside ml-2 space-y-1">
                  <li>Set NEXT_PUBLIC_YAHOO_CLIENT_ID in Netlify environment variables</li>
                  <li>Trigger a new deployment (push a commit or use Netlify dashboard)</li>
                  <li>Wait for build to complete</li>
                </ol>
              </div>
            )}
            {process.env.NEXT_PUBLIC_YAHOO_CLIENT_ID && (
              <p className="text-xs text-green-600 mt-2">
                ✅ Client ID configured. Click &quot;Connect Yahoo Account&quot; to authenticate.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Connected to Yahoo Fantasy Sports
            </div>

            {isSyncing ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Syncing league data...
              </div>
            ) : isUpToDate ? (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">League data up to date</span>
                {lastSyncTime && (
                  <span className="text-xs text-gray-500">(Last synced: {lastSyncTime})</span>
                )}
              </div>
            ) : null}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
            {success}
          </div>
        )}
      </div>
    </Card>
  )
}

