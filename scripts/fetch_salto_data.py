#!/usr/bin/env python3
"""Download Football-Data SP1 CSVs + OpenFootball LaLiga calendars for Salto."""

from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FD_DIR = ROOT / "public" / "data" / "SP1"
OF_DIR = ROOT / "data" / "openfootball"

SEASONS = {
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

FD_URL = "https://www.football-data.co.uk/mmz4281/{code}/SP1.csv"
OF_URL = (
    "https://raw.githubusercontent.com/openfootball/football.json/master/"
    "{label}/es.1.json"
)


def fetch(url: str, dest: Path) -> None:
    print(f"GET {url}")
    with urllib.request.urlopen(url, timeout=60) as resp:
        data = resp.read()
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    print(f"  -> {dest} ({len(data)} bytes)")


def main() -> int:
    for code, label in SEASONS.items():
        fetch(FD_URL.format(code=code), FD_DIR / f"{code}.csv")
        fetch(OF_URL.format(label=label), OF_DIR / f"es.1.{label}.json")

    manifest = {
        "source_football_data": "https://www.football-data.co.uk",
        "source_openfootball": "https://github.com/openfootball/football.json",
        "league": "SP1",
        "seasons": list(SEASONS.keys()),
        "openfootball_labels": list(SEASONS.values()),
    }
    OF_DIR.mkdir(parents=True, exist_ok=True)
    (OF_DIR / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
