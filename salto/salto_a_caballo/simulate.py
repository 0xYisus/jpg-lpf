"""Run Salto a caballo strategies and emit logs / season tables."""

from __future__ import annotations

import csv
import json
from dataclasses import asdict, dataclass
from datetime import date
from decimal import Decimal
from pathlib import Path

from .data import Match, assert_data_complete, load_all_seasons
from .seasons import REFERENCE, SEASONS, WINDOWS, ReferenceRow
from .stake import initial_stake, is_winning_home_result, next_stake
from .standings import first_calendar_day, fixture_for_team, standings_before


@dataclass
class BetLog:
    season: str
    matchday: int
    cutoff_date: str
    real_date: str
    team: str
    opponent: str
    score: str
    result: str
    odds: str
    odds_col: str
    stake: str
    prior_state: str
    post_state: str
    payout: str
    net: str
    running_balance: str
    won: bool


@dataclass
class SeasonSummary:
    season: str
    window: str
    bets: int
    staked: str
    net: str
    roi_pct: str
    min_capital: str
    positive: bool


@dataclass
class WindowSummary:
    window: str
    window_start: int
    bets: int
    staked: str
    net: str
    roi_pct: str
    max_annual_capital: str
    positive_seasons: str
    seasons: list[SeasonSummary]


@dataclass
class Selection:
    match: Match
    team: str
    cutoff: date
    matchday: int


def _dec(value: Decimal) -> str:
    # Normalize trailing zeros for readable CSV while keeping exact scale.
    text = format(value, "f")
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    return text or "0"


def collect_home_selections(
    season_matches: list[Match],
    window_start: int,
    residual_log: list[str],
) -> list[Selection]:
    selections: list[Selection] = []
    for md in range(window_start, 39):
        cutoff = first_calendar_day(season_matches, md)
        table = standings_before(season_matches, cutoff)
        if table.residual_tie_note:
            residual_log.append(f"{season_matches[0].season} MD{md}: {table.residual_tie_note}")
        if len(table.order) < 4:
            raise RuntimeError(
                f"Fewer than 4 teams in table before {cutoff} (MD{md})"
            )
        fourth = table.order[3]
        fixture = fixture_for_team(season_matches, md, fourth)
        # Away fixtures are omitted and do not change stake state.
        if fixture.home != fourth:
            continue
        selections.append(
            Selection(match=fixture, team=fourth, cutoff=cutoff, matchday=md)
        )
    return selections


def simulate_season(
    season_code: str,
    season_matches: list[Match],
    window_start: int,
    residual_log: list[str],
) -> tuple[list[BetLog], SeasonSummary]:
    selections = collect_home_selections(season_matches, window_start, residual_log)
    selections.sort(key=lambda s: (s.match.real_date, s.matchday))

    stake = initial_stake()
    balance = Decimal(0)
    cum_profit = Decimal(0)
    min_capital = Decimal(0)
    bets: list[BetLog] = []

    i = 0
    while i < len(selections):
        day = selections[i].match.real_date
        day_batch: list[Selection] = []
        while i < len(selections) and selections[i].match.real_date == day:
            day_batch.append(selections[i])
            i += 1

        profit_before = cum_profit
        day_outlay = Decimal(0)
        day_profit = Decimal(0)

        for sel in day_batch:
            m = sel.match
            prior = stake
            won = is_winning_home_result(m.result)
            payout = (stake * m.odds) if won else Decimal(0)
            net = payout - stake
            day_outlay += stake
            day_profit += net
            balance += net
            post = next_stake(won=won)
            bets.append(
                BetLog(
                    season=season_code,
                    matchday=sel.matchday,
                    cutoff_date=sel.cutoff.isoformat(),
                    real_date=m.real_date.isoformat(),
                    team=sel.team,
                    opponent=m.away,
                    score=f"{m.home_goals}-{m.away_goals}",
                    result=m.result,
                    odds=_dec(m.odds),
                    odds_col=m.odds_col,
                    stake=_dec(stake),
                    prior_state=_dec(prior),
                    post_state=_dec(post),
                    payout=_dec(payout),
                    net=_dec(net),
                    running_balance=_dec(balance),
                    won=won,
                )
            )
            stake = post

        needed = max(Decimal(0), day_outlay - profit_before)
        if needed > min_capital:
            min_capital = needed
        cum_profit += day_profit

    staked = sum((Decimal(b.stake) for b in bets), Decimal(0))
    net = sum((Decimal(b.net) for b in bets), Decimal(0))
    roi = (net / staked * Decimal(100)) if staked else Decimal(0)
    window = f"{window_start}-38"
    return bets, SeasonSummary(
        season=season_code,
        window=window,
        bets=len(bets),
        staked=_dec(staked),
        net=_dec(net),
        roi_pct=f"{roi.quantize(Decimal('0.01'))}",
        min_capital=_dec(min_capital),
        positive=net > 0,
    )


def simulate_window(
    by_season: dict[str, list[Match]],
    window_start: int,
    residual_log: list[str],
) -> tuple[list[BetLog], WindowSummary]:
    all_bets: list[BetLog] = []
    season_rows: list[SeasonSummary] = []
    for code in SEASONS:
        bets, summary = simulate_season(
            code, by_season[code], window_start, residual_log
        )
        all_bets.extend(bets)
        season_rows.append(summary)

    staked = sum((Decimal(b.stake) for b in all_bets), Decimal(0))
    net = sum((Decimal(b.net) for b in all_bets), Decimal(0))
    roi = (net / staked * Decimal(100)) if staked else Decimal(0)
    max_cap = max((Decimal(s.min_capital) for s in season_rows), default=Decimal(0))
    positive = sum(1 for s in season_rows if s.positive)
    return all_bets, WindowSummary(
        window=f"{window_start}-38",
        window_start=window_start,
        bets=len(all_bets),
        staked=_dec(staked),
        net=_dec(net),
        roi_pct=f"{roi.quantize(Decimal('0.01'))}",
        max_annual_capital=_dec(max_cap),
        positive_seasons=f"{positive}/10",
        seasons=season_rows,
    )


def run_all(
    *,
    out_dir: Path | None = None,
) -> tuple[list[WindowSummary], list[str], Path]:
    by_season, audits = load_all_seasons()
    assert_data_complete(audits)

    out = out_dir or (Path(__file__).resolve().parents[2] / "simulations" / "salto")
    out.mkdir(parents=True, exist_ok=True)

    residual_log: list[str] = []
    summaries: list[WindowSummary] = []

    for window_start in WINDOWS:
        bets, summary = simulate_window(by_season, window_start, residual_log)
        summaries.append(summary)
        _write_bet_log(out / f"bets_window_{window_start}-38.csv", bets)
        _write_season_table(out / f"seasons_window_{window_start}-38.csv", summary)

    _write_summary(out / "summary.csv", summaries)
    _write_comparison(out / "comparison.md", summaries)
    if residual_log:
        (out / "residual_ties.log").write_text(
            "\n".join(residual_log) + "\n", encoding="utf-8"
        )
    else:
        (out / "residual_ties.log").write_text(
            "(none — no residual ties affecting 4th)\n", encoding="utf-8"
        )

    (out / "audits.json").write_text(
        json.dumps([asdict(a) for a in audits], indent=2) + "\n",
        encoding="utf-8",
    )
    return summaries, residual_log, out


def verify_against_reference(
    summaries: list[WindowSummary],
) -> list[dict[str, object]]:
    """Return empty list on full match; otherwise mismatch records."""
    by_start = {s.window_start: s for s in summaries}
    mismatches: list[dict[str, object]] = []
    for ref in REFERENCE:
        got = by_start[ref.window_start]
        checks = {
            "bets": (ref.bets, got.bets),
            "staked": (str(ref.staked), got.staked),
            "net": (ref.net, got.net.lstrip("+")),
            "roi_pct": (ref.roi_pct, got.roi_pct),
            "max_annual_capital": (ref.max_annual_capital, got.max_annual_capital),
            "positive_seasons": (f"{ref.positive_seasons}/10", got.positive_seasons),
        }
        for field, (expected, actual) in checks.items():
            if str(expected) != str(actual):
                mismatches.append(
                    {
                        "window": ref.window_start,
                        "field": field,
                        "expected": expected,
                        "actual": actual,
                    }
                )
    return mismatches


def _write_bet_log(path: Path, bets: list[BetLog]) -> None:
    fields = [
        "season",
        "matchday",
        "cutoff_date",
        "real_date",
        "team",
        "opponent",
        "score",
        "result",
        "odds",
        "odds_col",
        "stake",
        "prior_state",
        "post_state",
        "payout",
        "net",
        "running_balance",
        "won",
    ]
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields)
        writer.writeheader()
        for b in bets:
            writer.writerow(asdict(b))


def _write_season_table(path: Path, summary: WindowSummary) -> None:
    fields = [
        "season",
        "window",
        "bets",
        "staked",
        "net",
        "roi_pct",
        "min_capital",
        "positive",
    ]
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields)
        writer.writeheader()
        for row in summary.seasons:
            writer.writerow(asdict(row))
        writer.writerow(
            {
                "season": "TOTAL",
                "window": summary.window,
                "bets": summary.bets,
                "staked": summary.staked,
                "net": summary.net,
                "roi_pct": summary.roi_pct,
                "min_capital": summary.max_annual_capital,
                "positive": summary.positive_seasons,
            }
        )


def _write_summary(path: Path, summaries: list[WindowSummary]) -> None:
    fields = [
        "window",
        "bets",
        "staked",
        "net",
        "roi_pct",
        "max_annual_capital",
        "positive_seasons",
    ]
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields)
        writer.writeheader()
        for s in summaries:
            writer.writerow({k: getattr(s, k) for k in fields})


def _write_comparison(path: Path, summaries: list[WindowSummary]) -> None:
    lines = [
        "# Salto a caballo — strategy comparison",
        "",
        "| Window | Bets | Staked | Net (€) | ROI | Max annual capital | Positive seasons |",
        "|--------|------|--------|---------|-----|--------------------|------------------|",
    ]
    for s in summaries:
        net = s.net if s.net.startswith("-") else f"+{s.net}"
        lines.append(
            f"| {s.window} | {s.bets} | {s.staked} | {net} | {s.roi_pct}% | "
            f"{s.max_annual_capital} | {s.positive_seasons} |"
        )
    lines.extend(
        [
            "",
            "## Reading the trade-offs",
            "",
            "- **€ profit:** window 15–38 leads on absolute net (+5270), ahead of 29–38 "
            "(+3784) and 10–38 (+2912).",
            "- **ROI:** the short late-season window 29–38 is strongest (37.10%), then "
            "15–38 (20.83%), then 10–38 (8.93%).",
            "- **Capital required:** 29–38 needs the least peak annual float (1006), "
            "15–38 is mid (1429), and 10–38 is heaviest (2600).",
            "",
            "Narrower late windows raise efficiency and lower capital at the cost of "
            "fewer bets; the mid window balances profit and hit-rate across seasons.",
            "",
        ]
    )
    path.write_text("\n".join(lines), encoding="utf-8")


# Re-export for package API
__all__ = [
    "REFERENCE",
    "ReferenceRow",
    "run_all",
    "verify_against_reference",
    "simulate_window",
    "WindowSummary",
]
