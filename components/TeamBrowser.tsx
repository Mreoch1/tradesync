'use client'

import Link from 'next/link'
import { Team } from '@/types/teams'
import Card from './ui/Card'

interface TeamBrowserProps {
  teams: Team[]
  selectedTeamId: string | null
  onSelectTeam: (teamId: string | null) => void
}

export default function TeamBrowser({ teams, selectedTeamId, onSelectTeam }: TeamBrowserProps) {
  return (
    <Card title="Teams">
      <div className="space-y-2">
        <button
          onClick={() => onSelectTeam(null)}
          className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
            selectedTeamId === null
              ? 'bg-blue-50 text-blue-700 border-2 border-blue-200 shadow-sm font-semibold'
              : 'hover:bg-gray-50 text-gray-700 border-2 border-transparent hover:border-gray-200'
          }`}
        >
          All Players
        </button>
        {teams.map((team) => (
          <Link
            key={team.id}
            href={`/teams/${team.id}`}
            className={`block w-full text-left px-4 py-3 rounded-lg text-sm transition-all duration-200 hover:bg-gray-50 text-gray-700 border-2 ${
              selectedTeamId === team.id 
                ? 'bg-blue-50 border-blue-200 shadow-sm font-semibold' 
                : 'border-transparent hover:border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="font-medium text-slate-900">{team.name}</span>
              {team.rank && (
                <span className="text-xs text-gray-500 font-medium">#{team.rank}</span>
              )}
            </div>
            {team.owner && (
              <div className="text-xs text-gray-500 mt-0.5">
                {team.owner}
              </div>
            )}
            {team.record && (
              <div className="text-xs text-gray-500">
                {team.record}
              </div>
            )}
            <div className="text-xs text-gray-500 mt-1">
              {team.players.length} players
            </div>
          </Link>
        ))}
      </div>
    </Card>
  )
}
