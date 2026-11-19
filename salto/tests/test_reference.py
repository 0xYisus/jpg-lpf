"""End-to-end verification against the published reference table."""

from __future__ import annotations

from salto_a_caballo.simulate import run_all, verify_against_reference


def test_matches_reference_table(tmp_path):
    summaries, _, _ = run_all(out_dir=tmp_path)
    mismatches = verify_against_reference(summaries)
    assert mismatches == [], mismatches
