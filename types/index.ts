export interface Player {
  id: string
  name: string
  position: string // Single position or comma-separated (e.g., "C", "LW,RW", "G")
  team: string
  stats?: PlayerStats
  projectedStats?: PlayerStats
  value?: number
  rank?: number
  startPercentage?: number // % Start
  rosPercentage?: number // % Rest of Season
  opponent?: string
  status?: 'healthy' | 'DTD' | 'IR' | 'IR-LT' | 'OUT'
  notes?: string
}

export interface PlayerStats {
  // Basketball stats
  points?: number
  rebounds?: number
  assists?: number
  steals?: number
  blocks?: number
  turnovers?: number
  fieldGoalPercentage?: number
  freeThrowPercentage?: number
  threePointPercentage?: number
  
  // Hockey stats (skaters)
  goals?: number
  hockeyAssists?: number // Using different name to avoid conflict
  hockeyPoints?: number // Total points (G+A)
  plusMinus?: number
  pim?: number // Penalty Minutes
  ppp?: number // Power Play Points
  shp?: number // Short Handed Points
  gwg?: number // Game Winning Goals
  sog?: number // Shots on Goal
  fw?: number // Faceoff Wins
  hit?: number // Hits
  blk?: number // Blocks
  
  // Goaltender stats
  gs?: number // Games Started
  wins?: number
  losses?: number
  ga?: number // Goals Against
  gaa?: number // Goals Against Average
  sv?: number // Saves
  sa?: number // Shots Against
  svp?: number // Save Percentage
  sho?: number // Shutouts
  
  [key: string]: number | undefined
}

export interface TradeSide {
  players: Player[]
  picks?: DraftPick[]
}

export interface DraftPick {
  id?: string
  year: number
  round: number
  teamId: string // Which team owns this pick
  description?: string
  value?: number // Calculated value based on round
}

export interface Trade {
  id: string
  sideA: TradeSide
  sideB: TradeSide
  leagueSettings?: LeagueSettings
  createdAt?: Date
}

export interface LeagueSettings {
  sport: 'nfl' | 'nba' | 'mlb' | 'nhl' | 'other'
  scoringType: 'standard' | 'ppr' | 'half-ppr' | 'categories' | 'points'
  rosterSize?: number
  benchSize?: number
  startingLineup?: {
    [position: string]: number
  }
}

export interface TradeAnalysis {
  trade: Trade
  sideAAnalysis: SideAnalysis
  sideBAnalysis: SideAnalysis
  recommendation: 'accept' | 'decline' | 'counter'
  confidence: number
  reasoning: string[]
}

export interface SideAnalysis {
  totalValue: number
  positionalValue: { [position: string]: number }
  projectedPoints?: number
  needs: string[]
  strengths: string[]
  weaknesses: string[]
}

