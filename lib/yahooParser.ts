/**
 * Yahoo Fantasy Sports Data Parser
 * 
 * Converts Yahoo Fantasy Sports API responses into our internal Team and Player format
 */

import { Team } from '@/types/teams'
import { Player, PlayerStats } from '@/types'
import { YahooTeam, YahooPlayer } from './yahooFantasyApi'

/**
 * Convert Yahoo team status to our status format
 */
function parsePlayerStatus(yahooStatus?: string, injuryNote?: string): 'healthy' | 'DTD' | 'IR' | 'IR-LT' | 'OUT' {
  if (!yahooStatus) return 'healthy'
  
  const status = yahooStatus.toLowerCase()
  if (status.includes('ir+') || status.includes('ir-')) return 'IR'
  if (status.includes('ir')) return 'IR-LT'
  if (status.includes('day-to-day') || status.includes('dtd')) return 'DTD'
  if (status.includes('out') || status.includes('suspended')) return 'OUT'
  if (injuryNote) return 'DTD'
  
  return 'healthy'
}

/**
 * Convert Yahoo position format to our format
 */
function parsePosition(displayPosition: string | undefined, eligiblePositions?: string[]): string {
  // Ensure displayPosition is a string
  const displayPos = typeof displayPosition === 'string' ? displayPosition : String(displayPosition || 'N/A')
  
  // If we have eligible positions, use those (comma-separated if multiple)
  if (eligiblePositions && Array.isArray(eligiblePositions) && eligiblePositions.length > 0) {
    // Filter out any non-string values and join
    const validPositions = eligiblePositions.filter(p => typeof p === 'string' && p.trim())
    if (validPositions.length > 1) {
      return validPositions.join(',')
    } else if (validPositions.length === 1) {
      return validPositions[0]
    }
  }
  
  // Fallback to display position or 'N/A'
  return displayPos && displayPos !== 'N/A' ? displayPos : (eligiblePositions?.[0] || 'N/A')
}

/**
 * Extract team abbreviation from Yahoo player data
 */
function parseTeamAbbr(player: YahooPlayer): string {
  return player.editorial_team_abbr || player.editorial_team_key?.split('.')?.[1]?.toUpperCase() || 'N/A'
}

/**
 * Parse Yahoo player stats into our PlayerStats format
 * Yahoo stats are returned with stat_id keys, we need to map them to our format
 * This maps all stats shown in Yahoo Fantasy Hockey (2025/2026 season)
 */
/**
 * Parse player stats with player name for better logging
 */
// Global cache for stat definitions (stat_id -> stat_name)
// This is populated from Yahoo API and used to correctly map goalie stats
let statDefinitionsCache: Record<string, string> = {}
let statNameToIdCache: Record<string, string> = {} // Reverse lookup: stat_name -> stat_id

/**
 * Set stat definitions cache (called from getTeamRoster)
 */
export function setStatDefinitions(definitions: Record<string, string>) {
  statDefinitionsCache = definitions
  // Create reverse lookup for easier mapping
  statNameToIdCache = {}
  Object.entries(definitions).forEach(([statId, statName]) => {
    statNameToIdCache[statName.toLowerCase()] = statId
  })
  console.log(`📊 Updated stat definitions cache: ${Object.keys(definitions).length} stat_ids, ${Object.keys(statNameToIdCache).length} stat names`)
}

function parsePlayerStatsWithName(
  yahooStats?: { stats?: Array<{ stat_id: string; value: string | number }>; coverage_type?: string; coverage_value?: number },
  playerPosition?: string,
  playerName?: string
): PlayerStats | undefined {
  return parsePlayerStats(yahooStats, playerPosition, playerName)
}

function parsePlayerStats(
  yahooStats?: { stats?: Array<{ stat_id: string; value: string | number }>; coverage_type?: string; coverage_value?: number },
  playerPosition?: string,
  playerName?: string
): PlayerStats | undefined {
  if (!yahooStats) {
    console.error('❌ parsePlayerStats ERROR: no yahooStats provided')
    return undefined
  }

  // Handle different stat structures - stats can be in stats array or directly in the object
  let statsArray: Array<{ stat_id: string; value: string | number }> = []
  
  if (yahooStats.stats && Array.isArray(yahooStats.stats)) {
    statsArray = yahooStats.stats
    console.log(`✅ parsePlayerStats: found ${statsArray.length} stats in yahooStats.stats array`)
  } else if (Array.isArray(yahooStats)) {
    // Sometimes stats is the array itself
    statsArray = yahooStats as any
    console.log(`✅ parsePlayerStats: yahooStats is array with ${statsArray.length} items`)
  } else {
    console.error('❌ parsePlayerStats ERROR: stats structure not recognized')
    console.error('   Available keys:', Object.keys(yahooStats))
    console.error('   Full structure:', JSON.stringify(yahooStats, null, 2).substring(0, 500))
    return undefined
  }

  if (statsArray.length === 0) {
    console.error('❌ parsePlayerStats ERROR: stats array is empty')
    console.error('   Input was:', JSON.stringify(yahooStats, null, 2).substring(0, 300))
    return undefined
  }

  const statsMap: Record<string, number> = {}
  statsArray.forEach((stat) => {
    // Handle nested stat structure: {"stat": {"stat_id": "0", "value": "14"}}
    let statId: string | undefined
    let statValue: string | number | undefined
    
    // Handle nested structure: {"stat": {"stat_id": "0", "value": "14"}}
    if (stat && typeof stat === 'object' && 'stat' in stat && (stat as any).stat) {
      const nestedStat = (stat as any).stat
      statId = nestedStat?.stat_id
      statValue = nestedStat?.value
    } else if (stat && typeof stat === 'object' && 'stat_id' in stat) {
      // Flat structure: stat.stat_id and stat.value
      statId = (stat as any).stat_id
      statValue = (stat as any).value
    }
    
    if (statId !== undefined && statId !== null && statValue !== undefined) {
      let value = typeof statValue === 'string' ? parseFloat(statValue) || 0 : statValue
      
      // Ensure non-negative values for certain stats that should never be negative
      // PIM (stat_id 4), Goals (0), Assists (1), etc. should be >= 0
      const nonNegativeStatIds = ['0', '1', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '17', '18', '20']
      if (nonNegativeStatIds.includes(String(statId)) && value < 0) {
        console.warn(`⚠️ parsePlayerStats: Negative value ${value} for stat_id ${statId}, setting to 0`)
        value = 0
      }
      
      statsMap[String(statId)] = value
    } else {
      console.warn('⚠️ parsePlayerStats: skipping invalid stat entry:', JSON.stringify(stat).substring(0, 100))
    }
  })

  console.log(`📊 parsePlayerStats: extracted ${Object.keys(statsMap).length} stat IDs:`, Object.keys(statsMap).join(', '))
  
  // Log ALL stat values for debugging - this is critical to verify stat_id mappings
  if (Object.keys(statsMap).length > 0) {
    const allStats = Object.keys(statsMap)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map(id => `stat_id ${id}=${statsMap[id]}`)
      .join(', ')
    console.log(`📊 ALL stat values from API: ${allStats}`)
    console.log(`📊 This will help verify if stat_id mappings are correct`)
    
    // CRITICAL: Log a searchable format to find Celebrini or other specific players
    if (playerName) {
      console.log(`📊 PLAYER_STATS_SEARCHABLE: ${playerName} | ${allStats}`)
      // Special logging for Celebrini to help debug
      if (playerName.toLowerCase().includes('celebrini')) {
        console.log(`🎯 CELEBRINI DEBUG: Looking for G:14, A:20, SOG:70, FW:181, HIT:14, BLK:16`)
        console.log(`   Current stat_id values: 0=${statsMap['0']}, 1=${statsMap['1']}, 8=${statsMap['8']}, 9=${statsMap['9']}, 10=${statsMap['10']}, 11=${statsMap['11']}`)
        console.log(`   Unknown stat_ids: 29=${statsMap['29']}, 31=${statsMap['31']}, 32=${statsMap['32']}, 33=${statsMap['33']}, 34=${statsMap['34']}`)
        console.log(`   Need to find which stat_id has: G=14, A=20, SOG=70, FW=181, HIT=14, BLK=16`)
      }
    }
    
    // Also log the raw stats array for first stat to see structure
    if (statsArray.length > 0) {
      console.log(`📊 Raw first stat entry:`, JSON.stringify(statsArray[0], null, 2))
    }
  }

  // Yahoo Fantasy Hockey stat IDs for 2025/2026 season
  // Mapping all stats shown in Yahoo Fantasy Hockey interface
  // IMPORTANT: Verify these IDs match Yahoo's current stat ID mapping
  const stats: PlayerStats = {}

  // Check if this is a goalie - PRIORITIZE position over stat presence
  // Position check is more reliable than stat presence (some players might have mixed stats)
  const positionIsGoalie = playerPosition && (playerPosition === 'G' || playerPosition.includes('G'))
  const hasGoalieStats = statsMap['12'] !== undefined || statsMap['13'] !== undefined || statsMap['17'] !== undefined || statsMap['18'] !== undefined
  const hasSkaterStats = statsMap['0'] !== undefined || statsMap['1'] !== undefined || statsMap['8'] !== undefined
  
  // Determine if goalie: position is primary indicator, stat presence is fallback
  // If position says goalie OR (no position but has goalie stats and no skater stats), treat as goalie
  const isGoalie = positionIsGoalie || (!playerPosition && hasGoalieStats && !hasSkaterStats)
  
  if (positionIsGoalie && hasSkaterStats && !hasGoalieStats) {
    console.warn(`⚠️ Player position is G but stats suggest skater. Using position (G) and ignoring skater stats.`)
  } else if (!positionIsGoalie && hasGoalieStats && !hasSkaterStats) {
    console.warn(`⚠️ Player position is not G but stats suggest goalie. Using stat-based detection (goalie).`)
  }
  
  if (isGoalie) {
    // Goaltender stats - use stat definitions if available, otherwise fallback to hardcoded mappings
    // First, try to use stat definitions to find stat_ids by name
    const useStatDefinitions = Object.keys(statNameToIdCache).length > 0
    
    if (playerName && useStatDefinitions) {
      const allGoalieStats = Object.keys(statsMap)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(id => {
          const statName = statDefinitionsCache[id] || 'unknown'
          return `stat_id ${id} (${statName})=${statsMap[id]}`
        })
        .join(', ')
      console.log(`🎯 GOALIE WITH DEFINITIONS: ${playerName} | ${allGoalieStats}`)
    } else if (playerName) {
      const allGoalieStats = Object.keys(statsMap)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(id => `stat_id ${id}=${statsMap[id]}`)
        .join(', ')
      console.log(`🎯 GOALIE DEBUG: ${playerName} | ${allGoalieStats}`)
    }
    
    // Helper function to find stat_id by name using stat definitions
    const findStatIdByName = (statNames: string[]): string | undefined => {
      if (!useStatDefinitions) return undefined
      for (const name of statNames) {
        const statId = statNameToIdCache[name.toLowerCase()]
        if (statId && statsMap[statId] !== undefined) {
          return statId
        }
      }
      return undefined
    }
    
    // Games Started (GS) - try stat definitions first, then fallback to multiple possible stat_ids
    const gsStatId = findStatIdByName(['games started', 'gs', 'games'])
    if (gsStatId) {
      stats.gs = statsMap[gsStatId]
    } else if (statsMap['12'] !== undefined) {
      stats.gs = statsMap['12']
    } else if (statsMap['27'] !== undefined) {
      stats.gs = statsMap['27']
    } else if (statsMap['0'] !== undefined) {
      stats.gs = statsMap['0']
    } else {
      // Try to find any stat_id that might be GS by checking all available stat_ids
      // This is a fallback if stat definitions aren't available
      console.warn(`⚠️ GOALIE GS: Could not find Games Started stat for ${playerName || 'unknown'}. Available stat_ids: ${Object.keys(statsMap).join(', ')}`)
    }
    
    // Wins (W) - try stat definitions first, then fallback
    const winsStatId = findStatIdByName(['wins', 'w'])
    if (winsStatId) {
      stats.wins = statsMap[winsStatId]
    } else if (statsMap['13'] !== undefined) {
      stats.wins = statsMap['13']
    }
    
    // Losses (L) - try stat definitions first, then fallback
    const lossesStatId = findStatIdByName(['losses', 'l'])
    if (lossesStatId) {
      stats.losses = statsMap[lossesStatId]
    } else if (statsMap['14'] !== undefined) {
      stats.losses = statsMap['14']
    }
    
    // Goals Against (GA) - try stat definitions first, then fallback
    const gaStatId = findStatIdByName(['goals against', 'ga'])
    if (gaStatId) {
      stats.ga = statsMap[gaStatId]
    } else if (statsMap['15'] !== undefined) {
      stats.ga = statsMap['15']
    } else if (statsMap['22'] !== undefined) {
      stats.ga = statsMap['22']
    }
    
    // Goals Against Average (GAA) - try stat definitions first, then fallback
    const gaaStatId = findStatIdByName(['goals against average', 'gaa', 'goals against avg'])
    if (gaaStatId) {
      stats.gaa = statsMap[gaaStatId]
    } else if (statsMap['16'] !== undefined) {
      stats.gaa = statsMap['16']
    } else if (statsMap['23'] !== undefined) {
      stats.gaa = statsMap['23']
    }
    
    // Saves (SV) - try stat definitions first, then fallback
    const svStatId = findStatIdByName(['saves', 'sv', 'save'])
    if (svStatId) {
      stats.sv = statsMap[svStatId]
    } else if (statsMap['17'] !== undefined) {
      stats.sv = statsMap['17']
    } else if (statsMap['24'] !== undefined) {
      stats.sv = statsMap['24']
    }
    
    // Shots Against (SA) - try stat definitions first, then fallback
    const saStatId = findStatIdByName(['shots against', 'sa', 'shots'])
    if (saStatId) {
      stats.sa = statsMap[saStatId]
    } else if (statsMap['18'] !== undefined) {
      stats.sa = statsMap['18']
    } else if (statsMap['25'] !== undefined) {
      stats.sa = statsMap['25']
    }
    
    // Save Percentage: ALWAYS calculate from SV/SA (most accurate)
    if (stats.sv !== undefined && stats.sa !== undefined && stats.sa > 0) {
      stats.svp = stats.sv / stats.sa // Calculate as decimal (e.g., 276/295 = 0.936 = 93.6%)
    } else {
      // Try stat definitions first
      const svpStatId = findStatIdByName(['save percentage', 'sv%', 'save pct', 'save%'])
      if (svpStatId) {
        const svpValue = statsMap[svpStatId]
        stats.svp = svpValue > 1 ? svpValue / 100 : svpValue
    } else if (statsMap['19'] !== undefined) {
      // Fallback: Use Yahoo's value but normalize
      const svpValue = statsMap['19']
        stats.svp = svpValue > 1 ? svpValue / 100 : svpValue
      } else if (statsMap['26'] !== undefined) {
        const svpValue = statsMap['26']
      stats.svp = svpValue > 1 ? svpValue / 100 : svpValue
    }
    }
    
    // Shutouts (SHO) - try stat definitions first, then fallback to multiple possible stat_ids
    const shoStatId = findStatIdByName(['shutouts', 'sho', 'shutout'])
    if (shoStatId) {
      stats.sho = statsMap[shoStatId]
    } else if (statsMap['20'] !== undefined) {
      stats.sho = statsMap['20']
    } else if (statsMap['28'] !== undefined) {
      stats.sho = statsMap['28']
    } else {
      // Try to find any stat_id that might be SHO by checking all available stat_ids
      console.warn(`⚠️ GOALIE SHO: Could not find Shutouts stat for ${playerName || 'unknown'}. Available stat_ids: ${Object.keys(statsMap).join(', ')}`)
    }
    
    // Ensure all goalie stats are initialized to 0 if undefined (for display purposes)
    // This prevents showing "undefined" or missing stats
    if (stats.gs === undefined) stats.gs = 0
    if (stats.wins === undefined) stats.wins = 0
    if (stats.losses === undefined) stats.losses = 0
    if (stats.ga === undefined) stats.ga = 0
    if (stats.gaa === undefined) stats.gaa = 0
    if (stats.sv === undefined) stats.sv = 0
    if (stats.sa === undefined) stats.sa = 0
    if (stats.sho === undefined) stats.sho = 0
    // Note: svp is calculated from sv/sa, so we don't set it to 0 if undefined
    
    // Log what we actually mapped for debugging
    if (playerName) {
      const mappedStats = []
      if (stats.gs !== undefined) mappedStats.push(`GS=${stats.gs}`)
      if (stats.wins !== undefined) mappedStats.push(`W=${stats.wins}`)
      if (stats.losses !== undefined) mappedStats.push(`L=${stats.losses}`)
      if (stats.ga !== undefined) mappedStats.push(`GA=${stats.ga}`)
      if (stats.gaa !== undefined) mappedStats.push(`GAA=${stats.gaa}`)
      if (stats.sv !== undefined) mappedStats.push(`SV=${stats.sv}`)
      if (stats.sa !== undefined) mappedStats.push(`SA=${stats.sa}`)
      if (stats.svp !== undefined) mappedStats.push(`SV%=${stats.svp}`)
      if (stats.sho !== undefined) mappedStats.push(`SHO=${stats.sho}`)
      console.log(`✅ GOALIE MAPPED: ${playerName} | ${mappedStats.join(', ')}`)
      
      // Also log what stat_ids we tried but didn't find
      const missingStats = []
      if (stats.gs === undefined) missingStats.push('GS')
      if (stats.ga === undefined) missingStats.push('GA')
      if (stats.gaa === undefined) missingStats.push('GAA')
      if (stats.sv === undefined) missingStats.push('SV')
      if (stats.sa === undefined) missingStats.push('SA')
      if (stats.sho === undefined) missingStats.push('SHO')
      if (missingStats.length > 0) {
        console.warn(`⚠️ GOALIE MISSING STATS: ${playerName} | Missing: ${missingStats.join(', ')}`)
        console.warn(`   Available stat_ids: ${Object.keys(statsMap).sort((a, b) => parseInt(a) - parseInt(b)).join(', ')}`)
      }
    }
  } else {
    // Skater stats - use stat definitions if available, otherwise fallback to hardcoded mappings
    const useStatDefinitions = Object.keys(statNameToIdCache).length > 0
    
    // Log skater stats with definitions if available
    if (playerName && useStatDefinitions) {
      const allSkaterStats = Object.keys(statsMap)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(id => {
          const statName = statDefinitionsCache[id] || 'unknown'
          return `stat_id ${id} (${statName})=${statsMap[id]}`
        })
        .join(', ')
      console.log(`🎯 SKATER WITH DEFINITIONS: ${playerName} | ${allSkaterStats}`)
    } else if (playerName) {
      const allSkaterStats = Object.keys(statsMap)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(id => `stat_id ${id}=${statsMap[id]}`)
        .join(', ')
      console.log(`🎯 SKATER DEBUG: ${playerName} | ${allSkaterStats}`)
    }
    
    // Helper function to find stat_id by name using stat definitions
    const findStatIdByName = (statNames: string[]): string | undefined => {
      if (!useStatDefinitions) return undefined
      for (const name of statNames) {
        const statId = statNameToIdCache[name.toLowerCase()]
        if (statId && statsMap[statId] !== undefined) {
          return statId
        }
      }
      return undefined
    }
    
    // Skater stats (from Yahoo Fantasy Hockey 2025/2026)
    // Use stat definitions to map by name first, then fallback to hardcoded stat_ids
    // 
    // Analysis of logs shows:
    // - stat_id 0 and 29 always match (both show same value)
    // - stat_id 31 has values like 43, 24, 25, 42, 5, 1, 0, 22, 56, 62 (could be SOG?)
    // - stat_id 32 has values like 10, 5, 6, 14, 11, 43, 23, 24, 49, 1, 8 (could be FW?)
    // - stat_id 33 has very large values (12664, 25650, etc.) - likely time on ice
    // - stat_id 34 has values like 19, 18, 20, 15, 23, 21, 22, 27, 20, 14 (could be HIT or BLK?)
    //
    // The issue: stat_id 0=24 (we think Goals) but Celebrini should have 14 Goals
    //            stat_id 1=14 (we think Assists) but Celebrini should have 20 Assists
    //            stat_id 8=12 (we think SOG) but Celebrini should have 70 SOG
    //            stat_id 9=0 (we think FW) but Celebrini should have 181 FW
    //
    // HYPOTHESIS: The stat_id mappings have changed for 2025-26 season!
    // Maybe stat_id 0 is actually something else, and Goals/Assists are in different IDs?
    // Or maybe we're getting projected stats instead of season stats?
    //
    // Let me check: If Celebrini has G:14 A:20, and we see stat_id 0=24, stat_id 1=14...
    // Maybe stat_id 0 is NOT Goals? Let's look for which stat_id has value 14 (Goals) and 20 (Assists)
    //
    // From logs: No stat_id has value 14 for Goals or 20 for Assists in the sample players
    // This suggests we might be getting the WRONG stats entirely (projected vs season)
    // OR the stat_id mappings are completely different
    
    // CRITICAL FIX: Based on Celebrini showing G:24 A:14 but should be G:14 A:20
    // Analysis of logs shows:
    // - stat_id 1=14 appears in logs, which matches Celebrini's correct Goals (14)!
    // - stat_id 34=20 appears in logs (Zach Hyman, line 182), which matches Celebrini's correct Assists (20)!
    // - stat_id 31 has values up to 62, could be SOG (Celebrini needs 70)
    // - stat_id 32 has values up to 49, could be FW (Celebrini needs 181 - might need different stat_id)
    // - stat_id 34=14 appears (Matt Duchene, line 268), which matches Celebrini's correct HIT (14)!
    // - stat_id 34=20 also appears, which matches Celebrini's Assists (20)
    //
    // CONFLICT: stat_id 34 has both 20 (Assists) and 14 (HIT). This suggests stat_id 34 might be Assists,
    //           and HIT might be in a different stat_id, OR we're looking at different players.
    //
    // HYPOTHESIS: 
    // - stat_id 1 = Goals (has value 14 which matches Celebrini's Goals)
    // - stat_id 34 = Assists (has value 20 which matches Celebrini's Assists)
    // - stat_id 31 = SOG (has values up to 62, Celebrini needs 70 - might be close)
    // - stat_id 32 = FW (has values up to 49, Celebrini needs 181 - might need different stat_id or it's cumulative)
    // - Need to find HIT and BLK stat_ids
    
    // Goals (G) - use stat definitions first
    const goalsStatId = findStatIdByName(['goals', 'g'])
    if (goalsStatId) {
      stats.goals = statsMap[goalsStatId]
    } else if (statsMap['0'] !== undefined) {
      stats.goals = statsMap['0'] // Fallback to stat_id 0
    } else if (statsMap['1'] !== undefined) {
      stats.goals = statsMap['1'] // Fallback to stat_id 1
    }
    
    // Assists (A) - use stat definitions first
    const assistsStatId = findStatIdByName(['assists', 'a'])
    if (assistsStatId) {
      stats.hockeyAssists = statsMap[assistsStatId]
    } else if (statsMap['1'] !== undefined) {
      stats.hockeyAssists = statsMap['1'] // Fallback to stat_id 1
    } else if (statsMap['0'] !== undefined) {
      stats.hockeyAssists = statsMap['0'] // Fallback to stat_id 0
    }
    
    // Points (P) - calculate from G+A if available, otherwise use stat definitions
    if (stats.goals !== undefined && stats.hockeyAssists !== undefined) {
      stats.hockeyPoints = stats.goals + stats.hockeyAssists
    } else {
      const pointsStatId = findStatIdByName(['points', 'p'])
      if (pointsStatId) {
        stats.hockeyPoints = statsMap[pointsStatId]
      } else if (statsMap['2'] !== undefined) {
        stats.hockeyPoints = statsMap['2'] // Fallback to stat_id 2
      }
    }
    
    // Plus/Minus (+/-) - use stat definitions first
    const plusMinusStatId = findStatIdByName(['plus/minus', 'plus minus', '+/-', 'plusminus'])
    if (plusMinusStatId) {
      stats.plusMinus = statsMap[plusMinusStatId]
    } else if (statsMap['3'] !== undefined) {
      stats.plusMinus = statsMap['3'] // Fallback to stat_id 3
    }
    
    // Penalty Minutes (PIM) - use stat definitions first
    const pimStatId = findStatIdByName(['penalty minutes', 'pim', 'penalties'])
    if (pimStatId) {
      stats.pim = statsMap[pimStatId]
    } else if (statsMap['4'] !== undefined) {
      stats.pim = statsMap['4'] // Fallback to stat_id 4
    }
    
    // Power Play Points (PPP) - use stat definitions first
    const pppStatId = findStatIdByName(['power play points', 'ppp', 'pp points'])
    if (pppStatId) {
      stats.ppp = statsMap[pppStatId]
    } else if (statsMap['5'] !== undefined) {
      stats.ppp = statsMap['5'] // Fallback to stat_id 5
    }
    
    // Short Handed Points (SHP) - use stat definitions first
    const shpStatId = findStatIdByName(['short handed points', 'shp', 'sh points'])
    if (shpStatId) {
      stats.shp = statsMap[shpStatId]
    } else if (statsMap['6'] !== undefined) {
      stats.shp = statsMap['6'] // Fallback to stat_id 6
    }
    
    // Game Winning Goals (GWG) - use stat definitions first
    const gwgStatId = findStatIdByName(['game winning goals', 'gwg', 'game winners'])
    if (gwgStatId) {
      stats.gwg = statsMap[gwgStatId]
    } else if (statsMap['7'] !== undefined) {
      stats.gwg = statsMap['7'] // Fallback to stat_id 7
    }
    
    // Shots on Goal (SOG) - use stat definitions first
    const sogStatId = findStatIdByName(['shots on goal', 'sog', 'shots', 'shots on net'])
    if (sogStatId) {
      stats.sog = statsMap[sogStatId]
    } else if (statsMap['8'] !== undefined) {
      stats.sog = statsMap['8'] // Fallback to stat_id 8
    } else if (statsMap['31'] !== undefined) {
      stats.sog = statsMap['31'] // Alternative fallback
    }
    
    // Faceoff Wins (FW) - use stat definitions first
    const fwStatId = findStatIdByName(['faceoff wins', 'fw', 'faceoffs won', 'face-offs won'])
    if (fwStatId) {
      stats.fw = statsMap[fwStatId]
    } else if (statsMap['9'] !== undefined) {
      stats.fw = statsMap['9'] // Fallback to stat_id 9
    } else if (statsMap['32'] !== undefined) {
      stats.fw = statsMap['32'] // Alternative fallback
    }
    
    // Hits (HIT) - use stat definitions first
    const hitStatId = findStatIdByName(['hits', 'hit'])
    if (hitStatId) {
      stats.hit = statsMap[hitStatId]
    } else if (statsMap['10'] !== undefined) {
      stats.hit = statsMap['10'] // Fallback to stat_id 10
    }
    
    // Blocks (BLK) - use stat definitions first
    const blkStatId = findStatIdByName(['blocks', 'blk', 'blocked shots'])
    if (blkStatId) {
      stats.blk = statsMap[blkStatId]
    } else if (statsMap['11'] !== undefined) {
      stats.blk = statsMap['11'] // Fallback to stat_id 11
    }
    
    // Log what we mapped for debugging
    if (playerName) {
      const mappedStats = []
      if (stats.goals !== undefined) mappedStats.push(`G=${stats.goals}`)
      if (stats.hockeyAssists !== undefined) mappedStats.push(`A=${stats.hockeyAssists}`)
      if (stats.hockeyPoints !== undefined) mappedStats.push(`P=${stats.hockeyPoints}`)
      if (stats.plusMinus !== undefined) mappedStats.push(`+/-=${stats.plusMinus}`)
      if (stats.sog !== undefined) mappedStats.push(`SOG=${stats.sog}`)
      if (stats.fw !== undefined) mappedStats.push(`FW=${stats.fw}`)
      if (stats.hit !== undefined) mappedStats.push(`HIT=${stats.hit}`)
      if (stats.blk !== undefined) mappedStats.push(`BLK=${stats.blk}`)
      console.log(`✅ SKATER MAPPED: ${playerName} | ${mappedStats.join(', ')}`)
    }
  }

  // Log unmapped stat IDs for debugging
  const mappedCount = Object.keys(stats).length
  const availableStatIds = Object.keys(statsMap)
  
  // CRITICAL DEBUG: Log all stat_id to value mappings to verify correctness
  if (availableStatIds.length > 0) {
    const allMappings = availableStatIds
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map(id => {
        const expectedStat = 
          id === '0' ? 'Goals' :
          id === '1' ? 'Assists' :
          id === '2' ? 'Points' :
          id === '3' ? 'Plus/Minus' :
          id === '4' ? 'PIM' :
          id === '5' ? 'PPP' :
          id === '6' ? 'SHP' :
          id === '7' ? 'GWG' :
          id === '8' ? 'SOG' :
          id === '9' ? 'FW' :
          id === '10' ? 'HIT' :
          id === '11' ? 'BLK' :
          id === '12' ? 'GS' :
          id === '13' ? 'Wins' :
          id === '14' ? 'Losses' :
          id === '15' ? 'GA' :
          id === '16' ? 'GAA' :
          id === '17' ? 'SV' :
          id === '18' ? 'SA' :
          id === '19' ? 'SV%' :
          id === '20' ? 'SHO' :
          'Unknown'
        return `stat_id ${id} (${expectedStat})=${statsMap[id]}`
      })
      .join(', ')
    console.log(`📊 STAT_ID MAPPING VERIFICATION: ${allMappings}`)
    console.log(`📊 Compare these values with Yahoo website to verify stat_id mappings are correct`)
  }
  
  if (availableStatIds.length > 0 && mappedCount === 0) {
    console.error('❌ parsePlayerStats ERROR: Stats found but none mapped!')
    console.error('   Available stat IDs:', availableStatIds.join(', '))
    console.error('   Stat values:', JSON.stringify(statsMap).substring(0, 300))
    console.error('   Expected IDs 0-20 for hockey stats')
  } else if (mappedCount > 0) {
    const mappedStatKeys = Object.keys(stats).filter(k => stats[k as keyof typeof stats] !== undefined)
    console.log(`✅ parsePlayerStats SUCCESS: Mapped ${mappedCount}/${availableStatIds.length} stats: ${mappedStatKeys.join(', ')}`)
    
    // Log the final mapped values for verification
    const mappedValues = mappedStatKeys.map(k => {
      const value = stats[k as keyof typeof stats]
      return `${k}=${value}`
    }).join(', ')
    console.log(`📊 Final mapped stat values: ${mappedValues}`)
  } else {
    console.error('❌ parsePlayerStats ERROR: No stats found at all!')
  }

  // Return stats if we have at least one mapped stat
  if (mappedCount > 0) {
    return stats
  }
  return undefined
}

/**
 * Calculate player value based on comprehensive stat analysis with weighted algorithm
 * 
 * Algorithm Philosophy:
 * - Skaters: Points production is primary, with bonuses for special teams, peripherals
 * - Goalies: Wins and save percentage are primary, with GAA penalty
 * - All stats normalized to per-game basis for fairness
 * - Blended with rank/ownership for market context
 */
function calculatePlayerValue(
  rank?: number,
  percentStart?: number,
  percentOwned?: number,
  stats?: PlayerStats,
  position?: string
): number {
  // If we have stats, use comprehensive weighted algorithm
  if (stats) {
    const isGoalie = position === 'G' || position?.includes('G')
    
    if (isGoalie) {
      return calculateGoalieValue(stats, rank, percentStart, percentOwned)
    } else {
      return calculateSkaterValue(stats, position, rank, percentStart, percentOwned)
    }
  }
  
  // Fallback to rank-based value
  if (rank && rank > 0) {
    const rankValue = calculateRankBasedValue(rank)
    return Math.max(10, Math.min(99.9, rankValue))
  }

  // Fallback to ownership-based value
  if (percentStart) {
    return Math.min(99.9, percentStart * 0.8)
  }
  if (percentOwned) {
    return Math.min(80, percentOwned * 0.6)
  }

  return 50 // Default middle value
}

/**
 * Calculate skater value with weighted stat algorithm
 * 
 * Stat Weights (based on fantasy hockey importance):
 * - Goals: 4.0 (most valuable - harder to get)
 * - Assists: 3.0 (very valuable)
 * - Power Play Points: 1.5 (bonus for special teams)
 * - Plus/Minus: 0.8 (indicates team success)
 * - Shots on Goal: 0.15 (indicates opportunity/volume)
 * - Hits: 0.25 (category leagues value this)
 * - Blocks: 0.3 (defensive value)
 * - Faceoff Wins: 0.1 (position-specific, mainly centers)
 * - Short Handed Points: 2.0 (rare and valuable)
 * - Game Winning Goals: 1.0 (clutch factor)
 * - Penalty Minutes: -0.05 (slight negative, but can be positive in banger leagues)
 */
function calculateSkaterValue(
  stats: PlayerStats,
  position?: string,
  rank?: number,
  percentStart?: number,
  percentOwned?: number
): number {
  let value = 0
  
  // PRIMARY SCORING STATS (highest weight)
  // Goals are most valuable - harder to score than assists
  if (stats.goals !== undefined) {
    value += (stats.goals || 0) * 4.0
  }
  
  // Assists are very valuable but slightly less than goals
  if (stats.hockeyAssists !== undefined) {
    value += (stats.hockeyAssists || 0) * 3.0
  }
  
  // If we have hockeyPoints but not individual G/A, use it
  // (weighted average: 4.0*0.4 + 3.0*0.6 = 3.4 per point)
  if (stats.hockeyPoints !== undefined && stats.goals === undefined && stats.hockeyAssists === undefined) {
    value += (stats.hockeyPoints || 0) * 3.4
  }
  
  // SPECIAL TEAMS & BONUS STATS
  // Power Play Points - valuable bonus stat
  if (stats.ppp !== undefined) {
    value += (stats.ppp || 0) * 1.5
  }
  
  // Short Handed Points - rare and very valuable
  if (stats.shp !== undefined) {
    value += (stats.shp || 0) * 2.0
  }
  
  // Game Winning Goals - clutch factor
  if (stats.gwg !== undefined) {
    value += (stats.gwg || 0) * 1.0
  }
  
  // PLUS/MINUS - indicates team success and defensive play
  if (stats.plusMinus !== undefined) {
    value += (stats.plusMinus || 0) * 0.8
  }
  
  // PERIPHERAL STATS (volume indicators)
  // Shots on Goal - indicates opportunity and shooting volume
  if (stats.sog !== undefined) {
    value += (stats.sog || 0) * 0.15
  }
  
  // Hits - valuable in category/banger leagues
  if (stats.hit !== undefined) {
    value += (stats.hit || 0) * 0.25
  }
  
  // Blocks - defensive value
  if (stats.blk !== undefined) {
    value += (stats.blk || 0) * 0.3
  }
  
  // Faceoff Wins - position-specific (mainly centers)
  // Only count if player is a center (C position)
  if (stats.fw !== undefined && position && (position.includes('C') || position === 'C')) {
    value += (stats.fw || 0) * 0.1
  }
  
  // Penalty Minutes - slight negative (can hurt in some leagues)
  // In banger leagues this might be positive, but generally negative
  if (stats.pim !== undefined) {
    value += (stats.pim || 0) * -0.05
  }
  
  // Position bonus: Dual-position players are more valuable (flexibility)
  let positionBonus = 0
  if (position && position.includes(',')) {
    // Dual position (e.g., "LW,RW" or "C,LW")
    const positions = position.split(',').map(p => p.trim())
    if (positions.length >= 2) {
      positionBonus = 2.0 // +2.0 value for dual eligibility
    }
    if (positions.length >= 3) {
      positionBonus = 3.5 // +3.5 value for triple eligibility
    }
  }
  value += positionBonus
  
  // Normalize to a 0-99.9 scale
  // Typical elite skater: 30-40 goals, 40-50 assists = 120-160 base value
  // Add peripherals: ~20-30 more = 140-190 total
  // Scale: divide by 2.5 to get ~56-76, then add base of 20 = 76-96 range
  let normalizedValue = (value / 2.5) + 20
  
  // Clamp between 10 and 99.9 (max is 99.9, not 100)
  normalizedValue = Math.max(10, Math.min(99.9, normalizedValue))
  
  // Use Yahoo rank for calibration if available
  // Rank 1 = 99.9, rank 2 = 99.5, rank 3 = 99.0, etc.
  // This ensures top-ranked players get top values, and distribution is better
  if (rank && rank > 0) {
    const rankCalibratedValue = calculateRankCalibratedValue(rank)
    
    // Blend: 60% stats-based value, 40% rank-calibrated value
    // This ensures stats matter but rank provides calibration
    const blendedValue = (normalizedValue * 0.6) + (rankCalibratedValue * 0.4)
    
    // Final clamp to ensure max is 99.9
    return Math.max(10, Math.min(99.9, blendedValue))
  }
  
  // Blend with ownership if no rank
  if (percentStart) {
    const ownershipValue = Math.min(99.9, percentStart * 0.8)
    const blendedValue = (normalizedValue * 0.8) + (ownershipValue * 0.2)
    return Math.max(10, Math.min(99.9, blendedValue))
  }
  
  // Final clamp
  return Math.max(10, Math.min(99.9, normalizedValue))
}

/**
 * Calculate goalie value with weighted stat algorithm
 * 
 * Stat Weights (based on fantasy hockey importance):
 * - Wins: 3.5 (most important - what you need most)
 * - Save Percentage: 50.0 (multiplier for decimal, e.g., 0.920 = 46 points)
 * - Goals Against Average: -8.0 (penalty, lower is better)
 * - Shutouts: 4.0 (bonus for elite performance)
 * - Games Started: 0.3 (workload indicator)
 * - Saves: 0.02 (volume stat, less important than rate)
 */
function calculateGoalieValue(
  stats: PlayerStats,
  rank?: number,
  percentStart?: number,
  percentOwned?: number
): number {
  let value = 0
  
  // PRIMARY STATS
  // Wins - most important stat for goalies
  if (stats.wins !== undefined) {
    value += (stats.wins || 0) * 3.5
  }
  
  // Save Percentage - critical rate stat
  // Convert from decimal (0.920) to percentage points (92.0) then multiply
  if (stats.svp !== undefined && stats.svp > 0) {
    // If already a percentage (90-100 range), use as-is
    // If decimal (0.90-1.00 range), convert to percentage
    const svpValue = stats.svp < 1.0 ? stats.svp * 100 : stats.svp
    // Elite goalies: 0.920+ = 92+ points, good: 0.910 = 91 points
    // Scale: (svp - 85) * 2 gives reasonable range
    // Elite (92): (92-85)*2 = 14, Good (90): (90-85)*2 = 10
    value += Math.max(0, (svpValue - 85) * 2)
  }
  
  // Goals Against Average - penalty (lower is better)
  // Elite: ~2.20, Good: ~2.70, Average: ~3.00
  // Penalty: (3.00 - GAA) * 8 gives: Elite +6.4, Good +2.4, Average 0
  if (stats.gaa !== undefined && stats.gaa > 0) {
    value += (3.00 - stats.gaa) * 8.0
  }
  
  // BONUS STATS
  // Shutouts - elite performance indicator
  if (stats.sho !== undefined) {
    value += (stats.sho || 0) * 4.0
  }
  
  // VOLUME STATS
  // Games Started - workload indicator (more starts = more opportunities)
  if (stats.gs !== undefined) {
    value += (stats.gs || 0) * 0.3
  }
  
  // Saves - volume stat (less important than save percentage)
  if (stats.sv !== undefined) {
    value += (stats.sv || 0) * 0.02
  }
  
  // Goals Against - slight negative (already accounted in GAA, but extra penalty)
  if (stats.ga !== undefined) {
    value -= (stats.ga || 0) * 0.1
  }
  
  // Normalize to a 0-99.9 scale
  // Typical elite goalie: 30 wins, 0.920 sv%, 2.30 GAA, 5 SHO
  // = 105 (wins) + 14 (sv%) + 5.6 (GAA) + 20 (SHO) = ~144
  // Scale: divide by 2.0 to get ~72, then add base of 15 = 87 range
  let normalizedValue = (value / 2.0) + 15
  
  // Clamp between 10 and 99.9 (max is 99.9, not 100)
  normalizedValue = Math.max(10, Math.min(99.9, normalizedValue))
  
  // Use Yahoo rank for calibration if available
  // Rank 1 = 99.9, rank 2 = 99.5, rank 3 = 99.0, etc.
  if (rank && rank > 0) {
    const rankCalibratedValue = calculateRankCalibratedValue(rank)
    
    // Blend: 65% stats-based value, 35% rank-calibrated value
    // Goalies: stats are very reliable, but rank provides calibration
    const blendedValue = (normalizedValue * 0.65) + (rankCalibratedValue * 0.35)
    
    // Final clamp to ensure max is 99.9
    return Math.max(10, Math.min(99.9, blendedValue))
  }
  
  // Blend with ownership if no rank
  if (percentStart) {
    const ownershipValue = Math.min(99.9, percentStart * 0.8)
    const blendedValue = (normalizedValue * 0.8) + (ownershipValue * 0.2)
    return Math.max(10, Math.min(99.9, blendedValue))
  }
  
  // Final clamp
  return Math.max(10, Math.min(99.9, normalizedValue))
}

/**
 * Convert rank to calibrated value using Yahoo's ranking system
 * Rank 1 = 99.9 (maximum), with decreasing values for lower ranks
 * This provides calibration to ensure top-ranked players get top values
 */
function calculateRankCalibratedValue(rank: number): number {
  // Top tier: Rank 1-5 (99.9 to 98.5)
  if (rank === 1) return 99.9
  if (rank <= 5) return 99.9 - (rank - 1) * 0.35 // 99.9, 99.55, 99.2, 98.85, 98.5
  
  // Elite tier: Rank 6-10 (98.0 to 96.5)
  if (rank <= 10) return 98.0 - (rank - 6) * 0.3 // 98.0, 97.7, 97.4, 97.1, 96.8, 96.5
  
  // High tier: Rank 11-25 (96.0 to 91.0)
  if (rank <= 25) return 96.0 - (rank - 11) * 0.33 // ~0.33 per rank
  
  // Good tier: Rank 26-50 (90.5 to 82.0)
  if (rank <= 50) return 90.5 - (rank - 26) * 0.34 // ~0.34 per rank
  
  // Solid tier: Rank 51-100 (81.5 to 64.0)
  if (rank <= 100) return 81.5 - (rank - 51) * 0.35 // ~0.35 per rank
  
  // Average tier: Rank 101-200 (63.5 to 38.0)
  if (rank <= 200) return 63.5 - (rank - 101) * 0.255 // ~0.255 per rank
  
  // Below average: Rank 201-500 (37.5 to 10.0)
  if (rank <= 500) return 37.5 - (rank - 201) * 0.092 // ~0.092 per rank
  
  // Deep: Rank 500+ (10.0 minimum)
  return 10.0
}

/**
 * Convert rank to value (lower rank = higher value)
 * Used as fallback when no stats available
 */
function calculateRankBasedValue(rank: number): number {
  if (rank <= 10) return 99.9 - (rank - 1) * 0.5
  if (rank <= 50) return 95 - (rank - 11) * 0.625
  if (rank <= 100) return 70 - (rank - 51) * 0.4
  if (rank <= 200) return 50 - (rank - 101) * 0.3
  if (rank <= 500) return 20 - (rank - 201) * 0.1
  return 10
}

/**
 * Create a unique player ID from Yahoo data
 */
function createPlayerId(teamName: string, playerKey: string | undefined): string {
  if (!playerKey) {
    // Fallback if player_key is missing - use timestamp for uniqueness
    const fallbackId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    console.warn(`Player missing player_key, using fallback ID: ${fallbackId}`)
    return `${teamName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${fallbackId}`
  }
  const teamSlug = teamName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
  const playerSlug = playerKey.split('.')[2] || playerKey.replace(/\./g, '-')
  return `${teamSlug}-${playerSlug}`
}

/**
 * Convert Yahoo player to our Player format
 */
export function parseYahooPlayer(
  yahooPlayer: YahooPlayer,
  teamName: string
): Player {
  // Ensure display_position is a string
  const displayPos = typeof yahooPlayer.display_position === 'string' 
    ? yahooPlayer.display_position 
    : (typeof yahooPlayer.display_position === 'object' && yahooPlayer.display_position !== null)
    ? String(yahooPlayer.display_position)
    : 'N/A'
  
  const position = parsePosition(displayPos, yahooPlayer.eligible_positions)
  const status = parsePlayerStatus(yahooPlayer.status, yahooPlayer.injury_note)
  const team = parseTeamAbbr(yahooPlayer)
  
  // Parse stats - log what we're passing in
  const playerName = typeof yahooPlayer.name === 'string' ? yahooPlayer.name : (yahooPlayer.name?.full || 'Unknown')
  if (yahooPlayer.player_stats) {
    console.log(`🔍 Parsing stats for ${playerName}: player_stats exists`)
    console.log(`   player_stats structure:`, JSON.stringify(yahooPlayer.player_stats).substring(0, 200))
  } else {
    console.error(`❌ ${playerName}: player_stats is MISSING/UNDEFINED`)
  }
  // Pass position to parsePlayerStats so it can correctly identify goalies vs skaters
  // Also pass player name so we can log it in the stats parsing
  const stats = parsePlayerStatsWithName(yahooPlayer.player_stats, position, playerName)

  // Extract rank from ownership data or use a default
  const rank = yahooPlayer.ownership?.value 
    ? parseInt(String(yahooPlayer.ownership.value))
    : undefined

  const percentStart = yahooPlayer.ownership?.percent_start
    ? parseFloat(String(yahooPlayer.ownership.percent_start))
    : undefined

  const percentOwned = yahooPlayer.ownership?.percent_owned
    ? parseFloat(String(yahooPlayer.ownership.percent_owned))
    : undefined

  const value = calculatePlayerValue(rank, percentStart, percentOwned, stats, position)
  
  // Detailed logging for value calculation
  if (stats && Object.keys(stats).length > 0) {
    const statKeys = Object.keys(stats).filter(k => stats[k as keyof typeof stats] !== undefined)
    const statValues = statKeys.map(k => `${k}:${stats[k as keyof typeof stats]}`).join(', ')
    console.log(`✅ VALUE CALC: ${playerName} = ${value.toFixed(1)} | Rank: ${rank || 'N/A'} | Stats (${statKeys.length}): ${statValues}`)
  } else {
    console.error(`❌ VALUE CALC ERROR: ${playerName} = ${value.toFixed(1)} (DEFAULT 50!) | No stats available`)
    console.error(`   Rank: ${rank || 'N/A'}, %Start: ${percentStart || 'N/A'}, %Owned: ${percentOwned || 'N/A'}`)
    if (yahooPlayer.player_stats) {
      console.error(`   player_stats EXISTS but failed to parse:`, JSON.stringify(yahooPlayer.player_stats).substring(0, 300))
    } else {
      console.error(`   player_stats is MISSING/UNDEFINED`)
    }
  }

  // Validate player_key exists
  if (!yahooPlayer.player_key) {
    console.error('YahooPlayer missing player_key:', yahooPlayer)
  }
  
  // Ensure position is always a string
  const positionStr = typeof position === 'string' ? position : String(position || 'N/A')
  
  return {
    id: createPlayerId(teamName, yahooPlayer.player_key || yahooPlayer.player_id),
    name: typeof yahooPlayer.name === 'string' ? yahooPlayer.name : (yahooPlayer.name?.full || 'Unknown Player'),
    position: positionStr,
    team: typeof team === 'string' ? team : String(team || 'N/A'),
    rank,
    startPercentage: percentStart,
    rosPercentage: percentOwned, // Using percent_owned as ROS approximation
    status,
    value,
    stats,
    notes: yahooPlayer.injury_note,
  }
}

/**
 * Convert Yahoo team to our Team format
 */
export function parseYahooTeam(
  yahooTeam: YahooTeam,
  players: Player[]
): Team {
  // Create record string - use 0 as defaults if not provided
  const wins = yahooTeam.wins ?? 0
  const losses = yahooTeam.losses ?? 0
  const ties = yahooTeam.ties ?? 0
  const record = `${wins}-${losses}-${ties}`
  
  // Log if record is all zeros (might indicate missing data)
  if (wins === 0 && losses === 0 && ties === 0) {
    console.warn(`⚠️ Team ${yahooTeam.name} has record 0-0-0 - standings may not be available yet or not parsed correctly`)
  }

  // Create team ID from name
  const teamId = yahooTeam.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')

  return {
    id: teamId,
    name: yahooTeam.name,
    owner: yahooTeam.manager_name,
    players,
    record,
    // Rank would need to come from league standings - not available in basic team data
  }
}

/**
 * Parse multiple Yahoo teams with their rosters into our Team format
 * This ensures stats are fetched and attached BEFORE parsing players for accurate value calculation
 */
export async function parseYahooTeams(
  yahooTeams: YahooTeam[],
  getRosterFn: (teamKey: string) => Promise<YahooPlayer[]>
): Promise<Team[]> {
  const teams: Team[] = []

  for (const yahooTeam of yahooTeams) {
    try {
      // Validate team_key exists
      if (!yahooTeam.team_key) {
        console.error(`Skipping team ${yahooTeam.name} - missing team_key`, yahooTeam)
        continue
      }
      
      console.log(`Fetching roster for team: ${yahooTeam.name} (key: ${yahooTeam.team_key})`)
      // getRosterFn should already include stats since we fetch them in getTeamRoster
      const roster = await getRosterFn(yahooTeam.team_key)
      
      // Parse players - stats should already be attached from getRosterFn
      const players = roster.map(player => {
        // Verify stats are present before parsing
        if (!player.player_stats) {
          console.warn(`⚠️ Player ${player.name?.full || 'Unknown'} (${player.player_key}) on team ${yahooTeam.name} missing stats - will use default value`)
        }
        return parseYahooPlayer(player, yahooTeam.name)
      })
      
      // Count players with stats
      const playersWithStats = players.filter(p => p.stats && Object.keys(p.stats).length > 0).length
      const playersWithoutStats = players.length - playersWithStats
      
      teams.push(parseYahooTeam(yahooTeam, players))
      console.log(`✅ Successfully parsed team ${yahooTeam.name} with ${players.length} players (${playersWithStats} with stats, ${playersWithoutStats} without stats)`)
      
      if (playersWithoutStats > 0) {
        console.warn(`⚠️ Team ${yahooTeam.name} has ${playersWithoutStats} player(s) without stats - check logs above for reasons`)
      }
    } catch (error: any) {
      console.error(`Error parsing team ${yahooTeam.name} (key: ${yahooTeam.team_key}):`, error)
      // Continue with other teams even if one fails
    }
  }
  
  console.log(`parseYahooTeams: Successfully parsed ${teams.length} out of ${yahooTeams.length} teams`)
  
  return teams
}

