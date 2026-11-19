/** Core domain types — source-agnostic so providers can be swapped. */

export type LeagueId = 'E0' | 'SP1' | 'I1' | 'D1' | 'F1'

export type MatchResult = 'H' | 'D' | 'A'

export interface Odds1X2 {
  home: number | null
  draw: number | null
  away: number | null
  source: string
}

export interface Match {
  id: string
  league: LeagueId
  season: string
  date: string // ISO YYYY-MM-DD
  time: string | null
  kickoffMs: number
  homeTeam: string
  awayTeam: string
  homeGoals: number
  awayGoals: number
  result: MatchResult
  /** Opening / early bookmaker 1X2 when available */
  oddsOpen: Odds1X2 | null
  /** Closing / average 1X2 when available */
  oddsClose: Odds1X2 | null
  raw: Record<string, string>
}

export interface StandingRow {
  team: string
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  points: number
  position: number
}

export interface DataManifest {
  leagues: LeagueId[]
  seasons: string[]
  generatedAt: string
  source: string
}

export interface MatchQuery {
  league?: LeagueId | 'all'
  season?: string | 'all'
  team?: string | 'all'
  search?: string
}

export interface DataProvider {
  readonly id: string
  readonly label: string
  listSeasons(league: LeagueId): Promise<string[]>
  loadMatches(league: LeagueId, season: string): Promise<Match[]>
  loadAll?(leagues?: LeagueId[]): Promise<Match[]>
}
