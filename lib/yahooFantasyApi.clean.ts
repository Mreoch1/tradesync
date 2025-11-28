/**
 * Yahoo Fantasy Sports API Client - Clean Implementation
 * 
 * This is a clean, best-practices implementation of the Yahoo Fantasy Sports API client.
 * It properly handles team data, roster fetching, and player stats with correct coverage types.
 */

import { YahooOAuthTokens, YahooLeague, YahooTeam, YahooPlayer, YahooStat } from './yahooFantasyApi'

const YAHOO_API_BASE = 'https://fantasysports.yahooapis.com/fantasy/v2'

/**
 * Make a request to Yahoo Fantasy Sports API
 */
async function makeApiRequest(
  endpoint: string,
  accessToken: string,
  params?: Record<string, string>
): Promise<any> {
  const url = new URL(`${YAHOO_API_BASE}/${endpoint}`)
  url.searchParams.set('format', 'json')
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Yahoo API error: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`)
  }

  const responseText = await response.text()
  
  if (responseText.trim().startsWith('<?xml')) {
    throw new Error('Yahoo API returned XML instead of JSON')
  }

  return JSON.parse(responseText)
}

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

/**
 * Get league teams with standings
 */
export async function getLeagueTeams(accessToken: string, leagueKey: string): Promise<YahooTeam[]> {
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
 * Get team roster
 */
export async function getTeamRoster(
  accessToken: string,
  teamKey: string,
  season?: string
): Promise<YahooPlayer[]> {
  console.log(`📊 Fetching roster for ${teamKey}${season ? ` (season=${season})` : ''}`)
  
  // Fetch roster
  const rosterResponse = await makeApiRequest(`team/${teamKey}/roster`, accessToken)
  
  const team = rosterResponse.fantasy_content?.team
  if (!Array.isArray(team) || team.length < 2) {
    throw new Error('Invalid roster response structure')
  }

  const roster = team[1]?.roster
  if (!roster || !Array.isArray(roster)) {
    throw new Error('No roster data in response')
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
    await fetchPlayerStats(accessToken, players, season)
  }

  return players
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
        console.warn(`⚠️ No stats data in response for batch ${i / BATCH_SIZE + 1}`)
        continue
      }

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

          console.log(`✅ Attached stats to ${player.name?.full || playerKey} (${seasonStats.stats.length} stats)`)
        } else {
          console.warn(`⚠️ No season stats found for player ${playerKey}`)
        }
      })
    } catch (error: any) {
      console.error(`❌ Failed to fetch stats for batch ${i / BATCH_SIZE + 1}:`, error.message)
    }
  }
}

/**
 * Get stat definitions for a game
 */
export async function getStatDefinitions(accessToken: string, gameKey: string): Promise<Record<string, string>> {
  const response = await makeApiRequest(`game/${gameKey}/stat_categories`, accessToken)
  const statCategories = response.fantasy_content?.game?.[1]?.stat_categories?.stats
  
  if (!statCategories || !Array.isArray(statCategories)) {
    return {}
  }
  
  const statMap: Record<string, string> = {}
  statCategories.forEach((stat: any) => {
    if (stat?.stat) {
      const statData = Array.isArray(stat.stat) ? stat.stat[0] : stat.stat
      if (statData?.stat_id && statData?.name) {
        statMap[statData.stat_id] = statData.name
      }
    }
  })
  
  console.log(`📊 Loaded ${Object.keys(statMap).length} stat definitions`)
  return statMap
}

