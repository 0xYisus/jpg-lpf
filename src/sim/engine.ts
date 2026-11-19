import { standingsBefore, positionOf } from '../data/standings'
import type { Match, Odds1X2 } from '../data/types'
import type {
  BetLeg,
  MarketPick,
  SimResult,
  SimSummary,
  StrategyConfig,
  StreakKind,
  VenueFilter,
} from './types'

function resultForTeam(m: Match, team: string): StreakKind {
  const isHome = m.homeTeam === team
  if (m.result === 'D') return 'D'
  if (isHome) return m.result === 'H' ? 'W' : 'L'
  return m.result === 'A' ? 'W' : 'L'
}

function oddsForPick(
  odds: Odds1X2 | null,
  selectedIsHome: boolean,
  market: MarketPick,
): number | null {
  if (!odds) return null
  if (market === 'draw') return odds.draw
  if (market === 'team_win') return selectedIsHome ? odds.home : odds.away
  return selectedIsHome ? odds.away : odds.home
}

function pickWon(m: Match, selectedIsHome: boolean, market: MarketPick): boolean {
  if (market === 'draw') return m.result === 'D'
  if (market === 'team_win') return selectedIsHome ? m.result === 'H' : m.result === 'A'
  return selectedIsHome ? m.result === 'A' : m.result === 'H'
}

function venueOk(selectedIsHome: boolean, venue: VenueFilter): boolean {
  if (venue === 'both') return true
  if (venue === 'home') return selectedIsHome
  return !selectedIsHome
}

/**
 * Check the selected team's form over their last `n` completed matches
 * before `beforeKickoffMs` (any league season slice provided in `historyPool`).
 */
function streakMatches(
  historyPool: Match[],
  team: string,
  beforeKickoffMs: number,
  kind: StreakKind,
  n: number,
): boolean {
  if (n <= 0) return true
  const prior = historyPool
    .filter(
      (m) =>
        m.kickoffMs < beforeKickoffMs &&
        (m.homeTeam === team || m.awayTeam === team),
    )
    .sort((a, b) => b.kickoffMs - a.kickoffMs)
    .slice(0, n)

  if (prior.length < n) return false
  return prior.every((m) => {
    const r = resultForTeam(m, team)
    return kind === 'any' ? true : r === kind
  })
}

function seasonKey(m: Match): string {
  return `${m.league}|${m.season}`
}

export function runSimulation(allMatches: Match[], config: StrategyConfig): SimResult {
  const seasonSet = new Set(config.seasons)
  const leagueSet = new Set(config.leagues)

  const filtered = allMatches
    .filter((m) => leagueSet.has(m.league) && seasonSet.has(m.season))
    .sort((a, b) => a.kickoffMs - b.kickoffMs)

  // Group by league+season for table-at-kickoff
  const bySeason = new Map<string, Match[]>()
  for (const m of filtered) {
    const k = seasonKey(m)
    const arr = bySeason.get(k) ?? []
    arr.push(m)
    bySeason.set(k, arr)
  }

  let bankroll = config.startingBankroll
  let peak = bankroll
  let maxDrawdown = 0
  const legs: BetLeg[] = []
  const equity: SimResult['equity'] = [
    { date: filtered[0]?.date ?? '', bankroll, profit: 0, i: 0 },
  ]

  for (const m of filtered) {
    const seasonMatches = bySeason.get(seasonKey(m)) ?? []
    let selectedTeam: string | null = null
    let selectedPosition: number | null = null

    if (config.selectionMode === 'team') {
      if (m.homeTeam !== config.team && m.awayTeam !== config.team) continue
      selectedTeam = config.team
      const table = standingsBefore(seasonMatches, m.kickoffMs)
      selectedPosition = positionOf(table, selectedTeam)
    } else {
      const table = standingsBefore(seasonMatches, m.kickoffMs)
      const row = table.find((r) => r.position === config.tablePosition)
      if (!row) continue
      // Position team must be playing in this match
      if (row.team !== m.homeTeam && row.team !== m.awayTeam) continue
      selectedTeam = row.team
      selectedPosition = row.position
    }

    const selectedIsHome = selectedTeam === m.homeTeam
    if (!venueOk(selectedIsHome, config.venue)) continue

    if (config.streakEnabled) {
      // Form within the same league-season (clearer for table context)
      if (
        !streakMatches(
          seasonMatches,
          selectedTeam,
          m.kickoffMs,
          config.streakKind,
          config.streakLength,
        )
      ) {
        continue
      }
    }

    const oddsBundle = config.useClosingOdds
      ? (m.oddsClose ?? m.oddsOpen)
      : (m.oddsOpen ?? m.oddsClose)
    const odds = oddsForPick(oddsBundle, selectedIsHome, config.market)
    if (odds == null || odds <= 1) continue

    const stake = config.flatStake
    if (bankroll < stake && config.startingBankroll > 0) {
      // Still record conceptually if bankroll tracking is informational;
      // allow bet if starting bankroll is 0 (P&L-only mode).
      if (config.startingBankroll > 0) continue
    }

    const won = pickWon(m, selectedIsHome, config.market)
    const profit = won ? stake * (odds - 1) : -stake
    bankroll += profit
    peak = Math.max(peak, bankroll)
    maxDrawdown = Math.max(maxDrawdown, peak - bankroll)

    legs.push({
      match: m,
      selectedTeam,
      opponent: selectedIsHome ? m.awayTeam : m.homeTeam,
      venue: selectedIsHome ? 'home' : 'away',
      market: config.market,
      odds,
      stake,
      won,
      profit,
      bankrollAfter: bankroll,
      selectedPosition,
      date: m.date,
    })

    equity.push({
      date: m.date,
      bankroll,
      profit: bankroll - config.startingBankroll,
      i: legs.length,
    })
  }

  const summary = summarize(legs, bankroll, peak, maxDrawdown)
  return { legs, equity, summary, config }
}

function summarize(
  legs: BetLeg[],
  finalBankroll: number,
  peakBankroll: number,
  maxDrawdown: number,
): SimSummary {
  const bets = legs.length
  const wins = legs.filter((l) => l.won).length
  const losses = bets - wins
  const stakeTotal = legs.reduce((s, l) => s + l.stake, 0)
  const profit = legs.reduce((s, l) => s + l.profit, 0)
  const avgOdds = bets ? legs.reduce((s, l) => s + l.odds, 0) / bets : 0
  return {
    bets,
    wins,
    losses,
    winRate: bets ? wins / bets : 0,
    stakeTotal,
    profit,
    roi: stakeTotal ? profit / stakeTotal : 0,
    maxDrawdown,
    peakBankroll,
    finalBankroll,
    avgOdds,
  }
}

export function defaultConfig(): StrategyConfig {
  return {
    leagues: ['E0'],
    seasons: ['2425', '2324', '2223'],
    selectionMode: 'team',
    team: '',
    tablePosition: 4,
    venue: 'both',
    market: 'team_win',
    streakEnabled: false,
    streakKind: 'L',
    streakLength: 2,
    flatStake: 10,
    startingBankroll: 1000,
    useClosingOdds: true,
  }
}
