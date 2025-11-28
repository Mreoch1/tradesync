'use client'

import { useState, useMemo, useEffect } from 'react'
import { Trade, TradeAnalysis, Player, DraftPick, LeagueSettings } from '@/types'
import { Team } from '@/types/teams'
import { analyzeTrade } from '@/lib/analyzer'
import { teamManager } from '@/lib/teamManager'
import TradeSideBuilder from './TradeSideBuilder'
import TradeAnalysisResults from './TradeAnalysisResults'
import LeagueSettingsComponent from './LeagueSettings'
import TeamImporter from './TeamImporter'
import TeamBrowser from './TeamBrowser'
import RosterView from './RosterView'
import TradeBlock from './TradeBlock'
import Button from './ui/Button'

export default function TradeAnalyzer() {
  const [sideAPlayers, setSideAPlayers] = useState<Player[]>([])
  const [sideBPlayers, setSideBPlayers] = useState<Player[]>([])
  const [sideAPicks, setSideAPicks] = useState<DraftPick[]>([])
  const [sideBPicks, setSideBPicks] = useState<DraftPick[]>([])
  const [analysis, setAnalysis] = useState<TradeAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [leagueSettings, setLeagueSettings] = useState<LeagueSettings>({
    sport: 'nhl',
    scoringType: 'categories',
  })

  // Load teams from storage (populated by Yahoo sync)
  useEffect(() => {
    setTeams([...teamManager.getTeams()])
    
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
  }, [])

  // Get available players based on selected team
  const availablePlayers = useMemo(() => {
    if (selectedTeamId === null) {
      return teamManager.getAllPlayers()
    }
    return teamManager.getTeamPlayers(selectedTeamId)
  }, [selectedTeamId])

  const selectedTeam = selectedTeamId ? teamManager.getTeam(selectedTeamId) : null

  const handleAnalyze = async () => {
    if (sideAPlayers.length === 0 && sideBPlayers.length === 0) {
      return
    }

    setIsAnalyzing(true)
    await new Promise(resolve => setTimeout(resolve, 300))

    const trade: Trade = {
      id: Date.now().toString(),
      sideA: {
        players: sideAPlayers,
        picks: sideAPicks.length > 0 ? sideAPicks : undefined,
      },
      sideB: {
        players: sideBPlayers,
        picks: sideBPicks.length > 0 ? sideBPicks : undefined,
      },
      leagueSettings,
      createdAt: new Date(),
    }

    const result = analyzeTrade(trade)
    setAnalysis(result)
    setIsAnalyzing(false)

    setTimeout(() => {
      const resultsElement = document.getElementById('trade-results')
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  const handleReset = () => {
    setSideAPlayers([])
    setSideBPlayers([])
    setSideAPicks([])
    setSideBPicks([])
    setAnalysis(null)
  }

  const handleImportTeam = (players: Player[], teamName?: string, owner?: string) => {
    const teamId = `team-${teamName?.toLowerCase().replace(/\s+/g, '-') || Date.now()}`
    const team: Team = {
      id: teamId,
      name: teamName || 'Imported Team',
      owner,
      players,
    }
    teamManager.addTeam(team)
    setTeams([...teamManager.getTeams()])
  }

  const handleAddPlayerToSide = (side: 'A' | 'B') => (player: Player) => {
    if (side === 'A') {
      if (!sideAPlayers.find(p => p.id === player.id)) {
        setSideAPlayers([...sideAPlayers, player])
      }
    } else {
      if (!sideBPlayers.find(p => p.id === player.id)) {
        setSideBPlayers([...sideBPlayers, player])
      }
    }
  }

  const handleRemovePlayerFromSide = (side: 'A' | 'B') => (playerId: string) => {
    if (side === 'A') {
      setSideAPlayers(sideAPlayers.filter(p => p.id !== playerId))
    } else {
      setSideBPlayers(sideBPlayers.filter(p => p.id !== playerId))
    }
  }

  const handleAddPickToSide = (side: 'A' | 'B') => () => {
    const newPick: DraftPick = { year: 2024, round: 1, teamId: side === 'A' ? 'side-a' : 'side-b' }
    if (side === 'A') {
      setSideAPicks([...sideAPicks, newPick])
    } else {
      setSideBPicks([...sideBPicks, newPick])
    }
  }

  const handleRemovePickFromSide = (side: 'A' | 'B') => (index: number) => {
    if (side === 'A') {
      setSideAPicks(sideAPicks.filter((_, i) => i !== index))
    } else {
      setSideBPicks(sideBPicks.filter((_, i) => i !== index))
    }
  }

  const handleUpdatePickFromSide = (side: 'A' | 'B') => (index: number, pick: DraftPick) => {
    if (side === 'A') {
      const updated = [...sideAPicks]
      updated[index] = pick
      setSideAPicks(updated)
    } else {
      const updated = [...sideBPicks]
      updated[index] = pick
      setSideBPicks(updated)
    }
  }

  const canAnalyze = sideAPlayers.length > 0 || sideBPlayers.length > 0
  const totalA = sideAPlayers.reduce((sum, p) => sum + (p.value || 0), 0)
  const totalB = sideBPlayers.reduce((sum, p) => sum + (p.value || 0), 0)

  return (
    <div className="w-full">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 lg:gap-8">
          {/* Left Column: League Settings and Import */}
          <div className="space-y-6 order-1">
            <LeagueSettingsComponent
              settings={leagueSettings}
              onSettingsChange={setLeagueSettings}
            />
            <TeamImporter
              onImport={(players, teamName, owner) => handleImportTeam(players, teamName, owner)}
              sport={leagueSettings.sport as 'nhl' | 'nfl' | 'nba' | 'mlb'}
            />
            {teams.length > 0 && (
              <TeamBrowser
                teams={teams}
                selectedTeamId={selectedTeamId}
                onSelectTeam={setSelectedTeamId}
              />
            )}
            <TradeBlock />
          </div>

          {/* Right Column: Roster View and Trade Builder */}
          <div className="space-y-6 order-2">
            {/* All Players Roster */}
            <RosterView
              players={availablePlayers}
              selectedPlayers={[...sideAPlayers, ...sideBPlayers]}
              sideAPlayers={sideAPlayers}
              sideBPlayers={sideBPlayers}
              onAddPlayer={(player, side) => {
                const targetSide = side || (sideAPlayers.length <= sideBPlayers.length ? 'A' : 'B')
                handleAddPlayerToSide(targetSide)(player)
              }}
              onRemovePlayer={(playerId) => {
                if (sideAPlayers.find(p => p.id === playerId)) {
                  handleRemovePlayerFromSide('A')(playerId)
                } else if (sideBPlayers.find(p => p.id === playerId)) {
                  handleRemovePlayerFromSide('B')(playerId)
                }
              }}
              teamName={selectedTeam?.name}
            />

            {/* Trade Builder */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Trade Builder</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Compare Side A vs Side B</p>
                  </div>
                  {(sideAPlayers.length > 0 || sideBPlayers.length > 0) && (
                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          Side A
                        </div>
                        <div className="text-3xl font-bold text-slate-900">{totalA.toFixed(1)}</div>
                      </div>
                      <div className="h-12 w-px bg-gray-200" />
                      <div className="text-center">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          Side B
                        </div>
                        <div className="text-3xl font-bold text-slate-900">{totalB.toFixed(1)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6">
                {/* Trade Sides Grid */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <TradeSideBuilder
                    side="A"
                    players={sideAPlayers}
                    selectedPicks={sideAPicks}
                    onRemovePlayer={handleRemovePlayerFromSide('A')}
                    onAddPick={handleAddPickToSide('A')}
                    onRemovePick={handleRemovePickFromSide('A')}
                    onUpdatePick={handleUpdatePickFromSide('A')}
                  />
                  <TradeSideBuilder
                    side="B"
                    players={sideBPlayers}
                    selectedPicks={sideBPicks}
                    onRemovePlayer={handleRemovePlayerFromSide('B')}
                    onAddPick={handleAddPickToSide('B')}
                    onRemovePick={handleRemovePickFromSide('B')}
                    onUpdatePick={handleUpdatePickFromSide('B')}
                  />
                </div>

                {/* Analyze Button */}
                <div className="flex gap-3 pt-6 border-t border-gray-100">
                  <Button
                    size="lg"
                    onClick={handleAnalyze}
                    disabled={!canAnalyze || isAnalyzing}
                    className="flex-1 justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-6 rounded-lg shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
                  >
                    {isAnalyzing ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Analyzing...
                      </span>
                    ) : (
                      'Analyze Trade'
                    )}
                  </Button>
                  {(sideAPlayers.length > 0 || sideBPlayers.length > 0) && (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handleReset}
                      className="px-6 py-3.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Results */}
            {analysis && (
              <div id="trade-results">
                <TradeAnalysisResults analysis={analysis} trade={{
                  id: Date.now().toString(),
                  sideA: {
                    players: sideAPlayers,
                    picks: sideAPicks.length > 0 ? sideAPicks : undefined,
                  },
                  sideB: {
                    players: sideBPlayers,
                    picks: sideBPicks.length > 0 ? sideBPicks : undefined,
                  },
                  leagueSettings,
                  createdAt: new Date(),
                }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
