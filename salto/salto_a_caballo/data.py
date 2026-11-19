"""Load and join Football-Data SP1 CSVs with OpenFootball calendars."""

from __future__ import annotations

import csv
import json
import re
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path

from .names import to_fd
from .seasons import SEASONS, odds_column, season_label

_MD_RE = re.compile(r"^Matchday\s+(\d+)$")


@dataclass(frozen=True)
class Match:
    season: str
    matchday: int
    of_date: date
    real_date: date
    home: str
    away: str
    home_goals: int
    away_goals: int
    result: str  # H / D / A
    odds: Decimal
    odds_col: str


@dataclass
class DataAudit:
    season: str
    fd_rows: int
    of_matches: int
    joined: int
    missing_pairs: list[tuple[str, str, str]]
    missing_odds: list[tuple[str, str, str]]
    missing_scores: list[tuple[str, str]]


def repo_root() -> Path:
    # salto/salto_a_caballo/data.py → repo root is parents[2]
    return Path(__file__).resolve().parents[2]


def default_fd_dir() -> Path:
    return repo_root() / "public" / "data" / "SP1"


def default_of_dir() -> Path:
    return repo_root() / "data" / "openfootball"


def parse_fd_date(raw: str) -> date:
    day_s, month_s, year_s = raw.strip().split("/")
    year = int(year_s)
    if year < 100:
        year += 2000
    return date(year, int(month_s), int(day_s))


def parse_matchday(round_name: str) -> int:
    m = _MD_RE.match(round_name.strip())
    if not m:
        raise ValueError(f"Unexpected OpenFootball round name: {round_name!r}")
    return int(m.group(1))


def _parse_odds(raw: str) -> Decimal | None:
    text = (raw or "").strip()
    if not text:
        return None
    try:
        value = Decimal(text)
    except InvalidOperation:
        return None
    if value <= 1:
        return None
    return value


def load_season(
    season_code: str,
    *,
    fd_dir: Path | None = None,
    of_dir: Path | None = None,
) -> tuple[list[Match], DataAudit]:
    if season_code not in SEASONS:
        raise KeyError(f"Unsupported season code: {season_code}")

    fd_dir = fd_dir or default_fd_dir()
    of_dir = of_dir or default_of_dir()
    label = season_label(season_code)
    preferred_col = odds_column(season_code)

    fd_path = fd_dir / f"{season_code}.csv"
    of_path = of_dir / f"es.1.{label}.json"
    if not fd_path.is_file():
        raise FileNotFoundError(
            f"Missing Football-Data CSV {fd_path}. Run scripts/fetch_salto_data.py"
        )
    if not of_path.is_file():
        raise FileNotFoundError(
            f"Missing OpenFootball calendar {of_path}. Run scripts/fetch_salto_data.py"
        )

    fd_rows = list(csv.DictReader(fd_path.open(newline="", encoding="utf-8")))
    of_doc = json.loads(of_path.read_text(encoding="utf-8"))
    of_matches = of_doc["matches"]

    by_pair: dict[tuple[str, str], dict[str, str]] = {}
    for row in fd_rows:
        home = (row.get("HomeTeam") or "").strip()
        away = (row.get("AwayTeam") or "").strip()
        if home and away:
            by_pair[(home, away)] = row

    matches: list[Match] = []
    missing_pairs: list[tuple[str, str, str]] = []
    missing_odds: list[tuple[str, str, str]] = []
    missing_scores: list[tuple[str, str]] = []

    for raw in of_matches:
        of_home = raw["team1"]
        of_away = raw["team2"]
        home = to_fd(of_home)
        away = to_fd(of_away)
        row = by_pair.get((home, away))
        if row is None:
            missing_pairs.append((label, of_home, of_away))
            continue

        hg_s = (row.get("FTHG") or "").strip()
        ag_s = (row.get("FTAG") or "").strip()
        if hg_s == "" or ag_s == "":
            missing_scores.append((home, away))
            continue

        odds = _parse_odds(row.get(preferred_col, ""))
        used_col = preferred_col
        if odds is None:
            missing_odds.append((home, away, preferred_col))
            continue

        ftr = (row.get("FTR") or "").strip()
        hg = int(hg_s)
        ag = int(ag_s)
        if ftr not in {"H", "D", "A"}:
            ftr = "H" if hg > ag else "A" if hg < ag else "D"

        matches.append(
            Match(
                season=season_code,
                matchday=parse_matchday(raw["round"]),
                of_date=date.fromisoformat(raw["date"]),
                real_date=parse_fd_date(row["Date"]),
                home=home,
                away=away,
                home_goals=hg,
                away_goals=ag,
                result=ftr,
                odds=odds,
                odds_col=used_col,
            )
        )

    audit = DataAudit(
        season=season_code,
        fd_rows=len(fd_rows),
        of_matches=len(of_matches),
        joined=len(matches),
        missing_pairs=missing_pairs,
        missing_odds=missing_odds,
        missing_scores=missing_scores,
    )
    return matches, audit


def load_all_seasons(
    *,
    fd_dir: Path | None = None,
    of_dir: Path | None = None,
) -> tuple[dict[str, list[Match]], list[DataAudit]]:
    by_season: dict[str, list[Match]] = {}
    audits: list[DataAudit] = []
    for code in SEASONS:
        matches, audit = load_season(code, fd_dir=fd_dir, of_dir=of_dir)
        by_season[code] = matches
        audits.append(audit)
    return by_season, audits


def assert_data_complete(audits: list[DataAudit]) -> None:
    problems: list[str] = []
    for a in audits:
        if a.missing_pairs:
            problems.append(
                f"{a.season}: {len(a.missing_pairs)} unmatched OpenFootball fixtures"
            )
        if a.missing_scores:
            problems.append(f"{a.season}: {len(a.missing_scores)} fixtures without scores")
        if a.missing_odds:
            problems.append(
                f"{a.season}: {len(a.missing_odds)} fixtures missing {odds_column(a.season)}"
            )
        if a.joined != 380:
            problems.append(f"{a.season}: expected 380 joined matches, got {a.joined}")
    if problems:
        raise RuntimeError("Data incomplete before simulation:\n- " + "\n- ".join(problems))
