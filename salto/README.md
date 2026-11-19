# Salto a caballo — historical simulator

Python simulator for three “Salto a caballo” variants on **LaLiga**: bet the **home win of the team in 4th** inside official matchday windows, with a **100 € / 500 €** stake machine.

## Reproduce

From the repo root:

```bash
# 1) Data (Football-Data SP1 + OpenFootball calendars)
python3 scripts/fetch_salto_data.py

# 2) Deps + tests
python3 -m pip install -r salto/requirements.txt
python3 -m pytest salto/tests -q

# 3) Run simulator (writes CSVs under simulations/salto/)
PYTHONPATH=salto python3 -m salto_a_caballo
```

Optional: `PYTHONPATH=salto python3 -m salto_a_caballo --out /tmp/salto-out`

## Rules (short)

| Item | Rule |
|------|------|
| Seasons | 2016/17 → 2025/26 (SP1) |
| Selection | 4th place at 00:00 on the first OpenFootball calendar day of each official matchday |
| Bet | Home win only; away / out-of-window skipped (no stake change) |
| Windows | 10–38, 15–38, 29–38 |
| Stake | Start season at 100 €; after draw/loss → 500 € until a win → back to 100 € |
| Odds | `B365H` for 16/17–18/19; `B365CH` from 19/20 |
| Money | `decimal.Decimal`; same-day stakes disbursed before collecting; min capital per season |

Postponements keep the matchday’s selected club and settle on the real Football-Data date (chronological stake updates).

## Outputs

Under `simulations/salto/`:

- `bets_window_{10,15,29}-38.csv` — per-bet log
- `seasons_window_{10,15,29}-38.csv` — per-season table + TOTAL
- `summary.csv` / `comparison.md` — cross-window totals
- `audits.json` / `residual_ties.log` — join coverage and residual 4th-place ties

## Reference check

The CLI exits 0 only when totals match the reference table in the project spec (bets, staked, net, ROI, max annual capital, positive seasons).
