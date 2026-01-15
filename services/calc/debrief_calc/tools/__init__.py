"""
Built-in analysis tools for debrief-calc.

This module auto-registers all built-in tools when imported.
Import this module to make the tools available in the registry.

Built-in tools:
- track-stats: Calculate statistics for a single track
- range-bearing: Calculate range and bearing between two tracks
- area-summary: Summarize features within a geographic region
"""

# Import tools to trigger registration via @tool decorator
from debrief_calc.tools import area_summary, range_bearing, track_stats

__all__ = [
    "track_stats",
    "range_bearing",
    "area_summary",
]
