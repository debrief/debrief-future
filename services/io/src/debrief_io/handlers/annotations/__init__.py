"""
Annotation parsing for REP file special comments.

This module handles parsing of all REP file special comment types:
- NARRATIVE/NARRATIVE2 - Text entries with timestamps
- CIRCLE, RECT, LINE - Basic shapes
- TEXT, VECTOR - Text and directional annotations
- POLY, POLYLINE - Multi-vertex shapes
- TIMETEXT, PERIODTEXT, ELLIPSE - Temporal annotations
- DYNAMIC_RECT/CIRCLE/POLY - Time-varying shapes
- SENSOR, SENSOR2, TMA_POS, TMA_RB - Sensor and TMA data

All annotations are converted to GeoJSON features with styling properties.
"""

from .parser import parse_annotations

__all__ = ["parse_annotations"]
