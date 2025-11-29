/**
 * Roster Parser
 * 
 * Normalizes players to a flat list from Yahoo's nested roster structure.
 */

import { normalizeYahooNode, findFirstPath } from './normalize'
import type { YahooPlayer } from '../yahooFantasyApi'

/**
 * Flatten players from Yahoo roster structure
 * 
 * Handles multiple possible roster structures:
 * - roster["0"].players["0"].player[...]
 * - players["0"].player[...]
 * - player[...]
 * 
 * @param raw - Raw roster response from Yahoo API
 * @returns Flat array of player data objects
 */
export function flattenPlayers(raw: any): any[] {
  // Try multiple possible paths
  const players = findFirstPath(raw, [
    'roster.0.players',
    'roster.players',
    'players',
    'roster.0.player',
    'roster.player',
    'player',
  ])
  
  if (!players) {
    return []
  }
  
  // Handle different structures
  let playerList: any[] = []
  
  if (Array.isArray(players)) {
    // Direct array of players
    playerList = players
  } else if (typeof players === 'object') {
    // Object with numeric keys (Yahoo format)
    if (players.player) {
      // Nested player structure
      const playerData = players.player
      playerList = Array.isArray(playerData) ? playerData : [playerData]
    } else {
      // Object with numeric keys - convert to array
      playerList = Object.values(players)
    }
  }
  
  // Extract player data from nested structures
  const flattened: any[] = []
  
  for (const playerEntry of playerList) {
    if (!playerEntry || typeof playerEntry !== 'object') {
      continue
    }
    
    // Handle different player entry structures
    let playerArray: any[] = []
    
    if (playerEntry.player) {
      // player: [[{player_key}, ...], ...] or player: [{player_key}, ...]
      if (Array.isArray(playerEntry.player)) {
        playerArray = playerEntry.player
      } else {
        playerArray = [playerEntry.player]
      }
    } else if (Array.isArray(playerEntry)) {
      // Entry is directly an array
      playerArray = playerEntry
    } else if (playerEntry.player_key) {
      // Already a player data object
      playerArray = [playerEntry]
    }
    
    // Extract player data from first element
    const playerData = normalizeYahooNode(playerArray)
    if (playerData && playerData.player_key) {
      flattened.push(playerData)
    }
  }
  
  return flattened
}

/**
 * Extract ownership data from player array
 * 
 * @param playerArray - Player array from Yahoo API
 * @returns Ownership data or undefined
 */
export function extractOwnership(playerArray: any[]): any {
  if (!Array.isArray(playerArray)) {
    return undefined
  }
  
  // Search through array for ownership
  for (let i = 1; i < playerArray.length; i++) {
    const item = playerArray[i]
    if (item && typeof item === 'object' && item.ownership) {
      return item.ownership
    }
  }
  
  return undefined
}

/**
 * Parse roster from Yahoo API response
 * 
 * @param rosterResponse - Raw roster response from Yahoo API
 * @returns Array of YahooPlayer objects
 * @throws Error if roster cannot be parsed
 */
export function parseRoster(rosterResponse: any): YahooPlayer[] {
  const team = rosterResponse.fantasy_content?.team
  
  if (!Array.isArray(team) || team.length < 1) {
    throw new Error(
      'Invalid roster response structure. ' +
      'Expected team array in response.'
    )
  }
  
  // Find roster data
  const rosterData = findFirstPath(
    { team },
    [
      'team.1.roster',
      'team.0.roster',
      'team.roster',
    ]
  )
  
  if (!rosterData) {
    throw new Error(
      'No roster data found in response. ' +
      'Searched through team array but could not find roster property.'
    )
  }
  
  // Flatten players
  const playerEntries = Array.isArray(rosterData) 
    ? rosterData 
    : Object.values(rosterData)
  
  const players: YahooPlayer[] = []
  
  for (const rosterEntry of playerEntries) {
    if (!rosterEntry || typeof rosterEntry !== 'object') {
      continue
    }
    
    // Extract players from this roster entry
    const playerList = flattenPlayers(rosterEntry)
    
    for (const playerObj of playerList) {
      if (!playerObj || typeof playerObj !== 'object') {
        continue
      }
      
      // Handle different player structures
      let playerArray: any[] = []
      
      if (playerObj.player) {
        if (Array.isArray(playerObj.player)) {
          playerArray = playerObj.player
        } else {
          playerArray = [playerObj.player]
        }
      } else if (Array.isArray(playerObj)) {
        playerArray = playerObj
      } else if (playerObj.player_key) {
        playerArray = [playerObj]
      }
      
      // Extract player data
      const playerData = normalizeYahooNode(playerArray)
      if (!playerData?.player_key) {
        continue
      }
      
      // Extract ownership
      const ownership = extractOwnership(playerArray)
      
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
        player_stats: undefined, // Stats fetched separately
      })
    }
  }
  
  if (players.length === 0) {
    throw new Error(
      'Roster parsed but contains 0 players. ' +
      'This may indicate a parsing issue or empty roster.'
    )
  }
  
  return players
}

