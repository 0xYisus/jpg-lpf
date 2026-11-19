# JPG LPF — Match Odds & Strategy Lab

Football-inspired web app: browse ~10 seasons of Europe’s top five leagues and simulate flat-stake betting strategies on historical 1X2 odds (football-data.co.uk).

## Run locally

Requires **Node.js 20+** (verified on Node 22) and npm.

```bash
git clone https://github.com/0xYisus/jpg-lpf.git
cd jpg-lpf
npm install
npm run fetch-data
npm run dev
```

Then open **http://localhost:5173** in your browser.

- Default branch (`main`) has the full app — no feature branch checkout needed.
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

Seasons: `1516` … `2526` (2015/16 → 2025/26). For the web lab, `npm run fetch-data` covers the top-five leagues; Salto uses SP1 `1617`–`2526` plus OpenFootball calendars via `python3 scripts/fetch_salto_data.py`.

## Salto a caballo (Python)

Historical LaLiga simulator (4th-place home wins, 100/500 stake machine). See [`salto/README.md`](salto/README.md).

```bash
python3 scripts/fetch_salto_data.py
python3 -m pip install -r salto/requirements.txt
PYTHONPATH=salto python3 -m salto_a_caballo
python3 -m pytest salto/tests -q
```

## Strategy rules (short)

- **Team** — bet whenever that club plays (home / away / both).
- **Position at kickoff** — rebuild the season table from fixtures with an earlier kickoff (points → GD → GF → name); bet only if that side is in the match.
- **Streaks** — optional: selected team’s last N results in that league-season must be W, D, or L.
- **Stake** — flat stake; bankroll / ROI / drawdown on the equity chart.

Odds preference: closing averages → Bet365 close → market averages → open.

## Stack

React + Vite + TypeScript + Recharts + PapaParse. Data layer is swappable (`src/data/types.ts` → `DataProvider`).
