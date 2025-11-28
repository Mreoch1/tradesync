import { Trade, TradeAnalysis } from '@/types'

/**
 * Downloads a trade analysis as a JSON file
 */
export function downloadTrade(trade: Trade, analysis: TradeAnalysis): void {
  const sideAValue = analysis.sideAAnalysis.totalValue
  const sideBValue = analysis.sideBAnalysis.totalValue
  const score = sideAValue - sideBValue
  const scoreDisplay = score > 0 ? `+${score.toFixed(1)}` : score.toFixed(1)

  const tradeData = {
    trade: {
      id: trade.id,
      createdAt: trade.createdAt?.toISOString(),
      leagueSettings: trade.leagueSettings,
    },
    sideA: {
      players: trade.sideA.players.map(p => ({
        name: p.name,
        position: p.position,
        team: p.team,
        value: p.value,
      })),
      picks: trade.sideA.picks,
      totalValue: sideAValue,
    },
    sideB: {
      players: trade.sideB.players.map(p => ({
        name: p.name,
        position: p.position,
        team: p.team,
        value: p.value,
      })),
      picks: trade.sideB.picks,
      totalValue: sideBValue,
    },
    analysis: {
      score: score,
      scoreDisplay: scoreDisplay,
      recommendation: analysis.recommendation,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
      sideAAnalysis: analysis.sideAAnalysis,
      sideBAnalysis: analysis.sideBAnalysis,
    },
  }

  const blob = new Blob([JSON.stringify(tradeData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `trade-analysis-${trade.id}-${Date.now()}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Downloads a trade analysis as a CSV file
 */
export function downloadTradeAsCSV(trade: Trade, analysis: TradeAnalysis): void {
  const sideAValue = analysis.sideAAnalysis.totalValue
  const sideBValue = analysis.sideBAnalysis.totalValue
  const score = sideAValue - sideBValue
  const scoreDisplay = score > 0 ? `+${score.toFixed(1)}` : score.toFixed(1)

  const rows: string[] = []

  // Header
  rows.push('Trade Analysis')
  rows.push(`Date: ${trade.createdAt?.toLocaleString() || 'N/A'}`)
  rows.push(`Score: ${scoreDisplay}`)
  rows.push(`Recommendation: ${analysis.recommendation.toUpperCase()}`)
  rows.push(`Confidence: ${analysis.confidence}%`)
  rows.push('')

  // Side A
  rows.push('Side A')
  rows.push('Player,Position,Team,Value')
  trade.sideA.players.forEach(player => {
    rows.push(`"${player.name}",${player.position},${player.team},${player.value?.toFixed(1) || '0.0'}`)
  })
  if (trade.sideA.picks && trade.sideA.picks.length > 0) {
    rows.push('Draft Picks')
    trade.sideA.picks.forEach(pick => {
      rows.push(`${pick.year} Round ${pick.round}`)
    })
  }
  rows.push(`Total Value: ${sideAValue.toFixed(1)}`)
  rows.push('')

  // Side B
  rows.push('Side B')
  rows.push('Player,Position,Team,Value')
  trade.sideB.players.forEach(player => {
    rows.push(`"${player.name}",${player.position},${player.team},${player.value?.toFixed(1) || '0.0'}`)
  })
  if (trade.sideB.picks && trade.sideB.picks.length > 0) {
    rows.push('Draft Picks')
    trade.sideB.picks.forEach(pick => {
      rows.push(`${pick.year} Round ${pick.round}`)
    })
  }
  rows.push(`Total Value: ${sideBValue.toFixed(1)}`)
  rows.push('')

  // Analysis
  rows.push('Analysis')
  analysis.reasoning.forEach(reason => {
    rows.push(`"${reason}"`)
  })

  const csvContent = rows.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `trade-analysis-${trade.id}-${Date.now()}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

