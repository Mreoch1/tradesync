'use client'

import { useEffect, useState } from 'react'
import { Player } from '@/types'
import { Team } from '@/types/teams'
import { teamManager } from '@/lib/teamManager'
import Header from '@/components/ui/Header'
import TradeBlock from '@/components/TradeBlock'
import PlayerSearch from '@/components/PlayerSearch'
import YahooSync from '@/components/YahooSync'
import Card from '@/components/ui/Card'
import Link from 'next/link'

export default function Home() {
  const [teams, setTeams] = useState<Team[]>([])
  const [tradeBlock, setTradeBlock] = useState<Player[]>([])

  useEffect(() => {
    // Load teams from storage (populated by Yahoo sync)
    setTeams(teamManager.getTeams())
    
    // Listen for teams updates from Yahoo sync
    const handleTeamsUpdate = () => {
      setTeams([...teamManager.getTeams()])
    }
    
    window.addEventListener('teamsUpdated', handleTeamsUpdate)
    window.addEventListener('teamsStorageUpdated', handleTeamsUpdate)
    
    return () => {
      window.removeEventListener('teamsUpdated', handleTeamsUpdate)
      window.removeEventListener('teamsStorageUpdated', handleTeamsUpdate)
    }

    // Load trade block from sessionStorage
    const saved = sessionStorage.getItem('tradeBlock')
    if (saved !== null) {
      try {
        setTradeBlock(JSON.parse(saved) as Player[])
      } catch (e) {
        console.error('Error loading trade block:', e)
      }
    }

    // Listen for trade block updates
    const handleStorageChange = () => {
      const updated = sessionStorage.getItem('tradeBlock')
      if (updated !== null) {
        try {
          setTradeBlock(JSON.parse(updated) as Player[])
        } catch (e) {
          console.error('Error loading trade block:', e)
        }
      } else {
        setTradeBlock([])
      }
    }

    window.addEventListener('tradeBlockUpdated', handleStorageChange)
    return () => {
      window.removeEventListener('tradeBlockUpdated', handleStorageChange)
    }
  }, [])

  const handleAddToTradeBlock = (player: Player) => {
    if (!tradeBlock.find(p => p.id === player.id)) {
      const updated = [...tradeBlock, player]
      setTradeBlock(updated)
      sessionStorage.setItem('tradeBlock', JSON.stringify(updated))
      window.dispatchEvent(new Event('tradeBlockUpdated'))
    }
  }

  const handleTeamsSynced = (syncedTeams: Team[]) => {
    // Add synced teams to team manager (this will update existing teams or add new ones)
    let addedCount = 0
    let updatedCount = 0
    
    syncedTeams.forEach(team => {
      const existing = teamManager.getTeams().find(t => t.id === team.id)
      if (existing) {
        updatedCount++
      } else {
        addedCount++
      }
      teamManager.addTeam(team)
    })
    
    // Update the teams state
    setTeams([...teamManager.getTeams()])
    
    // Dispatch event to notify PlayerSearch and other components
    window.dispatchEvent(new Event('teamsUpdated'))
    
    console.log(`Synced teams: ${addedCount} added, ${updatedCount} updated, ${syncedTeams.length} total`)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100">
      <Header />
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            <PlayerSearch 
              onAddToTradeBlock={handleAddToTradeBlock}
              tradeBlockPlayers={tradeBlock}
            />
            <TradeBlock />
          </div>

          {/* Right Column - Teams */}
          <div className="space-y-6">
            <YahooSync onTeamsSynced={handleTeamsSynced} />
            <Card title="Teams">
              <div className="space-y-3">
                {teams.map((team) => {
                  const teamValue = team.players.reduce((sum, p) => sum + (p.value || 0), 0)
                  const tradeBlockCount = tradeBlock.filter(p => 
                    team.players.some(tp => tp.id === p.id)
                  ).length

                  return (
                    <Link
                      key={team.id}
                      href={`/teams/${team.id}`}
                      className="block p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:shadow-md transition-all bg-white"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg text-slate-900">{team.name}</h3>
                        {team.rank && (
                          <span className="text-xs text-gray-500 font-medium">#{team.rank}</span>
                        )}
                      </div>
                      {team.owner && (
                        <p className="text-sm text-gray-600 mb-2">Owner: {team.owner}</p>
                      )}
                      {team.record && (
                        <p className="text-xs text-gray-500 mb-3">Record: {team.record}</p>
                      )}
                      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-100">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Players</div>
                          <div className="text-sm font-bold text-gray-900">{team.players.length}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Team Value</div>
                          <div className="text-sm font-bold text-gray-900">{teamValue.toFixed(1)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">In Trade Block</div>
                          <div className="text-sm font-bold text-blue-600">{tradeBlockCount}</div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </Card>

          </div>
        </div>
      </div>
    </main>
  )
}
