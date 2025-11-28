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
https://aitradr.netlify.app/api/auth/yahoo/callback

If you're in local development, use your Cloudflare Tunnel URL:
https://YOUR_TUNNEL_URL.trycloudflare.com/api/auth/yahoo/callback`
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
    return {}
  }
  
  // league[0] is an array of league data objects
  const leagueDataArray = league[0]
  if (!Array.isArray(leagueDataArray)) {
    return {}
  }
  
  // Extract league data from the array of objects
  let leagueData: any = {}
  leagueDataArray.forEach((item: any) => {
    if (typeof item === 'object' && item !== null) {
      Object.assign(leagueData, item)
    }
  })
  
  // Extract game_key from league_key (format: {game_key}.l.{league_id})
  const leagueKeyParts = leagueKey?.split('.') || []
  const gameKey = leagueKeyParts[0] || leagueData.game_key
  
  // Try to get season from multiple sources
  let season = leagueData.season || leagueData.current_season
  
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
    console.warn(`   Full league data (first 500 chars):`, JSON.stringify(leagueData, null, 2).substring(0, 500))
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
    
    // Extract team data from teamArray[0]
    const teamData = extractYahooData<any>(teamArray, 0)
    if (!teamData?.team_key) {
      console.warn(`Skipping team at key ${key} - missing team_key`)
      return
    }
    
    // Extract manager from teamArray[1]
    const managers = teamArray[1]?.managers
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
    
    // Extract standings from teamArray[2]
    const standings = teamArray[2]?.team_standings
    let wins = 0, losses = 0, ties = 0
    
    if (standings?.outcome_totals) {
        const ot = standings.outcome_totals
      wins = parseInt(ot.wins || ot.win || '0', 10) || 0
      losses = parseInt(ot.losses || ot.loss || '0', 10) || 0
      ties = parseInt(ot.ties || ot.tie || '0', 10) || 0
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
  const playerKeys = players.map(p => p.player_key).filter(Boolean)
  if (playerKeys.length === 0) return

  console.log(`📊 Fetching stats for ${playerKeys.length} players (season=${season})`)

  // Fetch in batches of 25 (Yahoo API limit)
      const BATCH_SIZE = 25
      
      for (let i = 0; i < playerKeys.length; i += BATCH_SIZE) {
        const batch = playerKeys.slice(i, i + BATCH_SIZE)
    const endpoint = `players;player_keys=${batch.join(',')}/stats;type=season;season=${season}`
    
    try {
      const statsResponse = await makeApiRequest(endpoint, accessToken)
      const playersData = statsResponse.fantasy_content?.players
      
      if (!playersData || typeof playersData !== 'object') {
        console.warn(`⚠️ No stats data in response for batch ${Math.floor(i / BATCH_SIZE) + 1}`)
        continue
      }

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
        if (!statsData) return

        // Find season stats (coverage_type='season')
        let seasonStats: any = null
        
        if (Array.isArray(statsData)) {
          // Multiple stat sets - find the season one
          for (const statSet of statsData) {
            if (statSet?.player_stats) {
              const ps = statSet.player_stats
              // Check if it's an object with coverage_type
              if (ps.coverage_type === 'season' && ps.coverage_value === parseInt(season, 10)) {
                seasonStats = ps
                break
              }
              // Check if it's an object with numeric keys (Yahoo format)
              if (typeof ps === 'object' && !Array.isArray(ps)) {
                const firstKey = Object.keys(ps)[0]
                if (ps[firstKey]?.coverage_type === 'season') {
                  seasonStats = ps[firstKey]
                  break
                }
              }
            }
          }
        } else if (statsData?.player_stats) {
          const ps = statsData.player_stats
          // Direct player_stats object
          if (ps.coverage_type === 'season' && ps.coverage_value === parseInt(season, 10)) {
            seasonStats = ps
          } else if (typeof ps === 'object' && !Array.isArray(ps)) {
            // Check numeric keys
            const firstKey = Object.keys(ps)[0]
            if (ps[firstKey]?.coverage_type === 'season') {
              seasonStats = ps[firstKey]
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
        }
      })
    } catch (error: any) {
      console.error(`❌ Failed to fetch stats for batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message)
    }
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
    if (!Array.isArray(team) || team.length < 2) {
      const responseStr = JSON.stringify(rosterResponse, null, 2).substring(0, 1000)
      console.error(`❌ Invalid roster response structure for ${teamKey}`)
      console.error(`   Response structure:`, responseStr)
      throw new Error(`Invalid roster response structure for team ${teamKey}. Expected team array with length >= 2, got: ${Array.isArray(team) ? team.length : typeof team}`)
    }

    const roster = team[1]?.roster
    if (!roster || !Array.isArray(roster)) {
      const teamStr = JSON.stringify(team, null, 2).substring(0, 1000)
      console.error(`❌ No roster data in response for ${teamKey}`)
      console.error(`   team[1] structure:`, teamStr)
      throw new Error(`No roster data in response for team ${teamKey}. team[1] is: ${typeof team[1]}, roster is: ${typeof roster}`)
    }

    const players: YahooPlayer[] = []
    
    // Extract players from roster
    roster.forEach((playerObj: any) => {
    if (!playerObj?.player || !Array.isArray(playerObj.player)) return
    
    const playerArray = playerObj.player
    const playerData = extractYahooData<any>(playerArray, 0)
    
    if (!playerData?.player_key) {
      console.warn('Skipping player - missing player_key')
      return
    }

    // Extract ownership from playerArray
    let ownership: any = undefined
    for (let i = 1; i < playerArray.length; i++) {
      const item = playerArray[i]
      if (item?.ownership) {
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

    console.log(`✅ Parsed ${players.length} players from roster`)

    // Fetch stats for all players if season is provided
    if (season && players.length > 0) {
      try {
        await fetchPlayerStats(accessToken, players, season)
      } catch (statsError: any) {
        console.error(`❌ Failed to fetch stats for team ${teamKey}:`, statsError?.message)
        console.error(`   Continuing without stats - players will have default values`)
        // Don't throw - return players without stats rather than failing completely
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
  // Ensure client_id and redirect_uri are properly encoded
  const trimmedClientId = clientId.trim()
  const trimmedRedirectUri = redirectUri.trim()
  
  console.log('🔍 getAuthorizationUrl - Client ID length:', trimmedClientId.length)
  console.log('🔍 getAuthorizationUrl - Redirect URI:', trimmedRedirectUri)
  
  // Ensure redirect URI has no trailing slashes and matches exactly
  const cleanRedirectUri = trimmedRedirectUri.replace(/\/+$/, '')
  
  // Validate redirect URI format
  const expectedRedirectUri = 'https://aitradr.netlify.app/api/auth/yahoo/callback'
  if (cleanRedirectUri !== expectedRedirectUri) {
    console.warn(`⚠️ Redirect URI mismatch! Expected: ${expectedRedirectUri}, Got: ${cleanRedirectUri}`)
  }
  
  const params = new URLSearchParams({
    client_id: trimmedClientId,
    redirect_uri: cleanRedirectUri,
    response_type: 'code',
    scope: 'fspt-r', // Fantasy Sports - Read permission
    language: 'en-us',
    ...(state && { state }),
  })
  
  const authUrl = `https://api.login.yahoo.com/oauth2/request_auth?${params.toString()}`
  
  // Decode the redirect_uri from the URL to verify encoding
  const urlObj = new URL(authUrl)
  const decodedRedirectUri = urlObj.searchParams.get('redirect_uri')
  
  // Log all parameters being sent
  console.log('🔍 getAuthorizationUrl - All OAuth Parameters:')
  console.log('  - client_id:', trimmedClientId.substring(0, 30) + '...')
  console.log('  - redirect_uri:', cleanRedirectUri)
  console.log('  - response_type:', 'code')
  console.log('  - scope:', 'fspt-r')
  console.log('  - language:', 'en-us')
  if (state) console.log('  - state:', state)
  
  console.log('🔍 getAuthorizationUrl - Full URL:', authUrl)
  console.log('🔍 getAuthorizationUrl - Redirect URI being sent:', cleanRedirectUri)
  console.log('🔍 getAuthorizationUrl - Redirect URI in URL (decoded):', decodedRedirectUri)
  console.log('🔍 getAuthorizationUrl - Expected Redirect URI:', expectedRedirectUri)
  console.log('🔍 getAuthorizationUrl - Match:', cleanRedirectUri === expectedRedirectUri)
  console.log('🔍 getAuthorizationUrl - Client ID in URL:', urlObj.searchParams.get('client_id')?.substring(0, 30) + '...')
  console.log('🔍 getAuthorizationUrl - Scope in URL:', urlObj.searchParams.get('scope'))
  console.log('🔍 getAuthorizationUrl - Response type in URL:', urlObj.searchParams.get('response_type'))
  console.log('🔍 getAuthorizationUrl - Client ID length:', trimmedClientId.length)
  console.log('🔍 getAuthorizationUrl - Client ID matches expected:', trimmedClientId === 'dj0yJmk9TEo2TFg0MFR2dTk1JmQ9WVdrOWEwWkxNbmxYZFVvbWNHbzlNQT09JnM9Y29uc3VtZXJzZWNyZXQmc3Y9MCZ4PTU3')
  
  return authUrl
}

