'use client'

import { Player, DraftPick } from '@/types'
import Button from './ui/Button'
import { getPlayerDisplayValue, formatPlayerInfo } from '@/utils/playerUtils'

interface TradeSideBuilderProps {
  side: 'A' | 'B'
  players: Player[]
  selectedPicks: DraftPick[]
  onRemovePlayer: (playerId: string) => void
  onAddPick: () => void
  onRemovePick: (index: number) => void
  onUpdatePick: (index: number, pick: DraftPick) => void
}

export default function TradeSideBuilder({
  side,
  players,
  selectedPicks,
  onRemovePlayer,
  onAddPick,
  onRemovePick,
  onUpdatePick,
}: TradeSideBuilderProps) {
  const totalValue = players.reduce((sum, p) => sum + (p.value || 0), 0)

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-0.5">Side {side}</h3>
        <div className="text-xs text-gray-500">{players.length} players</div>
      </div>

      <div className="space-y-4">
        {players.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-lg border-2 border-dashed border-gray-200">
            No players added yet
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-slate-900 truncate mb-0.5">
                    {player.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatPlayerInfo(player)}
                    {player.status && player.status !== 'healthy' && (
                      <span
                        className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${
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
                  {player.stats && (
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600 mt-1">
                      {player.stats.goals !== undefined && (
                        <span><span className="font-medium">G:</span> {player.stats.goals}</span>
                      )}
                      {player.stats.hockeyAssists !== undefined && (
                        <span><span className="font-medium">A:</span> {player.stats.hockeyAssists}</span>
                      )}
                      {player.stats.hockeyPoints !== undefined && (
                        <span><span className="font-medium">P:</span> {player.stats.hockeyPoints}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-4">
                  {player.value !== undefined && (
                    <div className="text-right">
                      <div className="text-xs text-gray-500 mb-0.5">Value</div>
                      <div className="text-sm font-bold text-blue-600">
                        {getPlayerDisplayValue(player)}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => onRemovePlayer(player.id)}
                    className="text-red-600 hover:text-red-700 font-bold text-xl leading-none px-2 py-1 rounded hover:bg-red-50 transition-colors flex-shrink-0"
                    aria-label={`Remove ${player.name}`}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Draft Picks
            </label>
            <Button size="sm" variant="outline" onClick={onAddPick} className="text-xs">
              + Add Pick
            </Button>
          </div>
          {selectedPicks.length > 0 && (
            <div className="space-y-2">
              {selectedPicks.map((pick, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-gray-200"
                >
                  <input
                    type="number"
                    value={pick.year}
                    onChange={(e) =>
                      onUpdatePick(index, { ...pick, year: parseInt(e.target.value) || 2024 })
                    }
                    placeholder="Year"
                    className="w-20 px-2.5 py-1.5 border border-gray-300 rounded-md text-xs bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    min="2020"
                    max="2030"
                  />
                  <span className="text-xs text-gray-500 font-medium">Round</span>
                  <input
                    type="number"
                    value={pick.round}
                    onChange={(e) =>
                      onUpdatePick(index, { ...pick, round: parseInt(e.target.value) || 1 })
                    }
                    placeholder="Round"
                    className="w-16 px-2.5 py-1.5 border border-gray-300 rounded-md text-xs bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    min="1"
                    max="20"
                  />
                  <button
                    onClick={() => onRemovePick(index)}
                    className="ml-auto text-red-600 hover:text-red-700 text-lg leading-none px-2 hover:bg-red-50 rounded transition-colors"
                    aria-label="Remove pick"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 border-t-2 border-gray-200 bg-blue-50/50 -mx-5 -mb-5 px-5 py-4 rounded-b-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Total Value
            </span>
            <span className="text-2xl font-bold text-slate-900">
              {totalValue.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
