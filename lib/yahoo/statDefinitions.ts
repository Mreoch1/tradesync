/**
 * Stat Definitions Cache
 * 
 * Fetches and caches stat definitions from Yahoo API.
 * Stat definitions map stat_id to stat_name, allowing dynamic stat mapping
 * instead of hardcoded stat IDs.
 */

import { makeApiRequest } from './client'

/**
 * Global cache for stat definitions
 * Key: game_key, Value: { stat_id -> stat_name, stat_name -> stat_id }
 */
const statDefinitionsCache = new Map<
  string,
  {
    byId: Record<string, string>
    byName: Record<string, string>
  }
>()

/**
 * Get stat definitions for a game
 * 
 * Fetches stat categories from Yahoo API and caches them.
 * This must be called before parsing player stats.
 * 
 * @param accessToken - OAuth access token
 * @param gameKey - Yahoo game key (e.g., "465" for NHL 2025-26)
 * @returns Map of stat_id -> stat_name
 * @throws Error if stat definitions cannot be fetched
 */
export async function getStatDefinitions(
  accessToken: string,
  gameKey: string
): Promise<Record<string, string>> {
  // Check cache first
  const cached = statDefinitionsCache.get(gameKey)
  if (cached) {
    return cached.byId
  }
  
  // Fetch from API
  const response = await makeApiRequest(`game/${gameKey}/stat_categories`, accessToken)
  const statCategories = response.fantasy_content?.game?.[1]?.stat_categories?.stats
  
  if (!statCategories || !Array.isArray(statCategories)) {
    throw new Error(
      `Failed to fetch stat definitions for game ${gameKey}. ` +
      'Stat definitions are required for correct stat mapping. ' +
      'Cannot proceed without stat definitions.'
    )
  }
  
  // Build lookup maps
  const byId: Record<string, string> = {}
  const byName: Record<string, string> = {}
  
  statCategories.forEach((stat: any) => {
    if (stat?.stat) {
      const statData = Array.isArray(stat.stat) ? stat.stat[0] : stat.stat
      if (statData?.stat_id && statData?.name) {
        const statId = String(statData.stat_id)
        const statName = String(statData.name)
        byId[statId] = statName
        byName[statName.toLowerCase()] = statId
      }
    }
  })
  
  if (Object.keys(byId).length === 0) {
    throw new Error(
      `Stat definitions returned empty for game ${gameKey}. ` +
      'Cannot proceed without stat definitions.'
    )
  }
  
  // Cache the result
  statDefinitionsCache.set(gameKey, { byId, byName })
  
  console.log(`[Stat Definitions] Loaded ${Object.keys(byId).length} stat definitions for game ${gameKey}`)
  
  return byId
}

/**
 * Get stat ID by name (case-insensitive)
 * 
 * @param gameKey - Yahoo game key
 * @param statNames - Array of possible stat names to try
 * @returns Stat ID if found, undefined otherwise
 */
export function getStatIdByName(gameKey: string, statNames: string[]): string | undefined {
  const cached = statDefinitionsCache.get(gameKey)
  if (!cached) {
    return undefined
  }
  
  // Try exact matches first
  for (const name of statNames) {
    const statId = cached.byName[name.toLowerCase()]
    if (statId) {
      return statId
    }
  }
  
  // Try partial matches (normalize by removing special chars)
  for (const name of statNames) {
    const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '')
    for (const [cachedName, statId] of Object.entries(cached.byName)) {
      const normalizedCached = cachedName.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (normalizedCached.includes(normalizedName) || normalizedName.includes(normalizedCached)) {
        return statId
      }
    }
  }
  
  return undefined
}

/**
 * Check if stat definitions are loaded for a game
 */
export function hasStatDefinitions(gameKey: string): boolean {
  return statDefinitionsCache.has(gameKey)
}

/**
 * Clear stat definitions cache (useful for testing)
 */
export function clearStatDefinitionsCache(): void {
  statDefinitionsCache.clear()
}

