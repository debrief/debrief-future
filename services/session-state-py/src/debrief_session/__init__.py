"""
Debrief Session State Client
Feature: 024-document-session-state

Python client for the Debrief session state MCP service.
"""

from .client import SessionClient
from .types import (
    TimeInstant,
    TimeRange,
    TimeFilter,
    TimeStep,
    ViewportPolygon,
    FeatureSelection,
    TemporalSlice,
    SpatialSlice,
    FeaturesSlice,
    DocumentSlice,
    SessionState,
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
