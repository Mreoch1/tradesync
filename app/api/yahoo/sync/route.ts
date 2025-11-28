/**
 * Yahoo Fantasy Sports API Sync Route
 * 
 * This API route handles syncing teams and players from Yahoo Fantasy Sports.
 * It requires OAuth authentication and proxies requests to Yahoo's API.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getUserLeagues,
  getLeagueTeams,
  getTeamRoster,
  getAccessToken,
  refreshAccessToken,
  isTokenExpired,
  type YahooOAuthTokens,
} from '@/lib/yahooFantasyApi'
import { parseYahooTeams } from '@/lib/yahooParser'
import { Team } from '@/types/teams'
import { YahooPlayer } from '@/lib/yahooFantasyApi'

// Store tokens in memory (in production, use a database or secure storage)
// This is a simplified implementation - you should use proper session management
const tokenStore = new Map<string, YahooOAuthTokens>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, leagueKey, gameKey = '418', tokens } = body

    // Log request details for debugging
    console.log('📡 API Sync Request:', {
      action,
      leagueKey: leagueKey ? `${leagueKey.substring(0, 20)}...` : 'none',
      gameKey,
      hasTokens: !!tokens,
      hasAccessToken: !!(tokens?.access_token),
    })

    if (!tokens || !tokens.access_token) {
      console.error('❌ Missing access token in request')
      return NextResponse.json(
        { error: 'Missing access token. Please authenticate with Yahoo first by completing the OAuth flow.' },
        { status: 401 }
      )
    }

    // Check and refresh token if needed
    let accessToken = tokens.access_token
    if (isTokenExpired(tokens)) {
      console.log('🔄 Token expired, attempting refresh...')
      if (!tokens.refresh_token) {
        console.error('❌ No refresh token available')
        return NextResponse.json(
          { error: 'Token expired and no refresh token available. Please re-authenticate with Yahoo.' },
          { status: 401 }
        )
      }

      const clientId = process.env.YAHOO_CLIENT_ID
      const clientSecret = process.env.YAHOO_CLIENT_SECRET

      console.log('🔍 Server-side credentials check:', {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
      })

      if (!clientId || !clientSecret) {
        console.error('❌ Missing server-side OAuth credentials')
        return NextResponse.json(
          { error: 'Yahoo OAuth credentials not configured on server. Please set YAHOO_CLIENT_ID and YAHOO_CLIENT_SECRET in Netlify environment variables.' },
          { status: 500 }
        )
      }

      const refreshed = await refreshAccessToken(clientId, clientSecret, tokens.refresh_token)
      accessToken = refreshed.access_token
      // Return new tokens to client for storage
      return NextResponse.json({
        action: 'token_refreshed',
        tokens: refreshed,
      })
    }

    switch (action) {
      case 'get_leagues': {
        // Fetch all leagues if gameKey is 'all' or undefined. Otherwise filter by gameKey.
        // Note: gameKey defaults to '418' from the route parameter, but we want to fetch all if it's explicitly 'all'
        const leagues = await getUserLeagues(accessToken, gameKey === 'all' ? undefined : gameKey)
        return NextResponse.json({ leagues })
      }

      case 'get_teams': {
        if (!leagueKey) {
          return NextResponse.json(
            { error: 'leagueKey is required for get_teams action' },
            { status: 400 }
          )
        }
        const teams = await getLeagueTeams(accessToken, leagueKey)
        return NextResponse.json({ teams })
      }

      case 'sync_league': {
        if (!leagueKey) {
          return NextResponse.json(
            { error: 'leagueKey is required for sync_league action' },
            { status: 400 }
          )
        }

        console.log(`Syncing league: ${leagueKey}`)

        // Get league info first to determine the correct season and game key
        // CRITICAL: We need the season to fetch correct stats (2025-26 NHL = season 2025)
        let leagueSeason: string | undefined = undefined
        let gameKey: string | undefined = undefined
        try {
          const { getLeagueInfo } = await import('@/lib/yahooFantasyApi')
          const leagueInfo = await getLeagueInfo(accessToken, leagueKey)
          leagueSeason = leagueInfo.season
          gameKey = leagueInfo.game_key
          console.log(`📊 Extracted season from league: ${leagueSeason || 'not found'}, game_key: ${gameKey || 'not found'}`)
          
          if (!leagueSeason) {
            console.error(`❌ CRITICAL: No season found in league info. Stats may be incorrect.`)
            console.error(`   League info:`, JSON.stringify(leagueInfo, null, 2))
          } else {
            console.log(`✅ Using season ${leagueSeason} for all stat fetches (2025-26 NHL season = 2025)`)
          }
        } catch (leagueInfoError: any) {
          console.error(`❌ CRITICAL: Could not fetch league info:`, leagueInfoError?.message)
          console.error(`   Stats fetching will fail without season. This is a critical error.`)
        }

        // Fetch stat definitions ONCE before processing any teams
        // This ensures all player parsing has access to stat definitions
        if (gameKey) {
          try {
            const { getStatDefinitions } = await import('@/lib/yahooFantasyApi')
            const { setStatDefinitions } = await import('@/lib/yahooParser')
            const statDefinitions = await getStatDefinitions(accessToken, gameKey)
            if (Object.keys(statDefinitions).length > 0) {
              console.log(`📊 Loaded ${Object.keys(statDefinitions).length} stat definitions for all players`)
              setStatDefinitions(statDefinitions)
            } else {
              console.warn(`⚠️ Stat definitions returned empty - player stats may be incorrect`)
            }
          } catch (defError: any) {
            console.warn(`⚠️ Could not fetch stat definitions:`, defError?.message)
          }
        } else {
          console.warn(`⚠️ No game_key found - cannot fetch stat definitions. Player stats may be incorrect.`)
        }

        // Get teams
        let yahooTeams
        try {
          yahooTeams = await getLeagueTeams(accessToken, leagueKey)
          console.log(`Found ${yahooTeams.length} teams from Yahoo API for league ${leagueKey}`)
          
          if (leagueSeason) {
            console.log(`✅ Using season ${leagueSeason} for stats`)
          } else {
            console.log(`⚠️ No season found, will use date-based stats (current season)`)
          }
        } catch (teamsError: any) {
          console.error('Error fetching teams from Yahoo:', teamsError)
          const errorMessage = teamsError?.message || teamsError?.toString() || 'Unknown error occurred'
          return NextResponse.json(
            { error: `Failed to fetch teams from Yahoo API: ${errorMessage}. Check server logs for full details.` },
            { status: 500 }
          )
        }

        if (yahooTeams.length === 0) {
          return NextResponse.json(
            { error: `No teams found in league ${leagueKey}. Possible reasons: league is empty, you don't have access, or the league key is incorrect. Check server logs for API response details.` },
            { status: 404 }
          )
        }

        // Get roster for each team with season
        // CRITICAL: Only call getTeamRoster once per team - it fetches both roster AND stats
        const getRoster = async (teamKey: string): Promise<YahooPlayer[]> => {
          console.log(`📊 Fetching roster AND stats for team: ${teamKey} (season: ${leagueSeason || 'not specified'})`)
          console.log(`📊 This is the ONLY stats fetch for this team - no duplicate calls`)
          const roster = await getTeamRoster(accessToken, teamKey, undefined, leagueSeason)
          console.log(`✅ Completed roster+stats fetch for team ${teamKey}: ${roster.length} players`)
          return roster
        }

        // Parse teams into our format
        let teams
        try {
          teams = await parseYahooTeams(yahooTeams, getRoster)
          console.log(`Successfully parsed ${teams.length} teams from ${yahooTeams.length} Yahoo teams`)
        } catch (parseError: any) {
          console.error('Error parsing teams:', parseError)
          const errorMessage = parseError?.message || parseError?.toString() || 'Unknown parsing error'
          return NextResponse.json(
            { error: `Failed to parse teams: ${errorMessage}. Check server logs for full details.` },
            { status: 500 }
          )
        }

        if (teams.length === 0) {
          return NextResponse.json(
            { error: `Teams were fetched but parsing resulted in 0 teams. This may indicate a parsing issue. Found ${yahooTeams.length} Yahoo teams but couldn't convert them. Check server logs for details.` },
            { status: 500 }
          )
        }

        return NextResponse.json({ teams })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error: any) {
    console.error('Yahoo API sync error:', error)
    const errorMessage = error?.message || error?.toString() || 'Failed to sync with Yahoo Fantasy Sports'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

// OAuth callback is now handled at /api/auth/yahoo/callback
// This route only handles POST requests for API operations

