'use client'

import { useEffect, useState, useMemo } from 'react'
import { Player, DraftPick } from '@/types'
import { Team } from '@/types/teams'
import { teamManager } from '@/lib/teamManager'
import { getDraftPickValue, getDraftPickDescription } from '@/lib/draftPickValues'
import Card from './ui/Card'
import Button from './ui/Button'
import Link from 'next/link'

export default function TradeBlock() {
  const [tradeBlock, setTradeBlock] = useState<Player[]>([])
  const [draftPicks, setDraftPicks] = useState<DraftPick[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [showAddPick, setShowAddPick] = useState<string | null>(null)
  const [newPick, setNewPick] = useState<{ teamId: string; year: number; round: number }>({
    teamId: '',
    year: new Date().getFullYear() + 1,
    round: 1,
  })

  useEffect(() => {
    // Load teams
    setTeams(teamManager.getTeams())

    // Load trade block from sessionStorage
    const saved = sessionStorage.getItem('tradeBlock')
    if (saved) {
      try {
        setTradeBlock(JSON.parse(saved))
      } catch (e) {
        console.error('Error loading trade block:', e)
      }
    }

    // Load draft picks from sessionStorage
    const savedPicks = sessionStorage.getItem('tradeBlockPicks')
    if (savedPicks) {
      try {
        const picks = JSON.parse(savedPicks)
        setDraftPicks(picks.map((pick: DraftPick) => ({
          ...pick,
          value: getDraftPickValue(pick.round),
        })))
      } catch (e) {
        console.error('Error loading draft picks:', e)
      }
    }

    // Listen for storage events
    const handleStorageChange = () => {
      const updated = sessionStorage.getItem('tradeBlock')
      if (updated) {
        try {
          setTradeBlock(JSON.parse(updated))
        } catch (e) {
          console.error('Error loading trade block:', e)
        }
      } else {
        setTradeBlock([])
      }

      const updatedPicks = sessionStorage.getItem('tradeBlockPicks')
      if (updatedPicks) {
        try {
          const picks = JSON.parse(updatedPicks)
          setDraftPicks(picks.map((pick: DraftPick) => ({
            ...pick,
            value: getDraftPickValue(pick.round),
          })))
        } catch (e) {
          console.error('Error loading draft picks:', e)
        }
      } else {
        setDraftPicks([])
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('tradeBlockUpdated', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('tradeBlockUpdated', handleStorageChange)
    }
  }, [])

  // Categorize players and picks by team
  const itemsByTeam = useMemo(() => {
    const teamMap: { [teamId: string]: { team: Team; players: Player[]; picks: DraftPick[]; value: number } } = {}
    
    // Add players
    tradeBlock.forEach(player => {
      // Find which team this player belongs to
      for (const team of teams) {
        if (team.players.some(tp => tp.id === player.id)) {
          if (!teamMap[team.id]) {
            teamMap[team.id] = { team, players: [], picks: [], value: 0 }
          }
          teamMap[team.id].players.push(player)
          teamMap[team.id].value += player.value || 0
          break
        }
      }
    })

    // Add draft picks
    draftPicks.forEach(pick => {
      if (!teamMap[pick.teamId]) {
        const team = teams.find(t => t.id === pick.teamId)
        if (team) {
          teamMap[pick.teamId] = { team, players: [], picks: [], value: 0 }
        }
      }
      if (teamMap[pick.teamId]) {
        teamMap[pick.teamId].picks.push(pick)
        teamMap[pick.teamId].value += pick.value || 0
      }
    })
    
    return Object.values(teamMap)
  }, [tradeBlock, draftPicks, teams])

  // Calculate trade analysis
  const tradeAnalysis = useMemo(() => {
    if (itemsByTeam.length !== 2) {
      return null
    }

    const [team1, team2] = itemsByTeam
    const team1Value = team1.value
    const team2Value = team2.value
    
    // Team 1 gains team2Value, loses team1Value
    // Team 2 gains team1Value, loses team2Value
    const team1Net = team2Value - team1Value  // What team 1 gains
    const team2Net = team1Value - team2Value  // What team 2 gains
    
    return {
      team1: {
        ...team1,
        netValue: team1Net,
      },
      team2: {
        ...team2,
        netValue: team2Net,
      },
      winner: team1Net > team2Net ? team1.team : team1Net < team2Net ? team2.team : null,
    }
  }, [itemsByTeam])

  const handleRemove = (playerId: string) => {
    const updated = tradeBlock.filter(p => p.id !== playerId)
    setTradeBlock(updated)
    sessionStorage.setItem('tradeBlock', JSON.stringify(updated))
    window.dispatchEvent(new Event('tradeBlockUpdated'))
  }

  const handleAddDraftPick = () => {
    if (!newPick.teamId || !newPick.round || !newPick.year) return

    const pick: DraftPick = {
      id: `pick-${Date.now()}-${Math.random()}`,
      year: newPick.year,
      round: newPick.round,
      teamId: newPick.teamId,
      value: getDraftPickValue(newPick.round),
    }

    const updated = [...draftPicks, pick]
    setDraftPicks(updated)
    sessionStorage.setItem('tradeBlockPicks', JSON.stringify(updated))
    setShowAddPick(null)
    setNewPick({ teamId: '', year: new Date().getFullYear() + 1, round: 1 })
    window.dispatchEvent(new Event('tradeBlockUpdated'))
  }

  const handleRemoveDraftPick = (pickId: string) => {
    const updated = draftPicks.filter(p => p.id !== pickId)
    setDraftPicks(updated)
    sessionStorage.setItem('tradeBlockPicks', JSON.stringify(updated))
    window.dispatchEvent(new Event('tradeBlockUpdated'))
  }

  const handleClear = () => {
    setTradeBlock([])
    setDraftPicks([])
    sessionStorage.removeItem('tradeBlock')
    sessionStorage.removeItem('tradeBlockPicks')
    window.dispatchEvent(new Event('tradeBlockUpdated'))
  }

  if (tradeBlock.length === 0 && draftPicks.length === 0) {
    return (
      <Card title="Trade Block">
        <div className="text-center py-10">
          <div className="text-gray-400 text-sm mb-2">No items in trade block</div>
          <div className="text-xs text-gray-500 leading-relaxed">
            Add players and draft picks from different teams to analyze the trade
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card title="Trade Block">
      <div className="space-y-4">
        {/* Trade Analysis - Show only if 2 teams */}
        {tradeAnalysis && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Team 1 */}
              <div className={`p-4 rounded-lg border-2 ${
                tradeAnalysis.winner?.id === tradeAnalysis.team1.team.id
                  ? 'bg-emerald-50 border-emerald-300'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  {tradeAnalysis.team1.team.name}
                </div>
                <div className={`text-2xl font-bold ${
                  tradeAnalysis.team1.netValue > 0
                    ? 'text-emerald-700'
                    : tradeAnalysis.team1.netValue < 0
                    ? 'text-red-700'
                    : 'text-gray-700'
                }`}>
                  {tradeAnalysis.team1.netValue > 0 ? '+' : ''}{tradeAnalysis.team1.netValue.toFixed(1)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {tradeAnalysis.team1.players.length} player{tradeAnalysis.team1.players.length !== 1 ? 's' : ''}
                  {tradeAnalysis.team1.picks.length > 0 && `, ${tradeAnalysis.team1.picks.length} pick${tradeAnalysis.team1.picks.length !== 1 ? 's' : ''}`}
                </div>
              </div>

              {/* Team 2 */}
              <div className={`p-4 rounded-lg border-2 ${
                tradeAnalysis.winner?.id === tradeAnalysis.team2.team.id
                  ? 'bg-emerald-50 border-emerald-300'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  {tradeAnalysis.team2.team.name}
                </div>
                <div className={`text-2xl font-bold ${
                  tradeAnalysis.team2.netValue > 0
                    ? 'text-emerald-700'
                    : tradeAnalysis.team2.netValue < 0
                    ? 'text-red-700'
                    : 'text-gray-700'
                }`}>
                  {tradeAnalysis.team2.netValue > 0 ? '+' : ''}{tradeAnalysis.team2.netValue.toFixed(1)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {tradeAnalysis.team2.players.length} player{tradeAnalysis.team2.players.length !== 1 ? 's' : ''}
                  {tradeAnalysis.team2.picks.length > 0 && `, ${tradeAnalysis.team2.picks.length} pick${tradeAnalysis.team2.picks.length !== 1 ? 's' : ''}`}
                </div>
              </div>
            </div>

            {/* Winner Indicator */}
            {tradeAnalysis.winner && (
              <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-lg">
                <div className="text-sm font-semibold text-emerald-800 text-center">
                  🏆 {tradeAnalysis.winner.name} wins the trade
                </div>
              </div>
            )}

            {!tradeAnalysis.winner && (
              <div className="p-3 bg-gray-100 border border-gray-300 rounded-lg">
                <div className="text-sm font-semibold text-gray-700 text-center">
                  Trade is even
                </div>
              </div>
            )}
          </div>
        )}

        {!tradeAnalysis && (tradeBlock.length > 0 || draftPicks.length > 0) && (
          <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
            <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">
              Need 2 teams for trade analysis
            </div>
            <div className="text-sm text-amber-600">
              Add players and/or draft picks from 2 different teams to see trade analysis
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleClear} className="font-medium">
            Clear All
          </Button>
        </div>

        {/* Players and Picks by Team */}
        <div className="space-y-4">
          {itemsByTeam.map(({ team, players, picks, value }) => (
            <div key={team.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm text-gray-900">{team.name}</h4>
                <div className="text-xs text-gray-600">
                  Total Value: <span className="font-bold">{value.toFixed(1)}</span>
                </div>
              </div>

              {/* Players */}
              {players.length > 0 && (
                <div className="space-y-2 mb-3">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs text-slate-900 truncate">
                          {player.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {player.position} • {player.team}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <div className="text-xs text-gray-600 font-medium">
                          {player.value?.toFixed(1) || '0.0'}
                        </div>
                        <button
                          onClick={() => handleRemove(player.id)}
                          className="text-red-600 hover:text-red-700 font-bold text-lg leading-none px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors"
                          aria-label={`Remove ${player.name}`}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Draft Picks */}
              {picks.length > 0 && (
                <div className="space-y-2 mb-3">
                  {picks.map((pick) => (
                    <div
                      key={pick.id}
                      className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs text-slate-900">
                          {getDraftPickDescription(pick.year, pick.round)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Round {pick.round}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <div className="text-xs text-blue-600 font-medium">
                          {pick.value?.toFixed(1) || '0.0'}
                        </div>
                        <button
                          onClick={() => handleRemoveDraftPick(pick.id!)}
                          className="text-red-600 hover:text-red-700 font-bold text-lg leading-none px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors"
                          aria-label={`Remove draft pick`}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Draft Pick Button */}
              <div className="pt-2 border-t border-gray-200">
                {showAddPick === team.id ? (
                  <div className="space-y-2 p-2 bg-white rounded border border-gray-200">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Year</label>
                        <input
                          type="number"
                          value={newPick.year}
                          onChange={(e) => setNewPick({ ...newPick, year: parseInt(e.target.value) || new Date().getFullYear() + 1 })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          min={new Date().getFullYear()}
                          max={new Date().getFullYear() + 5}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Round</label>
                        <select
                          value={newPick.round}
                          onChange={(e) => setNewPick({ ...newPick, round: parseInt(e.target.value) })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {Array.from({ length: 16 }, (_, i) => i + 1).map(round => (
                            <option key={round} value={round}>Round {round}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end gap-1">
                        <Button
                          size="sm"
                          onClick={handleAddDraftPick}
                          className="flex-1 text-xs py-1"
                        >
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowAddPick(null)
                            setNewPick({ teamId: '', year: new Date().getFullYear() + 1, round: 1 })
                          }}
                          className="text-xs py-1 px-2"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowAddPick(team.id)
                      setNewPick({ ...newPick, teamId: team.id })
                    }}
                    className="w-full text-xs"
                  >
                    + Add Draft Pick
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
