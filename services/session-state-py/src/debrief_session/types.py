"""
Session state types for Python client.
Feature: 024-document-session-state

Types that exist in debrief_schemas are imported from there.
Local types (SpatialSlice, FeaturesSlice, DocumentSlice, SessionState) are
defined here as they are not (yet) in debrief_schemas.

NOTE: The generated ConfiguredBaseModel uses extra="forbid" and snake_case field
names without camelCase aliases. Callers must use snake_case constructors.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

# Import session-state types from generated debrief_schemas (source of truth).
# These replace the previous hand-written duplicates.
from debrief_schemas import (
    FeatureSelection,
    TemporalSlice,
    TimeFilter,
    TimeInstant,
    TimeRange,
    TimeStep,
    ViewportPolygon,
)

__all__ = [
    "FeatureSelection",
    "TemporalSlice",
    "TimeFilter",
    "TimeInstant",
    "TimeRange",
    "TimeStep",
    "ViewportPolygon",
]


def make_time_instant(epoch: int) -> TimeInstant:
    """Create a TimeInstant from epoch milliseconds.

    Helper replacing the former TimeInstant.from_epoch() classmethod.
    The generated TimeInstant (ConfiguredBaseModel) does not support classmethods.
    """
    dt = datetime.utcfromtimestamp(epoch / 1000)
    return TimeInstant(
        epoch=epoch,
        iso=dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
    )


def make_time_instant_now() -> TimeInstant:
    """Create a TimeInstant for the current time.

    Helper replacing the former TimeInstant.now() classmethod.
    """
    dt = datetime.utcnow()
    epoch = int(dt.timestamp() * 1000)
    iso = dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
    return TimeInstant(epoch=epoch, iso=iso)


class SpatialSlice(BaseModel):
    """Spatial state slice."""

    viewport: ViewportPolygon | None = None
    rotation: float = 0


class FeaturesSlice(BaseModel):
    """Features state slice."""

    model_config = ConfigDict(populate_by_name=True)

    featureCollectionUri: str | None = Field(None, alias="featureCollectionUri")
    selection: FeatureSelection
    hiddenFeatureIds: list[str] = Field(default_factory=list, alias="hiddenFeatureIds")


class DocumentSlice(BaseModel):
    """Document state slice."""

    model_config = ConfigDict(populate_by_name=True)

    dirty: bool = False
    savePath: str | None = Field(None, alias="savePath")


class SessionState(BaseModel):
    """Complete session state."""

    temporal: TemporalSlice
    spatial: SpatialSlice
    features: FeaturesSlice
    document: DocumentSlice
