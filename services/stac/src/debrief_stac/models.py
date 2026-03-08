"""
Pydantic models for debrief-stac internal use.

These models define the metadata structures used when creating
and managing STAC Items (plots) within catalogs.
"""

from datetime import UTC
from datetime import datetime as dt

from pydantic import BaseModel, Field


class PlotMetadata(BaseModel):
    """Metadata for creating a new plot (STAC Item).

    Attributes:
        title: Human-readable title for the plot
        description: Optional detailed description
        timestamp: Timestamp for the plot (defaults to now)
    """

    title: str = Field(..., min_length=1, description="Plot title")
    description: str | None = Field(default=None, description="Plot description")
    timestamp: dt = Field(
        default_factory=lambda: dt.now(UTC),
        description="Plot timestamp (ISO8601)",
        alias="datetime",
    )

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "examples": [
                {
                    "title": "Exercise Alpha Analysis",
                    "description": "Track analysis from Exercise Alpha, Day 1",
                    "datetime": "2026-01-09T12:00:00Z",
                }
            ]
        },
    }


class PlotSummary(BaseModel):
    """Summary information for a plot in list views.

    Attributes:
        id: Unique plot identifier
        title: Plot title
        timestamp: Plot timestamp
        feature_count: Number of features in the plot
    """

    id: str = Field(..., description="Plot ID")
    title: str = Field(..., description="Plot title")
    timestamp: dt = Field(..., description="Plot timestamp", alias="datetime")
    feature_count: int = Field(default=0, ge=0, description="Number of features")

    model_config = {"populate_by_name": True}


class CollectionExtent(BaseModel):
    """Spatial and temporal extent of a STAC Collection.

    Attributes:
        bbox: Bounding box as (west, south, east, north), or None if no spatial data
        temporal_start: Earliest start datetime ISO string, or None
        temporal_end: Latest end datetime ISO string, or None
    """

    bbox: tuple[float, float, float, float] | None = Field(
        default=None, description="Bounding box [west, south, east, north]"
    )
    temporal_start: str | None = Field(default=None, description="Earliest start datetime")
    temporal_end: str | None = Field(default=None, description="Latest end datetime")


class CollectionSummaries(BaseModel):
    """Pre-aggregated distinct values for extension properties.

    Each array contains the sorted, deduplicated values across all items.

    Attributes:
        vessel_classes: Distinct vessel class paths
        tags: Distinct plot-level tags
        feature_tags: Distinct feature-level tags
        track_names: Distinct track names
        nationalities: Distinct nationality codes (ISO 3166-1 alpha-2)
    """

    vessel_classes: list[str] = Field(default_factory=list, description="Distinct vessel classes")
    tags: list[str] = Field(default_factory=list, description="Distinct plot-level tags")
    feature_tags: list[str] = Field(default_factory=list, description="Distinct feature-level tags")
    track_names: list[str] = Field(default_factory=list, description="Distinct track names")
    nationalities: list[str] = Field(default_factory=list, description="Distinct nationality codes")


class AssetProvenance(BaseModel):
    """Provenance metadata for source file assets.

    Per Constitution Article III, all transformations must record lineage.

    Attributes:
        source_path: Original file path before copy
        load_timestamp: When the file was loaded
        tool_version: Version of debrief-stac that loaded the file
    """

    source_path: str = Field(..., description="Original source file path")
    load_timestamp: dt = Field(
        default_factory=lambda: dt.now(UTC), description="When the asset was loaded"
    )
    tool_version: str = Field(default="0.1.0", description="debrief-stac version")
