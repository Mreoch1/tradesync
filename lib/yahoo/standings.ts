/**
 * Standings Parser
 * 
 * Dedicated parser for team standings with fail-fast error handling.
 * Never allows silent 0-0-0 defaults.
 */

import { makeApiRequest } from './client'
import { normalizeYahooNode, findFirstPath } from './normalize'
import type { YahooTeam } from '../yahooFantasyApi'

/**
 * Extract standings from team data
 * 
 * Searches through team array structure to find standings.
 * 
 * @param teamArray - Team array from Yahoo API response
 * @returns Object with wins, losses, ties, or null if not found
 */
function extractStandingsFromTeam(teamArray: any[]): { wins: number; losses: number; ties: number } | null {
  if (!Array.isArray(teamArray)) {
    return null
  }
  
  // Try multiple possible paths
  const standings = findFirstPath(
    { teamArray },
    [
      'teamArray.2.team_standings.outcome_totals',
      'teamArray.1.team_standings.outcome_totals',
      'teamArray.0.team_standings.outcome_totals',
    ]
  )
  
  if (!standings) {
    // Search through array elements
    for (const item of teamArray) {
      if (item?.team_standings?.outcome_totals) {
        const ot = item.team_standings.outcome_totals
        return {
          wins: parseInt(ot.wins || ot.win || '0', 10) || 0,
          losses: parseInt(ot.losses || ot.loss || '0', 10) || 0,
          ties: parseInt(ot.ties || ot.tie || '0', 10) || 0,
        }
      }
      if (item?.outcome_totals) {
        const ot = item.outcome_totals
        return {
          wins: parseInt(ot.wins || ot.win || '0', 10) || 0,
          losses: parseInt(ot.losses || ot.loss || '0', 10) || 0,
          ties: parseInt(ot.ties || ot.tie || '0', 10) || 0,
        }
      }
    }
    return null
  }
  
  return {
    wins: parseInt(standings.wins || standings.win || '0', 10) || 0,
    losses: parseInt(standings.losses || standings.loss || '0', 10) || 0,
    ties: parseInt(standings.ties || standings.tie || '0', 10) || 0,
  }
}

/**
 * Get standings from league standings endpoint
 * 
 * Fallback method when standings are not in team response.
 * 
 * @param accessToken - OAuth access token
 * @param leagueKey - League key
 * @returns Map of team_key -> { wins, losses, ties }
 */
async function getStandingsFromEndpoint(
  accessToken: string,
  leagueKey: string
): Promise<Map<string, { wins: number; losses: number; ties: number }>> {
  const standingsMap = new Map<string, { wins: number; losses: number; ties: number }>()
  
  try {
    const response = await makeApiRequest(`league/${leagueKey}/standings`, accessToken)
    const league = response.fantasy_content?.league
    
    if (!Array.isArray(league) || league.length < 2) {
      return standingsMap
    }
    
    const standingsData = league[1]?.standings
    if (!standingsData || typeof standingsData !== 'object') {
      return standingsMap
    }
    
    // Extract standings for each team
    Object.values(standingsData).forEach((standingObj: any) => {
      if (typeof standingObj !== 'object' || !standingObj.team) return
      
      const standingTeamArray = standingObj.team
      if (!Array.isArray(standingTeamArray)) return
      
      const teamData = normalizeYahooNode(standingTeamArray)
      const teamKey = teamData?.team_key
      if (!teamKey) return
      
      // Extract standings
      const standings = findFirstPath(
        { teamArray: standingTeamArray },
        [
          'teamArray.2.team_standings.outcome_totals',
          'teamArray.1.team_standings.outcome_totals',
        ]
      )
      
      if (standings) {
        standingsMap.set(teamKey, {
          wins: parseInt(standings.wins || standings.win || '0', 10) || 0,
          losses: parseInt(standings.losses || standings.loss || '0', 10) || 0,
          ties: parseInt(standings.ties || standings.tie || '0', 10) || 0,
        })
      }
    })
  } catch (error: any) {
    console.warn(`[Standings] Failed to fetch from standings endpoint: ${error.message}`)
  }
  
  return standingsMap
}

/**
 * Parse standings for teams
 * 
 * Rules:
 * 1. Search local team response first
 * 2. If missing, call league standings endpoint
 * 3. Fail fast if standings cannot be found
 * 
 * @param accessToken - OAuth access token
 * @param leagueKey - League key
 * @param teams - Array of Yahoo teams with team data
 * @returns Teams with standings attached
 * @throws Error if standings cannot be determined for any team
 */
export async function parseStandings(
  accessToken: string,
  leagueKey: string,
  teams: YahooTeam[]
): Promise<YahooTeam[]> {
  const teamsWithStandings: YahooTeam[] = []
  const teamsWithoutStandings: string[] = []
  
  // First pass: try to extract from team data
  for (const team of teams) {
    // If team already has standings, use them
    if (team.wins !== undefined || team.losses !== undefined || team.ties !== undefined) {
      teamsWithStandings.push(team)
      continue
    }
    
    // Mark as needing standings
    teamsWithoutStandings.push(team.team_key)
  }
  
  // If all teams have standings, return early
  if (teamsWithoutStandings.length === 0) {
    return teams
  }
  
  // Second pass: fetch from standings endpoint
  const standingsMap = await getStandingsFromEndpoint(accessToken, leagueKey)
  
  // Attach standings to teams
  for (const team of teams) {
    if (teamsWithoutStandings.includes(team.team_key)) {
      const standings = standingsMap.get(team.team_key)
      if (standings) {
        teamsWithStandings.push({
          ...team,
          wins: standings.wins,
          losses: standings.losses,
          ties: standings.ties,
        })
      } else {
        // Still no standings - this is an error condition
        teamsWithoutStandings.push(team.team_key)
      }
    } else {
      teamsWithStandings.push(team)
    }
  }
  
  // Fail fast if any teams are missing standings
  if (teamsWithoutStandings.length > 0) {
    const teamNames = teams
      .filter(t => teamsWithoutStandings.includes(t.team_key))
      .map(t => t.name)
      .join(', ')
    
    throw new Error(
      `Failed to determine standings for ${teamsWithoutStandings.length} team(s): ${teamNames}. ` +
      'Standings are required for accurate team records.'
    )
  }
  
  return teamsWithStandings
}

