import type { LeagueId, Match } from '../data/types'

export type VenueFilter = 'home' | 'away' | 'both'

export type MarketPick = 'team_win' | 'draw' | 'opponent_win'

export type StreakKind = 'W' | 'D' | 'L' | 'any'

export type SelectionMode = 'team' | 'position'

/**
 * Position rule (documented for users):
 * For each candidate match, compute the league table from all completed
 * matches in that season with kickoff strictly before this match.
 * Ranking: points → goal difference → goals for → team name.
 * If the home or away team (per venue filter) currently occupies `tablePosition`,
 * that side is the selection.
 */
export interface StrategyConfig {
  leagues: LeagueId[]
  seasons: string[]
  selectionMode: SelectionMode
  /** When selectionMode === 'team' */
  team: string
  /** When selectionMode === 'position' — 1-based league rank at kickoff */
  tablePosition: number
  venue: VenueFilter
  /** Bet market relative to the selected side */
  market: MarketPick
  /** Require N consecutive prior results before betting */
  streakEnabled: boolean
  streakKind: StreakKind
  streakLength: number
  flatStake: number
  startingBankroll: number
  /** Prefer closing odds; fall back to opening */
  useClosingOdds: boolean
}

export interface BetLeg {
  match: Match
  selectedTeam: string
  opponent: string
  venue: 'home' | 'away'
  market: MarketPick
  odds: number
  stake: number
  won: boolean
  profit: number
  bankrollAfter: number
  selectedPosition: number | null
  date: string
}

export interface SimSummary {
  bets: number
  wins: number
  losses: number
  winRate: number
  stakeTotal: number
  profit: number
  roi: number
  maxDrawdown: number
  peakBankroll: number
  finalBankroll: number
  avgOdds: number
}

export interface SimResult {
  legs: BetLeg[]
  equity: { date: string; bankroll: number; profit: number; i: number }[]
  summary: SimSummary
  config: StrategyConfig
}
