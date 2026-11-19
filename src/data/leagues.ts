import type { LeagueId } from './types'

export interface LeagueMeta {
  id: LeagueId
  name: string
  country: string
  short: string
  accent: string
}

export const LEAGUES: LeagueMeta[] = [
  { id: 'E0', name: 'Premier League', country: 'England', short: 'EPL', accent: '#c8102e' },
  { id: 'SP1', name: 'La Liga', country: 'Spain', short: 'LL', accent: '#f1c40f' },
  { id: 'I1', name: 'Serie A', country: 'Italy', short: 'SA', accent: '#009246' },
  { id: 'D1', name: 'Bundesliga', country: 'Germany', short: 'BL', accent: '#dd0000' },
  { id: 'F1', name: 'Ligue 1', country: 'France', short: 'L1', accent: '#002395' },
]

/** Season codes used by football-data.co.uk (YYZZ → 20YY/20ZZ). */
export const SEASONS = [
  '1516',
  '1617',
  '1718',
  '1819',
  '1920',
  '2021',
  '2122',
  '2223',
  '2324',
  '2425',
] as const

export type SeasonCode = (typeof SEASONS)[number]

export function seasonLabel(code: string): string {
  if (code.length !== 4) return code
  const a = Number(code.slice(0, 2))
  const b = Number(code.slice(2, 4))
  return `20${String(a).padStart(2, '0')}/20${String(b).padStart(2, '0')}`
}

export function leagueById(id: LeagueId): LeagueMeta {
  return LEAGUES.find((l) => l.id === id)!
}
