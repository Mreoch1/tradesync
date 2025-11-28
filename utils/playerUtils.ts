import { Player } from '@/types'

/**
 * Calculates a player's fantasy value based on stats
 */
export function calculatePlayerValue(player: Player): number {
  if (player.value !== undefined) {
    return player.value
  }

  // Fallback calculation based on projected stats or current stats
  const stats = player.projectedStats || player.stats
  
  if (!stats) {
    return 0
  }

  // Simple value calculation - can be customized per sport/league
  let value = 0
  
  if (stats.points) value += stats.points * 1
  if (stats.rebounds) value += stats.rebounds * 1.2
  if (stats.assists) value += stats.assists * 1.5
  if (stats.steals) value += stats.steals * 3
  if (stats.blocks) value += stats.blocks * 3
  if (stats.turnovers) value -= stats.turnovers * 1

  return Math.round(value)
}

/**
 * Formats player name for display
 */
export function formatPlayerName(player: Player): string {
  return player.name || 'Unknown Player'
}

/**
 * Formats player position and team
 */
export function formatPlayerInfo(player: Player): string {
  const parts = [player.position, player.team].filter(Boolean)
  return parts.join(' - ')
}

/**
 * Gets player display value
 */
export function getPlayerDisplayValue(player: Player): string {
  const value = player.value ?? calculatePlayerValue(player)
  return value.toFixed(1)
}

