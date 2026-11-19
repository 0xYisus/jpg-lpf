import { useMemo, useState } from 'react'
import { LEAGUES, seasonLabel } from '../data/leagues'
import type { LeagueId, Match } from '../data/types'

interface MatchBrowserProps {
  matches: Match[]
  seasons: string[]
}

function fmtOdds(n: number | null | undefined): string {
  return n != null ? n.toFixed(2) : '—'
}

export function MatchBrowser({ matches, seasons }: MatchBrowserProps) {
  const [league, setLeague] = useState<LeagueId | 'all'>('E0')
  const [season, setSeason] = useState<string>('2425')
  const [team, setTeam] = useState('all')
  const [q, setQ] = useState('')

  const teams = useMemo(() => {
    const set = new Set<string>()
    for (const m of matches) {
      if (league !== 'all' && m.league !== league) continue
      if (season !== 'all' && m.season !== season) continue
      set.add(m.homeTeam)
      set.add(m.awayTeam)
    }
    return [...set].sort()
  }, [matches, league, season])

  const rows = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return matches
      .filter((m) => {
        if (league !== 'all' && m.league !== league) return false
        if (season !== 'all' && m.season !== season) return false
        if (team !== 'all' && m.homeTeam !== team && m.awayTeam !== team) return false
        if (
          qq &&
          !`${m.homeTeam} ${m.awayTeam}`.toLowerCase().includes(qq)
        ) {
          return false
        }
        return true
      })
      .slice()
      .sort((a, b) => b.kickoffMs - a.kickoffMs)
      .slice(0, 400)
  }, [matches, league, season, team, q])

  return (
    <section className="section" id="browse">
      <div className="section-head">
        <div>
          <h2>Match archive</h2>
          <p>
            Results, dates, and 1X2 odds from football-data.co.uk. Filter by
            league, season, or club.
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="filters">
          <div className="field">
            <label htmlFor="league">League</label>
            <select
              id="league"
              value={league}
              onChange={(e) => {
                setLeague(e.target.value as LeagueId | 'all')
                setTeam('all')
              }}
            >
              <option value="all">All leagues</option>
              {LEAGUES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="season">Season</label>
            <select
              id="season"
              value={season}
              onChange={(e) => {
                setSeason(e.target.value)
                setTeam('all')
              }}
            >
              <option value="all">All seasons</option>
              {[...seasons].reverse().map((s) => (
                <option key={s} value={s}>
                  {seasonLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="team">Team</label>
            <select id="team" value={team} onChange={(e) => setTeam(e.target.value)}>
              <option value="all">All teams</option>
              {teams.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="search">Search</label>
            <input
              id="search"
              placeholder="Club name…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <p className="muted" style={{ margin: '0 0 0.75rem', fontSize: '0.85rem' }}>
          Showing {rows.length.toLocaleString()} matches
          {rows.length >= 400 ? ' (capped at 400)' : ''}
        </p>

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Date</th>
                <th>League</th>
                <th>Home</th>
                <th>Score</th>
                <th>Away</th>
                <th>1</th>
                <th>X</th>
                <th>2</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const o = m.oddsClose ?? m.oddsOpen
                return (
                  <tr key={m.id}>
                    <td>{m.date}</td>
                    <td>{m.league}</td>
                    <td>{m.homeTeam}</td>
                    <td className="score">
                      {m.homeGoals}–{m.awayGoals}
                    </td>
                    <td>{m.awayTeam}</td>
                    <td className="odds">{fmtOdds(o?.home)}</td>
                    <td className="odds">{fmtOdds(o?.draw)}</td>
                    <td className="odds">{fmtOdds(o?.away)}</td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted">
                    No matches for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
