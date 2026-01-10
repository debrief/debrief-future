"""
debrief-stac: Local STAC catalog operations for Debrief v4.x.

This package provides functions for managing local STAC catalogs,
creating and reading plots (STAC Items), and managing GeoJSON feature
assets with provenance tracking.
"""

__version__ = "0.1.0"

from debrief_stac.exceptions import (
    CatalogExistsError,
    CatalogNotFoundError,
    DebriefStacError,
    PlotNotFoundError,
    ValidationError,
)

__all__ = [
    "__version__",
    "DebriefStacError",
    "CatalogExistsError",
    "CatalogNotFoundError",
    "PlotNotFoundError",
    "ValidationError",
]
