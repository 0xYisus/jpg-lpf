import type { Match, StandingRow } from './types'

interface MutableRow {
  team: string
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  points: number
}

function empty(team: string): MutableRow {
  return { team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 }
}

function applyResult(table: Map<string, MutableRow>, m: Match) {
  const home = table.get(m.homeTeam) ?? empty(m.homeTeam)
  const away = table.get(m.awayTeam) ?? empty(m.awayTeam)
  home.played += 1
  away.played += 1
  home.gf += m.homeGoals
  home.ga += m.awayGoals
  away.gf += m.awayGoals
  away.ga += m.homeGoals
  home.gd = home.gf - home.ga
  away.gd = away.gf - away.ga
  if (m.result === 'H') {
    home.won += 1
    home.points += 3
    away.lost += 1
  } else if (m.result === 'A') {
    away.won += 1
    away.points += 3
    home.lost += 1
  } else {
    home.drawn += 1
    away.drawn += 1
    home.points += 1
    away.points += 1
  }
  table.set(m.homeTeam, home)
  table.set(m.awayTeam, away)
}

function rank(rows: MutableRow[]): StandingRow[] {
  const sorted = [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.gd !== a.gd) return b.gd - a.gd
    if (b.gf !== a.gf) return b.gf - a.gf
    return a.team.localeCompare(b.team)
  })
  return sorted.map((r, i) => ({ ...r, position: i + 1 }))
}

/**
 * League table from all matches in `seasonMatches` with kickoff strictly
 * before `beforeKickoffMs`. Used for "position at kickoff" betting.
 */
export function standingsBefore(
  seasonMatches: Match[],
  beforeKickoffMs: number,
): StandingRow[] {
  const prior = seasonMatches
    .filter((m) => m.kickoffMs < beforeKickoffMs)
    .sort((a, b) => a.kickoffMs - b.kickoffMs)

  const table = new Map<string, MutableRow>()
  for (const m of prior) applyResult(table, m)
  return rank([...table.values()])
}

export function finalStandings(seasonMatches: Match[]): StandingRow[] {
  const sorted = [...seasonMatches].sort((a, b) => a.kickoffMs - b.kickoffMs)
  const table = new Map<string, MutableRow>()
  for (const m of sorted) applyResult(table, m)
  return rank([...table.values()])
}

export function positionOf(
  standings: StandingRow[],
  team: string,
): number | null {
  return standings.find((r) => r.team === team)?.position ?? null
}
