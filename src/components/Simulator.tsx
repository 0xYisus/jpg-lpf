import { useMemo, useState } from 'react'
import { LEAGUES, SEASONS, seasonLabel } from '../data/leagues'
import type { LeagueId, Match } from '../data/types'
import { defaultConfig, runSimulation } from '../sim/engine'
import type { StrategyConfig } from '../sim/types'
import { SimCharts } from './SimCharts'

interface SimulatorProps {
  matches: Match[]
}

function money(n: number): string {
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}`
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

export function Simulator({ matches }: SimulatorProps) {
  const [config, setConfig] = useState<StrategyConfig>(() => defaultConfig())
  const [ran, setRan] = useState(false)

  const teams = useMemo(() => {
    const set = new Set<string>()
    for (const m of matches) {
      if (!config.leagues.includes(m.league)) continue
      if (!config.seasons.includes(m.season)) continue
      set.add(m.homeTeam)
      set.add(m.awayTeam)
    }
    return [...set].sort()
  }, [matches, config.leagues, config.seasons])

  // Auto-pick a team when empty / invalid
  const effectiveConfig = useMemo(() => {
    const c = { ...config }
    if (c.selectionMode === 'team' && (!c.team || !teams.includes(c.team))) {
      c.team = teams[0] ?? ''
    }
    return c
  }, [config, teams])

  const result = useMemo(() => {
    if (!ran) return null
    return runSimulation(matches, effectiveConfig)
  }, [matches, effectiveConfig, ran])

  function toggleLeague(id: LeagueId) {
    setConfig((c) => {
      const has = c.leagues.includes(id)
      const leagues = has ? c.leagues.filter((x) => x !== id) : [...c.leagues, id]
      return { ...c, leagues: leagues.length ? leagues : [id] }
    })
    setRan(false)
  }

  function toggleSeason(code: string) {
    setConfig((c) => {
      const has = c.seasons.includes(code)
      const seasons = has ? c.seasons.filter((x) => x !== code) : [...c.seasons, code]
      return { ...c, seasons: seasons.length ? seasons : [code] }
    })
    setRan(false)
  }

  const patch = <K extends keyof StrategyConfig>(key: K, value: StrategyConfig[K]) => {
    setConfig((c) => ({ ...c, [key]: value }))
    setRan(false)
  }

  return (
    <section className="section" id="simulate">
      <div className="section-head">
        <div>
          <h2>Strategy simulator</h2>
          <p>
            Flat-stake backtests on historical 1X2 odds. Pick a club or a table
            position at kickoff, optional streak filters, home/away.
          </p>
        </div>
      </div>

      <div className="sim-layout">
        <div className="panel sim-form">
          <div className="field">
            <label>Leagues</label>
            <div className="chip-row">
              {LEAGUES.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={`chip ${config.leagues.includes(l.id) ? 'on' : ''}`}
                  onClick={() => toggleLeague(l.id)}
                >
                  {l.short}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Seasons</label>
            <div className="chip-row">
              {[...SEASONS].reverse().map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`chip ${config.seasons.includes(s) ? 'on' : ''}`}
                  onClick={() => toggleSeason(s)}
                >
                  {seasonLabel(s).replace('20', '').replace('/20', '/')}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="selMode">Selection</label>
            <select
              id="selMode"
              value={config.selectionMode}
              onChange={(e) =>
                patch('selectionMode', e.target.value as StrategyConfig['selectionMode'])
              }
            >
              <option value="team">Specific team</option>
              <option value="position">Table position at kickoff</option>
            </select>
          </div>

          {config.selectionMode === 'team' ? (
            <div className="field">
              <label htmlFor="teamSel">Team</label>
              <select
                id="teamSel"
                value={effectiveConfig.team}
                onChange={(e) => patch('team', e.target.value)}
              >
                {teams.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="field">
              <label htmlFor="pos">Table position (1 = top)</label>
              <input
                id="pos"
                type="number"
                min={1}
                max={20}
                value={config.tablePosition}
                onChange={(e) => patch('tablePosition', Number(e.target.value) || 1)}
              />
              <p className="rule-note">
                Before each match, the table is rebuilt from that season&apos;s
                completed fixtures with an earlier kickoff. Tie-break:
                points → GD → GF → name. Bet only when the team in this
                position is playing in the match.
              </p>
            </div>
          )}

          <div className="field">
            <label htmlFor="venue">Venue</label>
            <select
              id="venue"
              value={config.venue}
              onChange={(e) => patch('venue', e.target.value as StrategyConfig['venue'])}
            >
              <option value="both">Home & away</option>
              <option value="home">Home only</option>
              <option value="away">Away only</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="market">Market (relative to selected side)</label>
            <select
              id="market"
              value={config.market}
              onChange={(e) => patch('market', e.target.value as StrategyConfig['market'])}
            >
              <option value="team_win">Selected team to win</option>
              <option value="draw">Draw</option>
              <option value="opponent_win">Opponent to win</option>
            </select>
          </div>

          <label className="check-row">
            <input
              type="checkbox"
              checked={config.streakEnabled}
              onChange={(e) => patch('streakEnabled', e.target.checked)}
            />
            Require prior streak
          </label>

          {config.streakEnabled && (
            <>
              <div className="field">
                <label htmlFor="streakKind">Streak type</label>
                <select
                  id="streakKind"
                  value={config.streakKind}
                  onChange={(e) =>
                    patch('streakKind', e.target.value as StrategyConfig['streakKind'])
                  }
                >
                  <option value="W">Wins</option>
                  <option value="D">Draws</option>
                  <option value="L">Losses</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="streakN">Consecutive results</label>
                <input
                  id="streakN"
                  type="number"
                  min={1}
                  max={10}
                  value={config.streakLength}
                  onChange={(e) => patch('streakLength', Number(e.target.value) || 1)}
                />
                <p className="rule-note">
                  Uses the selected team&apos;s last N results in that
                  league-season before the match. Example: after 2 losses → bet
                  their next game.
                </p>
              </div>
            </>
          )}

          <div className="field">
            <label htmlFor="stake">Flat stake</label>
            <input
              id="stake"
              type="number"
              min={1}
              step={1}
              value={config.flatStake}
              onChange={(e) => patch('flatStake', Number(e.target.value) || 1)}
            />
          </div>

          <div className="field">
            <label htmlFor="bank">Starting bankroll</label>
            <input
              id="bank"
              type="number"
              min={0}
              step={10}
              value={config.startingBankroll}
              onChange={(e) => patch('startingBankroll', Number(e.target.value) || 0)}
            />
          </div>

          <label className="check-row">
            <input
              type="checkbox"
              checked={config.useClosingOdds}
              onChange={(e) => patch('useClosingOdds', e.target.checked)}
            />
            Prefer closing / average odds
          </label>

          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: '0.5rem' }}
            onClick={() => setRan(true)}
          >
            Run simulation
          </button>
        </div>

        <div>
          {!result && (
            <div className="panel muted">
              Configure a strategy and hit <strong style={{ color: 'var(--kit-white)' }}>Run simulation</strong>.
              Results stay in-browser — no API calls.
            </div>
          )}

          {result && (
            <>
              <div className="stat-grid">
                <div className="stat">
                  <div className="label">ROI</div>
                  <div className={`value ${result.summary.roi >= 0 ? 'good' : 'bad'}`}>
                    {pct(result.summary.roi)}
                  </div>
                </div>
                <div className="stat">
                  <div className="label">Profit / loss</div>
                  <div className={`value ${result.summary.profit >= 0 ? 'good' : 'bad'}`}>
                    {money(result.summary.profit)}
                  </div>
                </div>
                <div className="stat">
                  <div className="label">Win rate</div>
                  <div className="value">{pct(result.summary.winRate)}</div>
                </div>
                <div className="stat">
                  <div className="label">Bets</div>
                  <div className="value">{result.summary.bets}</div>
                </div>
                <div className="stat">
                  <div className="label">Max drawdown</div>
                  <div className="value bad">{result.summary.maxDrawdown.toFixed(2)}</div>
                </div>
                <div className="stat">
                  <div className="label">Avg odds</div>
                  <div className="value">{result.summary.avgOdds.toFixed(2)}</div>
                </div>
              </div>

              <SimCharts result={result} />

              <div className="panel" style={{ marginTop: '0.75rem' }}>
                <div className="section-head">
                  <div>
                    <h2 style={{ fontSize: '1.5rem' }}>Bet log</h2>
                    <p>Most recent 100 legs.</p>
                  </div>
                </div>
                <div className="table-wrap">
                  <table className="data">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Fixture</th>
                        <th>Pick</th>
                        <th>Pos</th>
                        <th>Odds</th>
                        <th>P/L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...result.legs]
                        .reverse()
                        .slice(0, 100)
                        .map((leg, i) => (
                          <tr key={`${leg.match.id}-${i}`}>
                            <td>{leg.date}</td>
                            <td>
                              {leg.match.homeTeam} {leg.match.homeGoals}–{leg.match.awayGoals}{' '}
                              {leg.match.awayTeam}
                            </td>
                            <td>
                              {leg.selectedTeam} ({leg.venue})
                            </td>
                            <td>{leg.selectedPosition ?? '—'}</td>
                            <td className="odds">{leg.odds.toFixed(2)}</td>
                            <td className={leg.profit >= 0 ? 'score' : ''} style={{ color: leg.profit >= 0 ? 'var(--good)' : 'var(--bad)' }}>
                              {money(leg.profit)}
                            </td>
                          </tr>
                        ))}
                      {result.legs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="muted">
                            No bets matched these filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
