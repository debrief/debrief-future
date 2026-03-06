"""
Session state types for Python client.
Feature: 024-document-session-state
"""

from datetime import datetime

from pydantic import BaseModel, Field


class TimeInstant(BaseModel):
    """A point in time with dual representations."""

    epoch: int = Field(description="Milliseconds since Unix epoch")
    iso: str = Field(description="ISO 8601 UTC format string")

    @classmethod
    def now(cls) -> "TimeInstant":
        """Create a TimeInstant for the current time."""
        dt = datetime.utcnow()
        return cls(
            epoch=int(dt.timestamp() * 1000),
            iso=dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
        )

    @classmethod
    def from_epoch(cls, epoch: int) -> "TimeInstant":
        """Create a TimeInstant from epoch milliseconds."""
        dt = datetime.utcfromtimestamp(epoch / 1000)
        return cls(
            epoch=epoch,
            iso=dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
        )


class TimeRange(BaseModel):
    """A temporal interval with inclusive start and end."""

    start: TimeInstant
    end: TimeInstant


class TimeFilter(BaseModel):
    """Constraints on the visible time window."""

    start: TimeInstant | None = None
    end: TimeInstant | None = None


class TimeStep(BaseModel):
    """Step size for discrete time navigation."""

    value: float
    unit: str = Field(description="millisecond|second|minute|hour|day")


class Coordinate(BaseModel):
    """A geographic coordinate."""

    __root__: tuple[float, float]

    def __init__(self, lon: float, lat: float, **kwargs: object) -> None:
        super().__init__(__root__=(lon, lat), **kwargs)

    @property
    def longitude(self) -> float:
        return self.__root__[0]

    @property
    def latitude(self) -> float:
        return self.__root__[1]


class ViewportPolygon(BaseModel):
    """Geographic area as a 4-corner polygon."""

    coordinates: list[list[float]] = Field(
        description="Four corners [NW, NE, SE, SW] as [lon, lat] pairs"
    )


class FeatureSelection(BaseModel):
    """Set of selected feature identifiers."""

    featureIds: list[str] = Field(default_factory=list, alias="featureIds")
    primary: str | None = None
    timestamp: TimeInstant

    class Config:
        populate_by_name = True


class TemporalSlice(BaseModel):
    """Temporal state slice."""

    currentTime: TimeInstant | None = Field(None, alias="currentTime")
    timeRange: TimeRange | None = Field(None, alias="timeRange")
    timeFilter: TimeFilter | None = Field(None, alias="timeFilter")
    stepSize: TimeStep = Field(alias="stepSize")
    playbackRate: float = Field(alias="playbackRate")
    playbackState: str = Field(alias="playbackState")
    displayMode: str = Field(alias="displayMode")

    class Config:
        populate_by_name = True


class SpatialSlice(BaseModel):
    """Spatial state slice."""

    viewport: ViewportPolygon | None = None
    rotation: float = 0


class FeaturesSlice(BaseModel):
    """Features state slice."""

    featureCollectionUri: str | None = Field(None, alias="featureCollectionUri")
    selection: FeatureSelection
    hiddenFeatureIds: list[str] = Field(default_factory=list, alias="hiddenFeatureIds")

    class Config:
        populate_by_name = True


class DocumentSlice(BaseModel):
    """Document state slice."""

    dirty: bool = False
    savePath: str | None = Field(None, alias="savePath")

    class Config:
        populate_by_name = True


class SessionState(BaseModel):
    """Complete session state."""

    temporal: TemporalSlice
    spatial: SpatialSlice
    features: FeaturesSlice
    document: DocumentSlice
