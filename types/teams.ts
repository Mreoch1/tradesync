import { Player } from './index'

export interface Team {
  id: string
  name: string
  owner?: string
  players: Player[]
  record?: string
  rank?: number
}

export interface TeamData {
  teams: Team[]
}

