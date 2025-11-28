import { Trade, TradeAnalysis, SideAnalysis, Player, TradeSide } from '@/types'

/**
 * Analyzes a fantasy sports trade and provides recommendations
 */
export function analyzeTrade(trade: Trade): TradeAnalysis {
  const sideAAnalysis = analyzeSide(trade.sideA)
  const sideBAnalysis = analyzeSide(trade.sideB)

  const recommendation = determineRecommendation(sideAAnalysis, sideBAnalysis)
  const confidence = calculateConfidence(sideAAnalysis, sideBAnalysis)
  const reasoning = generateReasoning(sideAAnalysis, sideBAnalysis, recommendation)

  return {
    trade,
    sideAAnalysis,
    sideBAnalysis,
    recommendation,
    confidence,
    reasoning,
  }
}

/**
 * Analyzes one side of a trade
 */
function analyzeSide(side: TradeSide): SideAnalysis {
  const totalValue = calculateTotalValue(side.players)
  const positionalValue = calculatePositionalValue(side.players)
  const projectedPoints = calculateProjectedPoints(side.players)
  const needs = identifyNeeds(side.players)
  const strengths = identifyStrengths(side.players)
  const weaknesses = identifyWeaknesses(side.players)

  return {
    totalValue,
    positionalValue,
    projectedPoints,
    needs,
    strengths,
    weaknesses,
  }
}

/**
 * Calculates the total value of players in a trade side
 */
function calculateTotalValue(players: Player[]): number {
  return players.reduce((sum, player) => sum + (player.value || 0), 0)
}

/**
 * Calculates positional value distribution
 */
function calculatePositionalValue(players: Player[]): { [position: string]: number } {
  const positional: { [position: string]: number } = {}
  
  players.forEach(player => {
    const position = player.position || 'UNKNOWN'
    positional[position] = (positional[position] || 0) + (player.value || 0)
  })

  return positional
}

/**
 * Calculates projected points for players
 */
function calculateProjectedPoints(players: Player[]): number | undefined {
  return players.reduce((sum, player) => {
    return sum + (player.projectedStats?.points || player.stats?.points || 0)
  }, 0)
}

/**
 * Identifies team needs based on roster
 */
function identifyNeeds(players: Player[]): string[] {
  const needs: string[] = []
  const positions = players.map(p => p.position).filter(Boolean)
  
  // Simple logic - can be enhanced based on league settings
  const positionCounts: { [key: string]: number } = {}
  positions.forEach(pos => {
    positionCounts[pos] = (positionCounts[pos] || 0) + 1
  })

  // Example: identify if missing key positions
  if (!positionCounts['QB'] && positions.some(p => p.includes('QB'))) {
    needs.push('Quarterback depth')
  }

  return needs
}

/**
 * Identifies team strengths
 */
function identifyStrengths(players: Player[]): string[] {
  const strengths: string[] = []
  
  if (players.length === 0) return strengths
  
  const values = players.map(p => p.value || 0).filter(v => v > 0)
  if (values.length === 0) return strengths
  
  const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length
  const highValuePlayers = players.filter(p => (p.value || 0) > 75)
  const midValuePlayers = players.filter(p => (p.value || 0) > 50 && (p.value || 0) <= 75)
  
  if (highValuePlayers.length > 0) {
    strengths.push(`Elite players: ${highValuePlayers.map(p => p.name).join(', ')}`)
  }
  
  if (midValuePlayers.length >= 2) {
    strengths.push(`Solid depth with ${midValuePlayers.length} quality players`)
  }
  
  if (avgValue > 60) {
    strengths.push(`High average player value (${avgValue.toFixed(1)})`)
  }
  
  // Check for positional diversity
  const positions = new Set(players.map(p => p.position).filter(Boolean))
  if (positions.size >= 3) {
    strengths.push(`Good positional diversity across ${positions.size} positions`)
  }

  return strengths
}

/**
 * Identifies team weaknesses
 */
function identifyWeaknesses(players: Player[]): string[] {
  const weaknesses: string[] = []
  
  if (players.length === 0) {
    weaknesses.push('No players in this side')
    return weaknesses
  }
  
  const values = players.map(p => p.value || 0).filter(v => v > 0)
  if (values.length === 0) {
    weaknesses.push('No player values available')
    return weaknesses
  }
  
  const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length
  const lowValuePlayers = players.filter(p => (p.value || 0) < 30)
  const veryLowValuePlayers = players.filter(p => (p.value || 0) < 15)
  
  if (veryLowValuePlayers.length > 0) {
    weaknesses.push(`Very low-value players: ${veryLowValuePlayers.map(p => p.name).join(', ')}`)
  } else if (lowValuePlayers.length > 0) {
    weaknesses.push(`${lowValuePlayers.length} players with below-average value`)
  }
  
  if (avgValue < 40 && players.length > 1) {
    weaknesses.push(`Low average player value (${avgValue.toFixed(1)})`)
  }
  
  // Check for lack of star power
  const starPlayers = players.filter(p => (p.value || 0) > 75)
  if (starPlayers.length === 0 && players.length > 1) {
    weaknesses.push('Lacks elite/top-tier players')
  }
  
  // Check for positional imbalance
  if (players.length > 1) {
    const positionCounts: { [key: string]: number } = {}
    players.forEach(p => {
      if (p.position) {
        positionCounts[p.position] = (positionCounts[p.position] || 0) + 1
      }
    })
    const maxCount = Math.max(...Object.values(positionCounts))
    if (maxCount >= players.length * 0.6 && players.length > 2) {
      weaknesses.push('Heavy concentration at single position')
    }
  }

  return weaknesses
}

/**
 * Determines trade recommendation based on multiple factors
 */
function determineRecommendation(
  sideA: SideAnalysis,
  sideB: SideAnalysis
): 'accept' | 'decline' | 'counter' {
  const valueDifference = sideA.totalValue - sideB.totalValue
  const totalValue = Math.max(sideA.totalValue, sideB.totalValue) || 1
  
  // Calculate percentage difference
  const percentageDiff = (Math.abs(valueDifference) / totalValue) * 100
  
  // Accept if within 5% value difference
  if (percentageDiff <= 5) {
    return 'accept'
  }
  
  // If side A is significantly better (more than 15% difference), decline
  if (valueDifference > totalValue * 0.15) {
    return 'decline'
  }
  
  // If side B is significantly better, decline (from side A perspective)
  if (valueDifference < -totalValue * 0.15) {
    return 'decline'
  }
  
  // For moderate differences (5-15%), recommend counter
  return 'counter'
}

/**
 * Calculates confidence level (0-100) based on multiple factors
 */
function calculateConfidence(
  sideA: SideAnalysis,
  sideB: SideAnalysis
): number {
  const valueDifference = Math.abs(sideA.totalValue - sideB.totalValue)
  const totalValue = Math.max(sideA.totalValue, sideB.totalValue)
  
  if (totalValue === 0) return 50

  const percentageDifference = (valueDifference / totalValue) * 100
  
  let confidence = 50 // Base confidence
  
  // Adjust based on value difference
  // Larger differences = higher confidence in recommendation
  if (percentageDifference > 15) {
    confidence = 85 + Math.min(10, (percentageDifference - 15) / 2)
  } else if (percentageDifference > 10) {
    confidence = 75 + ((percentageDifference - 10) * 2)
  } else if (percentageDifference > 5) {
    confidence = 60 + ((percentageDifference - 5) * 3)
  } else {
    confidence = 50 + (percentageDifference * 2)
  }
  
  // Boost confidence if both sides have projected points
  if (sideA.projectedPoints !== undefined && sideB.projectedPoints !== undefined) {
    confidence += 5
  }
  
  // Reduce confidence if there's a mismatch in number of players
  const playerCountDiff = Math.abs(sideA.totalValue > 0 ? 1 : 0 - (sideB.totalValue > 0 ? 1 : 0))
  if (playerCountDiff > 2) {
    confidence -= 5
  }
  
  return Math.min(95, Math.max(50, Math.round(confidence)))
}

/**
 * Generates comprehensive reasoning for the recommendation
 */
function generateReasoning(
  sideA: SideAnalysis,
  sideB: SideAnalysis,
  recommendation: 'accept' | 'decline' | 'counter'
): string[] {
  const reasoning: string[] = []
  const valueDifference = sideA.totalValue - sideB.totalValue
  const totalValue = Math.max(sideA.totalValue, sideB.totalValue) || 1
  const percentageDiff = (Math.abs(valueDifference) / totalValue) * 100

  // Value analysis
  if (Math.abs(valueDifference) < 1) {
    reasoning.push('Trade is essentially equal in total value')
  } else if (valueDifference > 0) {
    reasoning.push(
      `Side A has ${valueDifference.toFixed(1)} more value (${percentageDiff.toFixed(1)}% advantage)`
    )
  } else {
    reasoning.push(
      `Side B has ${Math.abs(valueDifference).toFixed(1)} more value (${percentageDiff.toFixed(1)}% advantage)`
    )
  }

  // Projected points analysis
  if (sideA.projectedPoints !== undefined && sideB.projectedPoints !== undefined) {
    const pointsDiff = sideA.projectedPoints - sideB.projectedPoints
    if (Math.abs(pointsDiff) > 1) {
      reasoning.push(
        `Projected points: Side ${pointsDiff > 0 ? 'A' : 'B'} favored by ${Math.abs(pointsDiff).toFixed(1)} points`
      )
    } else {
      reasoning.push('Projected points are nearly identical between sides')
    }
  }

  // Positional balance
  const sideAPositions = Object.keys(sideA.positionalValue).length
  const sideBPositions = Object.keys(sideB.positionalValue).length
  if (sideAPositions !== sideBPositions) {
    reasoning.push(
      `Positional diversity differs: Side A has ${sideAPositions} positions, Side B has ${sideBPositions}`
    )
  }

  // Strengths comparison
  if (sideA.strengths.length > sideB.strengths.length && sideA.strengths.length > 0) {
    reasoning.push('Side A shows stronger overall roster quality')
  } else if (sideB.strengths.length > sideA.strengths.length && sideB.strengths.length > 0) {
    reasoning.push('Side B shows stronger overall roster quality')
  }

  // Weaknesses warning
  if (sideA.weaknesses.length > sideB.weaknesses.length && sideA.weaknesses.length > 0) {
    reasoning.push('Side A has more identified weaknesses to consider')
  } else if (sideB.weaknesses.length > sideA.weaknesses.length && sideB.weaknesses.length > 0) {
    reasoning.push('Side B has more identified weaknesses to consider')
  }

  // Recommendation reasoning
  if (recommendation === 'accept') {
    reasoning.push('Recommendation: ACCEPT - Trade is fair and balanced')
  } else if (recommendation === 'decline') {
    if (valueDifference > 0) {
      reasoning.push('Recommendation: DECLINE - You would be giving up too much value')
    } else {
      reasoning.push('Recommendation: DECLINE - You would be receiving insufficient value')
    }
  } else {
    reasoning.push('Recommendation: COUNTER - Consider negotiating for better value balance')
  }

  return reasoning
}

