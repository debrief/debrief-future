from __future__ import annotations

import re
import sys
from datetime import date, datetime, time
from decimal import Decimal
from enum import Enum
from typing import Any, ClassVar, Literal, Optional, Union

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    RootModel,
    SerializationInfo,
    SerializerFunctionWrapHandler,
    field_validator,
    model_serializer,
)


metamodel_version = "None"
version = "None"


class ConfiguredBaseModel(BaseModel):
    model_config = ConfigDict(
        serialize_by_alias=True,
        validate_by_name=True,
        validate_assignment=True,
        validate_default=True,
        extra="forbid",
        arbitrary_types_allowed=True,
        use_enum_values=True,
        strict=False,
    )

    @model_serializer(mode="wrap", when_used="unless-none")
    def treat_empty_lists_as_none(
        self, handler: SerializerFunctionWrapHandler, info: SerializationInfo
    ) -> dict[str, Any]:
        if info.exclude_none:
            _instance = self.model_copy()
            for field, field_info in type(_instance).model_fields.items():
                if getattr(_instance, field) == [] and not (field_info.is_required()):
                    setattr(_instance, field, None)
        else:
            _instance = self
        return handler(_instance, info)


class LinkMLMeta(RootModel):
    root: dict[str, Any] = {}
    model_config = ConfigDict(frozen=True)

    def __getattr__(self, key: str):
        return getattr(self.root, key)

    def __getitem__(self, key: str):
        return self.root[key]

    def __setitem__(self, key: str, value):
        self.root[key] = value

    def __contains__(self, key: str) -> bool:
        return key in self.root


linkml_meta = LinkMLMeta(
    {
        "default_prefix": "debrief",
        "default_range": "string",
        "description": "LinkML schemas for Debrief v4.x maritime tactical analysis "
        "platform. Defines GeoJSON profile extensions for tracks, "
        "sensor contacts, and reference locations, plus STAC metadata "
        "and tool definitions.",
        "id": "https://debrief.info/schemas/debrief",
        "imports": ["linkml:types", "common", "geojson", "stac", "tools"],
        "name": "debrief",
        "prefixes": {
            "debrief": {
                "prefix_prefix": "debrief",
                "prefix_reference": "https://debrief.info/schemas/",
            },
            "geojson": {
                "prefix_prefix": "geojson",
                "prefix_reference": "https://purl.org/geojson/vocab#",
            },
            "linkml": {"prefix_prefix": "linkml", "prefix_reference": "https://w3id.org/linkml/"},
            "stac": {
                "prefix_prefix": "stac",
                "prefix_reference": "https://stac-extensions.github.io/",
            },
        },
        "source_file": "/home/user/debrief-future/shared/schemas/src/linkml/debrief.yaml",
        "title": "Debrief Maritime Analysis Schemas",
    }
)


class TrackTypeEnum(str, Enum):
    """
    Type of track feature
    """

    OWNSHIP = "OWNSHIP"
    """
    Own ship track
    """
    CONTACT = "CONTACT"
    """
    Contact/target track
    """
    REFERENCE = "REFERENCE"
    """
    Reference track
    """
    SOLUTION = "SOLUTION"
    """
    Solution/analysis track
    """


class SensorTypeEnum(str, Enum):
    """
    Type of sensor that produced a contact
    """

    SONAR_ACTIVE = "SONAR_ACTIVE"
    """
    Active sonar
    """
    SONAR_PASSIVE = "SONAR_PASSIVE"
    """
    Passive sonar
    """
    RADAR = "RADAR"
    """
    Radar
    """
    ESM = "ESM"
    """
    Electronic Support Measures
    """
    VISUAL = "VISUAL"
    """
    Visual observation
    """
    AIS = "AIS"
    """
    Automatic Identification System
    """
    OTHER = "OTHER"
    """
    Other sensor type
    """


class LocationTypeEnum(str, Enum):
    """
    Type of reference location
    """

    WAYPOINT = "WAYPOINT"
    """
    Navigation waypoint
    """
    EXERCISE_AREA = "EXERCISE_AREA"
    """
    Exercise area boundary
    """
    DANGER_AREA = "DANGER_AREA"
    """
    Danger/exclusion zone
    """
    ANCHORAGE = "ANCHORAGE"
    """
    Anchorage location
    """
    PORT = "PORT"
    """
    Port/harbor
    """
    REFERENCE = "REFERENCE"
    """
    Generic reference point
    """


class ToolCategoryEnum(str, Enum):
    """
    Category of analysis tool
    """

    GEOMETRY = "GEOMETRY"
    """
    Geometric calculations
    """
    KINEMATICS = "KINEMATICS"
    """
    Speed, course, bearing calculations
    """
    TACTICAL = "TACTICAL"
    """
    Tactical analysis
    """
    EXPORT = "EXPORT"
    """
    Data export
    """
    TRANSFORM = "TRANSFORM"
    """
    Data transformation
    """


class SelectionContextEnum(str, Enum):
    """
    Type of selection context required by a tool
    """

    SINGLE_TRACK = "SINGLE_TRACK"
    """
    Single track selected
    """
    MULTIPLE_TRACKS = "MULTIPLE_TRACKS"
    """
    Multiple tracks selected
    """
    TIME_PERIOD = "TIME_PERIOD"
    """
    Time period selected
    """
    TRACK_SEGMENT = "TRACK_SEGMENT"
    """
    Track segment selected
    """
    SENSOR_CONTACT = "SENSOR_CONTACT"
    """
    Sensor contact selected
    """
    FEATURE_SET = "FEATURE_SET"
    """
    Arbitrary feature set selected
    """


class TimestampedPosition(ConfiguredBaseModel):
    """
    A position with timestamp and optional kinematic data
    """

    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta(
        {"from_schema": "https://debrief.info/schemas/common"}
    )

    time: datetime = Field(
        default=...,
        description="""Position timestamp (ISO8601)""",
        json_schema_extra={
            "linkml_meta": {"domain_of": ["TimestampedPosition", "SensorContactProperties"]}
        },
    )
    coordinates: list[float] = Field(
        default=...,
        description="""[longitude, latitude] in degrees""",
        min_length=2,
        max_length=2,
        json_schema_extra={
            "linkml_meta": {
                "domain_of": [
                    "TimestampedPosition",
                    "GeoJSONPoint",
                    "GeoJSONLineString",
                    "GeoJSONPolygon",
                ]
            }
        },
    )
    depth: Optional[float] = Field(
        default=None,
        description="""Depth in meters (negative = below surface)""",
        json_schema_extra={"linkml_meta": {"domain_of": ["TimestampedPosition"]}},
    )
    course: Optional[float] = Field(
        default=None,
        description="""Course in degrees (0-360)""",
        ge=0,
        le=360,
        json_schema_extra={"linkml_meta": {"domain_of": ["TimestampedPosition"]}},
    )
    speed: Optional[float] = Field(
        default=None,
        description="""Speed in knots""",
        ge=0,
        json_schema_extra={"linkml_meta": {"domain_of": ["TimestampedPosition"]}},
    )


class SourceFile(ConfiguredBaseModel):
    """
    Metadata about a source file loaded into a plot
    """

    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta(
        {"from_schema": "https://debrief.info/schemas/common"}
    )

    filename: str = Field(
        default=...,
        description="""Original filename""",
        json_schema_extra={"linkml_meta": {"domain_of": ["SourceFile"]}},
    )
    format: str = Field(
        default=...,
        description="""File format (e.g., \"REP\", \"CSV\")""",
        json_schema_extra={"linkml_meta": {"domain_of": ["SourceFile"]}},
    )
    loaded_at: datetime = Field(
        default=...,
        description="""When file was loaded""",
        json_schema_extra={"linkml_meta": {"domain_of": ["SourceFile"]}},
    )
    sha256: str = Field(
        default=...,
        description="""SHA256 hash of file contents""",
        json_schema_extra={"linkml_meta": {"domain_of": ["SourceFile"]}},
    )
    asset_href: str = Field(
        default=...,
        description="""Path to asset in STAC catalog""",
        json_schema_extra={"linkml_meta": {"domain_of": ["SourceFile"]}},
    )

    @field_validator("sha256")
    def pattern_sha256(cls, v):
        pattern = re.compile(r"^[a-f0-9]{64}$")
        if isinstance(v, list):
            for element in v:
                if isinstance(element, str) and not pattern.match(element):
                    err_msg = f"Invalid sha256 format: {element}"
                    raise ValueError(err_msg)
        elif isinstance(v, str) and not pattern.match(v):
            err_msg = f"Invalid sha256 format: {v}"
            raise ValueError(err_msg)
        return v


class GeoJSONPoint(ConfiguredBaseModel):
    """
    GeoJSON Point geometry
    """

    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta(
        {"from_schema": "https://debrief.info/schemas/geojson"}
    )

    type: Literal["Point"] = Field(
        default=...,
        description="""Geometry type discriminator""",
        json_schema_extra={
            "linkml_meta": {
                "domain_of": [
                    "GeoJSONPoint",
                    "GeoJSONLineString",
                    "GeoJSONPolygon",
                    "TrackFeature",
                    "SensorContact",
                    "ReferenceLocation",
                ],
                "equals_string": "Point",
            }
        },
    )
    coordinates: list[float] = Field(
        default=...,
        description="""[longitude, latitude] in degrees""",
        min_length=2,
        max_length=2,
        json_schema_extra={
            "linkml_meta": {
                "domain_of": [
                    "TimestampedPosition",
                    "GeoJSONPoint",
                    "GeoJSONLineString",
                    "GeoJSONPolygon",
                ]
            }
        },
    )


class GeoJSONLineString(ConfiguredBaseModel):
    """
    GeoJSON LineString geometry
    """

    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta(
        {"from_schema": "https://debrief.info/schemas/geojson"}
    )

    type: Literal["LineString"] = Field(
        default=...,
        description="""Geometry type discriminator""",
        json_schema_extra={
            "linkml_meta": {
                "domain_of": [
                    "GeoJSONPoint",
                    "GeoJSONLineString",
                    "GeoJSONPolygon",
                    "TrackFeature",
                    "SensorContact",
                    "ReferenceLocation",
                ],
                "equals_string": "LineString",
            }
        },
    )
    coordinates: list[float] = Field(
        default=...,
        description="""Array of [longitude, latitude] pairs""",
        json_schema_extra={
            "linkml_meta": {
                "domain_of": [
                    "TimestampedPosition",
                    "GeoJSONPoint",
                    "GeoJSONLineString",
                    "GeoJSONPolygon",
                ]
            }
        },
    )


class GeoJSONPolygon(ConfiguredBaseModel):
    """
    GeoJSON Polygon geometry
    """

    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta(
        {"from_schema": "https://debrief.info/schemas/geojson"}
    )

    type: Literal["Polygon"] = Field(
        default=...,
        description="""Geometry type discriminator""",
        json_schema_extra={
            "linkml_meta": {
                "domain_of": [
                    "GeoJSONPoint",
                    "GeoJSONLineString",
                    "GeoJSONPolygon",
                    "TrackFeature",
                    "SensorContact",
                    "ReferenceLocation",
                ],
                "equals_string": "Polygon",
            }
        },
    )
    coordinates: list[float] = Field(
        default=...,
        description="""Array of linear rings (arrays of [lon, lat] pairs)""",
        json_schema_extra={
            "linkml_meta": {
                "domain_of": [
                    "TimestampedPosition",
                    "GeoJSONPoint",
                    "GeoJSONLineString",
                    "GeoJSONPolygon",
                ]
            }
        },
    )


class TrackProperties(ConfiguredBaseModel):
    """
    Properties for a TrackFeature
    """

    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta(
        {"from_schema": "https://debrief.info/schemas/geojson"}
    )

    platform_id: str = Field(
        default=...,
        description="""Platform/vessel identifier""",
        json_schema_extra={"linkml_meta": {"domain_of": ["TrackProperties"]}},
    )
    platform_name: Optional[str] = Field(
        default=None,
        description="""Human-readable platform name""",
        json_schema_extra={"linkml_meta": {"domain_of": ["TrackProperties"]}},
    )
    track_type: TrackTypeEnum = Field(
        default=...,
        description="""Type of track""",
        json_schema_extra={"linkml_meta": {"domain_of": ["TrackProperties"]}},
    )
    start_time: datetime = Field(
        default=...,
        description="""Track start time (ISO8601)""",
        json_schema_extra={"linkml_meta": {"domain_of": ["TrackProperties"]}},
    )
    end_time: datetime = Field(
        default=...,
        description="""Track end time (ISO8601)""",
        json_schema_extra={"linkml_meta": {"domain_of": ["TrackProperties"]}},
    )
    positions: list[TimestampedPosition] = Field(
        default=...,
        description="""Array of timestamped positions""",
        min_length=2,
        json_schema_extra={"linkml_meta": {"domain_of": ["TrackProperties"]}},
    )
    source_file: Optional[str] = Field(
        default=None,
        description="""Original source file path""",
        json_schema_extra={"linkml_meta": {"domain_of": ["TrackProperties"]}},
    )
    color: Optional[str] = Field(
        default=None,
        description="""Display color (CSS color string)""",
        json_schema_extra={
            "linkml_meta": {
                "domain_of": [
                    "TrackProperties",
                    "SensorContactProperties",
                    "ReferenceLocationProperties",
                ]
            }
        },
    )


class TrackFeature(ConfiguredBaseModel):
    """
    GeoJSON Feature representing a vessel track
    """

    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta(
        {"from_schema": "https://debrief.info/schemas/geojson"}
    )

    type: Literal["Feature"] = Field(
        default=...,
        description="""GeoJSON type discriminator""",
        json_schema_extra={
            "linkml_meta": {
                "domain_of": [
                    "GeoJSONPoint",
                    "GeoJSONLineString",
                    "GeoJSONPolygon",
                    "TrackFeature",
                    "SensorContact",
                    "ReferenceLocation",
                ],
                "equals_string": "Feature",
            }
        },
    )
    id: str = Field(
        default=...,
        description="""Unique identifier (UUID recommended)""",
        json_schema_extra={
            "linkml_meta": {
                "domain_of": [
                    "TrackFeature",
                    "SensorContact",
                    "ReferenceLocation",
                    "PlotMetadata",
                    "ToolMetadata",
                ]
            }
        },
    )
    geometry: GeoJSONLineString = Field(
        default=...,
        description="""Track path as GeoJSON LineString""",
        json_schema_extra={
            "linkml_meta": {"domain_of": ["TrackFeature", "SensorContact", "ReferenceLocation"]}
        },
    )
    properties: TrackProperties = Field(
        default=...,
        description="""Track metadata""",
        json_schema_extra={
            "linkml_meta": {"domain_of": ["TrackFeature", "SensorContact", "ReferenceLocation"]}
        },
    )
    bbox: Optional[list[float]] = Field(
        default=[],
        description="""Bounding box [minLon, minLat, maxLon, maxLat]""",
        min_length=4,
        max_length=4,
        json_schema_extra={"linkml_meta": {"domain_of": ["TrackFeature"]}},
    )


class SensorContactProperties(ConfiguredBaseModel):
    """
    Properties for a SensorContact
    """

    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta(
        {"from_schema": "https://debrief.info/schemas/geojson"}
    )

    parent_track_id: str = Field(
        default=...,
        description="""ID of parent TrackFeature""",
        json_schema_extra={"linkml_meta": {"domain_of": ["SensorContactProperties"]}},
    )
    sensor_type: SensorTypeEnum = Field(
        default=...,
        description="""Type of sensor""",
        json_schema_extra={"linkml_meta": {"domain_of": ["SensorContactProperties"]}},
    )
    time: datetime = Field(
        default=...,
        description="""Detection timestamp (ISO8601)""",
        json_schema_extra={
            "linkml_meta": {"domain_of": ["TimestampedPosition", "SensorContactProperties"]}
        },
    )
    bearing: Optional[float] = Field(
        default=None,
        description="""Bearing in degrees (0-360)""",
        ge=0,
        le=360,
        json_schema_extra={"linkml_meta": {"domain_of": ["SensorContactProperties"]}},
    )
    bearing_error: Optional[float] = Field(
        default=None,
        description="""Bearing error in degrees""",
        ge=0,
        json_schema_extra={"linkml_meta": {"domain_of": ["SensorContactProperties"]}},
    )
    range: Optional[float] = Field(
        default=None,
        description="""Range in nautical miles""",
        ge=0,
        json_schema_extra={"linkml_meta": {"domain_of": ["SensorContactProperties"]}},
    )
    range_error: Optional[float] = Field(
        default=None,
        description="""Range error in nautical miles""",
        ge=0,
        json_schema_extra={"linkml_meta": {"domain_of": ["SensorContactProperties"]}},
    )
    frequency: Optional[float] = Field(
        default=None,
        description="""Frequency in Hz (for acoustic)""",
        ge=0,
        json_schema_extra={"linkml_meta": {"domain_of": ["SensorContactProperties"]}},
    )
    label: Optional[str] = Field(
        default=None,
        description="""User-assigned label""",
        json_schema_extra={"linkml_meta": {"domain_of": ["SensorContactProperties"]}},
    )
    color: Optional[str] = Field(
        default=None,
        description="""Display color (CSS color string)""",
        json_schema_extra={
            "linkml_meta": {
                "domain_of": [
                    "TrackProperties",
                    "SensorContactProperties",
                    "ReferenceLocationProperties",
                ]
            }
        },
    )


class SensorContact(ConfiguredBaseModel):
    """
    GeoJSON Feature representing a sensor detection
    """

    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta(
        {"from_schema": "https://debrief.info/schemas/geojson"}
    )

    type: Literal["Feature"] = Field(
        default=...,
        description="""GeoJSON type discriminator""",
        json_schema_extra={
            "linkml_meta": {
                "domain_of": [
                    "GeoJSONPoint",
                    "GeoJSONLineString",
                    "GeoJSONPolygon",
                    "TrackFeature",
                    "SensorContact",
                    "ReferenceLocation",
                ],
                "equals_string": "Feature",
            }
        },
    )
    id: str = Field(
        default=...,
        description="""Unique identifier (UUID recommended)""",
        json_schema_extra={
            "linkml_meta": {
                "domain_of": [
                    "TrackFeature",
                    "SensorContact",
                    "ReferenceLocation",
                    "PlotMetadata",
                    "ToolMetadata",
                ]
            }
        },
    )
    geometry: GeoJSONPoint = Field(
        default=...,
        description="""Contact position as GeoJSON Point""",
        json_schema_extra={
            "linkml_meta": {"domain_of": ["TrackFeature", "SensorContact", "ReferenceLocation"]}
        },
    )
    properties: SensorContactProperties = Field(
        default=...,
        description="""Contact metadata""",
        json_schema_extra={
            "linkml_meta": {"domain_of": ["TrackFeature", "SensorContact", "ReferenceLocation"]}
        },
    )


class ReferenceLocationProperties(ConfiguredBaseModel):
    """
    Properties for a ReferenceLocation
    """

    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta(
        {"from_schema": "https://debrief.info/schemas/geojson"}
    )

    name: str = Field(
        default=...,
        description="""Reference location name""",
        json_schema_extra={
            "linkml_meta": {"domain_of": ["ReferenceLocationProperties", "ToolMetadata"]}
        },
    )
    location_type: LocationTypeEnum = Field(
        default=...,
        description="""Type of reference""",
        json_schema_extra={"linkml_meta": {"domain_of": ["ReferenceLocationProperties"]}},
    )
    description: Optional[str] = Field(
        default=None,
        description="""Additional description""",
        json_schema_extra={
            "linkml_meta": {
                "domain_of": ["ReferenceLocationProperties", "PlotMetadata", "ToolMetadata"]
            }
        },
    )
    symbol: Optional[str] = Field(
        default=None,
        description="""Map symbol identifier""",
        json_schema_extra={"linkml_meta": {"domain_of": ["ReferenceLocationProperties"]}},
    )
    color: Optional[str] = Field(
        default=None,
        description="""Display color (CSS color string)""",
        json_schema_extra={
            "linkml_meta": {
                "domain_of": [
                    "TrackProperties",
                    "SensorContactProperties",
                    "ReferenceLocationProperties",
                ]
            }
        },
    )
    valid_from: Optional[datetime] = Field(
        default=None,
        description="""Start of validity period""",
        json_schema_extra={"linkml_meta": {"domain_of": ["ReferenceLocationProperties"]}},
    )
    valid_until: Optional[datetime] = Field(
        default=None,
        description="""End of validity period""",
        json_schema_extra={"linkml_meta": {"domain_of": ["ReferenceLocationProperties"]}},
    )


class ReferenceLocation(ConfiguredBaseModel):
    """
    GeoJSON Feature for fixed reference points
    """

    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta(
        {"from_schema": "https://debrief.info/schemas/geojson"}
    )

    type: Literal["Feature"] = Field(
        default=...,
        description="""GeoJSON type discriminator""",
        json_schema_extra={
            "linkml_meta": {
                "domain_of": [
                    "GeoJSONPoint",
                    "GeoJSONLineString",
                    "GeoJSONPolygon",
                    "TrackFeature",
                    "SensorContact",
                    "ReferenceLocation",
                ],
                "equals_string": "Feature",
            }
        },
    )
    id: str = Field(
        default=...,
        description="""Unique identifier""",
        json_schema_extra={
            "linkml_meta": {
                "domain_of": [
                    "TrackFeature",
                    "SensorContact",
                    "ReferenceLocation",
                    "PlotMetadata",
                    "ToolMetadata",
                ]
            }
        },
    )
    geometry: GeoJSONPoint = Field(
        default=...,
        description="""Location (Point) or area (Polygon)""",
        json_schema_extra={
            "linkml_meta": {"domain_of": ["TrackFeature", "SensorContact", "ReferenceLocation"]}
        },
    )
    properties: ReferenceLocationProperties = Field(
        default=...,
        description="""Reference metadata""",
        json_schema_extra={
            "linkml_meta": {"domain_of": ["TrackFeature", "SensorContact", "ReferenceLocation"]}
        },
    )


class PlotMetadata(ConfiguredBaseModel):
    """
    STAC Item properties for a Debrief plot
    """

    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta(
        {
            "from_schema": "https://debrief.info/schemas/stac",
            "rules": [
                {
                    "description": "If datetime is absent, both start_datetime and "
                    "end_datetime are required",
                    "postconditions": {
                        "slot_conditions": {
                            "end_datetime": {"name": "end_datetime", "required": True},
                            "start_datetime": {"name": "start_datetime", "required": True},
                        }
                    },
                    "preconditions": {
                        "slot_conditions": {
                            "datetime": {"name": "datetime", "value_presence": "ABSENT"}
                        }
                    },
                }
            ],
        }
    )

    id: str = Field(
        default=...,
        description="""Unique plot identifier""",
        json_schema_extra={
            "linkml_meta": {
                "domain_of": [
                    "TrackFeature",
                    "SensorContact",
                    "ReferenceLocation",
                    "PlotMetadata",
                    "ToolMetadata",
                ]
            }
        },
    )
    title: str = Field(
        default=...,
        description="""Human-readable plot title""",
        json_schema_extra={"linkml_meta": {"domain_of": ["PlotMetadata"]}},
    )
    description: Optional[str] = Field(
        default=None,
        description="""Plot description""",
        json_schema_extra={
            "linkml_meta": {
                "domain_of": ["ReferenceLocationProperties", "PlotMetadata", "ToolMetadata"]
            }
        },
    )
    datetime: Optional[datetime] = Field(
        default=None,
        description="""Single datetime (if not range)""",
        json_schema_extra={"linkml_meta": {"domain_of": ["PlotMetadata"]}},
    )
    start_datetime: Optional[datetime] = Field(
        default=None,
        description="""Start of temporal extent""",
        json_schema_extra={"linkml_meta": {"domain_of": ["PlotMetadata"]}},
    )
    end_datetime: Optional[datetime] = Field(
        default=None,
        description="""End of temporal extent""",
        json_schema_extra={"linkml_meta": {"domain_of": ["PlotMetadata"]}},
    )
    created: datetime = Field(
        default=...,
        description="""Plot creation timestamp""",
        json_schema_extra={"linkml_meta": {"domain_of": ["PlotMetadata"]}},
    )
    updated: datetime = Field(
        default=...,
        description="""Last update timestamp""",
        json_schema_extra={"linkml_meta": {"domain_of": ["PlotMetadata"]}},
    )
    source_files: list[SourceFile] = Field(
        default=...,
        description="""List of source files""",
        min_length=1,
        json_schema_extra={"linkml_meta": {"domain_of": ["PlotMetadata"]}},
    )
    platform_ids: Optional[list[str]] = Field(
        default=[],
        description="""Platforms included in plot""",
        json_schema_extra={"linkml_meta": {"domain_of": ["PlotMetadata"]}},
    )
    exercise_name: Optional[str] = Field(
        default=None,
        description="""Exercise/operation name""",
        json_schema_extra={"linkml_meta": {"domain_of": ["PlotMetadata"]}},
    )
    classification: Optional[str] = Field(
        default=None,
        description="""Security classification""",
        json_schema_extra={"linkml_meta": {"domain_of": ["PlotMetadata"]}},
    )


class ToolMetadata(ConfiguredBaseModel):
    """
    Describes an analysis tool available in the calc service
    """

    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta(
        {"from_schema": "https://debrief.info/schemas/tools"}
    )

    id: str = Field(
        default=...,
        description="""Unique tool identifier""",
        json_schema_extra={
            "linkml_meta": {
                "domain_of": [
                    "TrackFeature",
                    "SensorContact",
                    "ReferenceLocation",
                    "PlotMetadata",
                    "ToolMetadata",
                ]
            }
        },
    )
    name: str = Field(
        default=...,
        description="""Human-readable tool name""",
        json_schema_extra={
            "linkml_meta": {"domain_of": ["ReferenceLocationProperties", "ToolMetadata"]}
        },
    )
    description: str = Field(
        default=...,
        description="""Tool description""",
        json_schema_extra={
            "linkml_meta": {
                "domain_of": ["ReferenceLocationProperties", "PlotMetadata", "ToolMetadata"]
            }
        },
    )
    version: str = Field(
        default=...,
        description="""Tool version (semver recommended)""",
        json_schema_extra={"linkml_meta": {"domain_of": ["ToolMetadata"]}},
    )
    category: ToolCategoryEnum = Field(
        default=...,
        description="""Tool category""",
        json_schema_extra={"linkml_meta": {"domain_of": ["ToolMetadata"]}},
    )
    selection_context: list[SelectionContextEnum] = Field(
        default=...,
        description="""Required selection types""",
        min_length=1,
        json_schema_extra={"linkml_meta": {"domain_of": ["ToolMetadata"]}},
    )
    input_schema: Optional[str] = Field(
        default=None,
        description="""JSON Schema for tool inputs (as JSON string)""",
        json_schema_extra={"linkml_meta": {"domain_of": ["ToolMetadata"]}},
    )
    output_schema: Optional[str] = Field(
        default=None,
        description="""JSON Schema for tool outputs (as JSON string)""",
        json_schema_extra={"linkml_meta": {"domain_of": ["ToolMetadata"]}},
    )
    icon: Optional[str] = Field(
        default=None,
        description="""Icon identifier""",
        json_schema_extra={"linkml_meta": {"domain_of": ["ToolMetadata"]}},
    )

    @field_validator("version")
    def pattern_version(cls, v):
        pattern = re.compile(r"^\d+\.\d+\.\d+.*$")
        if isinstance(v, list):
            for element in v:
                if isinstance(element, str) and not pattern.match(element):
                    err_msg = f"Invalid version format: {element}"
                    raise ValueError(err_msg)
        elif isinstance(v, str) and not pattern.match(v):
            err_msg = f"Invalid version format: {v}"
            raise ValueError(err_msg)
        return v


# Model rebuild
# see https://pydantic-docs.helpmanual.io/usage/models/#rebuilding-a-model
TimestampedPosition.model_rebuild()
SourceFile.model_rebuild()
GeoJSONPoint.model_rebuild()
GeoJSONLineString.model_rebuild()
GeoJSONPolygon.model_rebuild()
TrackProperties.model_rebuild()
TrackFeature.model_rebuild()
SensorContactProperties.model_rebuild()
SensorContact.model_rebuild()
ReferenceLocationProperties.model_rebuild()
ReferenceLocation.model_rebuild()
PlotMetadata.model_rebuild()
ToolMetadata.model_rebuild()
