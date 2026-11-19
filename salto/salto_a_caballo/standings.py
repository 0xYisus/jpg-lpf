"""League table rebuild with LaLiga-style tie-breakers."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from .data import Match


@dataclass
class StandingRow:
    team: str
    points: int = 0
    gd: int = 0
    gf: int = 0
    ga: int = 0


@dataclass
class StandingsResult:
    order: list[str]
    rows: list[StandingRow]
    residual_tie_note: str | None = None


def _apply(table: dict[str, StandingRow], match: Match) -> None:
    home = table[match.home]
    away = table[match.away]
    home.gf += match.home_goals
    home.ga += match.away_goals
    home.gd += match.home_goals - match.away_goals
    away.gf += match.away_goals
    away.ga += match.home_goals
    away.gd += match.away_goals - match.home_goals
    if match.result == "H":
        home.points += 3
    elif match.result == "A":
        away.points += 3
    else:
        home.points += 1
        away.points += 1


def _h2h_legs_complete(prior: list[Match], teams: set[str]) -> bool:
    team_list = sorted(teams)
    for i, t1 in enumerate(team_list):
        for t2 in team_list[i + 1 :]:
            legs = [m for m in prior if {m.home, m.away} == {t1, t2}]
            if len(legs) < 2:
                return False
    return True


def _h2h_stats(
    prior: list[Match], teams: set[str]
) -> tuple[dict[str, int], dict[str, int], dict[str, int]]:
    pts = {t: 0 for t in teams}
    gd = {t: 0 for t in teams}
    gf = {t: 0 for t in teams}
    for m in prior:
        if m.home not in teams or m.away not in teams:
            continue
        gf[m.home] += m.home_goals
        gf[m.away] += m.away_goals
        gd[m.home] += m.home_goals - m.away_goals
        gd[m.away] += m.away_goals - m.home_goals
        if m.result == "H":
            pts[m.home] += 3
        elif m.result == "A":
            pts[m.away] += 3
        else:
            pts[m.home] += 1
            pts[m.away] += 1
    return pts, gd, gf


def standings_before(
    season_matches: list[Match],
    cutoff: date,
) -> StandingsResult:
    """Table at 00:00 of `cutoff` — results with real_date strictly before cutoff."""
    teams: set[str] = set()
    for m in season_matches:
        teams.add(m.home)
        teams.add(m.away)

    table = {t: StandingRow(t) for t in teams}
    prior = [m for m in season_matches if m.real_date < cutoff]
    for m in prior:
        _apply(table, m)

    by_points: dict[int, list[StandingRow]] = {}
    for row in table.values():
        by_points.setdefault(row.points, []).append(row)

    ordered: list[StandingRow] = []
    for points in sorted(by_points.keys(), reverse=True):
        group = by_points[points]
        if len(group) == 1:
            ordered.extend(group)
            continue
        teamset = {r.team for r in group}
        if _h2h_legs_complete(prior, teamset):
            hp, hg, hf = _h2h_stats(prior, teamset)
            group.sort(
                key=lambda r: (
                    -hp[r.team],
                    -hg[r.team],
                    -hf[r.team],
                    -r.gd,
                    -r.gf,
                    r.team,
                )
            )
        else:
            group.sort(key=lambda r: (-r.gd, -r.gf, r.team))
        ordered.extend(group)

    residual: str | None = None
    if len(ordered) >= 4:
        fourth = ordered[3]
        tied = [
            r
            for r in ordered
            if r.points == fourth.points and r.gd == fourth.gd and r.gf == fourth.gf
        ]
        if len(tied) > 1:
            residual = (
                f"Residual tie affecting 4th before {cutoff.isoformat()}: "
                + ", ".join(r.team for r in tied)
            )

    return StandingsResult(
        order=[r.team for r in ordered],
        rows=ordered,
        residual_tie_note=residual,
    )


def first_calendar_day(season_matches: list[Match], matchday: int) -> date:
    days = [m.of_date for m in season_matches if m.matchday == matchday]
    if not days:
        raise ValueError(f"No fixtures for matchday {matchday}")
    return min(days)


def fixture_for_team(
    season_matches: list[Match], matchday: int, team: str
) -> Match:
    hits = [
        m
        for m in season_matches
        if m.matchday == matchday and (m.home == team or m.away == team)
    ]
    if len(hits) != 1:
        raise RuntimeError(
            f"Expected one fixture for {team} on matchday {matchday}, found {len(hits)}"
        )
    return hits[0]
