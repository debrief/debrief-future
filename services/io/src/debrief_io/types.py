"""Type aliases for debrief-io.

Provides common type aliases used throughout the package
for cleaner type annotations.
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from debrief_io.handlers.base import BaseHandler

from debrief_schemas.unions import DebriefFeature

# Path to a file to parse - accepts both str and Path
FilePath = Path | str

# GeoJSON feature type output by parser.
# Runtime: validated against debrief-schemas Pydantic models at the
# parser output boundary (warn-and-continue).
# Preserves the alias for backward compatibility — callers can still
# write ``Feature`` but get the strong union type.
Feature = DebriefFeature

# Handler class type for registration
HandlerClass = type["BaseHandler"]
