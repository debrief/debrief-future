"""Type aliases for debrief-io.

Provides common type aliases used throughout the package
for cleaner type annotations.
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from debrief_io.handlers.base import BaseHandler

# Path to a file to parse - accepts both str and Path
FilePath = Path | str

# Any GeoJSON feature type output by parser
# Using Any to avoid circular imports with debrief-schemas
# Actual types: TrackFeature | ReferenceLocation | SensorContact
Feature = Any

# Handler class type for registration
HandlerClass = type["BaseHandler"]
