"""Stake machine for Salto a caballo (100 ↔ 500)."""

from __future__ import annotations

from decimal import Decimal

from .seasons import STAKE_BASE, STAKE_ESCALATED

BASE = Decimal(STAKE_BASE)
ESCALATED = Decimal(STAKE_ESCALATED)


def initial_stake() -> Decimal:
    """Each strategy starts each season at 100 €."""
    return BASE


def next_stake(*, won: bool) -> Decimal:
    """After a win return to 100 €; after draw/loss stay/escalate to 500 €."""
    return BASE if won else ESCALATED


def is_winning_home_result(result: str) -> bool:
    return result == "H"
