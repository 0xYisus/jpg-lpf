# JPG LPF — Match Odds & Strategy Lab

Football-inspired web app: browse ~10 seasons of Europe’s top five leagues and simulate flat-stake betting strategies on historical 1X2 odds (football-data.co.uk).

## Run locally

```bash
git clone https://github.com/0xYisus/jpg-lpf.git
cd jpg-lpf
npm install
npm run fetch-data
npm run dev
```

Then open **http://localhost:5173** in your browser.

- `npm run fetch-data` downloads match/odds CSVs into `public/data/` (needed once; ~7MB). The app can also fetch from football-data.co.uk at runtime if a file is missing.
- Production build: `npm run build && npm run preview`

## Leagues & seasons

| Code | League | Country |
|------|--------|---------|
| E0 | Premier League | England |
| SP1 | La Liga | Spain |
| I1 | Serie A | Italy |
| D1 | Bundesliga | Germany |
| F1 | Ligue 1 | France |

Seasons: `1516` … `2425` (2015/16 → 2024/25).

## Strategy rules (short)

- **Team** — bet whenever that club plays (home / away / both).
- **Position at kickoff** — rebuild the season table from fixtures with an earlier kickoff (points → GD → GF → name); bet only if that side is in the match.
- **Streaks** — optional: selected team’s last N results in that league-season must be W, D, or L.
- **Stake** — flat stake; bankroll / ROI / drawdown on the equity chart.

Odds preference: closing averages → Bet365 close → market averages → open.

## Stack

React + Vite + TypeScript + Recharts + PapaParse. Data layer is swappable (`src/data/types.ts` → `DataProvider`).
