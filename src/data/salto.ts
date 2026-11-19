import Papa from 'papaparse'

export type SaltoWindow = '10-38' | '15-38' | '29-38'

export const SALTO_WINDOWS: SaltoWindow[] = ['10-38', '15-38', '29-38']

export const SALTO_REFERENCE: Record<
  SaltoWindow,
  {
    bets: number
    staked: number
    net: number
    roiPct: number
    maxAnnualCapital: number
    positiveSeasons: string
  }
> = {
  '10-38': {
    bets: 142,
    staked: 32600,
    net: 2912,
    roiPct: 8.93,
    maxAnnualCapital: 2600,
    positiveSeasons: '6/10',
  },
  '15-38': {
    bets: 117,
    staked: 25300,
    net: 5270,
    roiPct: 20.83,
    maxAnnualCapital: 1429,
    positiveSeasons: '8/10',
  },
  '29-38': {
    bets: 50,
    staked: 10200,
    net: 3784,
    roiPct: 37.1,
    maxAnnualCapital: 1006,
    positiveSeasons: '9/10',
  },
}

export interface SaltoSummaryRow {
  window: SaltoWindow
  bets: number
  staked: number
  net: number
  roiPct: number
  maxAnnualCapital: number
  positiveSeasons: string
}

export interface SaltoSeasonRow {
  season: string
  window: SaltoWindow
  bets: number
  staked: number
  net: number
  roiPct: number
  minCapital: number
  positive: boolean | string
  isTotal?: boolean
}

export interface SaltoBetRow {
  season: string
  matchday: number
  cutoffDate: string
  realDate: string
  team: string
  opponent: string
  score: string
  result: string
  odds: number
  oddsCol: string
  stake: number
  priorState: number
  postState: number
  payout: number
  net: number
  runningBalance: number
  won: boolean
}

export interface SaltoBundle {
  summary: SaltoSummaryRow[]
  seasons: Record<SaltoWindow, SaltoSeasonRow[]>
  bets: Record<SaltoWindow, SaltoBetRow[]>
}

function num(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return Number(v.replace(',', '.'))
  return Number(v)
}

async function fetchCsv(path: string): Promise<Record<string, string>[]> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`)
  const text = await res.text()
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  })
  if (parsed.errors.length) {
    throw new Error(`CSV parse error in ${path}: ${parsed.errors[0]?.message}`)
  }
  return parsed.data
}

function parseSummary(rows: Record<string, string>[]): SaltoSummaryRow[] {
  return rows.map((r) => ({
    window: r.window as SaltoWindow,
    bets: num(r.bets),
    staked: num(r.staked),
    net: num(r.net),
    roiPct: num(r.roi_pct),
    maxAnnualCapital: num(r.max_annual_capital),
    positiveSeasons: r.positive_seasons,
  }))
}

function parseSeasons(rows: Record<string, string>[]): SaltoSeasonRow[] {
  return rows.map((r) => {
    const isTotal = r.season === 'TOTAL'
    return {
      season: r.season,
      window: r.window as SaltoWindow,
      bets: num(r.bets),
      staked: num(r.staked),
      net: num(r.net),
      roiPct: num(r.roi_pct),
      minCapital: num(r.min_capital),
      positive: isTotal ? r.positive : r.positive === 'True',
      isTotal,
    }
  })
}

function parseBets(rows: Record<string, string>[]): SaltoBetRow[] {
  return rows.map((r) => ({
    season: r.season,
    matchday: num(r.matchday),
    cutoffDate: r.cutoff_date,
    realDate: r.real_date,
    team: r.team,
    opponent: r.opponent,
    score: r.score,
    result: r.result,
    odds: num(r.odds),
    oddsCol: r.odds_col,
    stake: num(r.stake),
    priorState: num(r.prior_state),
    postState: num(r.post_state),
    payout: num(r.payout),
    net: num(r.net),
    runningBalance: num(r.running_balance),
    won: r.won === 'True',
  }))
}

export function seasonLabel(code: string): string {
  if (code === 'TOTAL') return 'TOTAL'
  if (code.length !== 4) return code
  return `20${code.slice(0, 2)}/${code.slice(2)}`
}

/** Load precomputed Salto artifacts from /data/salto (Python sim outputs). */
export async function loadSaltoBundle(): Promise<SaltoBundle> {
  const [summaryRaw, ...rest] = await Promise.all([
    fetchCsv('/data/salto/summary.csv'),
    ...SALTO_WINDOWS.flatMap((w) => [
      fetchCsv(`/data/salto/seasons_window_${w}.csv`),
      fetchCsv(`/data/salto/bets_window_${w}.csv`),
    ]),
  ])

  const seasons = {} as Record<SaltoWindow, SaltoSeasonRow[]>
  const bets = {} as Record<SaltoWindow, SaltoBetRow[]>

  SALTO_WINDOWS.forEach((w, i) => {
    seasons[w] = parseSeasons(rest[i * 2] ?? [])
    bets[w] = parseBets(rest[i * 2 + 1] ?? [])
  })

  return {
    summary: parseSummary(summaryRaw),
    seasons,
    bets,
  }
}

export function matchesReference(row: SaltoSummaryRow): boolean {
  const ref = SALTO_REFERENCE[row.window]
  if (!ref) return false
  return (
    row.bets === ref.bets &&
    row.staked === ref.staked &&
    row.net === ref.net &&
    Math.abs(row.roiPct - ref.roiPct) < 0.005 &&
    row.maxAnnualCapital === ref.maxAnnualCapital &&
    row.positiveSeasons === ref.positiveSeasons
  )
}
