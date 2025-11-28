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
    try {
      errorText = await response.text()
    } catch (e) {
      errorText = `HTTP ${response.status} ${response.statusText}`
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
export async function getLeagueTeams(accessToken: string, leagueKey: string): Promise<YahooTeam[]> {
  // Request teams - Yahoo API includes standings in the teams response by default
  // If standings are missing, we'll fetch them separately as a fallback
  const response = await makeApiRequest(`league/${leagueKey}/teams`, accessToken)
  
  const responseStr = response ? JSON.stringify(response, null, 2) : 'undefined'
  console.log('Raw getLeagueTeams response structure:', responseStr.substring(0, 1500))
  
  const teams: YahooTeam[] = []
  
  // Parse the nested Yahoo API response structure
  // Structure: fantasy_content.league[0] = league data, league[1] = teams
  const league = response.fantasy_content?.league
  if (!league || !Array.isArray(league) || league.length < 2) {
    console.log('No league data or teams found in response')
    return teams
  }
  
  const teamsData = league[1]?.teams || {}
  
  // Log team count from API
  const teamCount = teamsData.count || Object.keys(teamsData).filter(k => k !== 'count').length
  console.log(`📊 Yahoo API returned ${teamCount} teams (checking count property and object keys)`)
  console.log(`📊 Teams data keys:`, Object.keys(teamsData).join(', '))
  
  // Iterate through teams (Yahoo uses string keys like "0", "1", etc.)
  // Use Object.entries to preserve order and handle both numeric and string keys
  let skippedCount = 0
  const teamEntries = Object.entries(teamsData)
  console.log(`📊 Processing ${teamEntries.length} team entries from API`)
  
  teamEntries.forEach(([key, teamObj]: [string, any], index: number) => {
    // Skip count property if present
    if (key === 'count' || typeof teamObj === 'number') {
      console.log(`📊 Skipping count property: key="${key}", value=${teamObj}`)
      return
    }
    
    if (!teamObj || typeof teamObj !== 'object') {
      skippedCount++
      console.warn(`⚠️ Skipping invalid team object at key "${key}":`, JSON.stringify(teamObj).substring(0, 200))
      return
    }
    
    // Handle different team object structures - be more flexible
    let teamArray = null
    if (teamObj.team) {
      teamArray = teamObj.team
    } else if (Array.isArray(teamObj)) {
      // Sometimes teamObj is directly the array
      teamArray = teamObj
    } else if (teamObj[0] && Array.isArray(teamObj[0])) {
      // Sometimes team data is nested in [0]
      teamArray = teamObj
    } else {
      // Try to extract team data directly from the object
      // Some teams might have a different structure
      console.log(`🔍 Attempting alternative parsing for team at key "${key}"`)
      console.log(`   Object keys:`, Object.keys(teamObj).join(', '))
      console.log(`   Object structure:`, JSON.stringify(teamObj).substring(0, 500))
      
      // Try to find team_key directly in the object
      if (teamObj.team_key) {
        // This might be a flattened structure - try to construct teamArray
        const constructedTeamData: any = {}
        Object.keys(teamObj).forEach(k => {
          if (k !== 'team' && typeof teamObj[k] === 'object' && teamObj[k] !== null) {
            Object.assign(constructedTeamData, teamObj[k])
          } else if (typeof teamObj[k] !== 'object') {
            constructedTeamData[k] = teamObj[k]
          }
        })
        
        // Create a minimal teamArray structure
        teamArray = [[constructedTeamData], {}, {}]
      } else {
        skippedCount++
        console.warn(`⚠️ Skipping team at key "${key}" - no team property or array structure:`, JSON.stringify(teamObj).substring(0, 200))
        return
      }
    }
    
    if (!Array.isArray(teamArray) || teamArray.length < 1) {
      skippedCount++
      console.warn(`⚠️ Skipping team at key "${key}" - invalid array structure (length: ${Array.isArray(teamArray) ? teamArray.length : 'not array'})`)
      return
    }
    
    // teamArray[0] is itself an array of objects: [{team_key: ...}, {team_id: ...}, {name: ...}, ...]
    const teamDataArray = teamArray[0]
    if (!Array.isArray(teamDataArray)) {
      // If teamDataArray is not an array, try to use it directly as teamData
      if (teamDataArray && typeof teamDataArray === 'object' && teamDataArray.team_key) {
        // It's already a team data object
        const teamData = teamDataArray
        // Continue with this teamData (skip to validation)
        if (!teamData.team_key) {
          skippedCount++
          console.error(`❌ Team data missing team_key at key "${key}". Extracted data:`, teamData)
          return
        }
        // Extract team_id from team_key if not directly available
        const extractedTeamId = teamData.team_id || teamData.team_key?.split('.')?.[3] || ''
        
        teams.push({
          team_key: teamData.team_key,
          team_id: extractedTeamId,
          name: teamData.name || `Team ${key}`,
          url: teamData.url,
          logo_url: teamData.team_logos?.[0]?.team_logo?.url || teamData.team_logos?.[0]?.url,
          manager_name: teamData.manager_name,
          manager_email: teamData.manager_email,
          wins: teamData.wins || 0,
          losses: teamData.losses || 0,
          ties: teamData.ties || 0,
        })
        
        console.log(`✅ Parsed team (alternative structure): ${teamData.name || `Team ${key}`} (key: ${teamData.team_key})`)
        return
      }
      
      skippedCount++
      console.warn(`⚠️ Skipping team at key "${key}" - teamArray[0] is not an array:`, typeof teamDataArray)
      return
    }
    
    // Extract team data from the array of objects
    let teamData: any = {}
    teamDataArray.forEach((item: any) => {
      if (typeof item === 'object' && item !== null) {
        Object.assign(teamData, item)
      }
    })
    
    // Validate team_key is present
    if (!teamData.team_key) {
      skippedCount++
      console.error(`❌ Team data missing team_key at key "${key}". Extracted data:`, teamData)
      console.error('Full teamDataArray:', JSON.stringify(teamDataArray, null, 2))
      console.error('Full teamArray:', JSON.stringify(teamArray, null, 2).substring(0, 1000))
      return
    }
    
    console.log(`✅ Parsing team ${teams.length + 1}/${teamCount}: ${teamData.name || 'Unknown'} (key: ${teamData.team_key})`)
    
    const managers = teamArray[1]?.managers || {}
    
    // Get manager info (first manager)
    let managerName, managerEmail
    const managerValues = Object.values(managers)
    if (managerValues.length > 0) {
      const managerObj = managerValues[0] as any
      if (managerObj?.manager) {
        const managerData = Array.isArray(managerObj.manager) ? managerObj.manager[0] : managerObj.manager
        managerName = managerData?.nickname
        managerEmail = managerData?.email
      }
    }
    
    // Get standings - check multiple possible locations in Yahoo API response
    let wins = 0, losses = 0, ties = 0
    
    // Log full teamArray structure for first team to understand the data structure
    if (teams.length === 0) {
      console.log(`📊 Full teamArray structure for ${teamData.name}:`)
      console.log(`   teamArray length:`, teamArray.length)
      teamArray.forEach((item, idx) => {
        if (item && typeof item === 'object') {
          const keys = Array.isArray(item) ? `[array with ${item.length} items]` : Object.keys(item).join(', ')
          console.log(`   teamArray[${idx}] keys:`, keys)
          if (idx === 2) {
            console.log(`   teamArray[2] full:`, JSON.stringify(item, null, 2).substring(0, 2000))
          }
        } else {
          console.log(`   teamArray[${idx}] type:`, typeof item, item)
        }
      })
    }
    
    // Try multiple locations for standings data
    // Location 1: teamArray[2].team_standings
    let standings = teamArray[2]?.team_standings
    let outcomeTotals = standings?.outcome_totals
    
    // Location 2: teamArray[2] directly (if it's the standings object)
    if (!standings || (typeof standings === 'object' && Object.keys(standings).length === 0)) {
      standings = teamArray[2]
      outcomeTotals = standings?.outcome_totals
    }
    
    // Location 3: Check if teamArray[2] is an array and standings is inside
    if (Array.isArray(teamArray[2])) {
      const standingsInArray = teamArray[2].find((item: any) => item?.team_standings || item?.outcome_totals)
      if (standingsInArray) {
        standings = standingsInArray.team_standings || standingsInArray
        outcomeTotals = standings?.outcome_totals || standingsInArray.outcome_totals
      }
      // Also check if any item in the array has wins/losses/ties directly
      for (const item of teamArray[2]) {
        if (item && typeof item === 'object' && (item.wins !== undefined || item.losses !== undefined)) {
          wins = parseInt(item.wins || item.win || '0') || 0
          losses = parseInt(item.losses || item.loss || '0') || 0
          ties = parseInt(item.ties || item.tie || '0') || 0
          if (wins > 0 || losses > 0 || ties > 0) {
            console.log(`📊 Found record in teamArray[2] array item: W=${wins}, L=${losses}, T=${ties}`)
            break
          }
        }
      }
    }
    
    // Location 4: Check teamData directly
    if ((wins === 0 && losses === 0 && ties === 0) && (teamData.wins !== undefined || teamData.losses !== undefined)) {
      wins = parseInt(teamData.wins || '0') || 0
      losses = parseInt(teamData.losses || '0') || 0
      ties = parseInt(teamData.ties || '0') || 0
      console.log(`📊 Found record in teamData: W=${wins}, L=${losses}, T=${ties}`)
    }
    
    // Location 5: Check teamArray[1] for standings (sometimes standings are in managers section)
    if ((wins === 0 && losses === 0 && ties === 0) && teamArray[1]) {
      if (teamArray[1].team_standings) {
        standings = teamArray[1].team_standings
        outcomeTotals = standings?.outcome_totals
      }
    }
    
    // Extract from standings structure
    if (standings && typeof standings === 'object' && !Array.isArray(standings)) {
      // Check for nested structure: standings.outcome_totals
      if (standings.outcome_totals) {
        const ot = standings.outcome_totals
        wins = parseInt(ot.wins || ot.win || '0') || 0
        losses = parseInt(ot.losses || ot.loss || '0') || 0
        ties = parseInt(ot.ties || ot.tie || '0') || 0
      } 
      // Check for direct properties: standings.wins, standings.losses, standings.ties
      else if (standings.wins !== undefined || standings.losses !== undefined) {
        wins = parseInt(standings.wins || standings.win || '0') || 0
        losses = parseInt(standings.losses || standings.loss || '0') || 0
        ties = parseInt(standings.ties || standings.tie || '0') || 0
      }
    }
    
    // Fallback to outcomeTotals if found and still no wins
    if (wins === 0 && losses === 0 && ties === 0 && outcomeTotals) {
      wins = parseInt(outcomeTotals.wins || outcomeTotals.win || '0') || 0
      losses = parseInt(outcomeTotals.losses || outcomeTotals.loss || '0') || 0
      ties = parseInt(outcomeTotals.ties || outcomeTotals.tie || '0') || 0
    }
    
    // Log standings extraction for debugging (for first team or if all zeros)
    if (teams.length === 0 || (wins === 0 && losses === 0 && ties === 0)) {
      console.log(`📊 Standings extraction for ${teamData.name}:`)
      console.log(`   teamArray[2] exists:`, !!teamArray[2])
      if (teamArray[2]) {
        console.log(`   teamArray[2] type:`, Array.isArray(teamArray[2]) ? 'array' : typeof teamArray[2])
        console.log(`   teamArray[2] keys:`, typeof teamArray[2] === 'object' && !Array.isArray(teamArray[2]) ? Object.keys(teamArray[2]).join(', ') : 'N/A')
      }
      const standingsStr = standings ? JSON.stringify(standings, null, 2) : 'undefined'
      console.log(`   standings:`, standingsStr.substring(0, 1000))
      const outcomeTotalsStr = outcomeTotals ? JSON.stringify(outcomeTotals, null, 2) : 'undefined'
      console.log(`   outcomeTotals:`, outcomeTotalsStr)
      console.log(`   Final extracted: W=${wins}, L=${losses}, T=${ties}`)
    }
    
    // Extract team_id from team_key if not directly available (format: 465.l.9080.t.1)
    const extractedTeamId = teamData.team_id || teamData.team_key?.split('.')?.[3] || ''
    
    teams.push({
      team_key: teamData.team_key,
      team_id: extractedTeamId,
      name: teamData.name,
      url: teamData.url,
      logo_url: teamData.team_logos?.[0]?.team_logo?.url || teamData.team_logos?.[0]?.url,
      manager_name: managerName,
      manager_email: managerEmail,
      wins,
      losses,
      ties,
    })
    
    console.log(`Parsed team: ${teamData.name} (key: ${teamData.team_key}, id: ${extractedTeamId}, record: ${wins}-${losses}-${ties})`)
  })
  
  console.log(`✅ Parsed ${teams.length} teams from league ${leagueKey}`)
  
  if (skippedCount > 0) {
    console.warn(`⚠️ Skipped ${skippedCount} invalid team object(s) during parsing`)
  }
  
  if (teamCount && teams.length < teamCount) {
    console.error(`❌ TEAM COUNT MISMATCH: Expected ${teamCount} teams but only parsed ${teams.length} teams!`)
    console.error(`   This indicates some teams are being skipped. Check logs above for skipped teams.`)
    const responseStr = response ? JSON.stringify(response, null, 2) : 'undefined'
    console.error(`   Raw response structure (first 3000 chars):`, responseStr.substring(0, 3000))
  }
  
  if (teams.length === 0) {
    const responseStr = response ? JSON.stringify(response, null, 2) : 'undefined'
    console.error('❌ No teams parsed! Raw response structure:', responseStr.substring(0, 2000))
  }
  
  // If any teams have 0-0-0 records, try to fetch standings separately and merge
  const teamsWithZeroRecords = teams.filter(t => t.wins === 0 && t.losses === 0 && t.ties === 0)
  if (teamsWithZeroRecords.length > 0 && teamsWithZeroRecords.length === teams.length) {
    console.log(`⚠️ All ${teams.length} teams have 0-0-0 records. Attempting to fetch standings separately...`)
    try {
      const standingsResponse = await makeApiRequest(`league/${leagueKey}/standings`, accessToken)
      const standingsLeague = standingsResponse.fantasy_content?.league
      if (standingsLeague && Array.isArray(standingsLeague) && standingsLeague.length > 1) {
        const standingsData = standingsLeague[1]?.standings
        if (standingsData) {
          console.log(`📊 Found standings data, merging with teams...`)
          // Parse standings and match by team_key
          const standingsEntries = Object.entries(standingsData)
          standingsEntries.forEach(([key, standingObj]: [string, any]) => {
            if (key === 'count' || typeof standingObj === 'number') return
            
            const standingArray = standingObj?.team_standings || standingObj
            if (!standingArray || !Array.isArray(standingArray)) return
            
            // Extract team_key from standings
            const standingTeamKey = standingArray[0]?.team_key
            if (!standingTeamKey) return
            
            // Find matching team and update record
            const team = teams.find(t => t.team_key === standingTeamKey)
            if (team) {
              // Extract wins, losses, ties from standings
              const outcomeTotals = standingArray[2]?.outcome_totals || standingArray[1]?.outcome_totals
              if (outcomeTotals) {
                team.wins = parseInt(outcomeTotals.wins || outcomeTotals.win || '0') || 0
                team.losses = parseInt(outcomeTotals.losses || outcomeTotals.loss || '0') || 0
                team.ties = parseInt(outcomeTotals.ties || outcomeTotals.tie || '0') || 0
                console.log(`✅ Updated ${team.name} record from standings: ${team.wins}-${team.losses}-${team.ties}`)
              }
            }
          })
        }
      }
    } catch (standingsError: any) {
      console.warn(`⚠️ Failed to fetch standings separately:`, standingsError.message)
    }
  }
  
  return teams
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
  // CRITICAL: This function fetches BOTH roster AND stats
  // It should only be called ONCE per team to avoid duplicate API calls
  console.log(`📊 getTeamRoster called for ${teamKey} - season=${season || 'not specified'}, date=${date || 'not specified'}`)
  
  // Request roster - the roster endpoint returns player info but stats need to be fetched separately
  // First get the roster to get player keys
  const rosterEndpoint = `team/${teamKey}/roster${date ? `;date=${date}` : ''}`
  const params: Record<string, string> | undefined = date ? { date } : undefined
  
  console.log(`📊 Step 1: Fetching roster for ${teamKey}`)
  const response = await makeApiRequest(rosterEndpoint, accessToken, params)
  
  const responseStr = response ? JSON.stringify(response, null, 2) : 'undefined'
  console.log(`Roster response for team ${teamKey}:`, responseStr.substring(0, 2000))
  
  const players: YahooPlayer[] = []
  
  // Parse the nested Yahoo API response structure
  // Structure: fantasy_content.team[0] = team data array, team[1] = roster
  const teamArray = response.fantasy_content?.team
  if (!teamArray || !Array.isArray(teamArray) || teamArray.length < 2) {
    console.log('No roster data found in response')
    return players
  }
  
  // teamArray[1] contains roster data
  // teamArray[1] is also an array, so we need to find the roster data in it
  let roster = {}
  
  // Check if teamArray[1] is an array (nested structure like teams)
  if (Array.isArray(teamArray[1])) {
    // teamArray[1] is an array, find roster in it
    for (const item of teamArray[1]) {
      if (item && typeof item === 'object' && item.roster) {
        roster = item.roster[0]?.players || item.roster?.players || {}
        break
      }
    }
  } else if (teamArray[1]?.roster) {
    // Direct roster property
    roster = teamArray[1].roster[0]?.players || teamArray[1].roster?.players || {}
  }
  
  // Check if roster response includes stats (some endpoints return stats with roster)
  const rosterHasStats = JSON.stringify(roster).includes('player_stats') || JSON.stringify(roster).includes('stats')
  if (rosterHasStats) {
    console.log(`📊 Roster response appears to include stats data`)
  }
  
  // Iterate through players (Yahoo uses string keys like "0", "1", etc.)
  Object.values(roster).forEach((playerObj: any) => {
    // Skip count property if present
    if (typeof playerObj === 'number' || playerObj === 'count') return
    
    if (!playerObj || typeof playerObj !== 'object' || !playerObj.player) return
    
    // player is an array: [0] = array of player data objects, [1] = stats, [2] = ownership, etc.
    const playerArray = playerObj.player
    if (!Array.isArray(playerArray) || playerArray.length < 1) return
    
    // playerArray[0] is itself an array of objects: [{player_key: ...}, {player_id: ...}, {name: ...}, ...]
    const playerDataArray = playerArray[0]
    if (!Array.isArray(playerDataArray)) {
      console.log('Skipping player - playerArray[0] is not an array:', playerArray[0])
      return
    }
    
    // Extract player data from the array of objects
    let playerData: any = {}
    playerDataArray.forEach((item: any) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        Object.assign(playerData, item)
      }
    })
    
    // Validate player_key is present
    if (!playerData.player_key) {
      console.error('Player data missing player_key. Extracted data:', playerData)
      return
    }
    
    // Extract stats and ownership from playerArray
    // NOTE: We'll fetch stats separately via the stats endpoint for better accuracy
    // The roster endpoint stats might be incomplete or from a different season
    // So we'll only extract ownership here, not stats
    let ownership = {}
    
    // Search through all items in playerArray for ownership
    for (let i = 1; i < playerArray.length; i++) {
      const item = playerArray[i]
      
      if (item && typeof item === 'object') {
        // Check for direct ownership
        if (item.ownership) {
          ownership = item.ownership
        }
        
        // Check nested structures
        if (Array.isArray(item)) {
          item.forEach((nestedItem: any) => {
            if (nestedItem && typeof nestedItem === 'object') {
              if (nestedItem.ownership) {
                ownership = nestedItem.ownership
              }
            }
          })
        }
      }
    }
    
    // Don't extract stats from roster - we'll fetch them separately for accuracy
    // This prevents mixing incomplete roster stats with full season stats
    
    // Ensure position is a string, not an object
    let positionStr = ''
    if (typeof playerData.position === 'string') {
      positionStr = playerData.position
    } else if (typeof playerData.primary_position === 'string') {
      positionStr = playerData.primary_position
    } else if (typeof playerData.display_position === 'string') {
      positionStr = playerData.display_position
    } else if (Array.isArray(playerData.eligible_positions) && playerData.eligible_positions.length > 0) {
      positionStr = playerData.eligible_positions[0]
    }
    
    players.push({
      player_key: playerData.player_key,
      player_id: playerData.player_id || playerData.player_key?.split('.')?.[2] || '',
      name: playerData.name || { full: 'Unknown Player', first: '', last: '', ascii_first: '', ascii_last: '' },
      display_position: typeof playerData.display_position === 'string' ? playerData.display_position : 'N/A',
      position_type: typeof playerData.position_type === 'string' ? playerData.position_type : '',
      primary_position: typeof playerData.primary_position === 'string' ? playerData.primary_position : '',
      eligible_positions: Array.isArray(playerData.eligible_positions) ? playerData.eligible_positions : [],
      position: positionStr,
      status: playerData.status,
      status_full: playerData.status_full,
      injury_note: playerData.injury_note,
      headshot: playerData.headshot,
      ownership: (ownership && (ownership as any).ownership_type) ? (ownership as any) : undefined,
      // Don't set player_stats here - we'll fetch them separately via the stats endpoint
      // This ensures we get complete, accurate season stats
      player_stats: undefined,
    })
    
    console.log(`Parsed player: ${playerData.name?.full || playerData.name || 'Unknown'} (key: ${playerData.player_key})`)
  })
  
  console.log(`Parsed ${players.length} players from roster for team ${teamKey}`)
  
  // Now fetch stats for all players in the roster
  // Yahoo API allows fetching stats for multiple players at once
  // CRITICAL: This is the ONLY place stats are fetched for this team
  if (players.length > 0) {
    try {
      const playerKeys = players.map(p => p.player_key).filter(key => key) // Filter out any undefined keys
      console.log(`📊 Step 2: Fetching stats for ${playerKeys.length} players from team ${teamKey}`)
      console.log(`📊 Using season=${season || 'not specified'} - this ensures correct 2025-26 season stats`)
      
      if (playerKeys.length === 0) {
        console.warn(`⚠️ No valid player keys found for team ${teamKey}, skipping stats fetch`)
        return players
      }
      
      // Stat definitions should already be fetched at the start of sync_league
      // But if they're not available, fetch them as a fallback
      const { hasStatDefinitions } = await import('./yahooParser')
      if (!hasStatDefinitions() && season) {
        // Extract game_key from teamKey (format: {game_key}.t.{team_id})
        const teamKeyParts = teamKey.split('.')
        const gameKey = teamKeyParts[0]
        if (gameKey) {
          try {
            const statDefinitions = await getStatDefinitions(accessToken, gameKey)
            if (Object.keys(statDefinitions).length > 0) {
              console.log(`📊 Fallback: Loaded ${Object.keys(statDefinitions).length} stat definitions for team ${teamKey}`)
              // Update the parser's stat definitions cache
              const { setStatDefinitions } = await import('./yahooParser')
              setStatDefinitions(statDefinitions)
            }
          } catch (defError: any) {
            console.warn(`⚠️ Could not fetch stat definitions (fallback):`, defError?.message)
          }
        }
      }
      
      // Yahoo API might have limits on batch size - fetch in chunks if needed (25 players at a time)
      const BATCH_SIZE = 25
      const statsByPlayerKey: Record<string, any> = {}
      
      for (let i = 0; i < playerKeys.length; i += BATCH_SIZE) {
        const batch = playerKeys.slice(i, i + BATCH_SIZE)
        console.log(`📊 Fetching stats batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(playerKeys.length / BATCH_SIZE)} for team ${teamKey} (${batch.length} players)`)
        
        try {
          // Fetch stats for all players
          // Try multiple approaches to get current season stats
          let statsResponse: any = null
          let statsEndpoint: string = ''
          
          // CRITICAL: Only use season-based stats endpoint - date-based stats return wrong coverage types
          // For 2025-26 NHL season, use season=2025
          // Yahoo API format: players;player_keys=.../stats;type=season;season=2025
          if (season) {
            // Use season stats endpoint - this is the ONLY endpoint that returns correct season stats
            // IMPORTANT: Yahoo API requires the season parameter to match the actual season year
            // For 2025-26 NHL season, season=2025
            statsEndpoint = `players;player_keys=${batch.join(',')}/stats;type=season;season=${season}`
            console.log(`📊 Fetching ACTUAL SEASON stats for ${batch.length} players: season=${season}`)
            console.log(`📊 Endpoint: ${statsEndpoint.substring(0, 150)}...`)
            console.log(`📊 CRITICAL: This endpoint should return coverage_type='season' with actual game stats, NOT projected stats`)
            try {
              statsResponse = await makeApiRequest(statsEndpoint, accessToken)
              
              // Validate response has players
              if (!statsResponse?.fantasy_content?.players) {
                throw new Error('Response missing fantasy_content.players')
              }
              
              const playerCount = Object.keys(statsResponse.fantasy_content.players).length
              if (playerCount === 0) {
                throw new Error('No players in stats response')
              }
              
              console.log(`✅ Successfully fetched season stats for ${playerCount} players (season=${season})`)
              
              // CRITICAL: Verify we got season stats, not projected stats
              // Check first player's coverage_type to ensure it's 'season'
              const firstPlayerKey = Object.keys(statsResponse.fantasy_content.players)[0]
              const firstPlayer = statsResponse.fantasy_content.players[firstPlayerKey]
              if (firstPlayer?.player && Array.isArray(firstPlayer.player) && firstPlayer.player[1]) {
                const statsData = firstPlayer.player[1]
                let coverageType = 'unknown'
                if (statsData.player_stats) {
                  if (statsData.player_stats["0"]) {
                    coverageType = statsData.player_stats["0"].coverage_type || 'unknown'
                  } else if (statsData.player_stats.coverage_type) {
                    coverageType = statsData.player_stats.coverage_type
                  }
                } else if (Array.isArray(statsData)) {
                  // Find season stats in array
                  for (const item of statsData) {
                    if (item?.player_stats?.coverage_type === 'season' || item?.coverage_type === 'season') {
                      coverageType = 'season'
                      break
                    }
                  }
                }
                
                if (coverageType !== 'season') {
                  console.error(`❌ CRITICAL ERROR: API returned ${coverageType} stats instead of 'season' stats!`)
                  console.error(`   This means we're getting projected/average stats instead of actual season stats.`)
                  console.error(`   First player coverage_type: ${coverageType}`)
                  console.error(`   Expected: coverage_type='season'`)
                  console.error(`   This will cause incorrect stat values to be displayed!`)
                } else {
                  console.log(`✅ VERIFIED: API returned season stats (coverage_type='season')`)
                }
              }
            } catch (seasonError: any) {
              console.error(`❌ CRITICAL: Failed to fetch season stats (season=${season}):`, seasonError?.message)
              console.error(`   This batch will be skipped. Players will not have stats.`)
              statsResponse = null
            }
          } else {
            // If no season provided, try without season parameter (should return current season)
            // WARNING: This might return projected stats instead of actual stats
            statsEndpoint = `players;player_keys=${batch.join(',')}/stats`
            console.log(`📊 WARNING: No season provided, fetching stats without season parameter`)
            console.log(`📊 WARNING: This may return projected stats instead of actual season stats!`)
            console.log(`📊 Endpoint: ${statsEndpoint.substring(0, 150)}...`)
            try {
              statsResponse = await makeApiRequest(statsEndpoint, accessToken)
              
              // Validate response
              if (!statsResponse?.fantasy_content?.players) {
                throw new Error('Response missing fantasy_content.players')
              }
              
              const playerCount = Object.keys(statsResponse.fantasy_content.players).length
              if (playerCount === 0) {
                throw new Error('No players in stats response')
              }
              
              console.log(`✅ Successfully fetched stats for ${playerCount} players (no season specified)`)
              console.log(`⚠️ WARNING: Cannot verify if these are actual season stats or projected stats`)
            } catch (noSeasonError: any) {
              console.error(`❌ CRITICAL: Failed to fetch stats without season:`, noSeasonError?.message)
              statsResponse = null
            }
          }
          
          // CRITICAL: If we don't have a response, skip this batch (don't use date-based fallback)
          if (!statsResponse || !statsResponse.fantasy_content?.players) {
            console.error(`❌ Failed to fetch stats for batch ${Math.floor(i / BATCH_SIZE) + 1}. Skipping this batch.`)
            console.error(`   Players in this batch will not have stats.`)
            continue // Skip to next batch
          }
          
          // Validate we got a response with players
          if (!statsResponse || !statsResponse.fantasy_content) {
            throw new Error('Invalid stats response structure - missing fantasy_content')
          }
          
          const playersData = statsResponse.fantasy_content.players || {}
          const playerCount = Object.keys(playersData).length
          
          if (playerCount === 0) {
            console.warn(`⚠️ Stats response has no players. Response structure:`, JSON.stringify(statsResponse, null, 2).substring(0, 1000))
            throw new Error('No players found in stats response')
          }
          
          console.log(`✅ Successfully fetched stats response for ${playerCount} players${season ? ` (requested season=${season})` : ' (no season specified)'}`)
          console.log(`📊 IMPORTANT: We will ONLY use stats with coverage_type='season'. All other coverage types will be rejected.`)
          
          // Log response structure for debugging (first batch only)
          if (i === 0) {
            const statsResponseStr = statsResponse ? JSON.stringify(statsResponse, null, 2) : 'undefined'
            console.log(`📊 Stats response structure (first 3000 chars):`, statsResponseStr.substring(0, 3000))
            
            if (playerCount > 0) {
              const playerKeys = Object.keys(playersData)
              const samplePlayer = playersData[playerKeys[0]]
              const samplePlayerStr = samplePlayer ? JSON.stringify(samplePlayer, null, 2) : 'undefined'
              console.log(`📊 Sample player (${playerKeys[0]}) stats structure:`, samplePlayerStr.substring(0, 2000))
              
              // Extract and log coverage info from first player to verify season
              if (samplePlayer?.player && Array.isArray(samplePlayer.player) && samplePlayer.player[1]) {
                const statsData = samplePlayer.player[1]
                if (statsData.player_stats) {
                  const coverageType = statsData.player_stats["0"]?.coverage_type || statsData.player_stats.coverage_type || 'unknown'
                  const coverageValue = statsData.player_stats["0"]?.coverage_value || statsData.player_stats["0"]?.season || statsData.player_stats.coverage_value || 'unknown'
                  console.log(`📊 VERIFICATION: First player coverage_type="${coverageType}", coverage_value=${coverageValue}`)
                  if (coverageType !== 'season' || (coverageValue !== season && season)) {
                    console.warn(`⚠️ WARNING: Stats coverage doesn't match expected! Expected: season=${season}, Got: ${coverageType}=${coverageValue}`)
                  }
                }
              }
            } else {
              const fullResponseStr = statsResponse ? JSON.stringify(statsResponse, null, 2) : 'undefined'
              console.error(`❌ No players found in stats response! Full response:`, fullResponseStr.substring(0, 1000))
            }
          }
          
          // Parse stats response for this batch
          // Import yahooParser module once for this batch
          const yahooParser = await import('./yahooParser')
          
          Object.values(playersData).forEach((playerObj: any) => {
        if (!playerObj || typeof playerObj !== 'object') return
        
        // Handle different structures
        let playerArray = null
        if (playerObj.player) {
          playerArray = playerObj.player
        } else if (Array.isArray(playerObj)) {
          playerArray = playerObj
        }
        
        if (!Array.isArray(playerArray) || playerArray.length < 2) return
        
        // Extract player key from playerArray[0]
        let playerKey = null
        const playerDataArray = playerArray[0]
        if (Array.isArray(playerDataArray)) {
          playerDataArray.forEach((item: any) => {
            if (item?.player_key) {
              playerKey = item.player_key
            }
          })
        } else if (playerDataArray?.player_key) {
          playerKey = playerDataArray.player_key
        }
        
        if (!playerKey) return
        
        // Extract stats from playerArray[1]
        // playerArray[1] can be an array or object containing stats
        const statsData = playerArray[1]
        let playerStats = null
        
        // Only log first player's structure to avoid spam
        const isFirstPlayer = Object.keys(statsByPlayerKey).length === 0
        if (isFirstPlayer) {
          console.log(`🔍 Extracting stats for player ${playerKey}, playerArray[1] type:`, Array.isArray(statsData) ? 'array' : typeof statsData)
          const statsDataStr = statsData ? JSON.stringify(statsData, null, 2) : 'undefined'
          console.log(`   playerArray[1] structure:`, statsDataStr.substring(0, 500))
        }
        
        // Stats structure can vary - handle different formats
        // playerArray[1] is often itself an array: [{player_stats: {...}}]
        // IMPORTANT: Yahoo may return multiple stat sets (season, projected, average, etc.)
        // We need to find the "season" coverage type for actual season stats
        if (Array.isArray(statsData)) {
          // Find the stats object in the array - prefer season stats
          let seasonStats = null
          let otherStats = null
          
          // Log all coverage types found for debugging
          const foundCoverageTypes: string[] = []
          
          for (const item of statsData) {
            if (!item || typeof item !== 'object') continue
            
            let itemStats = null
            let itemCoverageType = null
            
            if (item.player_stats) {
              itemStats = item.player_stats
              // Check nested structure first (coverage_type might be in player_stats["0"])
              if (item.player_stats["0"] && item.player_stats["0"].coverage_type) {
                itemCoverageType = item.player_stats["0"].coverage_type
              } else if (item.player_stats.coverage_type) {
                itemCoverageType = item.player_stats.coverage_type
              } else {
                itemCoverageType = 'unknown'
              }
            } else if (item.stats && Array.isArray(item.stats)) {
              itemStats = {
                coverage_type: item.coverage_type || 'unknown',
                coverage_value: item.coverage_value || 2025,
                stats: item.stats
              }
              itemCoverageType = item.coverage_type || 'unknown'
            }
            
            if (itemStats && itemCoverageType) {
              foundCoverageTypes.push(itemCoverageType)
              
              // CRITICAL: Only use season stats, reject all others
              if (itemCoverageType === 'season') {
                seasonStats = itemStats
                console.log(`✅ Found SEASON stats in array for ${playerKey}: ${itemStats.stats?.length || 0} stats`)
                break // Found season stats, use this
              } else {
                console.log(`⚠️ Skipping ${itemCoverageType || 'unknown'} stats for ${playerKey} - only using season stats`)
              }
            }
          }
          
          // Log all coverage types found for this player
          if (foundCoverageTypes.length > 0 && isFirstPlayer) {
            console.log(`📊 All coverage types found for ${playerKey}: ${foundCoverageTypes.join(', ')}`)
            if (!foundCoverageTypes.includes('season')) {
              console.error(`❌ CRITICAL: No 'season' coverage type found! Only found: ${foundCoverageTypes.join(', ')}`)
              console.error(`   This means we're getting projected/average stats instead of actual season stats!`)
            }
          }
          
          // CRITICAL: Only use season stats, reject all others
          if (!seasonStats) {
            console.warn(`❌ WARNING: No season stats found for player ${playerKey}! Only found other coverage types.`)
            console.warn(`   This player will not have stats. Check if season parameter is correct.`)
          }
          playerStats = seasonStats // Only use season stats, no fallback
        } else if (statsData && typeof statsData === 'object') {
          // statsData is an object
          if (statsData.player_stats) {
            // Handle nested structure: player_stats["0"] contains coverage info, player_stats.stats contains the stats array
            const playerStatsObj = statsData.player_stats
            let coverageType = 'unknown'
            let coverageValue: number | string = 2025
            let statsArray: Array<{ stat_id: string; value: string | number }> = []
            
            // Check if coverage info is in a numeric key like "0"
            if (playerStatsObj["0"]) {
              // Only use explicit coverage_type, don't infer from season property
              coverageType = playerStatsObj["0"].coverage_type || 'unknown'
              coverageValue = playerStatsObj["0"].coverage_value || playerStatsObj["0"].season || 2025
            } else if (playerStatsObj.coverage_type) {
              // Direct coverage_type in player_stats
              coverageType = playerStatsObj.coverage_type
              coverageValue = playerStatsObj.coverage_value || 2025
            }
            
            // CRITICAL: Only use season stats, reject all others (projected, average, etc.)
            if (coverageType !== 'season') {
              console.warn(`⚠️ REJECTING ${coverageType} stats for ${playerKey} - only using season stats`)
              console.warn(`   This prevents projected/average stats from being used instead of actual game stats`)
              playerStats = null
            } else {
              // Verify coverage_value matches requested season
              if (season && coverageValue !== season && String(coverageValue) !== String(season)) {
                console.warn(`⚠️ WARNING: Player ${playerKey} season stats have coverage_value=${coverageValue}, but requested season=${season}`)
                console.warn(`   Using stats anyway, but they may be from wrong season`)
              }
              
              // Extract stats array - check multiple possible locations
              if (playerStatsObj.stats && Array.isArray(playerStatsObj.stats)) {
                statsArray = playerStatsObj.stats
              } else if (playerStatsObj["1"] && Array.isArray(playerStatsObj["1"])) {
                // Stats might be in player_stats["1"]
                statsArray = playerStatsObj["1"]
              } else {
                // Try to find stats array in any numeric key
                for (const key of Object.keys(playerStatsObj)) {
                  if (key !== "0" && !isNaN(Number(key)) && Array.isArray(playerStatsObj[key])) {
                    statsArray = playerStatsObj[key]
                    console.log(`📊 Found stats array in player_stats["${key}"] for ${playerKey}`)
                    break
                  }
                }
              }
              
              // Build the playerStats object
              if (statsArray.length > 0) {
                playerStats = {
                  coverage_type: coverageType,
                  coverage_value: coverageValue,
                  stats: statsArray
                }
                console.log(`✅ Found SEASON player_stats in object for ${playerKey}: coverage_type="${coverageType}", coverage_value=${coverageValue}, ${statsArray.length} stats`)
                
                // Log ALL stat values for verification (helps catch wrong stat_id mappings)
                // This is critical for debugging stat_id mapping issues
                if (Object.keys(statsByPlayerKey).length === 0) {
                  const allStats = statsArray.map(s => {
                    const statId = s.stat_id || (s as any).stat?.stat_id
                    const statValue = s.value || (s as any).stat?.value
                    return `stat_id ${statId}=${statValue}`
                  }).join(', ')
                  console.log(`📊 ALL stat values from API (${statsArray.length} stats): ${allStats}`)
                  console.log(`📊 VERIFY: Compare these with Yahoo website to ensure stat_id mappings are correct`)
                  
                  // Also log with stat definitions if available
                  if (yahooParser.hasStatDefinitions()) {
                    const statDefs = yahooParser.getStatDefinitionsCache()
                    const statsWithNames = statsArray.map(s => {
                      const statId = s.stat_id || (s as any).stat?.stat_id
                      const statValue = s.value || (s as any).stat?.value
                      const statName = statDefs[statId] || 'unknown'
                      return `stat_id ${statId} (${statName})=${statValue}`
                    }).join(', ')
                    console.log(`📊 Stats with names from definitions: ${statsWithNames}`)
                  } else {
                    console.warn(`⚠️ Stat definitions not available - cannot show stat names. This may cause incorrect stat_id mappings.`)
                  }
                  
                  // Special logging for Celebrini to help identify stat_id mappings
                  // Expected values: G:14, A:20, P:34, +/-:3, PIM:12, PPP:12, SHP:0, GWG:3, SOG:70, FW:181, HIT:14, BLK:16
                  const playerName = playerDataArray.find((item: any) => item?.name?.full || item?.name)?.name?.full || 
                                     playerDataArray.find((item: any) => item?.name?.full || item?.name)?.name ||
                                     'Unknown'
                  if (typeof playerName === 'string' && playerName.toLowerCase().includes('celebrini')) {
                    console.log(`🎯 CELEBRINI STAT_ID MAPPING ANALYSIS:`)
                    console.log(`   Expected: G:14, A:20, P:34, +/-:3, PIM:12, PPP:12, SHP:0, GWG:3, SOG:70, FW:181, HIT:14, BLK:16`)
                    console.log(`   Looking for stat_ids with these values:`)
                    const expectedValues: Record<string, number> = { 'G': 14, 'A': 20, 'P': 34, '+/-': 3, 'PIM': 12, 'PPP': 12, 'SHP': 0, 'GWG': 3, 'SOG': 70, 'FW': 181, 'HIT': 14, 'BLK': 16 }
                    statsArray.forEach(s => {
                      const statId = s.stat_id || (s as any).stat?.stat_id
                      const statValue = typeof s.value === 'string' ? parseFloat(s.value) || 0 : (s.value || 0)
                      const statName = yahooParser.hasStatDefinitions() ? yahooParser.getStatDefinitionsCache()[statId] || 'unknown' : 'unknown'
                      
                      // Find which expected stat this might be
                      const matchingStat = Object.entries(expectedValues).find(([_, val]) => val === statValue)
                      if (matchingStat) {
                        console.log(`   ✅ stat_id ${statId} (${statName})=${statValue} → MATCHES ${matchingStat[0]}`)
                      } else {
                        console.log(`   📊 stat_id ${statId} (${statName})=${statValue}`)
                      }
                    })
                  }
                }
              } else {
                console.warn(`⚠️ Player ${playerKey} has season stats but stats array is empty`)
                playerStats = null
              }
            }
          } else if (statsData.stats && Array.isArray(statsData.stats)) {
            const coverageType = statsData.coverage_type || 'unknown'
            
            // CRITICAL: Only use season stats, reject all others (projected, average, etc.)
            if (coverageType !== 'season') {
              console.warn(`⚠️ REJECTING ${coverageType} stats for ${playerKey} - only using season stats`)
              console.warn(`   This prevents projected/average stats from being used instead of actual game stats`)
              playerStats = null
            } else {
              // Verify coverage_value matches requested season
              if (season && statsData.coverage_value !== season && String(statsData.coverage_value) !== String(season)) {
                console.warn(`⚠️ WARNING: Player ${playerKey} season stats have coverage_value=${statsData.coverage_value}, but requested season=${season}`)
                console.warn(`   Using stats anyway, but they may be from wrong season`)
              }
              
              playerStats = {
                coverage_type: coverageType,
                coverage_value: statsData.coverage_value || 2025,
                stats: statsData.stats
              }
              console.log(`✅ Found SEASON stats array in object for ${playerKey}: ${statsData.stats.length} stats, coverage_type="${coverageType}"`)
              
              // Log first few stat values for verification (helps catch wrong stat_id mappings)
              if (statsData.stats.length > 0 && Object.keys(statsByPlayerKey).length === 0) {
                const firstStats = statsData.stats.slice(0, 5).map((s: { stat_id?: string; value?: string | number; stat?: { stat_id?: string; value?: string | number } }) => {
                  const statId = s.stat_id || s.stat?.stat_id
                  const statValue = s.value || s.stat?.value
                  return `stat_id ${statId}=${statValue}`
                }).join(', ')
                console.log(`📊 First 5 stat values from API: ${firstStats}`)
                console.log(`📊 VERIFY: Compare these with Yahoo website to ensure stat_id mappings are correct`)
              }
            }
          }
        }
        
        if (playerStats) {
          // Ensure stats is in the format expected by parsePlayerStats
          if (!playerStats.stats && !Array.isArray(playerStats)) {
            const playerStatsStr = playerStats ? JSON.stringify(playerStats) : 'undefined'
            console.warn(`Player ${playerKey} stats format unexpected:`, playerStatsStr.substring(0, 300))
          } else {
            // Extract coverage info
            const coverageType = playerStats.coverage_type || (typeof playerStats === 'object' && !Array.isArray(playerStats) ? 'unknown' : 'array')
            const coverageValue = playerStats.coverage_value || 'unknown'
            
            // Log coverage for first player
            if (Object.keys(statsByPlayerKey).length === 0) {
              console.log(`📊 First player stats coverage: type="${coverageType}", value=${coverageValue}`)
              if (playerStats.stats && Array.isArray(playerStats.stats) && playerStats.stats.length > 0) {
                console.log(`📊 Sample stat entries (first 3):`, JSON.stringify(playerStats.stats.slice(0, 3), null, 2))
              }
            }
            
            statsByPlayerKey[playerKey] = playerStats
            const statCount = playerStats.stats?.length || (Array.isArray(playerStats) ? playerStats.length : 0)
            console.log(`✅ Found stats for ${playerKey}: ${statCount} stat entries (coverage: ${coverageType})`)
          }
        } else {
          console.warn(`❌ No stats found in statsData for player ${playerKey}. playerArray[1] type: ${Array.isArray(statsData) ? 'array' : typeof statsData}`)
        }
          }) // End forEach for this batch
          
        } catch (batchError: any) {
          console.error(`❌ Error fetching stats batch ${Math.floor(i / BATCH_SIZE) + 1} for team ${teamKey}:`, batchError.message)
          // Continue with next batch even if one fails
        }
      } // End batch loop
      
      // Attach stats to players - this happens BEFORE players are parsed
      // so value calculation can use the stats
      players.forEach(player => {
        if (statsByPlayerKey[player.player_key]) {
          const statsData = statsByPlayerKey[player.player_key]
          
          // Extract stats array - handle different formats
          let statsArray: Array<{ stat_id: string; value: string | number }> = []
          if (Array.isArray(statsData)) {
            statsArray = statsData
          } else if (statsData.stats && Array.isArray(statsData.stats)) {
            statsArray = statsData.stats
          } else if (statsData && typeof statsData === 'object') {
            // Try to find stats in nested structure
            const keys = Object.keys(statsData)
            for (const key of keys) {
              if (key === 'stats' && Array.isArray(statsData[key])) {
                statsArray = statsData[key]
                break
              }
            }
          }
          
          // Ensure stats is in the correct format expected by parsePlayerStats
          if (statsArray.length > 0) {
            // Extract coverage info - statsData is the playerStats object we built earlier
            // It should have coverage_type and coverage_value as direct properties
            let coverageType = 'unknown'
            let coverageValue: number | string = 'unknown'
            
            // statsData is the playerStats object we built, which has coverage_type directly
            if (statsData && typeof statsData === 'object') {
              coverageType = statsData.coverage_type || 'unknown'
              coverageValue = statsData.coverage_value || 'unknown'
            }
            
            // CRITICAL: Only use season stats, reject projected/average stats
            if (coverageType !== 'season') {
              console.warn(`⚠️ WARNING: Player ${player.name?.full || player.name} has ${coverageType} stats, not season stats! Skipping these stats.`)
              console.warn(`   Coverage: ${coverageType}, Value: ${coverageValue}`)
              console.warn(`   This player will not have stats attached. Please check API endpoint.`)
              // Don't attach non-season stats
              return
            }
            
            // Log coverage info for first few players to verify we're getting season stats
            if (Object.keys(statsByPlayerKey).length <= 2) {
              console.log(`📊 Player ${player.name?.full || player.name}: coverage_type="${coverageType}", coverage_value=${coverageValue}, stats count=${statsArray.length}`)
              if (statsArray.length > 0) {
                console.log(`📊 Sample stat: stat_id=${statsArray[0].stat_id}, value=${statsArray[0].value}`)
                // Log first 5 stats to see what we're getting
                const firstFive = statsArray.slice(0, 5).map(s => `stat_id ${s.stat_id}=${s.value}`).join(', ')
                console.log(`📊 First 5 stats from API: ${firstFive}`)
              }
            }
            
            player.player_stats = {
              coverage_type: coverageType,
              coverage_value: typeof coverageValue === 'number' ? coverageValue : (typeof coverageValue === 'string' ? parseInt(coverageValue) || 2025 : 2025),
              stats: statsArray
            }
            
            // Special logging for goalies
            const isGoalie = player.display_position === 'G' || player.position === 'G'
            if (isGoalie) {
              const goalieStatIds = statsArray.map(s => {
                const statId = s.stat_id || (s as any).stat?.stat_id
                const statValue = s.value || (s as any).stat?.value
                return `stat_id ${statId}=${statValue}`
              }).join(', ')
              console.log(`🎯 GOALIE STATS: ${player.name?.full || player.name} | ${goalieStatIds}`)
            }
            
            console.log(`✅ Attached ${statsArray.length} SEASON stats to ${player.name?.full || player.name} (coverage: ${coverageType}, value: ${coverageValue})`)
          } else {
            const statsDataStr = statsData ? JSON.stringify(statsData) : 'undefined'
            console.warn(`⚠️ Stats found for ${player.name?.full || player.name} but stats array is empty:`, statsDataStr.substring(0, 200))
          }
        } else {
          console.warn(`❌ No SEASON stats found for player ${player.name?.full || player.name} (${player.player_key})`)
          console.warn(`   This player will appear without stats. Check API logs to see what coverage types were returned.`)
        }
      })
      
      const statsAttached = Object.keys(statsByPlayerKey).length
      console.log(`✅ Successfully fetched and attached stats for ${statsAttached} out of ${players.length} players from team ${teamKey}`)
      
      if (statsAttached < players.length) {
        const missingStats = players
          .filter(p => !statsByPlayerKey[p.player_key])
          .map(p => p.name?.full || p.name || p.player_key)
        console.warn(`⚠️ Missing stats for ${players.length - statsAttached} player(s) on team ${teamKey}:`, missingStats.join(', '))
      }
    } catch (statsError: any) {
      console.error(`❌ CRITICAL ERROR fetching stats for team ${teamKey}:`, statsError.message)
      console.error(`   Stack:`, statsError.stack)
      // Continue without stats if there's an error - but log it clearly
      console.warn(`⚠️ Team ${teamKey} will have players without stats due to fetch error`)
    }
  } else {
    console.warn(`⚠️ No players found for team ${teamKey}, skipping stats fetch`)
  }
  
  return players
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

