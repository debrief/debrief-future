"""File format handlers for debrief-io.

This package contains handlers for various file formats.
Each handler is responsible for parsing a specific file format
and producing validated GeoJSON features.

Available handlers:
- REPHandler: Debrief REP (Replay) format
"""

from debrief_io.handlers.base import BaseHandler

__all__ = ["BaseHandler"]
