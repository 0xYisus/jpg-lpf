# JPG LPF — Match Odds & Strategy Lab

Football-inspired web app for browsing ~10 seasons of Europe’s top five leagues and simulating flat-stake betting strategies on historical 1X2 odds.

## Leagues

| Code | League | Country |
|------|--------|---------|
| E0 | Premier League | England |
| SP1 | La Liga | Spain |
| I1 | Serie A | Italy |
| D1 | Bundesliga | Germany |
| F1 | Ligue 1 | France |

Seasons: `1516` … `2425` (2015/16 → 2024/25).

## Data

- Source: [football-data.co.uk](https://www.football-data.co.uk) free CSVs
- Cached under `public/data/{league}/{season}.csv` (offline after first fetch)
- Refresh: `npm run fetch-data`
- Provider interface: `src/data/types.ts` → `DataProvider` (swap for an API later)

Odds preference: closing averages (`AvgCH/CD/CA`) → Bet365 close → market averages → Bet365 open.

## Strategy rules

**Team selection** — bet whenever that club plays (venue filter applied).

**Position at kickoff** — before each match, rebuild the league table from that season’s completed fixtures with an earlier kickoff. Ranking: points → GD → GF → name. Bet only if the team currently in position N is in the fixture.

**Streaks** — optional: require the selected team’s last N results in that league-season to be W, D, or L before placing the next bet.

**Stake** — flat stake with optional starting bankroll / drawdown tracking.

## Run

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
npm run preview
```

## Stack

React + Vite + TypeScript + Recharts + PapaParse.
