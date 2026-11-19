import Papa from 'papaparse'
import { LEAGUES, SEASONS } from './leagues'
import { rowToMatch } from './parseMatch'
import type { DataProvider, LeagueId, Match } from './types'

/**
 * Local CSV cache under /data/{league}/{season}.csv
 * Downloaded from https://www.football-data.co.uk/mmz4281/{season}/{league}.csv
 *
 * Swap this provider for an API-backed one by implementing DataProvider.
 */
export class FootballDataCsvProvider implements DataProvider {
  readonly id = 'football-data-co-uk'
  readonly label = 'football-data.co.uk (cached CSV)'

  private cache = new Map<string, Match[]>()

  listSeasons(_league: LeagueId): Promise<string[]> {
    return Promise.resolve([...SEASONS])
  }

  async loadMatches(league: LeagueId, season: string): Promise<Match[]> {
    const key = `${league}/${season}`
    const hit = this.cache.get(key)
    if (hit) return hit

    // Prefer project-local cache (public/data); fall back to football-data.co.uk.
    let text: string | null = await this.fetchText(`/data/${league}/${season}.csv`)
    if (text == null) {
      const remote = `https://www.football-data.co.uk/mmz4281/${season}/${league}.csv`
      text = await this.fetchText(remote)
      if (text == null) {
        console.warn(`Missing CSV for ${key}`)
        this.cache.set(key, [])
        return []
      }
    }
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    })
    const matches: Match[] = []
    parsed.data.forEach((row, i) => {
      const m = rowToMatch(row, league, season, i)
      if (m) matches.push(m)
    })
    matches.sort((a, b) => a.kickoffMs - b.kickoffMs)
    this.cache.set(key, matches)
    return matches
  }

  async loadAll(leagues: LeagueId[] = LEAGUES.map((l) => l.id)): Promise<Match[]> {
    const all: Match[] = []
    for (const league of leagues) {
      for (const season of SEASONS) {
        all.push(...(await this.loadMatches(league, season)))
      }
    }
    all.sort((a, b) => a.kickoffMs - b.kickoffMs)
    return all
  }

  private async fetchText(url: string): Promise<string | null> {
    try {
      const res = await fetch(url)
      if (!res.ok) return null
      return await res.text()
    } catch {
      return null
    }
  }
}

export const defaultProvider: DataProvider = new FootballDataCsvProvider()
