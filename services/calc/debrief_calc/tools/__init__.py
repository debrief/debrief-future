"""
Built-in analysis tools for debrief-calc.

This module auto-registers all built-in tools when imported.
Import this module to make the tools available in the registry.

Built-in tools:
- track-stats: Calculate statistics for a single track
- range-bearing: Calculate range and bearing between two tracks
- area-summary: Summarize features within a geographic region
- set-track-color: Set display color for tracks
- apply-symbol-style: Apply symbol style to position markers
- label-interval: Set time interval for label display
- symbol-interval: Set time interval for symbol display
- generate-reference-points: Generate grid/scatter reference points in a bounding box
"""

# Import tools to trigger registration via @tool decorator
from debrief_calc.tools import area_summary, range_bearing, track_stats
from debrief_calc.tools.reference import generation
from debrief_calc.tools.shape import manipulation
from debrief_calc.tools.track import styling

__all__ = [
    "track_stats",
    "range_bearing",
    "area_summary",
    "styling",
    "manipulation",
    "generation",
]
