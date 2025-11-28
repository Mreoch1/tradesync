'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { Team } from '@/types/teams'
import { Player, DraftPick } from '@/types'
import { teamManager } from '@/lib/teamManager'
import { getDraftPickValue, getDraftPickDescription } from '@/lib/draftPickValues'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Link from 'next/link'

export default function TeamPage() {
  const params = useParams()
  const router = useRouter()
  const [team, setTeam] = useState<Team | null>(null)
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([])
  const [selectedPicks, setSelectedPicks] = useState<DraftPick[]>([])

  useEffect(() => {
    const teamIdParam = params.id as string | null
    
    if (!teamIdParam) {
      console.error('No team ID in URL params')
      return
    }
    
    const teamId = teamIdParam // Now TypeScript knows it's a string
    
    // Load team from teamManager (which now persists in sessionStorage)
    const loadTeam = () => {
      const foundTeam = teamManager.getTeam(teamId)
      setTeam(foundTeam || null)
    }
    
    // Load immediately
    loadTeam()
    
    // Also listen for team updates
    const handleTeamsUpdated = () => {
      loadTeam()
    }
    
    window.addEventListener('teamsStorageUpdated', handleTeamsUpdated)
    window.addEventListener('teamsUpdated', handleTeamsUpdated)
    
    // Load selected players from sessionStorage
    const saved = sessionStorage.getItem('tradeBlock')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setSelectedPlayers(Array.isArray(parsed) ? parsed : [])
      } catch (e) {
        console.error('Error loading trade block:', e)
      }
    }

    // Load selected draft picks from sessionStorage
    const savedPicks = sessionStorage.getItem('tradeBlockPicks')
    if (savedPicks) {
      try {
        const picks = JSON.parse(savedPicks)
        setSelectedPicks(picks.filter((pick: DraftPick) => pick.teamId === teamId))
      } catch (e) {
        console.error('Error loading draft picks:', e)
      }
    }

    // Listen for trade block updates
    const handleStorageChange = () => {
      const updated = sessionStorage.getItem('tradeBlock')
      if (updated) {
        try {
          const parsed = JSON.parse(updated)
          setSelectedPlayers(Array.isArray(parsed) ? parsed : [])
        } catch (e) {
          console.error('Error loading trade block:', e)
        }
      }

      const updatedPicks = sessionStorage.getItem('tradeBlockPicks')
      if (updatedPicks) {
        try {
          const picks = JSON.parse(updatedPicks)
          setSelectedPicks(picks.filter((pick: DraftPick) => pick.teamId === teamId))
        } catch (e) {
          console.error('Error loading draft picks:', e)
        }
      }
    }

    window.addEventListener('tradeBlockUpdated', handleStorageChange)
    return () => {
      window.removeEventListener('tradeBlockUpdated', handleStorageChange)
    }
  }, [params.id])

  const handleAddToTradeBlock = (player: Player) => {
    if (!selectedPlayers.find(p => p.id === player.id)) {
      const updated = [...selectedPlayers, player]
      setSelectedPlayers(updated)
      sessionStorage.setItem('tradeBlock', JSON.stringify(updated))
      window.dispatchEvent(new Event('tradeBlockUpdated'))
    }
  }

  const handleRemoveFromTradeBlock = (playerId: string) => {
    const updated = selectedPlayers.filter(p => p.id !== playerId)
    setSelectedPlayers(updated)
    sessionStorage.setItem('tradeBlock', JSON.stringify(updated))
    window.dispatchEvent(new Event('tradeBlockUpdated'))
  }

  const handleAddDraftPickToTradeBlock = (year: number, round: number) => {
    if (!team) return

    // Check if this pick already exists
    const pickId = `${team.id}-${year}-round-${round}`
    if (selectedPicks.some(p => p.id === pickId)) {
      return
    }

    const pick: DraftPick = {
      id: pickId,
      year,
      round,
      teamId: team.id,
      value: getDraftPickValue(round),
    }

    const updatedPicks = sessionStorage.getItem('tradeBlockPicks')
    const allPicks = updatedPicks ? JSON.parse(updatedPicks) : []
    allPicks.push(pick)
    sessionStorage.setItem('tradeBlockPicks', JSON.stringify(allPicks))
    setSelectedPicks([...selectedPicks, pick])
    window.dispatchEvent(new Event('tradeBlockUpdated'))
  }

  const handleRemoveDraftPickFromTradeBlock = (pickId: string) => {
    const updatedPicks = sessionStorage.getItem('tradeBlockPicks')
    if (updatedPicks) {
      const allPicks = JSON.parse(updatedPicks)
      const filtered = allPicks.filter((p: DraftPick) => p.id !== pickId)
      sessionStorage.setItem('tradeBlockPicks', JSON.stringify(filtered))
      setSelectedPicks(selectedPicks.filter(p => p.id !== pickId))
      window.dispatchEvent(new Event('tradeBlockUpdated'))
    }
  }

  // Available draft pick year - Must be before conditional return
  const draftYear = useMemo(() => {
    return new Date().getFullYear() + 1
  }, [])

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Team Not Found</h1>
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            Return to Home
          </Link>
        </div>
      </div>
    )
  }

  // Group players by position
  const playersByPosition: { [key: string]: Player[] } = {}
  team.players.forEach(player => {
    // Ensure position is a string
    const positionStr = typeof player.position === 'string' ? player.position : String(player.position || 'N/A')
    const positions = positionStr.split(',').map(p => p.trim()).filter(p => p)
    positions.forEach(pos => {
      if (!playersByPosition[pos]) playersByPosition[pos] = []
      if (!playersByPosition[pos].find(p => p.id === player.id)) {
        playersByPosition[pos].push(player)
      }
    })
  })

  const positionOrder = ['C', 'LW', 'RW', 'D', 'G', 'F', 'Util', 'BN']
  const sortedPositions = Object.keys(playersByPosition).sort((a, b) => {
    const aIndex = positionOrder.indexOf(a) >= 0 ? positionOrder.indexOf(a) : 999
    const bIndex = positionOrder.indexOf(b) >= 0 ? positionOrder.indexOf(b) : 999
    return aIndex - bIndex
  })

  const totalValue = team.players.reduce((sum, p) => sum + (p.value || 0), 0)
  const tradeBlockValue = selectedPlayers.reduce((sum, p) => sum + (p.value || 0), 0)
  const draftPicksValue = selectedPicks.reduce((sum, p) => sum + (p.value || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1200px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{team.name}</h1>
                {team.owner && (
                  <p className="text-sm text-gray-500">Owner: {team.owner}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              {team.record && (
                <div className="text-xs sm:text-sm text-gray-600">
                  <span className="font-medium">Record:</span> {team.record}
                </div>
              )}
              {team.rank && (
                <div className="text-xs sm:text-sm text-gray-600">
                  <span className="font-medium">Rank:</span> #{team.rank}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Team Summary */}
        <Card className="mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            <div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Total Players
              </div>
              <div className="text-2xl font-bold text-gray-900">{team.players.length}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Team Value
              </div>
              <div className="text-2xl font-bold text-gray-900">{totalValue.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                In Trade Block
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {selectedPlayers.filter(p => team.players.find(tp => tp.id === p.id)).length}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Trade Block Value
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {(tradeBlockValue + draftPicksValue) > 0 ? `+${(tradeBlockValue + draftPicksValue).toFixed(1)}` : (tradeBlockValue + draftPicksValue).toFixed(1)}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {selectedPlayers.length} player{selectedPlayers.length !== 1 ? 's' : ''}
                {selectedPicks.length > 0 && `, ${selectedPicks.length} pick${selectedPicks.length !== 1 ? 's' : ''}`}
              </div>
            </div>
          </div>
        </Card>

        {/* Players by Position */}
        <div className="space-y-6">
          {sortedPositions.map((position) => (
            <Card key={position} title={`${typeof position === 'string' ? position : String(position)} (${playersByPosition[position].length})`}>
              <div className="grid grid-cols-1 gap-2">
                {playersByPosition[position].map((player) => {
                  const isInTradeBlock = selectedPlayers.some(p => p.id === player.id)
                  return (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                        isInTradeBlock
                          ? 'bg-blue-50 border-2 border-blue-200'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="font-semibold text-gray-900">{player.name}</div>
                          <div className="text-sm text-gray-600">{player.team}</div>
                          {player.status && player.status !== 'healthy' && (
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                player.status === 'IR' || player.status === 'IR-LT'
                                  ? 'bg-red-100 text-red-700'
                                  : player.status === 'DTD'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {player.status}
                            </span>
                          )}
                          {player.rank && (
                            <span className="text-xs text-gray-500">Rank #{player.rank}</span>
                          )}
                        </div>
                        
                        {/* Yahoo-style comprehensive stats table */}
                        <div className="mt-2 overflow-x-auto">
                          {/* Debug info - remove in production */}
                          {process.env.NODE_ENV === 'development' && (
                            <div className="text-xs text-gray-400 mb-1">
                              Stats object: {player.stats ? `${Object.keys(player.stats).length} keys: ${Object.keys(player.stats).join(', ')}` : 'null'}
                            </div>
                          )}
                          
                          {/* Ownership stats row */}
                          {(player.startPercentage !== undefined || player.rosPercentage !== undefined) && (
                            <div className="flex gap-4 text-xs mb-2">
                              {player.startPercentage !== undefined && (
                                <div>
                                  <span className="text-gray-500">% Start:</span>{' '}
                                  <span className="font-semibold">{player.startPercentage.toFixed(1)}%</span>
                                </div>
                              )}
                              {player.rosPercentage !== undefined && (
                                <div>
                                  <span className="text-gray-500">% Ros:</span>{' '}
                                  <span className="font-semibold">{player.rosPercentage.toFixed(1)}%</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Skater Stats - Yahoo table format - Always show all columns */}
                          {(player.position?.includes('C') || player.position?.includes('LW') || player.position?.includes('RW') || player.position?.includes('D') || player.position?.includes('F')) && (
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                              <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                                <div className="text-xs font-semibold text-gray-700">2025-26 Season Stats</div>
                              </div>
                              <div className="px-3 py-2">
                                <div className="grid grid-cols-6 sm:grid-cols-12 gap-x-4 gap-y-2 text-xs">
                                  <div className="flex flex-col">
                                    <span className="text-gray-500 text-[10px]">G</span>
                                    <span className="font-semibold text-gray-900">{player.stats?.goals ?? 0}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-gray-500 text-[10px]">A</span>
                                    <span className="font-semibold text-gray-900">{player.stats?.hockeyAssists ?? 0}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-gray-500 text-[10px]">P</span>
                                    <span className="font-semibold text-gray-900">{player.stats?.hockeyPoints ?? 0}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-gray-500 text-[10px]">+/-</span>
                                    <span className={`font-semibold ${(player.stats?.plusMinus ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {(player.stats?.plusMinus ?? 0) > 0 ? '+' : ''}{player.stats?.plusMinus ?? 0}
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-gray-500 text-[10px]">PIM</span>
                                    <span className="font-semibold text-gray-900">{player.stats?.pim ?? 0}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-gray-500 text-[10px]">PPP</span>
                                    <span className="font-semibold text-gray-900">{player.stats?.ppp ?? 0}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-gray-500 text-[10px]">SHP</span>
                                    <span className="font-semibold text-gray-900">{player.stats?.shp ?? 0}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-gray-500 text-[10px]">GWG</span>
                                    <span className="font-semibold text-gray-900">{player.stats?.gwg ?? 0}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-gray-500 text-[10px]">SOG</span>
                                    <span className="font-semibold text-gray-900">{player.stats?.sog ?? 0}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-gray-500 text-[10px]">FW</span>
                                    <span className="font-semibold text-gray-900">{player.stats?.fw ?? 0}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-gray-500 text-[10px]">HIT</span>
                                    <span className="font-semibold text-gray-900">{player.stats?.hit ?? 0}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-gray-500 text-[10px]">BLK</span>
                                    <span className="font-semibold text-gray-900">{player.stats?.blk ?? 0}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Goaltender Stats - Yahoo table format - Always show all columns */}
                          {(player.position?.includes('G')) && (
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                              <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                                <div className="text-xs font-semibold text-gray-700">2025-26 Season Stats</div>
                              </div>
                              <div className="px-3 py-2">
                                <div className="grid grid-cols-5 sm:grid-cols-10 gap-x-4 gap-y-2 text-xs">
                                  <div className="flex flex-col">
                                    <span className="text-gray-500 text-[10px]">GS</span>
                                    <span className="font-semibold text-gray-900">{player.stats?.gs ?? 0}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-gray-500 text-[10px]">W</span>
                                    <span className="font-semibold text-gray-900">{player.stats?.wins ?? 0}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-gray-500 text-[10px]">L</span>
                                    <span className="font-semibold text-gray-900">{player.stats?.losses ?? 0}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-gray-500 text-[10px]">GA</span>
                                    <span className="font-semibold text-gray-900">{player.stats?.ga ?? 0}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-gray-500 text-[10px]">GAA</span>
                                    <span className="font-semibold text-gray-900">
                                      {player.stats?.gaa !== undefined ? player.stats.gaa.toFixed(2) : '0.00'}
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-gray-500 text-[10px]">SV</span>
                                    <span className="font-semibold text-gray-900">{player.stats?.sv ?? 0}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-gray-500 text-[10px]">SA</span>
                                    <span className="font-semibold text-gray-900">{player.stats?.sa ?? 0}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-gray-500 text-[10px]">SV%</span>
                                    <span className="font-semibold text-gray-900">
                                      {player.stats?.svp !== undefined 
                                        ? (player.stats.svp <= 1 ? player.stats.svp * 100 : player.stats.svp).toFixed(1)
                                        : '0.0'}
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-gray-500 text-[10px]">SHO</span>
                                    <span className="font-semibold text-gray-900">{player.stats?.sho ?? 0}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4 ml-2 sm:ml-4">
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Value</div>
                          <div className="text-base sm:text-lg font-bold text-gray-900">
                            {player.value?.toFixed(1) || '0.0'}
                          </div>
                          {isInTradeBlock && (
                            <div className="text-xs text-blue-600 font-medium mt-1">
                              In Trade Block
                            </div>
                          )}
                        </div>
                        {isInTradeBlock ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveFromTradeBlock(player.id)}
                            className="min-w-[80px]"
                          >
                            Remove
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleAddToTradeBlock(player)}
                            className="min-w-[80px]"
                          >
                            Add to Trade
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          ))}
        </div>

        {/* Draft Picks Section */}
        <Card title="Available Draft Picks">
          <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              Click on any draft pick to add it to your trade block. All teams have picks in rounds 1-16 for the {draftYear} draft.
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h4 className="font-semibold text-sm text-gray-900 mb-3">{draftYear} Draft</h4>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {Array.from({ length: 16 }, (_, i) => i + 1).map((round) => {
                  const pickId = `${team.id}-${draftYear}-round-${round}`
                  const isSelected = selectedPicks.some(p => p.id === pickId)
                  const pickValue = getDraftPickValue(round)
                  
                  return (
                    <button
                      key={round}
                      onClick={() => {
                        if (isSelected) {
                          handleRemoveDraftPickFromTradeBlock(pickId)
                        } else {
                          handleAddDraftPickToTradeBlock(draftYear, round)
                        }
                      }}
                      className={`p-2 rounded-lg border-2 transition-all text-xs ${
                        isSelected
                          ? 'bg-blue-100 border-blue-400 text-blue-900 font-semibold'
                          : 'bg-white border-gray-300 hover:border-blue-300 hover:bg-blue-50 text-gray-700'
                      }`}
                    >
                      <div className="font-medium">R{round}</div>
                      <div className={`text-xs mt-0.5 ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}>
                        {pickValue.toFixed(1)}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Selected Picks Summary */}
            {selectedPicks.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <h4 className="font-semibold text-sm text-gray-900 mb-2">Selected Draft Picks</h4>
                <div className="space-y-2">
                  {selectedPicks.map((pick) => (
                    <div
                      key={pick.id}
                      className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200"
                    >
                      <div>
                        <div className="font-medium text-sm text-gray-900">
                          {getDraftPickDescription(pick.year, pick.round)}
                        </div>
                        <div className="text-xs text-gray-500">Value: {pick.value?.toFixed(1) || '0.0'}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveDraftPickFromTradeBlock(pick.id!)}
                        className="text-red-600 hover:text-red-700 font-bold text-lg leading-none px-2 py-1 rounded hover:bg-red-50 transition-colors"
                        aria-label={`Remove draft pick`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

