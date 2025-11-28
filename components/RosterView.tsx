'use client'

import { Player } from '@/types'
import Card from './ui/Card'
import Button from './ui/Button'

interface RosterViewProps {
  players: Player[]
  selectedPlayers: Player[]
  sideAPlayers?: Player[]
  sideBPlayers?: Player[]
  onAddPlayer: (player: Player, side?: 'A' | 'B') => void
  onRemovePlayer: (playerId: string) => void
  teamName?: string
}

export default function RosterView({
  players,
  selectedPlayers,
  sideAPlayers = [],
  sideBPlayers = [],
  onAddPlayer,
  onRemovePlayer,
  teamName = 'All Players',
}: RosterViewProps) {
  const selectedPlayerIds = new Set(selectedPlayers.map(p => p.id))
  const sideAPlayerIds = new Set(sideAPlayers.map(p => p.id))
  const sideBPlayerIds = new Set(sideBPlayers.map(p => p.id))

  // Group players by position
  const playersByPosition: { [key: string]: Player[] } = {}
  players.forEach(player => {
    const positions = player.position.split(',').map(p => p.trim())
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

  return (
    <Card title={`${teamName} Roster`}>
      <div className="space-y-6">
        {players.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            No players available
          </div>
        ) : (
          sortedPositions.map((position) => (
            <div key={position}>
              <div className="mb-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {position} ({playersByPosition[position].length})
                </h4>
              </div>
              <div className="space-y-2">
                {playersByPosition[position].map((player) => {
                  const isSelected = selectedPlayerIds.has(player.id)
                  return (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                        isSelected
                          ? 'bg-blue-50 border-2 border-blue-200'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-medium text-sm text-slate-900 truncate">
                            {player.name}
                          </div>
                          {player.status && player.status !== 'healthy' && (
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                player.status === 'IR' || player.status === 'IR-LT'
                                  ? 'bg-red-100 text-red-700'
                                  : player.status === 'DTD'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {player.status}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mb-1.5">
                          {player.team}
                          {player.rank && ` • Rank #${player.rank}`}
                        </div>
                        {player.stats && (
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600">
                            {player.stats.goals !== undefined && (
                              <span><span className="font-medium">G:</span> {player.stats.goals}</span>
                            )}
                            {player.stats.hockeyAssists !== undefined && (
                              <span><span className="font-medium">A:</span> {player.stats.hockeyAssists}</span>
                            )}
                            {player.stats.hockeyPoints !== undefined && (
                              <span><span className="font-medium">P:</span> {player.stats.hockeyPoints}</span>
                            )}
                            {player.stats.plusMinus !== undefined && (
                              <span><span className="font-medium">+/-:</span> {player.stats.plusMinus}</span>
                            )}
                            {player.stats.wins !== undefined && (
                              <span><span className="font-medium">W:</span> {player.stats.wins}</span>
                            )}
                            {player.stats.svp !== undefined && (
                              <span><span className="font-medium">SV%:</span> {(player.stats.svp * 100).toFixed(1)}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        {player.value !== undefined && (
                          <div className="text-right">
                            <div className="text-xs text-gray-500 mb-0.5">Value</div>
                            <div className="text-sm font-bold text-blue-600">
                              {player.value.toFixed(1)}
                            </div>
                          </div>
                        )}
                        {isSelected ? (
                          <div className="flex items-center gap-1.5">
                            {sideAPlayerIds.has(player.id) && (
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                                A
                              </span>
                            )}
                            {sideBPlayerIds.has(player.id) && (
                              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded font-medium">
                                B
                              </span>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onRemovePlayer(player.id)}
                              className="h-8 px-3 text-xs"
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onAddPlayer(player, 'A')}
                              className="h-8 px-3 text-xs font-medium"
                              title="Add to Side A"
                            >
                              A
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => onAddPlayer(player, 'B')}
                              className="h-8 px-3 text-xs font-medium"
                              title="Add to Side B"
                            >
                              B
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
