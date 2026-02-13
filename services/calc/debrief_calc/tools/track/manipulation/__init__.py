"""
Track manipulation tools.

Tools for deriving and transforming track data:
- generate-courses-speeds: Derive course and speed from consecutive positions
"""

from debrief_calc.tools.track.manipulation.generate_courses_speeds import (
    generate_courses_speeds,
)

__all__ = [
    "generate_courses_speeds",
]
