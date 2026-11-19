import type { LeagueId, Match, MatchResult, Odds1X2 } from './types'

function parseNum(v: string | undefined): number | null {
  if (v == null || v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n > 1 ? n : null
}

function pickOdds(
  row: Record<string, string>,
  keys: [string, string, string][],
  source: string,
): Odds1X2 | null {
  for (const [h, d, a] of keys) {
    const home = parseNum(row[h])
    const draw = parseNum(row[d])
    const away = parseNum(row[a])
    if (home != null && draw != null && away != null) {
      return { home, draw, away, source }
    }
  }
  return null
}

/** Prefer closing averages, then Bet365 close, then open averages / B365. */
export function extractOdds(row: Record<string, string>): {
  open: Odds1X2 | null
  close: Odds1X2 | null
} {
  const close =
    pickOdds(
      row,
      [
        ['AvgCH', 'AvgCD', 'AvgCA'],
        ['B365CH', 'B365CD', 'B365CA'],
        ['PSCH', 'PSCD', 'PSCA'],
        ['MaxCH', 'MaxCD', 'MaxCA'],
      ],
      'closing',
    ) ??
    pickOdds(
      row,
      [
        ['AvgH', 'AvgD', 'AvgA'],
        ['BbAvH', 'BbAvD', 'BbAvA'],
        ['B365H', 'B365D', 'B365A'],
        ['PSH', 'PSD', 'PSA'],
      ],
      'market',
    )

  const open = pickOdds(
    row,
    [
      ['B365H', 'B365D', 'B365A'],
      ['PSH', 'PSD', 'PSA'],
      ['AvgH', 'AvgD', 'AvgA'],
      ['BbAvH', 'BbAvD', 'BbAvA'],
      ['WHH', 'WHD', 'WHA'],
    ],
    'opening',
  )

  return { open, close }
}

/** football-data dates: DD/MM/YY or DD/MM/YYYY */
export function parseFdDate(dateStr: string, timeStr?: string): { iso: string; ms: number } {
  const parts = dateStr.trim().split(/[/-]/)
  if (parts.length !== 3) {
    return { iso: '1970-01-01', ms: 0 }
  }
  let [dd, mm, yy] = parts
  let year = Number(yy)
  if (yy.length === 2) year += year >= 70 ? 1900 : 2000
  const day = Number(dd)
  const month = Number(mm)
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  let hours = 15
  let mins = 0
  if (timeStr && /^\d{1,2}:\d{2}/.test(timeStr)) {
    const [h, m] = timeStr.split(':')
    hours = Number(h)
    mins = Number(m)
  }
  // Treat kickoff as UTC for ordering; relative order within a day is what matters.
  const ms = Date.UTC(year, month - 1, day, hours, mins)
  return { iso, ms }
}

export function rowToMatch(
  row: Record<string, string>,
  league: LeagueId,
  season: string,
  index: number,
): Match | null {
  const home = (row.HomeTeam || '').trim()
  const away = (row.AwayTeam || '').trim()
  if (!home || !away || !row.Date) return null

  const hg = Number(row.FTHG)
  const ag = Number(row.FTAG)
  if (!Number.isFinite(hg) || !Number.isFinite(ag)) return null

  const ftr = (row.FTR || '').trim() as MatchResult
  const result: MatchResult =
    ftr === 'H' || ftr === 'D' || ftr === 'A'
      ? ftr
      : hg > ag
        ? 'H'
        : hg < ag
          ? 'A'
          : 'D'

  const { iso, ms } = parseFdDate(row.Date, row.Time)
  const { open, close } = extractOdds(row)

  return {
    id: `${league}-${season}-${iso}-${home}-${away}-${index}`,
    league,
    season,
    date: iso,
    time: row.Time?.trim() || null,
    kickoffMs: ms,
    homeTeam: home,
    awayTeam: away,
    homeGoals: hg,
    awayGoals: ag,
    result,
    oddsOpen: open,
    oddsClose: close,
    raw: row,
  }
}
