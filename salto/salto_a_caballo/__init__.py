"""Salto a caballo — LaLiga 4th-place home-win historical simulator."""

__version__ = "1.0.0"

from .simulate import REFERENCE, run_all, verify_against_reference

__all__ = ["REFERENCE", "run_all", "verify_against_reference", "__version__"]
