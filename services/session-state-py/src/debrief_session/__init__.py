"""
Debrief Session State Client
Feature: 024-document-session-state

Python client for the Debrief session state MCP service.
"""

from .client import SessionClient

# Re-export generated types from debrief_schemas via types module
from .types import (
    DocumentSlice,
    FeatureSelection,
    FeaturesSlice,
    SessionState,
    SpatialSlice,
    TemporalSlice,
    TimeFilter,
    TimeInstant,
    TimeRange,
    TimeStep,
    ViewportPolygon,
    make_time_instant,
    make_time_instant_now,
)

__version__ = "0.1.0"

__all__ = [
    "SessionClient",
    "TimeInstant",
    "TimeRange",
    "TimeFilter",
    "TimeStep",
    "ViewportPolygon",
    "FeatureSelection",
    "TemporalSlice",
    "SpatialSlice",
    "FeaturesSlice",
    "DocumentSlice",
    "SessionState",
    "make_time_instant",
    "make_time_instant_now",
]
