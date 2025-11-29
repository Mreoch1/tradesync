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
    } else {
      // No tokens found - automatically start OAuth flow if client ID is configured
      const clientId = process.env.NEXT_PUBLIC_YAHOO_CLIENT_ID
      if (clientId && typeof window !== 'undefined') {
        // Check if we're already in the OAuth callback (don't auto-redirect if we're processing the callback)
        const urlParams = new URLSearchParams(window.location.search)
        const hasCallbackParams = urlParams.has('code') || urlParams.has('yahoo_tokens') || urlParams.has('yahoo_error')
        
        if (!hasCallbackParams) {
          console.log('🔄 No tokens found, auto-starting OAuth flow...')
          // Small delay to ensure component is fully mounted and avoid redirect loops
          setTimeout(() => {
            handleAuthenticate()
          }, 1000)
        } else {
          console.log('🔄 OAuth callback detected, waiting for token processing...')
        }
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
    console.log('🔍 Debug - NEXT_PUBLIC_YAHOO_CLIENT_ID:', clientId ? `Set (length: ${clientId.length})` : 'NOT SET')
    console.log('🔍 Debug - Client ID value (first 20 chars):', clientId ? clientId.substring(0, 20) + '...' : 'N/A')
    console.log('🔍 Debug - process.env keys:', Object.keys(process.env).filter(k => k.includes('YAHOO')))
    console.log('🔍 Debug - Current URL:', typeof window !== 'undefined' ? window.location.href : 'N/A')
    console.log('🔍 Debug - Window origin:', typeof window !== 'undefined' ? window.location.origin : 'N/A')
    
    if (!clientId) {
      const errorMsg = `Yahoo Client ID not configured.

For Netlify:
1. Go to Site Settings → Environment Variables
2. Add NEXT_PUBLIC_YAHOO_CLIENT_ID with your Yahoo Client ID
3. Trigger a new deployment (push a commit or use "Trigger deploy" in Netlify)
4. Wait for build to complete

Note: NEXT_PUBLIC_ variables are embedded at build time, so a rebuild is required.`
      setError(errorMsg)
      return
    }

    // Trim whitespace from client ID (in case it was set with extra spaces)
    const trimmedClientId = clientId.trim()
    if (trimmedClientId.length === 0) {
      setError('Yahoo Client ID is empty. Please check your Netlify environment variables and ensure there are no extra spaces.')
      return
    }

    // Use the redirect URI based on current window location
    // This must EXACTLY match what's configured in Yahoo Developer Portal
    if (typeof window === 'undefined') {
      setError('Cannot authenticate: window object not available')
      return
    }

    // Use redirect URI from environment (validated on server startup)
    // For client-side, we need to construct it from the current origin
    // The server will validate it matches YAHOO_REDIRECT_URI
    const redirectUri = `${window.location.origin}/api/auth/yahoo/callback`.replace(/\/+$/, '')
    
    // Validate HTTPS
    if (!redirectUri.startsWith('https://')) {
      const errorMsg = `OAuth requires HTTPS. Please access the app via HTTPS URL.

Current URL: ${window.location.href}
Redirect URI: ${redirectUri}`
      setError(errorMsg)
      return
    }
    
    try {
      const authUrl = getAuthorizationUrl(trimmedClientId, cleanRedirectUri)
      console.log('🔄 Redirecting to Yahoo OAuth')
      console.log('🔄 Redirect URI being sent:', cleanRedirectUri)
      console.log('🔄 Make sure this EXACT URI is in Yahoo Developer Portal')
      console.log('🔄 Client ID:', trimmedClientId.substring(0, 30) + '...')
      
      // Redirect to Yahoo for authentication
      window.location.href = authUrl
    } catch (err: any) {
      console.error('❌ Failed to generate OAuth URL:', err)
      const errorMsg = `Failed to start OAuth authentication: ${err.message || 'Unknown error'}

Redirect URI being used: ${cleanRedirectUri}

Troubleshooting:
1. Verify this EXACT redirect URI is in Yahoo Developer Portal: ${cleanRedirectUri}
2. Check NEXT_PUBLIC_YAHOO_CLIENT_ID is set in Netlify
3. Ensure no trailing slashes or extra spaces
4. Wait 2-5 minutes after updating Yahoo Developer Portal
5. Check browser console for detailed logs`
      setError(errorMsg)
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
      let errorMessage = yahooError
      
      // Provide helpful error messages for common issues
      if (yahooError.includes('valid client') || yahooError.includes('Please specify a valid client')) {
        errorMessage = `Yahoo OAuth Error: "Please specify a valid client"

This usually means:
1. Your app may not be fully approved in Yahoo Developer Portal
   → Check your app status at https://developer.yahoo.com/apps/
   → Make sure it shows as "Active" or "Approved"

2. Redirect URI mismatch
   → Verify in Yahoo Developer Portal: https://aitradr.netlify.app/api/auth/yahoo/callback
   → Must match exactly (no trailing slashes, exact case)

3. Client ID mismatch
   → Verify Client ID in Netlify matches Yahoo Developer Portal exactly

Visit /diagnostics to see detailed configuration.`
      }
      
      setError(errorMessage)
      // Clean up URL
      urlParams.delete('yahoo_error')
      const newUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : '')
      window.history.replaceState(null, '', newUrl)
    }
  }, [])

  const handleSyncLeagueWithKey = async (keyToUse?: string) => {
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

      console.log('🔄 Starting sync request for league:', key)
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

      console.log('📡 Sync response status:', response.status, response.statusText)

      let data
      try {
        data = await response.json()
      } catch (parseError) {
        const text = await response.text()
        console.error('❌ Failed to parse response as JSON:', text)
        throw new Error(`Server returned invalid response (${response.status}): ${text.substring(0, 200)}`)
      }

      if (!response.ok) {
        const errorMsg = data.error || `HTTP ${response.status}: ${response.statusText}`
        console.error('❌ Sync failed:', errorMsg)
        throw new Error(errorMsg)
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
          // Validate teams have data before replacing existing teams
          // Include teams that have either players OR a valid record (not 0-0-0)
          console.log(`📊 Validating ${data.teams.length} teams from sync response...`)
          
          const teamsWithData = data.teams.filter((team: Team) => {
            const hasPlayers = team.players && team.players.length > 0
            const hasRecord = team.record && team.record !== '0-0-0'
            const isValid = hasPlayers || hasRecord
            
            // Log each team's status for debugging
            if (!isValid) {
              console.warn(`⚠️ Team "${team.name}" filtered out: ${team.players?.length || 0} players, record: ${team.record}`)
            } else {
              console.log(`✅ Team "${team.name}" included: ${team.players?.length || 0} players, record: ${team.record}`)
            }
            
            return isValid
          })

          const filteredOut = data.teams.length - teamsWithData.length
          
          if (filteredOut > 0) {
            const filteredTeamNames = data.teams
              .filter((team: Team) => {
                const hasPlayers = team.players && team.players.length > 0
                const hasRecord = team.record && team.record !== '0-0-0'
                return !(hasPlayers || hasRecord)
              })
              .map((team: Team) => `${team.name} (${team.players?.length || 0} players, ${team.record})`)
            console.warn(`⚠️ Filtered out ${filteredOut} team(s) with no data:`)
            filteredTeamNames.forEach((name: string) => console.warn(`   - ${name}`))
            console.warn(`   These teams have 0 players and 0-0-0 record. They may have failed to fetch roster.`)
          }

          if (teamsWithData.length === 0) {
            console.warn('⚠️ Sync returned teams but all have empty data (0 players, 0-0-0 records). Keeping existing data.')
            setError('Sync completed but all teams have empty data. This may indicate a parsing issue. Keeping existing data. Check server logs for details.')
            setIsUpToDate(false)
            window.dispatchEvent(new CustomEvent('yahooSyncStatus', {
              detail: {
                isSyncing: false,
                isUpToDate: false,
                error: 'All teams have empty data',
                teamCount: data.teams.length,
              }
            }))
          } else {
            console.log(`✅ Sync returned ${data.teams.length} teams, ${teamsWithData.length} with valid data, ${filteredOut} filtered out`)
            
            // Only clear existing teams if we have valid data to replace them with
            if (typeof window !== 'undefined') {
              const { teamManager } = await import('@/lib/teamManager')
              teamManager.clearAllTeams()
              console.log('🧹 Cleared all cached teams/stats before applying fresh sync data')
            }
            
            onTeamsSynced(teamsWithData)
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
                teamCount: teamsWithData.length,
              }
            }))
          }
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
      console.error('❌ Sync error details:', err)
      console.error('❌ Error stack:', err.stack)
      
      // Provide more helpful error messages
      let userFriendlyError = errorMessage
      if (errorMessage.includes('401') || errorMessage.includes('authentication') || errorMessage.includes('token')) {
        userFriendlyError = `Authentication failed: ${errorMessage}

Please try:
1. Clear your browser's session storage
2. Refresh the page to re-authenticate
3. Complete the Yahoo OAuth flow again`
      } else if (errorMessage.includes('500') || errorMessage.includes('server')) {
        userFriendlyError = `Server error: ${errorMessage}

This may indicate:
1. Yahoo API is temporarily unavailable
2. Server-side configuration issue (check Netlify environment variables)
3. Network connectivity problem`
      }
      
      setError(`Error syncing league: ${userFriendlyError}

Check browser console (F12) and Netlify function logs for more details.`)
      
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
      
      if (fetchedLeagues.length === 0) {
        setError('No leagues found. Make sure you have access to at least one Yahoo Fantasy Sports league.')
        setIsUpToDate(false)
        return
      }
      
      setSuccess(`Found ${fetchedLeagues.length} league(s): ${fetchedLeagues.map((l: any) => l.name || l.league_key).join(', ')}`)
      
      // Auto-select and sync the first available league
      // Try to find "atfh2" first, otherwise use the first league
      const atfh2League = fetchedLeagues.find((l: any) => l.name === 'atfh2' || l.league_key?.includes('atfh2'))
      const leagueToSync = atfh2League || fetchedLeagues[0]
      
      if (leagueToSync) {
        const selectedLeagueKey = leagueToSync.league_key || leagueToSync.leagueKey
        if (selectedLeagueKey) {
          setLeagueKey(selectedLeagueKey)
          // Store league key for auto-sync on refresh
          sessionStorage.setItem('yahoo_league_key', selectedLeagueKey)
          console.log(`✅ Auto-selected league: ${leagueToSync.name || selectedLeagueKey} (${selectedLeagueKey})`)
          // Auto-sync the league after a short delay
          setTimeout(() => {
            handleSyncLeagueWithKey(selectedLeagueKey)
          }, 500)
        } else {
          setError(`Selected league has no league_key. League data: ${JSON.stringify(leagueToSync)}`)
          setIsUpToDate(false)
        }
      } else {
        setError(`Could not select a league. Found ${fetchedLeagues.length} league(s) but none could be used.`)
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
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Connecting to Yahoo Fantasy Sports...</span>
            </div>
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

