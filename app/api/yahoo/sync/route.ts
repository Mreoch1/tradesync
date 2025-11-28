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

    if (!tokens || !tokens.access_token) {
      return NextResponse.json(
        { error: 'Missing access token. Please authenticate first.' },
        { status: 401 }
      )
    }

    // Check and refresh token if needed
    let accessToken = tokens.access_token
    if (isTokenExpired(tokens)) {
      if (!tokens.refresh_token) {
        return NextResponse.json(
          { error: 'Token expired and no refresh token available' },
          { status: 401 }
        )
      }

      const clientId = process.env.YAHOO_CLIENT_ID
      const clientSecret = process.env.YAHOO_CLIENT_SECRET

      if (!clientId || !clientSecret) {
        return NextResponse.json(
          { error: 'Yahoo OAuth credentials not configured' },
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

        // Get league info first to determine the correct season
        let leagueSeason: string | undefined = undefined
        try {
          const { getLeagueInfo } = await import('@/lib/yahooFantasyApi')
          const leagueInfo = await getLeagueInfo(accessToken, leagueKey)
          leagueSeason = leagueInfo.season
          console.log(`📊 Extracted season from league: ${leagueSeason || 'not found'}`)
        } catch (leagueInfoError: any) {
          console.warn(`⚠️ Could not fetch league info, will try date-based stats:`, leagueInfoError?.message)
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
        const getRoster = async (teamKey: string): Promise<YahooPlayer[]> => {
          console.log(`Fetching roster for team: ${teamKey} (season: ${leagueSeason})`)
          return getTeamRoster(accessToken, teamKey, undefined, leagueSeason)
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

