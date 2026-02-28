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

# GeoJSON feature dict output by parser.
# Runtime: validated against debrief-schemas Pydantic models at the
# parser output boundary (warn-and-continue).
Feature = dict[str, Any]

# Handler class type for registration
HandlerClass = type["BaseHandler"]
