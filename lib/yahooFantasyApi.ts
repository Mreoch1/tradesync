/**
 * Yahoo Fantasy Sports API Client
 * 
 * This module provides functions to interact with the Yahoo Fantasy Sports API.
 * It handles OAuth2 authentication and provides methods to fetch league, team, and player data.
 */

export interface YahooOAuthTokens {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  expires_at?: number // Calculated timestamp when token expires
}

export interface YahooLeague {
  league_key: string
  league_id: string
  name: string
  url: string
  draft_status: string
  num_teams: number
  season?: string
  game_key?: string
}

export interface YahooTeam {
  team_key: string
  team_id: string
  name: string
  url: string
  logo_url?: string
  manager_name?: string
  manager_email?: string
  wins?: number
  losses?: number
  ties?: number
}

export interface YahooPlayer {
  player_key: string
  player_id: string
  name: {
    full: string
    first: string
    last: string
    ascii_first: string
    ascii_last: string
  }
  editorial_player_key?: string
  editorial_team_key?: string
  editorial_team_full_name?: string
  editorial_team_abbr?: string
  uniform_number?: string
  display_position: string
  position_type: string
  primary_position: string
  eligible_positions: string[]
  headshot?: {
    url: string
    size: string
  }
  bye_weeks?: string
  is_undroppable?: string
  position?: string
  status?: string
  status_full?: string
  injury_note?: string
  has_player_notes?: string
  player_notes_last_timestamp?: string
  ownership?: {
    ownership_type: string
    ownership_value: number
    percent_owned?: number
    percent_start?: number
    percent_owned_delta?: number
    percent_start_delta?: number
    value?: number
  }
  player_stats?: {
    coverage_type: string
    coverage_value: number
    stats: YahooStat[]
  }
}

export interface YahooStat {
  stat_id: string
  value: string | number
}

/**
 * Base URL for Yahoo Fantasy Sports API
 */
const YAHOO_API_BASE = 'https://fantasysports.yahooapis.com/fantasy/v2'

/**
 * Get OAuth access token using authorization code (for initial authentication)
 */
export async function getAccessToken(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<YahooOAuthTokens> {
  const response = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  })

  if (!response.ok) {
    let errorText = 'Unknown error'
    let errorJson: any = null
    try {
      errorText = await response.text()
      // Try to parse as JSON
      try {
        errorJson = JSON.parse(errorText)
      } catch {
        // Not JSON, use as-is
      }
    } catch (e) {
      errorText = `HTTP ${response.status} ${response.statusText}`
    }
    
    // Provide helpful error message for INVALID_REDIRECT_URI
    if (errorJson?.error === 'INVALID_REDIRECT_URI' || errorText.includes('INVALID_REDIRECT_URI')) {
      const errorMsg = `INVALID_REDIRECT_URI: The redirect URI doesn't match what's configured in Yahoo Developer Portal.

Redirect URI being used: ${redirectUri}

To fix this:
1. Go to Yahoo Developer Portal: https://developer.yahoo.com/apps/
2. Find your app and click "Edit"
3. Check the "Redirect URI(s)" field
4. Make sure this EXACT URI is listed: ${redirectUri}
5. No trailing slashes, must be HTTPS
6. Click "Update" and wait 2-5 minutes for changes to propagate
7. Try again

If you're in production, the redirect URI should be:
https://aitradr.netlify.app/api/auth/yahoo/callback`
      throw new Error(errorMsg)
    }
    
    throw new Error(`Failed to get access token: ${errorText}`)
  }

  const tokens = await response.json()
  return {
    ...tokens,
    expires_at: Date.now() + tokens.expires_in * 1000,
  }
}

/**
 * Refresh OAuth access token
 */
export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<YahooOAuthTokens> {
  const response = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to refresh access token: ${error}`)
  }

  const tokens = await response.json()
  return {
    ...tokens,
    expires_at: Date.now() + tokens.expires_in * 1000,
  }
}

/**
 * Check if token is expired or will expire soon (within 5 minutes)
 */
export function isTokenExpired(tokens: YahooOAuthTokens): boolean {
  if (!tokens.expires_at) return true
  const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000
  return tokens.expires_at < fiveMinutesFromNow
}

/**
 * Make authenticated API request to Yahoo Fantasy Sports API
 */
async function makeApiRequest(
  endpoint: string,
  accessToken: string,
  params?: Record<string, string>
): Promise<any> {
  // Yahoo Fantasy Sports API - format is controlled via query parameter, not file extension
  // Remove any .json or .xml extensions if present (not supported in path)
  let cleanEndpoint = endpoint
  if (endpoint.endsWith('.json') || endpoint.endsWith('.xml')) {
    cleanEndpoint = endpoint.replace(/\.(json|xml)$/, '')
  }
  
  const url = new URL(`${YAHOO_API_BASE}/${cleanEndpoint}`)
  
  // Yahoo API uses format query parameter for JSON (default is XML)
  url.searchParams.append('format', 'json')
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })
  }

  console.log('Yahoo API request:', url.toString())

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })

  const contentType = response.headers.get('content-type') || ''
  let responseText: string
  try {
    responseText = await response.text() || ''
  } catch (textError: any) {
    console.error('Failed to read response text:', textError)
    throw new Error(`Yahoo API error: ${response.status} ${response.statusText} - Failed to read response body`)
  }

  // Ensure responseText is a string
  if (typeof responseText !== 'string') {
    responseText = String(responseText || '')
  }

  console.log('Yahoo API response status:', response.status)
  console.log('Yahoo API response content-type:', contentType)
  console.log('Yahoo API response preview:', responseText ? responseText.substring(0, 300) : '(empty response)')

  if (!response.ok) {
    // If response is XML (error), parse it for error message
    if (responseText && (responseText.trim().startsWith('<?xml') || contentType.includes('xml'))) {
      // Extract error from XML if possible
      const errorMatch = responseText.match(/<description>(.*?)<\/description>/i) || 
                         responseText.match(/<error>(.*?)<\/error>/i) ||
                         responseText.match(/<message>(.*?)<\/message>/i)
      const errorMsg = errorMatch ? errorMatch[1] : (responseText ? responseText.substring(0, 300) : 'No response body')
      throw new Error(`Yahoo API error: ${response.status} ${response.statusText} - ${errorMsg}`)
    }
    const errorPreview = responseText ? responseText.substring(0, 300) : 'No response body'
    throw new Error(`Yahoo API error: ${response.status} ${response.statusText} - ${errorPreview}`)
  }

  // Check if response is actually JSON
  if (responseText && responseText.trim().startsWith('<?xml')) {
    // Got XML even though we requested JSON - try to parse error
    const errorMatch = responseText.match(/<description>(.*?)<\/description>/i) || 
                       responseText.match(/<error>(.*?)<\/error>/i) ||
                       responseText.match(/<message>(.*?)<\/message>/i)
    const errorMsg = errorMatch ? errorMatch[1] : 'Received XML response instead of JSON'
    const preview = responseText ? responseText.substring(0, 500) : 'No response body'
    throw new Error(`Yahoo API returned XML instead of JSON: ${errorMsg}. Response preview: ${preview}`)
  }

  if (!responseText || (!responseText.trim().startsWith('{') && !responseText.trim().startsWith('['))) {
    const preview = responseText ? responseText.substring(0, 200) : 'No response body'
    throw new Error(`Unexpected response format. Expected JSON but got: ${preview}`)
  }

  try {
    return JSON.parse(responseText)
  } catch (parseError: any) {
    const preview = responseText ? responseText.substring(0, 500) : 'No response body'
    console.error('Failed to parse JSON response:', preview)
    throw new Error(`Failed to parse JSON response: ${parseError.message}. Response preview: ${preview}`)
  }
}

/**
 * Get all leagues for the authenticated user
 * If gameKey is provided, only returns leagues for that game. If null/undefined, returns all leagues.
 */
export async function getUserLeagues(accessToken: string, gameKey?: string): Promise<YahooLeague[]> {
  // If gameKey is provided, filter by it. Otherwise, fetch all games and their leagues
  const endpoint = gameKey 
    ? `users;use_login=1/games;game_keys=${gameKey}/leagues`
    : `users;use_login=1/games/leagues`
  const response = await makeApiRequest(endpoint, accessToken)
  
  const responseStr = response ? JSON.stringify(response, null, 2) : 'undefined'
  console.log('Raw getUserLeagues response structure:', responseStr.substring(0, 1000))
  
  // Parse the nested Yahoo API response structure
  // Yahoo uses numeric string keys like "0", "1", etc. for arrays
  const users = response.fantasy_content?.users || {}
  const leagues: YahooLeague[] = []
  
  // Iterate through users (typically just one user with use_login=1)
  Object.values(users).forEach((userObj: any) => {
    if (!userObj || !userObj.user || !Array.isArray(userObj.user)) return
    
    const userData = userObj.user
    // user[0] is the user GUID, user[1] contains user subresources like games
    if (userData[1] && userData[1].games) {
      const games = userData[1].games
      
      // Iterate through games
      Object.values(games).forEach((game: any) => {
        if (!game || typeof game !== 'object' || !game.game) return
        
        // game is an array: [0] = game data, [1] = game subresources (leagues)
        const gameData = game.game
        if (Array.isArray(gameData) && gameData[1] && gameData[1].leagues) {
          const gameLeagues = gameData[1].leagues
          
          // leagues can be an empty array or an object with string keys
          if (Array.isArray(gameLeagues)) {
            // Empty array means no leagues
            console.log('Leagues array is empty for this game')
          } else if (typeof gameLeagues === 'object') {
            // Iterate through leagues object (Yahoo uses string keys like "0", "1", etc.)
            Object.values(gameLeagues).forEach((league: any) => {
              // Skip the "count" property if present
              if (typeof league === 'number' || league === 'count') return
              
              if (!league || typeof league !== 'object' || !league.league) return
              
              // league is an array: [0] = league data
              const leagueData = league.league
              if (Array.isArray(leagueData) && leagueData[0]) {
                const leagueInfo = leagueData[0]
                // Extract game_key and season from league_key (format: {game_key}.l.{league_id})
                const leagueKeyParts = leagueInfo.league_key?.split('.') || []
                const gameKeyFromLeague = leagueKeyParts[0]
                const gameInfo = gameData[0] // Game info contains season
                
                leagues.push({
                  league_key: leagueInfo.league_key,
                  league_id: leagueInfo.league_id,
                  name: leagueInfo.name,
                  url: leagueInfo.url,
                  draft_status: leagueInfo.draft_status || 'unknown',
                  num_teams: parseInt(leagueInfo.num_teams || '0') || 0,
                  season: gameInfo?.season,
                  game_key: gameKeyFromLeague,
                })
              }
            })
          }
        }
      })
    }
  })
  
  console.log(`Parsed ${leagues.length} leagues from response`)
  
  // Filter to only the newest season
  // Find the most recent season year from all leagues
  if (leagues.length > 0) {
    const seasons = leagues
      .map(l => parseInt(l.season || '0'))
      .filter(s => s > 0)
    
    if (seasons.length > 0) {
      const newestSeason = Math.max(...seasons).toString()
      const currentSeasonLeagues = leagues.filter(l => l.season === newestSeason)
      console.log(`Filtered to ${currentSeasonLeagues.length} leagues from newest season (${newestSeason}) out of ${leagues.length} total leagues`)
      return currentSeasonLeagues
    }
  }
  
  return leagues
}

/**
 * Get stat definitions for a game (maps stat_id to stat name)
 */
export async function getStatDefinitions(accessToken: string, gameKey: string): Promise<Record<string, string>> {
  try {
    const response = await makeApiRequest(`game/${gameKey}/stat_categories`, accessToken)
    const statCategories = response.fantasy_content?.game?.[1]?.stat_categories?.stats
    
    if (!statCategories || !Array.isArray(statCategories)) {
      console.warn(`⚠️ Could not parse stat categories for game ${gameKey}`)
      return {}
    }
    
    const statMap: Record<string, string> = {}
    statCategories.forEach((stat: any) => {
      if (stat && stat.stat) {
        const statData = Array.isArray(stat.stat) ? stat.stat[0] : stat.stat
        if (statData.stat_id && statData.name) {
          statMap[statData.stat_id] = statData.name
        }
      }
    })
    
    console.log(`📊 Stat definitions for game ${gameKey}:`, statMap)
    return statMap
  } catch (error: any) {
    console.warn(`⚠️ Could not fetch stat definitions for game ${gameKey}:`, error?.message)
    return {}
  }
}

/**
 * Get league information including season
 */
export async function getLeagueInfo(accessToken: string, leagueKey: string): Promise<{ season?: string; game_key?: string }> {
  const response = await makeApiRequest(`league/${leagueKey}`, accessToken)
  
  const league = response.fantasy_content?.league
  if (!league || !Array.isArray(league) || league.length < 1) {
    console.warn(`⚠️ getLeagueInfo: Invalid league response structure`)
    return {}
  }
  
  // Extract game_key from league_key (format: {game_key}.l.{league_id})
  const leagueKeyParts = leagueKey?.split('.') || []
  const gameKey = leagueKeyParts[0]
  
  // league[0] might be an array of league data objects, or league[0] might be the data itself
  let leagueData: any = {}
  
  if (Array.isArray(league[0])) {
    // league[0] is an array - extract data from it
    league[0].forEach((item: any) => {
      if (typeof item === 'object' && item !== null) {
        Object.assign(leagueData, item)
      }
    })
  } else if (typeof league[0] === 'object' && league[0] !== null) {
    // league[0] is directly the data object
    leagueData = league[0]
  }
  
  // Also check league[1] for additional data
  if (league.length > 1 && typeof league[1] === 'object' && league[1] !== null) {
    if (Array.isArray(league[1])) {
      league[1].forEach((item: any) => {
        if (typeof item === 'object' && item !== null) {
          Object.assign(leagueData, item)
        }
      })
    } else {
      Object.assign(leagueData, league[1])
    }
  }
  
  // Try to get season from multiple sources
  let season = leagueData.season || leagueData.current_season || leagueData.game_season
  
  // If no season in league data, try to get it from game info
  if (!season && gameKey) {
    try {
      // Fetch game info to get season
      const gameResponse = await makeApiRequest(`game/${gameKey}`, accessToken)
      const game = gameResponse.fantasy_content?.game
      if (game && Array.isArray(game) && game[0] && Array.isArray(game[0])) {
        let gameData: any = {}
        game[0].forEach((item: any) => {
          if (typeof item === 'object' && item !== null) {
            Object.assign(gameData, item)
          }
        })
        season = gameData.season
        console.log(`📊 Extracted season ${season} from game ${gameKey}`)
      }
    } catch (gameError: any) {
      console.warn(`⚠️ Could not fetch game info for game_key ${gameKey}:`, gameError?.message)
    }
  }
  
  // Log full league data for debugging if season still not found
  if (!season) {
    console.warn(`⚠️ Could not determine season for league ${leagueKey}. League data keys:`, Object.keys(leagueData).join(', '))
    console.warn(`   Full league data (first 1000 chars):`, JSON.stringify(leagueData, null, 2).substring(0, 1000))
    console.warn(`   Full league response structure (first 1000 chars):`, JSON.stringify(league, null, 2).substring(0, 1000))
    
    // Try to extract from league_key format: {game_key}.l.{league_id}
    // For NHL, game_key 465 = 2025-26 season, so season should be 2025
    if (gameKey === '465') {
      season = '2025'
      console.log(`📊 Using fallback: game_key 465 = 2025-26 NHL season, using season 2025`)
    } else if (gameKey) {
      // Try to fetch game info to get season
      try {
        const gameResponse = await makeApiRequest(`game/${gameKey}`, accessToken)
        const game = gameResponse.fantasy_content?.game
        if (game && Array.isArray(game) && game.length > 0) {
          let gameData: any = {}
          if (Array.isArray(game[0])) {
            game[0].forEach((item: any) => {
              if (typeof item === 'object' && item !== null) {
                Object.assign(gameData, item)
              }
            })
          } else if (typeof game[0] === 'object') {
            gameData = game[0]
          }
          season = gameData.season
          if (season) {
            console.log(`📊 Extracted season ${season} from game ${gameKey} (fallback)`)
          }
        }
      } catch (gameError: any) {
        console.warn(`⚠️ Could not fetch game info for game_key ${gameKey}:`, gameError?.message)
      }
    }
  }
  
  console.log(`📊 League info for ${leagueKey}: season=${season || 'unknown'}, game_key=${gameKey || 'unknown'}`)
  
  return { season, game_key: gameKey }
}

/**
 * Get all teams in a league
 */
/**
 * Extract data from Yahoo's nested array structure
 * Yahoo uses arrays like: [dataObject, subResource1, subResource2, ...]
 */
function extractYahooData<T>(array: any[], index: number = 0): T | null {
  if (!Array.isArray(array) || array.length <= index) return null
  
  const item = array[index]
  if (!item || typeof item !== 'object') return null
  
  // If it's an array of objects, merge them into one
  if (Array.isArray(item)) {
    const merged: any = {}
    item.forEach((obj: any) => {
      if (obj && typeof obj === 'object') {
        Object.assign(merged, obj)
      }
    })
    return merged as T
  }
  
  return item as T
}

export async function getLeagueTeams(accessToken: string, leagueKey: string): Promise<YahooTeam[]> {
  console.log(`📊 Fetching teams for league ${leagueKey}`)
  const response = await makeApiRequest(`league/${leagueKey}/teams`, accessToken)
  
  const league = response.fantasy_content?.league
  if (!Array.isArray(league) || league.length < 2) {
    throw new Error('Invalid league response structure')
  }

  const teamsData = league[1]?.teams
  if (!teamsData || typeof teamsData !== 'object') {
    throw new Error('No teams data in response')
  }

  const teams: YahooTeam[] = []
  
  // Iterate through teams (Yahoo uses numeric string keys)
  Object.entries(teamsData).forEach(([key, teamObj]: [string, any]) => {
    // Skip count property
    if (key === 'count' || typeof teamObj === 'number') return
    
    if (!teamObj?.team || !Array.isArray(teamObj.team)) {
      console.warn(`Skipping invalid team at key ${key}`)
        return
      }
      
    const teamArray = teamObj.team
    
    // Handle nested structure: teamArray[0] might itself be an array
    let actualTeamArray: any[] = teamArray
    if (Array.isArray(teamArray) && teamArray.length > 0 && Array.isArray(teamArray[0])) {
      // teamArray[0] is an array - use it as the actual team array
      actualTeamArray = teamArray[0]
      console.log(`📊 Team structure: teamArray[0] is an array with ${actualTeamArray.length} elements`)
    }
    
    // Extract team data from actualTeamArray[0]
    const teamData = extractYahooData<any>(actualTeamArray, 0)
    if (!teamData?.team_key) {
      console.warn(`Skipping team at key ${key} - missing team_key`)
      return
    }
    
    // Extract manager from actualTeamArray[1]
    const managers = actualTeamArray[1]?.managers
    let managerName: string | undefined
    if (managers && typeof managers === 'object') {
    const managerValues = Object.values(managers)
    if (managerValues.length > 0) {
      const managerObj = managerValues[0] as any
      if (managerObj?.manager) {
          const managerData = Array.isArray(managerObj.manager) 
            ? extractYahooData<any>(managerObj.manager, 0)
            : managerObj.manager
        managerName = managerData?.nickname
        }
      }
    }
    
    // Extract standings - search through actualTeamArray for standings data
    // Standings might be at different indices depending on API response structure
    let wins = 0, losses = 0, ties = 0
    let standingsFound = false
    
    // Search through actualTeamArray for standings
    for (let i = 0; i < actualTeamArray.length; i++) {
      const item = actualTeamArray[i]
      if (!item || typeof item !== 'object') continue
      
      // Check for team_standings directly
      if (item.team_standings) {
        const standings = item.team_standings
        if (standings.outcome_totals) {
          const ot = standings.outcome_totals
          wins = parseInt(ot.wins || ot.win || '0', 10) || 0
          losses = parseInt(ot.losses || ot.loss || '0', 10) || 0
          ties = parseInt(ot.ties || ot.tie || '0', 10) || 0
          standingsFound = true
          break
        }
      }
      
      // Check if item itself is standings
      if (item.outcome_totals) {
        const ot = item.outcome_totals
        wins = parseInt(ot.wins || ot.win || '0', 10) || 0
        losses = parseInt(ot.losses || ot.loss || '0', 10) || 0
        ties = parseInt(ot.ties || ot.tie || '0', 10) || 0
        standingsFound = true
        break
      }
      
      // Also check nested structures - item might be an array
      if (Array.isArray(item)) {
        for (let j = 0; j < item.length; j++) {
          const subItem = item[j]
          if (subItem?.team_standings?.outcome_totals) {
            const ot = subItem.team_standings.outcome_totals
            wins = parseInt(ot.wins || ot.win || '0', 10) || 0
            losses = parseInt(ot.losses || ot.loss || '0', 10) || 0
            ties = parseInt(ot.ties || ot.tie || '0', 10) || 0
            standingsFound = true
            break
          }
          if (subItem?.outcome_totals) {
            const ot = subItem.outcome_totals
            wins = parseInt(ot.wins || ot.win || '0', 10) || 0
            losses = parseInt(ot.losses || ot.loss || '0', 10) || 0
            ties = parseInt(ot.ties || ot.tie || '0', 10) || 0
            standingsFound = true
            break
          }
        }
        if (standingsFound) break
      }
    }
    
    if (standingsFound) {
      console.log(`📊 Team ${teamData.name}: Record ${wins}-${losses}-${ties}`)
    } else {
      console.warn(`⚠️ Team ${teamData.name}: No standings data found. Searched through ${actualTeamArray.length} actualTeamArray elements.`)
      console.warn(`   ActualTeamArray structure:`, JSON.stringify(actualTeamArray.slice(0, 5), null, 2).substring(0, 800))
    }

    const teamId = teamData.team_id || teamData.team_key?.split('.')?.[3] || ''
    
    teams.push({
      team_key: teamData.team_key,
      team_id: teamId,
      name: teamData.name || 'Unknown Team',
      url: teamData.url || '',
      logo_url: teamData.team_logos?.[0]?.team_logo?.url || teamData.team_logos?.[0]?.url,
      manager_name: managerName,
      wins,
      losses,
      ties,
    })
  })
  
  console.log(`✅ Parsed ${teams.length} teams from league ${leagueKey}`)
  
  // If no teams have standings, try fetching from standings endpoint as fallback
  const teamsWithoutStandings = teams.filter(t => t.wins === 0 && t.losses === 0 && t.ties === 0)
  if (teamsWithoutStandings.length === teams.length && teams.length > 0) {
    console.warn(`⚠️ All ${teams.length} teams have 0-0-0 records. Attempting to fetch standings from separate endpoint...`)
    try {
      const standingsResponse = await makeApiRequest(`league/${leagueKey}/standings`, accessToken)
      const standingsLeague = standingsResponse.fantasy_content?.league
      if (Array.isArray(standingsLeague) && standingsLeague.length > 1) {
        const standingsData = standingsLeague[1]?.standings
        if (standingsData && typeof standingsData === 'object') {
          console.log(`📊 Found standings data in separate endpoint`)
          // Map standings to teams by team_key
          Object.values(standingsData).forEach((standingObj: any) => {
            if (typeof standingObj !== 'object' || !standingObj.team) return
            const standingTeamArray = standingObj.team
            if (!Array.isArray(standingTeamArray)) return
            
            const standingTeamData = extractYahooData<any>(standingTeamArray, 0)
            const teamKey = standingTeamData?.team_key
            if (!teamKey) return
            
            // Find the team in our array
            const team = teams.find(t => t.team_key === teamKey)
            if (!team) return
            
            // Extract standings
            const standings = standingTeamArray[2]?.team_standings
            if (standings?.outcome_totals) {
              const ot = standings.outcome_totals
              team.wins = parseInt(ot.wins || ot.win || '0', 10) || 0
              team.losses = parseInt(ot.losses || ot.loss || '0', 10) || 0
              team.ties = parseInt(ot.ties || ot.tie || '0', 10) || 0
              console.log(`✅ Updated standings for ${team.name}: ${team.wins}-${team.losses}-${team.ties}`)
            }
          })
        }
      }
    } catch (standingsError: any) {
      console.warn(`⚠️ Could not fetch standings from separate endpoint:`, standingsError?.message)
    }
  }
  
  return teams
}

/**
 * Fetch player stats and attach to players
 */
async function fetchPlayerStats(
  accessToken: string,
  players: YahooPlayer[],
  season: string
): Promise<void> {
  if (!season) {
    console.error(`❌ fetchPlayerStats called without season parameter - cannot fetch stats`)
    return
  }
  
  const playerKeys = players.map(p => p.player_key).filter(Boolean)
  if (playerKeys.length === 0) {
    console.warn(`⚠️ No player keys to fetch stats for`)
    return
  }

  console.log(`📊 Fetching stats for ${playerKeys.length} players (season=${season})`)
  console.log(`📊 First 5 player keys:`, playerKeys.slice(0, 5).join(', '))

  // Track stats attachment
  let playersWithStatsAttached = 0
  let playersWithoutStats = 0

  // Fetch in batches of 25 (Yahoo API limit)
  const BATCH_SIZE = 25
  const totalBatches = Math.ceil(playerKeys.length / BATCH_SIZE)
  
  for (let i = 0; i < playerKeys.length; i += BATCH_SIZE) {
    const batch = playerKeys.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const endpoint = `players;player_keys=${batch.join(',')}/stats;type=season;season=${season}`
    
    console.log(`📊 Fetching stats batch ${batchNum}/${totalBatches} (${batch.length} players)`)
    
    try {
      const statsResponse = await makeApiRequest(endpoint, accessToken)
      const playersData = statsResponse.fantasy_content?.players
      
      if (!playersData || typeof playersData !== 'object') {
        console.warn(`⚠️ No stats data in response for batch ${batchNum}/${totalBatches}`)
        playersWithoutStats += batch.length
        continue
      }
      
      const playersInResponse = Object.keys(playersData).length
      console.log(`📊 Batch ${batchNum}/${totalBatches} returned stats for ${playersInResponse} players`)

      // Import yahooParser for Celebrini logging (outside forEach to avoid async issues)
      const yahooParser = await import('./yahooParser')
      
      // Process each player's stats
      Object.values(playersData).forEach((playerObj: any) => {
        if (!playerObj?.player || !Array.isArray(playerObj.player)) return
        
        const playerArray = playerObj.player
        const playerData = extractYahooData<any>(playerArray, 0)
        const playerKey = playerData?.player_key
        
        if (!playerKey) return

        // Find the player in our array
        const player = players.find(p => p.player_key === playerKey)
        if (!player) return

        // Extract stats from playerArray[1]
        const statsData = playerArray[1]
        if (!statsData) {
          // DEBUG: Log structure for first player to understand response format
          if (playerKey === batch[0]) {
            console.log(`🔍 [Stats Debug] Player ${playerKey}: No statsData at playerArray[1]`)
            console.log(`   playerArray length: ${playerArray.length}`)
            console.log(`   playerArray structure: ${JSON.stringify(playerArray.slice(0, 3)).substring(0, 300)}`)
          }
          playersWithoutStats++
          return
        }

        // DEBUG: Log the actual structure for first player in batch
        if (playerKey === batch[0]) {
          console.log(`🔍 [Stats Debug] First player ${playerKey} statsData structure:`)
          console.log(`   Type: ${Array.isArray(statsData) ? 'array' : typeof statsData}`)
          if (Array.isArray(statsData)) {
            console.log(`   Array length: ${statsData.length}`)
            if (statsData.length > 0) {
              console.log(`   First item type: ${typeof statsData[0]}`)
              console.log(`   First item keys: ${Object.keys(statsData[0] || {}).join(', ')}`)
            }
          } else {
            console.log(`   Keys: ${Object.keys(statsData).join(', ')}`)
          }
          console.log(`   Sample: ${JSON.stringify(statsData).substring(0, 800)}`)
        }

        // Find season stats (coverage_type='season')
        // Note: Don't require exact coverage_value match - season might not have started yet
        let seasonStats: any = null
        
        if (Array.isArray(statsData)) {
          // Multiple stat sets - find the season one
          for (const statSet of statsData) {
            if (statSet?.player_stats) {
              const ps = statSet.player_stats
              // Check if it's an object with coverage_type
              if (ps.coverage_type === 'season') {
                // Accept any season stats, don't require exact coverage_value match
                seasonStats = ps
                if (playerKey === batch[0]) {
                  console.log(`✅ [Stats Debug] Found season stats in array, coverage_value: ${ps.coverage_value}`)
                }
                break
              }
              // Check if it's an object with numeric keys (Yahoo format)
              if (typeof ps === 'object' && !Array.isArray(ps)) {
                for (const key of Object.keys(ps)) {
                  if (ps[key]?.coverage_type === 'season') {
                    seasonStats = ps[key]
                    if (playerKey === batch[0]) {
                      console.log(`✅ [Stats Debug] Found season stats in numeric key ${key}, coverage_value: ${ps[key].coverage_value}`)
                    }
                    break
                  }
                }
                if (seasonStats) break
              }
            }
          }
        } else if (statsData?.player_stats) {
          const ps = statsData.player_stats
          // Direct player_stats object
          if (ps.coverage_type === 'season') {
            // Accept any season stats
            seasonStats = ps
            if (playerKey === batch[0]) {
              console.log(`✅ [Stats Debug] Found direct season stats, coverage_value: ${ps.coverage_value}`)
            }
          } else if (typeof ps === 'object' && !Array.isArray(ps)) {
            // Check numeric keys
            for (const key of Object.keys(ps)) {
              if (ps[key]?.coverage_type === 'season') {
                seasonStats = ps[key]
                if (playerKey === batch[0]) {
                  console.log(`✅ [Stats Debug] Found season stats in numeric key ${key}, coverage_value: ${ps[key].coverage_value}`)
                }
                break
              }
            }
          }
        }

        // If no season stats found, log what we did find
        if (!seasonStats && playerKey === batch[0]) {
          console.warn(`⚠️ [Stats Debug] No season stats found for ${playerKey}`)
          console.warn(`   statsData type: ${Array.isArray(statsData) ? 'array' : typeof statsData}`)
          if (Array.isArray(statsData)) {
            statsData.forEach((item, idx) => {
              if (item?.player_stats) {
                const ps = item.player_stats
                console.warn(`   Array[${idx}]: coverage_type=${ps.coverage_type}, coverage_value=${ps.coverage_value}`)
              }
            })
          } else if (statsData?.player_stats) {
            const ps = statsData.player_stats
            if (typeof ps === 'object' && !Array.isArray(ps)) {
              Object.keys(ps).forEach(key => {
                console.warn(`   Key ${key}: coverage_type=${ps[key]?.coverage_type}, coverage_value=${ps[key]?.coverage_value}`)
              })
            } else {
              console.warn(`   Direct: coverage_type=${ps.coverage_type}, coverage_value=${ps.coverage_value}`)
            }
          }
        }

        if (seasonStats && seasonStats.stats && Array.isArray(seasonStats.stats)) {
          // Validate coverage_type
          if (seasonStats.coverage_type !== 'season') {
            console.warn(`⚠️ Player ${playerKey} stats have coverage_type="${seasonStats.coverage_type}", expected "season"`)
            return
          }

          player.player_stats = {
            coverage_type: seasonStats.coverage_type,
            coverage_value: seasonStats.coverage_value || parseInt(season, 10),
            stats: seasonStats.stats.map((s: any) => ({
              stat_id: s.stat_id || s.stat?.stat_id || '',
              value: s.value || s.stat?.value || 0,
            })),
          }

          const playerName = player.name?.full || playerKey
          playersWithStatsAttached++
          console.log(`✅ Attached stats to ${playerName} (${seasonStats.stats.length} stats)`)
          
          // Enhanced logging for Celebrini to help identify stat_id mappings
          if (playerName.toLowerCase().includes('celebrini')) {
            const allStats = player.player_stats.stats.map(s => {
              const statName = yahooParser.hasStatDefinitions() 
                ? yahooParser.getStatDefinitionsCache()[s.stat_id] || 'unknown'
                : 'unknown'
              return `stat_id ${s.stat_id} (${statName})=${s.value}`
            }).join(', ')
            
            console.log(`\n${'='.repeat(80)}`)
            console.log(`🎯 CELEBRINI STATS ANALYSIS`)
            console.log(`${'='.repeat(80)}`)
            console.log(`📊 All stat values from API: ${allStats}`)
            console.log(`📊 Expected: G:14, A:20, P:34, +/-:3, PIM:12, PPP:12, SHP:0, GWG:3, SOG:70, FW:181, HIT:14, BLK:16`)
            console.log(`📊 Coverage: ${player.player_stats.coverage_type}, Season: ${player.player_stats.coverage_value}`)
            console.log(`${'='.repeat(80)}\n`)
          }
        } else {
          console.warn(`⚠️ No season stats found for player ${playerKey}`)
          playersWithoutStats++
        }
      })
      
      // Check for players in batch that didn't get stats
      const batchPlayerKeys = new Set(batch)
      const playersWithStatsInBatch = players.filter(p => 
        batchPlayerKeys.has(p.player_key) && p.player_stats
      )
      const missingInBatch = batch.length - playersWithStatsInBatch.length
      if (missingInBatch > 0) {
        console.warn(`⚠️ Batch ${batchNum}/${totalBatches}: ${missingInBatch} player(s) did not receive stats`)
      }
    } catch (error: any) {
      console.error(`❌ Failed to fetch stats for batch ${batchNum}/${totalBatches}:`, error.message)
      playersWithoutStats += batch.length
    }
  }
  
  // Final summary
  console.log(`\n📊 Stats Fetch Summary:`)
  console.log(`   ✅ Players with stats: ${playersWithStatsAttached}/${playerKeys.length}`)
  console.log(`   ❌ Players without stats: ${playersWithoutStats}/${playerKeys.length}`)
  if (playersWithoutStats > 0) {
    console.warn(`   ⚠️ ${playersWithoutStats} player(s) did not receive stats - check logs above for details`)
  }
}

/**
 * Get roster for a specific team
 */
export async function getTeamRoster(
  accessToken: string,
  teamKey: string,
  date?: string,
  season?: string
): Promise<YahooPlayer[]> {
  console.log(`📊 Fetching roster for ${teamKey}${season ? ` (season=${season})` : ''}`)
  
  try {
    // Fetch roster (date parameter is kept for compatibility but not used - we use season for stats)
    const rosterResponse = await makeApiRequest(`team/${teamKey}/roster`, accessToken)
    
    const team = rosterResponse.fantasy_content?.team
    if (!Array.isArray(team) || team.length < 1) {
      const responseStr = JSON.stringify(rosterResponse, null, 2).substring(0, 1000)
      console.error(`❌ Invalid roster response structure for ${teamKey}`)
      console.error(`   Response structure:`, responseStr)
      throw new Error(`Invalid roster response structure for team ${teamKey}. Expected team array, got: ${Array.isArray(team) ? team.length : typeof team}`)
    }

    // Yahoo API returns team as: team: [[{team_key}, {team_id}, ...], {roster: {"0": {players: {"0": {player: [...]}}}}]
    // The roster is at team[1].roster as an object with numeric string keys
    let rosterData: any = null
    
    console.log(`📊 Team structure: Array length=${team.length}, team[0] is ${Array.isArray(team[0]) ? 'array' : typeof team[0]}, team[1] is ${team[1] ? (typeof team[1]) : 'undefined'}`)
    
    // Check if team[0] is an array (nested structure)
    if (Array.isArray(team[0])) {
      console.log(`📊 team[0] is array with ${team[0].length} elements`)
      // First, try team[1].roster (most common structure)
      if (team[1] && typeof team[1] === 'object') {
        console.log(`📊 team[1] exists, checking for roster property...`)
        console.log(`📊 team[1] keys: ${Object.keys(team[1]).join(', ')}`)
        if (team[1].roster) {
          console.log(`📊 Found team[1].roster, type: ${typeof team[1].roster}, isArray: ${Array.isArray(team[1].roster)}`)
          if (typeof team[1].roster === 'object') {
            rosterData = team[1].roster
            console.log(`✅ Using team[1].roster, has ${Object.keys(rosterData).length} entries`)
          }
        } else {
          console.log(`⚠️ team[1] exists but no roster property`)
        }
      } else {
        console.log(`⚠️ team[1] doesn't exist or is not an object`)
      }
      
      // If we didn't find it at team[1].roster, search through team[0] array
      if (!rosterData) {
        console.log(`📊 Searching through team[0] array for roster...`)
        const teamArray = team[0]
        for (let i = 0; i < teamArray.length; i++) {
          const item = teamArray[i]
          if (item && typeof item === 'object' && item.roster) {
            console.log(`📊 Found roster at team[0][${i}]`)
            if (Array.isArray(item.roster)) {
              rosterData = item.roster
            } else if (typeof item.roster === 'object') {
              rosterData = item.roster
            }
            if (rosterData) break
          }
        }
      }
    } else if (team[1] && typeof team[1] === 'object' && team[1].roster) {
      // Direct roster access (non-nested structure)
      console.log(`📊 Using direct team[1].roster access`)
      rosterData = team[1].roster
    } else {
      // Search through all team array elements for roster
      console.log(`📊 Searching through all team elements for roster...`)
      for (let i = 0; i < team.length; i++) {
        const item = team[i]
        if (item && typeof item === 'object' && item.roster) {
          console.log(`📊 Found roster at team[${i}]`)
          if (Array.isArray(item.roster)) {
            rosterData = item.roster
          } else if (typeof item.roster === 'object') {
            rosterData = item.roster
          }
          if (rosterData) break
        }
        // Also check if item is an array and search within it
        if (Array.isArray(item)) {
          for (let j = 0; j < item.length; j++) {
            const subItem = item[j]
            if (subItem && typeof subItem === 'object' && subItem.roster) {
              console.log(`📊 Found roster at team[${i}][${j}]`)
              if (Array.isArray(subItem.roster)) {
                rosterData = subItem.roster
              } else if (typeof subItem.roster === 'object') {
                rosterData = subItem.roster
              }
              if (rosterData) break
            }
          }
          if (rosterData) break
        }
      }
    }

    if (!rosterData) {
      const teamStr = JSON.stringify(team, null, 2).substring(0, 2000)
      console.error(`❌ No roster data in response for ${teamKey}`)
      console.error(`   team structure:`, teamStr)
      throw new Error(`No roster data in response for team ${teamKey}. Searched through team array but couldn't find roster property.`)
    }
    
    console.log(`✅ Found roster data: ${Array.isArray(rosterData) ? 'array' : 'object'} with ${Array.isArray(rosterData) ? rosterData.length : Object.keys(rosterData).length} entries`)

    const players: YahooPlayer[] = []
    
    // Extract players from roster
    // Structure: roster["0"].players["0"].player[...]
    // Roster can be either an array or an object with numeric string keys
    const rosterEntries = Array.isArray(rosterData) 
      ? rosterData 
      : Object.values(rosterData)
    
    console.log(`📊 Roster data structure: ${Array.isArray(rosterData) ? 'array' : 'object'}, ${rosterEntries.length} entries`)
    
    rosterEntries.forEach((rosterEntry: any, rosterIndex: number) => {
      if (!rosterEntry || typeof rosterEntry !== 'object') {
        console.warn(`⚠️ Skipping invalid roster entry at index ${rosterIndex}`)
        return
      }
      
      // Roster entry structure: { players: {"0": { player: [...] }, "1": { player: [...] }, ...} }
      let playerEntries: any[] = []
      
      if (rosterEntry?.players) {
        // players is an object with numeric string keys
        if (Array.isArray(rosterEntry.players)) {
          playerEntries = rosterEntry.players
        } else if (typeof rosterEntry.players === 'object') {
          // Convert object with numeric keys to array
          playerEntries = Object.values(rosterEntry.players)
        }
      } else if (rosterEntry?.player) {
        // Direct player reference (alternative structure)
        playerEntries = Array.isArray(rosterEntry.player) ? rosterEntry.player : [rosterEntry.player]
      }
      
      if (playerEntries.length === 0) {
        console.warn(`⚠️ No player entries found in roster entry ${rosterIndex}`)
        return
      }
      
      console.log(`📊 Found ${playerEntries.length} player entries in roster entry ${rosterIndex}`)
      
      // Process each player entry
      playerEntries.forEach((playerObj: any, playerIndex: number) => {
        if (!playerObj || typeof playerObj !== 'object') {
          console.warn(`⚠️ Skipping invalid player object at roster[${rosterIndex}].players[${playerIndex}]`)
          return
        }
        
        // Player entry structure: { player: [[{player_key}, ...], ...] }
        let playerArray: any[] = []
        
        if (playerObj?.player) {
          // player property exists - it's an array of player data arrays
          if (Array.isArray(playerObj.player)) {
            playerArray = playerObj.player
          } else if (typeof playerObj.player === 'object') {
            // Single player object, wrap in array
            playerArray = [playerObj.player]
          }
        } else if (Array.isArray(playerObj)) {
          // Player entry is directly an array
          playerArray = playerObj
        } else if (playerObj && typeof playerObj === 'object' && playerObj.player_key) {
          // Already a player data object
          playerArray = [playerObj]
        }
        
        if (playerArray.length === 0) {
          console.warn(`⚠️ No player data found in player entry ${playerIndex}`)
          return
        }
        
        // Extract player data from the first element of the array
        const playerData = extractYahooData<any>(playerArray, 0)
        
        if (!playerData?.player_key) {
          console.warn(`⚠️ Skipping player at index ${playerIndex} - missing player_key`)
          return
        }

        // Extract ownership from playerArray (usually in a later element)
        let ownership: any = undefined
        for (let i = 1; i < playerArray.length; i++) {
          const item = playerArray[i]
          if (item && typeof item === 'object' && item.ownership) {
            ownership = item.ownership
            break
          }
        }

        const playerId = playerData.player_id || playerData.player_key?.split('.')?.[2] || ''
        
        players.push({
          player_key: playerData.player_key,
          player_id: playerId,
          name: playerData.name || { full: 'Unknown Player', first: '', last: '', ascii_first: '', ascii_last: '' },
          display_position: playerData.display_position || 'N/A',
          position_type: playerData.position_type || '',
          primary_position: playerData.primary_position || '',
          eligible_positions: Array.isArray(playerData.eligible_positions) ? playerData.eligible_positions : [],
          position: playerData.display_position || playerData.primary_position || 'N/A',
          status: playerData.status,
          status_full: playerData.status_full,
          injury_note: playerData.injury_note,
          headshot: playerData.headshot,
          ownership,
          // Stats will be fetched separately
          player_stats: undefined,
        })
      })
    })

    console.log(`✅ Parsed ${players.length} players from roster`)

    // Fetch stats for all players if season is provided
    if (season && players.length > 0) {
      console.log(`📊 Fetching stats for ${players.length} players on team ${teamKey} (season=${season})`)
      try {
        await fetchPlayerStats(accessToken, players, season)
        const playersWithStats = players.filter(p => p.player_stats && p.player_stats.stats && p.player_stats.stats.length > 0).length
        console.log(`✅ Stats fetch complete for team ${teamKey}: ${playersWithStats}/${players.length} players have stats`)
        if (playersWithStats < players.length) {
          console.warn(`⚠️ Team ${teamKey}: ${players.length - playersWithStats} player(s) did not receive stats`)
        }
      } catch (statsError: any) {
        console.error(`❌ Failed to fetch stats for team ${teamKey}:`, statsError?.message)
        console.error(`   Error stack:`, statsError?.stack)
        console.error(`   Continuing without stats - players will have default values`)
        // Don't throw - return players without stats rather than failing completely
      }
    } else {
      if (!season) {
        console.warn(`⚠️ No season provided for team ${teamKey} - skipping stats fetch`)
      }
      if (players.length === 0) {
        console.warn(`⚠️ No players to fetch stats for on team ${teamKey}`)
      }
    }

    return players
  } catch (error: any) {
    console.error(`❌ getTeamRoster failed for ${teamKey}:`, error?.message)
    console.error(`   Error stack:`, error?.stack)
    // Re-throw with more context
    throw new Error(`Failed to fetch roster for team ${teamKey}: ${error?.message || 'Unknown error'}`)
  }
}

/**
 * Get detailed player stats
 */
export async function getPlayerStats(
  accessToken: string,
  playerKeys: string[],
  week?: number
): Promise<Record<string, YahooPlayer>> {
  const keys = playerKeys.join(',')
  const endpoint = week 
    ? `players;player_keys=${keys}/stats;type=week;week=${week}`
    : `players;player_keys=${keys}/stats`
    
  const response = await makeApiRequest(endpoint, accessToken)
  
  const players: Record<string, YahooPlayer> = {}
  const playersData = response.fantasy_content?.players || {}
  
  Object.values(playersData).forEach((player: any) => {
    if (player && typeof player === 'object' && player.player) {
      const playerData = player.player[0]
      const stats = player.player[1]?.player_stats || {}
      
      players[playerData.player_key] = {
        ...playerData,
        player_stats: stats.coverage_type ? stats : undefined,
      }
    }
  })
  
  return players
}

/**
 * Generate OAuth authorization URL
 */
export function getAuthorizationUrl(
  clientId: string,
  redirectUri: string,
  state?: string
): string {
  const trimmedClientId = clientId.trim()
  const cleanRedirectUri = redirectUri.trim().replace(/\/+$/, '')
  
  const params = new URLSearchParams({
    client_id: trimmedClientId,
    redirect_uri: cleanRedirectUri,
    response_type: 'code',
    scope: 'fspt-r', // Fantasy Sports - Read permission
    language: 'en-us',
    ...(state && { state }),
  })
  
  return `https://api.login.yahoo.com/oauth2/request_auth?${params.toString()}`
}

