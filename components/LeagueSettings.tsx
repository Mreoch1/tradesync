'use client'

import { LeagueSettings } from '@/types'
import Card from './ui/Card'

interface LeagueSettingsProps {
  settings: LeagueSettings
  onSettingsChange: (settings: LeagueSettings) => void
}

export default function LeagueSettingsComponent({ settings, onSettingsChange }: LeagueSettingsProps) {
  return (
    <Card title="League Settings">
      <div className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            League Type
          </label>
          <select
            value={settings.sport}
            onChange={(e) =>
              onSettingsChange({ ...settings, sport: e.target.value as LeagueSettings['sport'] })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm transition-colors"
          >
            <option value="nfl">NFL</option>
            <option value="nba">NBA</option>
            <option value="mlb">MLB</option>
            <option value="nhl">NHL</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Scoring Format
          </label>
          <select
            value={settings.scoringType}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                scoringType: e.target.value as LeagueSettings['scoringType'],
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm transition-colors"
          >
            <option value="standard">Standard</option>
            <option value="ppr">PPR (Points Per Reception)</option>
            <option value="half-ppr">Half PPR</option>
            <option value="categories">Categories</option>
            <option value="points">Points</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Roster Size
            </label>
            <input
              type="number"
              value={settings.rosterSize || ''}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  rosterSize: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              placeholder="Optional"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm transition-colors"
              min="1"
              max="30"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Bench Size
            </label>
            <input
              type="number"
              value={settings.benchSize || ''}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  benchSize: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              placeholder="Optional"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm transition-colors"
              min="0"
              max="20"
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
