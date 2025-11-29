/**
 * Season Detection
 * 
 * Canonical source of truth for season: game endpoint.
 * Season must come from game.season, not league or game_key guessing.
 */

import { makeApiRequest } from './client'
import { normalizeYahooNode } from './normalize'

/**
 * Global cache for game seasons
 * Key: game_key, Value: season (e.g., "2025")
 */
const seasonCache = new Map<string, string>()

/**
 * Get season for a game key
 * 
 * Fetches game info from Yahoo API and extracts season.
 * Season is cached globally by game_key.
 * 
 * @param accessToken - OAuth access token
 * @param gameKey - Yahoo game key (e.g., "465" for NHL 2025-26)
 * @returns Season year as string (e.g., "2025")
 * @throws Error if season cannot be determined
 */
export async function getSeason(
  accessToken: string,
  gameKey: string
): Promise<string> {
  // Check cache first
  const cached = seasonCache.get(gameKey)
  if (cached) {
    return cached
  }
  
  // Fetch game info
  const response = await makeApiRequest(`game/${gameKey}`, accessToken)
  const game = response.fantasy_content?.game
  
  if (!game || !Array.isArray(game)) {
    throw new Error(
      `Failed to fetch game info for game_key ${gameKey}. ` +
      'Cannot determine season without game info.'
    )
  }
  
  // Extract season from game data
  const gameData = normalizeYahooNode(game[0])
  if (!gameData) {
    throw new Error(
      `Invalid game response structure for game_key ${gameKey}. ` +
      'Cannot determine season.'
    )
  }
  
  const season = gameData.season
  if (!season) {
    throw new Error(
      `Game ${gameKey} does not have a season field. ` +
      'Cannot determine season.'
    )
  }
  
  // Extract year from season (e.g., "2025-26" -> "2025")
  const seasonYear = String(season).slice(0, 4)
  
  if (!seasonYear.match(/^\d{4}$/)) {
    throw new Error(
      `Invalid season format for game ${gameKey}: ${season}. ` +
      'Expected format like "2025-26" or "2025".'
    )
  }
  
  // Cache the result
  seasonCache.set(gameKey, seasonYear)
  
  console.log(`[Season] Determined season ${seasonYear} for game ${gameKey}`)
  
  return seasonYear
}

/**
 * Clear season cache (useful for testing)
 */
export function clearSeasonCache(): void {
  seasonCache.clear()
}

