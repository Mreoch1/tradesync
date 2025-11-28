'use client'

import { useState } from 'react'
import { Player } from '@/types'
import Card from './ui/Card'
import Button from './ui/Button'
import { parseYahooHockeyRoster } from '@/lib/hockeyParser'

interface TeamImporterProps {
  onImport: (players: Player[], teamName?: string, owner?: string) => void
  sport?: 'nhl' | 'nfl' | 'nba' | 'mlb'
}

export default function TeamImporter({ onImport, sport = 'nhl' }: TeamImporterProps) {
  const [importText, setImportText] = useState('')
  const [teamName, setTeamName] = useState('')
  const [owner, setOwner] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importedCount, setImportedCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleImport = () => {
    setIsImporting(true)
    setImportedCount(null)
    setError(null)
    
    try {
      let players: Player[] = []
      
      if (sport === 'nhl') {
        players = parseYahooHockeyRoster(importText)
      } else {
        setError('Import for this sport is coming soon!')
        setIsImporting(false)
        return
      }
      
      if (players.length > 0) {
        onImport(players, teamName || undefined, owner || undefined)
        setImportedCount(players.length)
        setImportText('')
        setTeamName('')
        setOwner('')
        setTimeout(() => setImportedCount(null), 5000)
      } else {
        setError('No players found. Please check the format and try again.')
      }
    } catch (error) {
      console.error('Import error:', error)
      setError('Error importing team data. Please check the format.')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Card title="Import Team from Yahoo Sports">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Team Name
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g., Mooninites"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm transition-colors placeholder:text-gray-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Owner (Optional)
            </label>
            <input
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Owner name"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm transition-colors placeholder:text-gray-400"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Paste Roster Data
          </label>
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
            <textarea
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value)
                setError(null)
              }}
              placeholder="Paste your Yahoo Sports roster table here..."
              className="w-full h-48 px-3 py-2 border-0 bg-transparent focus:outline-none text-gray-900 font-mono text-xs resize-none placeholder:text-gray-400"
            />
          </div>
          
          <div className="mt-2.5 space-y-1.5">
            <p className="text-xs text-gray-500 leading-relaxed">
              Copy the entire roster table from Yahoo Sports including headers and all player rows
            </p>
            {importedCount !== null && (
              <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Successfully imported {importedCount} players
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-2.5">
          <Button 
            onClick={handleImport} 
            disabled={!importText.trim() || isImporting}
            className="flex-1 font-medium"
          >
            {isImporting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Importing...
              </span>
            ) : (
              'Import Team'
            )}
          </Button>
          {importText && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setImportText('')
                setError(null)
              }}
              className="font-medium"
            >
              Clear
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
