"""Stake / window / postponement rules for Salto a caballo."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from salto_a_caballo.data import Match
from salto_a_caballo.seasons import STAKE_BASE, STAKE_ESCALATED
from salto_a_caballo.simulate import collect_home_selections, simulate_season
from salto_a_caballo.stake import initial_stake, is_winning_home_result, next_stake


def _m(
    *,
    md: int,
    real: str,
    of: str | None = None,
    home: str,
    away: str,
    result: str,
    hg: int = 1,
    ag: int = 0,
    odds: str = "2.00",
    season: str = "1617",
) -> Match:
    if result == "H":
        hg, ag = max(hg, 1), 0
    elif result == "A":
        hg, ag = 0, max(ag, 1)
    else:
        hg = ag = 1
    return Match(
        season=season,
        matchday=md,
        of_date=date.fromisoformat(of or real),
        real_date=date.fromisoformat(real),
        home=home,
        away=away,
        home_goals=hg,
        away_goals=ag,
        result=result,
        odds=Decimal(odds),
        odds_col="B365H",
    )


def test_window_resets_stake_each_season():
    """Each season starts at 100 € even if the previous season ended on 500."""
    assert initial_stake() == Decimal(STAKE_BASE)
    end_of_season_stake = next_stake(won=False)
    assert end_of_season_stake == Decimal(STAKE_ESCALATED)
    # New season always re-enters via initial_stake(), never carries 500 over.
    assert initial_stake() == Decimal(STAKE_BASE)

    matches = _four_team_season(fourth_home_mds={10})
    residual: list[str] = []
    _, summary_a = simulate_season("1617", matches, window_start=10, residual_log=residual)
    # Force a second season with identical fixtures / new code — stake base again.
    _, summary_b = simulate_season("1718", matches, window_start=10, residual_log=residual)
    assert summary_a.bets == summary_b.bets
    # First bet of each season is recorded at 100 inside simulate_season.
    bets_a, _ = simulate_season("1617", matches, window_start=10, residual_log=[])
    bets_b, _ = simulate_season("1718", matches, window_start=10, residual_log=[])
    assert bets_a[0].stake == "100"
    assert bets_b[0].stake == "100"


def test_draw_counts_as_loss_for_stake():
    assert is_winning_home_result("H") is True
    assert is_winning_home_result("D") is False
    assert is_winning_home_result("A") is False
    assert next_stake(won=False) == Decimal(STAKE_ESCALATED)
    assert next_stake(won=True) == Decimal(STAKE_BASE)


def test_away_omitted_does_not_change_stake():
    """4th place away: no bet, stake state unchanged across that matchday."""
    matches = _four_team_season(fourth_home_mds={11}, fourth_away_mds={10})
    residual: list[str] = []
    # Window 10–11 only via collecting selections for full range but season
    # only has MD1-3 setup + MD10 away + MD11 home.
    # Patch: build matches with MD10..38 stubs where D is away except MD11.
    bets, summary = simulate_season("1617", matches, window_start=10, residual_log=residual)
    # First bet should still be at 100 (MD10 away skipped).
    assert bets[0].stake == "100"
    assert bets[0].matchday == 11
    assert Decimal(summary.staked) >= 100


def test_postponed_keeps_selection_settles_chronologically():
    """MD10 home selection kept; if postponed after MD11, settle MD11 first."""
    matches = _four_team_season(
        fourth_home_mds={10, 11},
        postpone_md10_to="2016-11-20",
        md11_real="2016-11-05",
    )
    residual: list[str] = []
    bets, _ = simulate_season("1617", matches, window_start=10, residual_log=residual)
    assert [b.matchday for b in bets[:2]] == [11, 10]
    assert bets[0].real_date == "2016-11-05"
    assert bets[1].real_date == "2016-11-20"
    # MD11 settled first as a loss → MD10 (postponed) uses escalated 500.
    assert bets[0].stake == "100"
    assert bets[0].won is False
    assert bets[1].stake == "500"


def _four_team_season(
    *,
    fourth_home_mds: set[int],
    fourth_away_mds: set[int] | None = None,
    postpone_md10_to: str | None = None,
    md11_real: str = "2016-11-05",
) -> list[Match]:
    """A=1st, B=2nd, C=3rd, D=4th after MD1–3; D is the betting target."""
    fourth_away_mds = fourth_away_mds or set()
    matches: list[Match] = [
        _m(md=1, real="2016-08-20", home="A", away="D", result="H"),
        _m(md=1, real="2016-08-20", home="B", away="C", result="H"),
        _m(md=2, real="2016-08-27", home="A", away="C", result="H"),
        _m(md=2, real="2016-08-27", home="B", away="D", result="H"),
        _m(md=3, real="2016-09-10", home="A", away="B", result="H"),
        _m(md=3, real="2016-09-10", home="C", away="D", result="H"),
    ]
    # Points A9 B6 C3 D0 — stable 4th = D for all later cutoffs if we don't
    # add results that change order before each MD. Opponents' other games:
    # for each MD 4..38 create one fixture involving D and one among others.
    for md in range(4, 39):
        # Official calendar day ≈ mid season spaced
        of_day = date(2016, 9, 15).toordinal() + (md - 4) * 7
        of_s = date.fromordinal(of_day).isoformat()
        if md == 10 and postpone_md10_to:
            real_s = postpone_md10_to
        elif md == 11:
            real_s = md11_real
        else:
            real_s = of_s

        if md in fourth_home_mds:
            matches.append(
                _m(
                    md=md,
                    real=real_s,
                    of=of_s,
                    home="D",
                    away="A",
                    result="A",  # loss unless overridden
                    odds="2.50",
                )
            )
            matches.append(
                _m(md=md, real=real_s, of=of_s, home="B", away="C", result="H")
            )
        elif md in fourth_away_mds:
            matches.append(
                _m(
                    md=md,
                    real=real_s,
                    of=of_s,
                    home="A",
                    away="D",
                    result="H",
                    odds="1.80",
                )
            )
            matches.append(
                _m(md=md, real=real_s, of=of_s, home="B", away="C", result="H")
            )
        else:
            # D away by default outside requested homes — omitted for betting
            matches.append(
                _m(md=md, real=real_s, of=of_s, home="A", away="D", result="H")
            )
            matches.append(
                _m(md=md, real=real_s, of=of_s, home="B", away="C", result="H")
            )
    return matches


def test_collect_skips_away_only():
    matches = _four_team_season(fourth_home_mds={15}, fourth_away_mds={10, 11, 12, 13, 14})
    sels = collect_home_selections(matches, window_start=10, residual_log=[])
    assert all(s.match.home == "D" for s in sels)
    assert min(s.matchday for s in sels) == 15
