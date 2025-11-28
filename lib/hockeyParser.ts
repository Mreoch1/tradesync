import { Player } from '@/types'

/**
 * Parses Yahoo Sports Fantasy Hockey roster data
 * Handles the format with positions, names, teams, ranks, percentages, and stats
 */
export function parseYahooHockeyRoster(text: string): Player[] {
  const players: Player[] = []
  const lines = text.split('\n').filter(line => line.trim())

  let inForwardsSection = false
  let inGoaltendersSection = false
  let headerFound = false

  lines.forEach((line, index) => {
    const trimmedLine = line.trim()

    // Skip empty lines
    if (!trimmedLine) return

    // Detect section headers
    if (trimmedLine.includes('Forwards/Defensemen roster')) {
      inForwardsSection = true
      inGoaltendersSection = false
      headerFound = true
      return
    }

    if (trimmedLine.includes('Goaltenders roster')) {
      inForwardsSection = false
      inGoaltendersSection = true
      headerFound = true
      return
    }

    // Skip header rows and totals
    if (trimmedLine.includes('Rankings') || 
        trimmedLine.includes('Fantasy') || 
        trimmedLine.includes('Starting Lineup Totals') ||
        trimmedLine.includes('Details') ||
        trimmedLine.includes('Goaltender Appearances') ||
        trimmedLine.includes('Team analysis') ||
        trimmedLine.includes('Yahoo Sports')) {
      return
    }

    // Skip column headers
    if (!headerFound) return
    if (trimmedLine.match(/^Pos\s+Forwards|^Pos\s+Goaltenders/)) return
    if (trimmedLine.match(/^Pos\s+.*Opp.*Pre-Season.*Current/)) return

    // Extract position (C, LW, RW, D, G, BN, IR, IR+, Util)
    const positionMatch = trimmedLine.match(/^(C|LW|RW|D|G|BN|IR|IR\+|Util)\s+/)
    if (!positionMatch) return

    const rosterPosition = positionMatch[1]
    const actualPosition = ['BN', 'IR', 'IR+', 'Util'].includes(rosterPosition) ? '' : rosterPosition
    
    // Extract player name
    // Pattern: "Macklin Celebrini" or "Macklin CelebriniPlayer Note" or "Macklin CelebriniNew Player Note"
    const nameMatch = trimmedLine.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/)
    if (!nameMatch) return

    let playerName = nameMatch[1]
    // Clean up player name
    playerName = playerName.replace(/\s*(Player Note|New Player Note|DTD|IR|IR-LT|No new player Notes)\s*/gi, '').trim()

    // Extract team and positions from pattern like "SJ - C" or "NYR - LW,RW"
    let team = ''
    let positions = actualPosition
    const teamMatch = trimmedLine.match(/([A-Z]{2,3})\s*-\s*([A-Z](?:,\s*[A-Z]+)*)/)
    if (teamMatch) {
      team = teamMatch[1]
      positions = teamMatch[2].replace(/\s/g, '') // Remove spaces
    } else {
      // Try to find team abbreviation after the name
      const teamAfterName = trimmedLine.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\s+([A-Z]{2,3})/)
      if (teamAfterName) {
        team = teamAfterName[1]
      }
    }

    if (!team) return

    // Extract status
    let status: Player['status'] = 'healthy'
    if (trimmedLine.includes('IR-LT')) status = 'IR-LT'
    else if (trimmedLine.match(/\bIR\b/)) status = 'IR'
    else if (trimmedLine.includes('DTD')) status = 'DTD'
    else if (trimmedLine.includes('OUT')) status = 'OUT'

    // Extract rank (first number in line)
    const rankMatch = trimmedLine.match(/\b(\d+)\b/)
    const rank = rankMatch ? parseInt(rankMatch[1]) : undefined

    // Extract percentages (% Start, % ROS)
    const percentMatches = trimmedLine.match(/(\d+)%/g) || []
    const startPercentage = percentMatches[0] ? parseInt(percentMatches[0]) : undefined
    const rosPercentage = percentMatches[1] ? parseInt(percentMatches[1]) : undefined

    // Extract stats - these come after the percentages
    // For skaters: G, A, P, +/-, PIM, PPP, SHP, GWG, SOG, FW, HIT, BLK
    // For goalies: GS, W, L, GA, GAA, SV, SA, SV%, SHO
    const stats: any = {}
    const statSection = trimmedLine.substring(trimmedLine.lastIndexOf('%') + 1).trim()
    const statValues = statSection.split(/\s+/).filter(s => s && s !== '-')

    if (inGoaltendersSection || positions === 'G') {
      // Goaltender stats: GS, W, L, GA, GAA, SV, SA, SV%, SHO
      if (statValues.length >= 3) {
        if (statValues[0] !== '-') stats.gs = parseFloat(statValues[0])
        if (statValues[1] !== '-') stats.wins = parseFloat(statValues[1])
        if (statValues[2] !== '-') stats.losses = parseFloat(statValues[2])
        if (statValues[3] !== '-') stats.ga = parseFloat(statValues[3])
        if (statValues[4] !== '-') stats.gaa = parseFloat(statValues[4])
        if (statValues[5] !== '-') stats.sv = parseFloat(statValues[5])
        if (statValues[6] !== '-') stats.sa = parseFloat(statValues[6])
        if (statValues[7] !== '-') stats.svp = parseFloat(statValues[7].replace('%', '')) / 100
        if (statValues[8] !== '-') stats.sho = parseFloat(statValues[8])
      }
    } else {
      // Skater stats: G, A, P, +/-, PIM, PPP, SHP, GWG, SOG, FW, HIT, BLK
      if (statValues.length >= 3) {
        if (statValues[0] !== '-') stats.goals = parseFloat(statValues[0])
        if (statValues[1] !== '-') stats.hockeyAssists = parseFloat(statValues[1])
        if (statValues[2] !== '-') stats.hockeyPoints = parseFloat(statValues[2])
        
        // Handle +/- which can be negative
        const plusMinusMatch = trimmedLine.match(/([+-]?\d+)\s+(?=\d+\s+[A-Z])/i)
        if (plusMinusMatch) stats.plusMinus = parseFloat(plusMinusMatch[1])
        
        if (statValues[4] !== '-') stats.pim = parseFloat(statValues[4])
        if (statValues[5] !== '-') stats.ppp = parseFloat(statValues[5])
        if (statValues[6] !== '-') stats.shp = parseFloat(statValues[6])
        if (statValues[7] !== '-') stats.gwg = parseFloat(statValues[7])
        if (statValues[8] !== '-') stats.sog = parseFloat(statValues[8])
        if (statValues[9] !== '-') stats.fw = parseFloat(statValues[9])
        if (statValues[10] !== '-') stats.hit = parseFloat(statValues[10])
        if (statValues[11] !== '-') stats.blk = parseFloat(statValues[11])
      }
    }

    // Create player object
    if (playerName && team) {
      const player: Player = {
        id: `hockey-${team.toLowerCase()}-${playerName.toLowerCase().replace(/\s+/g, '-')}-${index}`,
        name: playerName,
        position: positions || actualPosition || 'C',
        team: team,
        stats: Object.keys(stats).length > 0 ? stats : undefined,
        rank,
        startPercentage,
        rosPercentage,
        status,
        value: calculateHockeyValue(stats, positions || actualPosition || 'C'),
      }
      players.push(player)
    }
  })

  return players.filter(p => p.name && p.team) // Filter out any empty entries
}

/**
 * Calculates a player's fantasy value based on hockey stats
 * Uses the same weighted algorithm as yahooParser for consistency
 */
function calculateHockeyValue(stats: any, position: string): number {
  const isGoalie = position === 'G' || stats.gs !== undefined
  
  if (isGoalie) {
    return calculateGoalieValueFromStats(stats)
  } else {
    return calculateSkaterValueFromStats(stats, position)
  }
}

/**
 * Calculate goalie value (same weights as yahooParser)
 */
function calculateGoalieValueFromStats(stats: any): number {
  let value = 0
  
  // Wins - most important
  if (stats.wins !== undefined) {
    value += (stats.wins || 0) * 3.5
  }
  
  // Save Percentage
  if (stats.svp !== undefined && stats.svp > 0) {
    const svpValue = stats.svp < 1.0 ? stats.svp * 100 : stats.svp
    value += Math.max(0, (svpValue - 85) * 2)
  }
  
  // Goals Against Average (lower is better)
  if (stats.gaa !== undefined && stats.gaa > 0) {
    value += (3.00 - stats.gaa) * 8.0
  }
  
  // Shutouts
  if (stats.sho !== undefined) {
    value += (stats.sho || 0) * 4.0
  }
  
  // Games Started
  if (stats.gs !== undefined) {
    value += (stats.gs || 0) * 0.3
  }
  
  // Saves
  if (stats.sv !== undefined) {
    value += (stats.sv || 0) * 0.02
  }
  
  // Goals Against
  if (stats.ga !== undefined) {
    value -= (stats.ga || 0) * 0.1
  }
  
  // Normalize and clamp (max 99.9)
  let normalizedValue = (value / 2.0) + 15
  normalizedValue = Math.max(10, Math.min(99.9, normalizedValue))
  
  return Math.round(normalizedValue * 10) / 10
}

/**
 * Calculate skater value (same weights as yahooParser)
 */
function calculateSkaterValueFromStats(stats: any, position?: string): number {
  let value = 0

  // Goals
  if (stats.goals !== undefined) {
    value += (stats.goals || 0) * 4.0
  }
  
  // Assists
  if (stats.hockeyAssists !== undefined) {
    value += (stats.hockeyAssists || 0) * 3.0
  }
  
  // If we have hockeyPoints but not individual G/A, use it
  if (stats.hockeyPoints !== undefined && stats.goals === undefined && stats.hockeyAssists === undefined) {
    value += (stats.hockeyPoints || 0) * 3.4
    }
  
  // Power Play Points
  if (stats.ppp !== undefined) {
    value += (stats.ppp || 0) * 1.5
  }
  
  // Short Handed Points
  if (stats.shp !== undefined) {
    value += (stats.shp || 0) * 2.0
    }
  
  // Game Winning Goals
  if (stats.gwg !== undefined) {
    value += (stats.gwg || 0) * 1.0
  }
  
  // Plus/Minus
  if (stats.plusMinus !== undefined) {
    value += (stats.plusMinus || 0) * 0.8
  }
  
  // Shots on Goal
  if (stats.sog !== undefined) {
    value += (stats.sog || 0) * 0.15
  }
  
  // Hits
  if (stats.hit !== undefined) {
    value += (stats.hit || 0) * 0.25
  }
  
  // Blocks
  if (stats.blk !== undefined) {
    value += (stats.blk || 0) * 0.3
  }
  
  // Faceoff Wins (centers only)
  if (stats.fw !== undefined && position && (position.includes('C') || position === 'C')) {
    value += (stats.fw || 0) * 0.1
  }
  
  // Penalty Minutes (slight negative)
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
  
  // Normalize and clamp (max 99.9)
  let normalizedValue = (value / 2.5) + 20
  normalizedValue = Math.max(10, Math.min(99.9, normalizedValue))
  
  return Math.round(normalizedValue * 10) / 10
}
