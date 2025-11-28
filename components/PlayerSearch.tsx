'use client'

import { useState, useMemo, useEffect } from 'react'
import { Player } from '@/types'
import { teamManager } from '@/lib/teamManager'
import Card from './ui/Card'
import Button from './ui/Button'

interface PlayerSearchProps {
  onAddToTradeBlock: (player: Player) => void
  tradeBlockPlayers: Player[]
}

export default function PlayerSearch({ onAddToTradeBlock, tradeBlockPlayers }: PlayerSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [allPlayers, setAllPlayers] = useState<Player[]>([])

  // Load all players from all teams (league-wide search)
  const refreshPlayers = () => {
    setAllPlayers(teamManager.getAllPlayers())
  }

  useEffect(() => {
    // Initial load
    refreshPlayers()
    
    // Listen for team updates to refresh player list
    const handleStorageChange = () => {
      refreshPlayers()
    }

    // Listen for custom event when teams are synced
    window.addEventListener('teamsUpdated', handleStorageChange)
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('teamsUpdated', handleStorageChange)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) {
      return []
    }
    
    const query = searchQuery.toLowerCase()
    
    // First, filter players by search query
    const matchingPlayers = allPlayers.filter(player => {
      const nameMatch = player.name.toLowerCase().includes(query)
      // Handle team as string or object
      let teamStr = ''
      if (typeof player.team === 'string') {
        teamStr = player.team
      } else if (player.team && typeof player.team === 'object') {
        // Try to extract team abbreviation from object
        teamStr = (player.team as any).abbr || (player.team as any).team || String(player.team)
      }
      const teamMatch = teamStr.toLowerCase().includes(query)
      const positionMatch = player.position?.toLowerCase().includes(query)
      return nameMatch || teamMatch || positionMatch
    })
    
    // Deduplicate by player name (case-insensitive) - keep the best occurrence (highest value or first)
    const seenNames = new Map<string, Player>()
    matchingPlayers.forEach(player => {
      const normalizedName = player.name.toLowerCase().trim()
      const existing = seenNames.get(normalizedName)
      
      if (!existing) {
        seenNames.set(normalizedName, player)
      } else {
        // Keep the player with higher value, or if values are equal, keep the existing one
        const currentValue = player.value ?? 0
        const existingValue = existing.value ?? 0
        if (currentValue > existingValue) {
          seenNames.set(normalizedName, player)
        }
      }
    })
    
    const uniquePlayers = Array.from(seenNames.values())
    return uniquePlayers.slice(0, 10) // Limit to 10 results
  }, [searchQuery, allPlayers])

  const handleAddPlayer = (player: Player) => {
    if (!tradeBlockPlayers.find(p => p.id === player.id)) {
      onAddToTradeBlock(player)
      setSearchQuery('') // Clear search after adding
    }
  }

  const isInTradeBlock = (playerId: string) => {
    return tradeBlockPlayers.some(p => p.id === playerId)
  }

  return (
    <Card title="Search Players">
      <div className="space-y-4">
        <div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, team, or position..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm transition-colors placeholder:text-gray-400"
          />
        </div>

        {searchQuery && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredPlayers.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                No players found
              </div>
            ) : (
              filteredPlayers.map((player) => {
                const inTradeBlock = isInTradeBlock(player.id)
                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      inTradeBlock
                        ? 'bg-blue-50 border-2 border-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-slate-900 truncate mb-0.5">
                        {player.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {player.position} • {(() => {
                          if (typeof player.team === 'string') {
                            return player.team
                          } else if (player.team && typeof player.team === 'object') {
                            return (player.team as any).abbr || (player.team as any).team || 'N/A'
                          }
                          return 'N/A'
                        })()}
                        {player.rank && ` • Rank #${player.rank}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-3">
                      {player.value !== undefined && (
                        <div className="text-right">
                          <div className="text-xs text-gray-500 mb-0.5">Value</div>
                          <div className="text-sm font-bold text-blue-600">
                            {player.value.toFixed(1)}
                          </div>
                        </div>
                      )}
                      {inTradeBlock ? (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                          Added
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleAddPlayer(player)}
                          className="whitespace-nowrap"
                        >
                          Add
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {!searchQuery && (
          <div className="text-center py-6 text-gray-400 text-sm">
            Start typing to search for players...
          </div>
        )}
      </div>
    </Card>
  )
}

