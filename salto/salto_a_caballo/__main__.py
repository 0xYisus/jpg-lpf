"""CLI: python -m salto_a_caballo"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .simulate import run_all, verify_against_reference


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Salto a caballo historical simulator (LaLiga 4th-place home wins)."
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=None,
        help="Output directory (default: <repo>/simulations/salto)",
    )
    parser.add_argument(
        "--skip-verify",
        action="store_true",
        help="Do not exit non-zero on reference mismatch",
    )
    args = parser.parse_args(argv)

    summaries, _residual, out = run_all(out_dir=args.out)
    print(f"Wrote outputs under {out}")
    print()
    print(
        f"{'Window':<8} {'Bets':>5} {'Staked':>8} {'Net':>8} {'ROI':>8} "
        f"{'MaxCap':>8} {'Pos':>6}"
    )
    for s in summaries:
        net = s.net if s.net.startswith("-") else f"+{s.net}"
        print(
            f"{s.window:<8} {s.bets:>5} {s.staked:>8} {net:>8} {s.roi_pct:>7}% "
            f"{s.max_annual_capital:>8} {s.positive_seasons:>6}"
        )

    mismatches = verify_against_reference(summaries)
    if mismatches:
        print("\nREFERENCE MISMATCH:", file=sys.stderr)
        for row in mismatches:
            print(
                f"  window {row['window']}: {row['field']} "
                f"expected={row['expected']} actual={row['actual']}",
                file=sys.stderr,
            )
        if not args.skip_verify:
            return 1
        return 0

    print("\nVerification: MATCH vs reference table.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
