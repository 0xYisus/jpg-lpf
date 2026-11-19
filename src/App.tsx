import { useEffect, useState } from 'react'
import { Hero } from './components/Hero'
import { MatchBrowser } from './components/MatchBrowser'
import { Simulator } from './components/Simulator'
import { SEASONS } from './data/leagues'
import { defaultProvider } from './data/footballDataProvider'
import type { Match } from './data/types'

type Tab = 'home' | 'browse' | 'simulate'

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const all = await defaultProvider.loadAll?.()
        if (!cancelled) {
          setMatches(all ?? [])
          setError(null)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function go(next: Tab) {
    setTab(next)
    if (next !== 'home') {
      requestAnimationFrame(() => {
        document.getElementById(next === 'browse' ? 'browse' : 'simulate')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark">
          <span className="dot" aria-hidden />
          JPG LPF
        </div>
        <nav className="nav-tabs" aria-label="Primary">
          <button type="button" className={tab === 'home' ? 'active' : ''} onClick={() => go('home')}>
            Home
          </button>
          <button
            type="button"
            className={tab === 'browse' ? 'active' : ''}
            onClick={() => go('browse')}
          >
            Matches
          </button>
          <button
            type="button"
            className={tab === 'simulate' ? 'active' : ''}
            onClick={() => go('simulate')}
          >
            Simulator
          </button>
        </nav>
      </header>

      {tab === 'home' && (
        <Hero
          matchCount={matches.length}
          onBrowse={() => go('browse')}
          onSimulate={() => go('simulate')}
        />
      )}

      {loading && (
        <div className="loading-banner">
          <div className="spinner" aria-hidden />
          Loading cached match data from football-data.co.uk…
        </div>
      )}

      {error && (
        <div className="loading-banner" style={{ borderColor: 'var(--bad)' }}>
          {error}
        </div>
      )}

      {!loading && !error && (tab === 'browse' || tab === 'home') && (
        <MatchBrowser matches={matches} seasons={[...SEASONS]} />
      )}

      {!loading && !error && (tab === 'simulate' || tab === 'home') && (
        <Simulator matches={matches} />
      )}

      {tab === 'home' && (
        <p className="footer-note">
          Data source: football-data.co.uk free CSVs · provider interface is swappable ·
          JPG LPF · for research / entertainment only
        </p>
      )}
    </div>
  )
}
