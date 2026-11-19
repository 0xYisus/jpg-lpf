import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  loadSaltoBundle,
  matchesReference,
  SALTO_WINDOWS,
  seasonLabel,
  type SaltoBundle,
  type SaltoSummaryRow,
  type SaltoWindow,
} from '../data/salto'

function money(n: number): string {
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function euro(n: number): string {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 0 })} €`
}

function roi(n: number): string {
  return `${n.toFixed(2)}%`
}

export function SaltoSimulator() {
  const [bundle, setBundle] = useState<SaltoBundle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [windowId, setWindowId] = useState<SaltoWindow>('15-38')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const data = await loadSaltoBundle()
        if (!cancelled) {
          setBundle(data)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load Salto data')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const summaryRow: SaltoSummaryRow | null = useMemo(() => {
    if (!bundle) return null
    return bundle.summary.find((r) => r.window === windowId) ?? null
  }, [bundle, windowId])

  const seasons = bundle?.seasons[windowId] ?? []
  const bets = bundle?.bets[windowId] ?? []
  const seasonRows = seasons.filter((s) => !s.isTotal)
  const allMatch = bundle?.summary.every(matchesReference) ?? false

  const equity = useMemo(
    () =>
      bets.map((b, i) => ({
        i: i + 1,
        balance: b.runningBalance,
        date: b.realDate,
        team: b.team,
      })),
    [bets],
  )

  return (
    <section className="section" id="salto">
      <div className="section-head">
        <div>
          <h2>Salto a caballo</h2>
          <p>
            LaLiga · 4th place home win only · stake ladder 100 → 500 after D/L,
            back to 100 after W. Seasons 2016/17–2025/26. Numbers from the
            Python simulator artifacts under <code>simulations/salto/</code>.
          </p>
        </div>
        {bundle && (
          <span className={`match-pill ${allMatch ? 'ok' : 'warn'}`}>
            {allMatch ? 'Matches reference' : 'Diverges from reference'}
          </span>
        )}
      </div>

      {loading && (
        <div className="loading-banner">
          <div className="spinner" aria-hidden />
          Loading Salto results…
        </div>
      )}

      {error && (
        <div className="loading-banner" style={{ borderColor: 'var(--bad)' }}>
          {error}
        </div>
      )}

      {bundle && !loading && !error && (
        <div className="sim-layout">
          <div className="panel sim-form">
            <div className="field">
              <label>Matchday window</label>
              <div className="chip-row">
                {SALTO_WINDOWS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    className={`chip ${windowId === w ? 'on' : ''}`}
                    onClick={() => setWindowId(w)}
                  >
                    {w.replace('-', '–')}
                  </button>
                ))}
              </div>
            </div>

            <p className="rule-note">
              Fixed presets only: official matchdays {windowId.replace('-', '–')}.
              Away and out-of-window fixtures are ignored and do not change the
              stake state. Odds: B365H through 2018/19, B365CH from 2019/20.
            </p>

            <div className="field" style={{ marginTop: '0.5rem' }}>
              <label>All windows (totals)</label>
              <div className="table-wrap" style={{ maxHeight: 220 }}>
                <table className="data">
                  <thead>
                    <tr>
                      <th>Window</th>
                      <th>Net</th>
                      <th>ROI</th>
                      <th>+</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bundle.summary.map((r) => (
                      <tr
                        key={r.window}
                        style={
                          r.window === windowId
                            ? { background: 'rgba(36, 138, 74, 0.18)' }
                            : undefined
                        }
                      >
                        <td>
                          <button
                            type="button"
                            className="linkish"
                            onClick={() => setWindowId(r.window)}
                          >
                            {r.window}
                          </button>
                        </td>
                        <td
                          style={{
                            color: r.net >= 0 ? 'var(--good)' : 'var(--bad)',
                          }}
                        >
                          {money(r.net)}
                        </td>
                        <td>{roi(r.roiPct)}</td>
                        <td>{r.positiveSeasons}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div>
            {summaryRow && (
              <div className="stat-grid">
                <div className="stat">
                  <div className="label">Bets</div>
                  <div className="value">{summaryRow.bets}</div>
                </div>
                <div className="stat">
                  <div className="label">Staked</div>
                  <div className="value">{euro(summaryRow.staked)}</div>
                </div>
                <div className="stat">
                  <div className="label">Net</div>
                  <div
                    className={`value ${summaryRow.net >= 0 ? 'good' : 'bad'}`}
                  >
                    {money(summaryRow.net)}
                  </div>
                </div>
                <div className="stat">
                  <div className="label">ROI</div>
                  <div
                    className={`value ${summaryRow.roiPct >= 0 ? 'good' : 'bad'}`}
                  >
                    {roi(summaryRow.roiPct)}
                  </div>
                </div>
                <div className="stat">
                  <div className="label">Min capital (max annual)</div>
                  <div className="value">{euro(summaryRow.maxAnnualCapital)}</div>
                </div>
                <div className="stat">
                  <div className="label">Positive seasons</div>
                  <div className="value">{summaryRow.positiveSeasons}</div>
                </div>
              </div>
            )}

            <div className="panel" style={{ marginTop: '0.75rem' }}>
              <div className="section-head" style={{ marginBottom: '0.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem' }}>Running balance</h2>
                  <p>Cumulative P&amp;L across all bets in this window.</p>
                </div>
              </div>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <AreaChart data={equity} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="saltoFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#e2c46a" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#e2c46a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(200,245,168,0.08)" vertical={false} />
                    <XAxis
                      dataKey="i"
                      tick={{ fill: '#8aa891', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#8aa891', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={56}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#0b1f13',
                        border: '1px solid rgba(200,245,168,0.2)',
                        borderRadius: 10,
                      }}
                      labelFormatter={(_, payload) => {
                        const p = payload?.[0]?.payload as
                          | { date?: string; i?: number; team?: string }
                          | undefined
                        return p
                          ? `Bet #${p.i} · ${p.date ?? ''} · ${p.team ?? ''}`
                          : ''
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="balance"
                      stroke="#e2c46a"
                      fill="url(#saltoFill)"
                      strokeWidth={2}
                      isAnimationActive
                      animationDuration={900}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel" style={{ marginTop: '0.75rem' }}>
              <div className="section-head">
                <div>
                  <h2 style={{ fontSize: '1.5rem' }}>Per season</h2>
                  <p>Min capital is that season&apos;s required float.</p>
                </div>
              </div>
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Season</th>
                      <th>Bets</th>
                      <th>Staked</th>
                      <th>Net</th>
                      <th>ROI</th>
                      <th>Min capital</th>
                      <th>+/−</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seasonRows.map((s) => (
                      <tr key={s.season}>
                        <td>{seasonLabel(s.season)}</td>
                        <td>{s.bets}</td>
                        <td>{euro(s.staked)}</td>
                        <td
                          style={{
                            color: s.net >= 0 ? 'var(--good)' : 'var(--bad)',
                          }}
                        >
                          {money(s.net)}
                        </td>
                        <td>{roi(s.roiPct)}</td>
                        <td>{euro(s.minCapital)}</td>
                        <td>{s.positive === true ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel" style={{ marginTop: '0.75rem' }}>
              <div className="section-head">
                <div>
                  <h2 style={{ fontSize: '1.5rem' }}>Bet log</h2>
                  <p>
                    {bets.length} legs · stake state before/after each settlement.
                  </p>
                </div>
              </div>
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>MD</th>
                      <th>Team</th>
                      <th>Opp</th>
                      <th>Score</th>
                      <th>Odds</th>
                      <th>Col</th>
                      <th>Stake</th>
                      <th>Net</th>
                      <th>Bal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...bets].reverse().map((b, i) => (
                      <tr key={`${b.season}-${b.matchday}-${b.realDate}-${i}`}>
                        <td>{b.realDate}</td>
                        <td>{b.matchday}</td>
                        <td>{b.team}</td>
                        <td>{b.opponent}</td>
                        <td className="score">{b.score}</td>
                        <td className="odds">{b.odds.toFixed(2)}</td>
                        <td className="odds">{b.oddsCol}</td>
                        <td>{b.stake}</td>
                        <td
                          style={{
                            color: b.net >= 0 ? 'var(--good)' : 'var(--bad)',
                          }}
                        >
                          {money(b.net)}
                        </td>
                        <td>{money(b.runningBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
