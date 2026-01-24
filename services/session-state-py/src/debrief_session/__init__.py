"""
Debrief Session State Client
Feature: 024-document-session-state

Python client for the Debrief session state MCP service.
"""

from .client import SessionClient
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
]
