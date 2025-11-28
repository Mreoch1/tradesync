'use client'

import { useState, useRef, useEffect } from 'react'
import { Player } from '@/types'
import Button from './ui/Button'

interface PlayerSelectorProps {
  players: Player[]
  selectedPlayers: Player[]
  onAddPlayer: (player: Player) => void
  onRemovePlayer: (playerId: string) => void
  placeholder?: string
}

export default function PlayerSelector({
  players,
  selectedPlayers,
  onAddPlayer,
  onRemovePlayer,
  placeholder = 'Search for a player...',
}: PlayerSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = players.filter(
        player =>
          player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          player.team.toLowerCase().includes(searchQuery.toLowerCase()) ||
          player.position.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 10)
      setFilteredPlayers(filtered)
      setIsOpen(true)
    } else {
      setFilteredPlayers([])
      setIsOpen(false)
    }
  }, [searchQuery, players])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectPlayer = (player: Player) => {
    onAddPlayer(player)
    setSearchQuery('')
    setIsOpen(false)
  }

  const selectedPlayerIds = new Set(selectedPlayers.map(p => p.id))

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => searchQuery && setIsOpen(true)}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
      />
      
      {isOpen && filteredPlayers.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
          {filteredPlayers.map((player) => {
            const isSelected = selectedPlayerIds.has(player.id)
            return (
              <button
                key={player.id}
                onClick={() => !isSelected && handleSelectPlayer(player)}
                disabled={isSelected}
                className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  isSelected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">{player.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {player.position} - {player.team}
                      {player.status && player.status !== 'healthy' && (
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                          player.status === 'IR' || player.status === 'IR-LT' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                          player.status === 'DTD' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {player.status}
                        </span>
                      )}
                    </div>
                    {player.rank && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        Rank: #{player.rank}
                        {player.startPercentage && ` • ${player.startPercentage}% Start`}
                      </div>
                    )}
                  </div>
                  {player.value !== undefined && (
                    <div className="text-right">
                      <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        {player.value.toFixed(1)}
                      </div>
                      {player.rosPercentage && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {player.rosPercentage}% ROS
                        </div>
                      )}
                    </div>
                  )}
                  {isSelected && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">✓ Selected</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {selectedPlayers.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedPlayers.map((player) => (
            <div
              key={player.id}
              className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
            >
              <span>{player.name}</span>
              <button
                onClick={() => onRemovePlayer(player.id)}
                className="hover:text-blue-600 dark:hover:text-blue-300 font-bold"
                aria-label={`Remove ${player.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

