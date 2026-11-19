"""Explicit OpenFootball → football-data.co.uk club name map."""

from __future__ import annotations

# OpenFootball calendar name → Football-Data SP1 HomeTeam/AwayTeam spelling.
OPENFOOTBALL_TO_FD: dict[str, str] = {
    "Athletic Club": "Ath Bilbao",
    "Atlético Madrid": "Ath Madrid",
    "Club Atlético de Madrid": "Ath Madrid",
    "CA Osasuna": "Osasuna",
    "CD Alavés": "Alaves",
    "Deportivo Alavés": "Alaves",
    "CD Leganés": "Leganes",
    "Cádiz CF": "Cadiz",
    "Deportivo La Coruña": "La Coruna",
    "Elche CF": "Elche",
    "Espanyol Barcelona": "Espanol",
    "RCD Espanyol de Barcelona": "Espanol",
    "FC Barcelona": "Barcelona",
    "Getafe CF": "Getafe",
    "Girona FC": "Girona",
    "Granada CF": "Granada",
    "Levante UD": "Levante",
    "Málaga CF": "Malaga",
    "RC Celta": "Celta",
    "RC Celta de Vigo": "Celta",
    "RCD Mallorca": "Mallorca",
    "Rayo Vallecano": "Vallecano",
    "Rayo Vallecano de Madrid": "Vallecano",
    "Real Betis": "Betis",
    "Real Betis Balompié": "Betis",
    "Real Madrid": "Real Madrid",
    "Real Madrid CF": "Real Madrid",
    "Real Oviedo": "Oviedo",
    "Real Sociedad": "Sociedad",
    "Real Sociedad de Fútbol": "Sociedad",
    "Real Valladolid": "Valladolid",
    "Real Valladolid CF": "Valladolid",
    "SD Eibar": "Eibar",
    "SD Huesca": "Huesca",
    "Sevilla FC": "Sevilla",
    "Sporting Gijón": "Sp Gijon",
    "UD Almería": "Almeria",
    "UD Las Palmas": "Las Palmas",
    "Valencia CF": "Valencia",
    "Villarreal CF": "Villarreal",
}


def to_fd(openfootball_name: str) -> str:
    try:
        return OPENFOOTBALL_TO_FD[openfootball_name]
    except KeyError as exc:
        raise KeyError(
            f"No Football-Data mapping for OpenFootball club {openfootball_name!r}"
        ) from exc
