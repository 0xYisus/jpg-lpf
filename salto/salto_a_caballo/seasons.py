"""Season codes, windows, and odds-column policy."""

from __future__ import annotations

from dataclasses import dataclass

# Football-Data season folder codes → OpenFootball season folder labels.
SEASONS: dict[str, str] = {
    "1617": "2016-17",
    "1718": "2017-18",
    "1819": "2018-19",
    "1920": "2019-20",
    "2021": "2020-21",
    "2122": "2021-22",
    "2223": "2022-23",
    "2324": "2023-24",
    "2425": "2024-25",
    "2526": "2025-26",
}

# Pre-close Bet365 for 2016/17–2018/19; closing from 2019/20 onward.
PRE_CLOSE_SEASONS = frozenset({"1617", "1718", "1819"})

WINDOWS: tuple[int, ...] = (10, 15, 29)

STAKE_BASE = 100
STAKE_ESCALATED = 500


@dataclass(frozen=True)
class ReferenceRow:
    window_start: int
    bets: int
    staked: int
    net: str  # Decimal string, e.g. "2912"
    roi_pct: str  # e.g. "8.93"
    max_annual_capital: str
    positive_seasons: int


REFERENCE: tuple[ReferenceRow, ...] = (
    ReferenceRow(10, 142, 32600, "2912", "8.93", "2600", 6),
    ReferenceRow(15, 117, 25300, "5270", "20.83", "1429", 8),
    ReferenceRow(29, 50, 10200, "3784", "37.10", "1006", 9),
)


def odds_column(season_code: str) -> str:
    return "B365H" if season_code in PRE_CLOSE_SEASONS else "B365CH"


def season_label(season_code: str) -> str:
    return SEASONS[season_code]
