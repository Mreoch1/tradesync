import { Team } from '@/types/teams'
import { Player } from '@/types'

const STORAGE_KEY = 'fantasy_teams'

/**
 * Manages teams and players with persistence in sessionStorage
 */
export class TeamManager {
  private teams: Team[] = []

  constructor() {
    // Load teams from sessionStorage on initialization
    this.loadTeams()
    
    // Listen for storage events (when teams are updated in other tabs/windows)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', () => {
        this.loadTeams()
      })
      
      // Listen for custom event when teams are synced
      window.addEventListener('teamsUpdated', () => {
        this.loadTeams()
      })
    }
  }

  private loadTeams(): void {
    if (typeof window === 'undefined') return
    
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        this.teams = JSON.parse(saved)
      }
    } catch (e) {
      console.error('Error loading teams from storage:', e)
      this.teams = []
    }
  }

  private saveTeams(): void {
    if (typeof window === 'undefined') return
    
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.teams))
      // Dispatch event to notify other components
      window.dispatchEvent(new Event('teamsStorageUpdated'))
    } catch (e) {
      console.error('Error saving teams to storage:', e)
    }
  }

  /**
   * Add or update a team
   * When updating, preserve existing team data if new team has no players
   */
  addTeam(team: Team): void {
    const index = this.teams.findIndex(t => t.id === team.id)
    if (index >= 0) {
      // Update existing team - merge players if needed
      const existingTeam = this.teams[index]
      // Only update if new team has players (from sync)
      if (team.players && team.players.length > 0) {
        this.teams[index] = team
      } else {
        // Preserve existing team if sync didn't provide players
        console.log(`Preserving existing team ${team.name} data - sync had no players`)
      }
    } else {
      this.teams.push(team)
    }
    this.saveTeams()
  }

  /**
   * Get all teams
   */
  getTeams(): Team[] {
    // Reload from storage to ensure we have latest data
    this.loadTeams()
    return this.teams
  }

  /**
   * Get a specific team by ID
   */
  getTeam(teamId: string): Team | undefined {
    // Reload from storage to ensure we have latest data
    this.loadTeams()
    return this.teams.find(t => t.id === teamId)
  }

  /**
   * Get all players from all teams
   */
  getAllPlayers(): Player[] {
    return this.teams.flatMap(team => team.players)
  }

  /**
   * Get players from a specific team
   */
  getTeamPlayers(teamId: string | null): Player[] {
    if (!teamId) {
      return this.getAllPlayers()
    }
    const team = this.getTeam(teamId)
    return team ? team.players : []
  }

  /**
   * Get player by ID
   */
  getPlayer(playerId: string): Player | undefined {
    for (const team of this.teams) {
      const player = team.players.find(p => p.id === playerId)
      if (player) return player
    }
    return undefined
  }

  /**
   * Clear all teams and stats from storage
   * This forces a fresh fetch from Yahoo API
   */
  clearAllTeams(): void {
    if (typeof window === 'undefined') return
    
    try {
      sessionStorage.removeItem(STORAGE_KEY)
      this.teams = []
      console.log('✅ Cleared all teams and stats from storage')
      // Dispatch event to notify other components
      window.dispatchEvent(new Event('teamsStorageUpdated'))
    } catch (e) {
      console.error('Error clearing teams from storage:', e)
    }
  }
}

export const teamManager = new TeamManager()

