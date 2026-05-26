# AUTO-GENERATED — DO NOT EDIT
from __future__ import annotations

import re
import sys
from datetime import (
    date,
    datetime,
    time
)
from decimal import Decimal
from enum import Enum
from typing import (
    Any,
    ClassVar,
    Literal,
    Optional,
    Union
)

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    RootModel,
    SerializationInfo,
    SerializerFunctionWrapHandler,
    field_validator,
    model_serializer
)


metamodel_version = "None"
version = "None"


class ConfiguredBaseModel(BaseModel):
    model_config = ConfigDict(
        serialize_by_alias = True,
        validate_by_name = True,
        validate_assignment = True,
        validate_default = True,
        extra = "forbid",
        arbitrary_types_allowed = True,
        use_enum_values = True,
        strict = False,
    )

    @model_serializer(mode='wrap', when_used='unless-none')
    def treat_empty_lists_as_none(
            self, handler: SerializerFunctionWrapHandler,
            info: SerializationInfo) -> dict[str, object]:
        if info.exclude_none:
            _instance = self.model_copy()
            for field, field_info in type(_instance).model_fields.items():
                if getattr(_instance, field) == [] and not(
                        field_info.is_required()):
                    setattr(_instance, field, None)
        else:
            _instance = self
        return handler(_instance, info)



class LinkMLMeta(RootModel):
    root: dict[str, object] = {}
    model_config = ConfigDict(frozen=True)

    def __getattr__(self, key:str):
        return getattr(self.root, key)

    def __getitem__(self, key:str):
        return self.root[key]

    def __setitem__(self, key:str, value):
        self.root[key] = value

    def __contains__(self, key:str) -> bool:
        return key in self.root


linkml_meta = LinkMLMeta({'default_prefix': 'debrief',
     'default_range': 'string',
     'description': 'LinkML schemas for Debrief v4.x maritime tactical analysis '
                    'platform. Defines GeoJSON profile extensions for tracks and '
                    'reference locations. This is a tracer bullet implementation '
                    'covering core entity types.',
     'id': 'https://debrief.info/schemas/debrief',
     'imports': ['linkml:types',
                 'common',
                 'styling',
                 'geojson',
                 'annotations',
                 'tool',
                 'log-entry',
                 'system-record',
                 'stac-extension',
                 'stac',
                 'raw-geojson',
                 'session-state',
                 'tool-result',
                 'storyboard',
                 'mcp'],
     'name': 'debrief',
     'prefixes': {'debrief': {'prefix_prefix': 'debrief',
                              'prefix_reference': 'https://debrief.info/schemas/'},
                  'geojson': {'prefix_prefix': 'geojson',
                              'prefix_reference': 'https://purl.org/geojson/vocab#'},
                  'linkml': {'prefix_prefix': 'linkml',
                             'prefix_reference': 'https://w3id.org/linkml/'}},
     'source_file': 'src/linkml/debrief.yaml',
     'title': 'Debrief Maritime Analysis Schemas'} )

class FeatureKindEnum(str, Enum):
    """
    Discriminator for GeoJSON feature types
    """
    TRACK = "TRACK"
    """
    Vessel track (LineString geometry)
    """
    POINT = "POINT"
    """
    Reference point/location (Point geometry)
    """
    NARRATIVE = "NARRATIVE"
    """
    Timestamped narrative/log entry (no geometry)
    """
    CIRCLE = "CIRCLE"
    """
    Circle annotation (Polygon geometry, center+radius in properties)
    """
    RECTANGLE = "RECTANGLE"
    """
    Rectangle annotation (Polygon geometry)
    """
    LINE = "LINE"
    """
    Line annotation (LineString geometry)
    """
    TEXT = "TEXT"
    """
    Text annotation at a position (Point geometry)
    """
    VECTOR = "VECTOR"
    """
    Vector annotation (LineString geometry, origin+range+bearing in properties)
    """
    SYSTEM = "SYSTEM"
    """
    Non-spatial system state (null geometry, reserved state.* IDs)
    """
    POLY = "POLY"
    """
    Arbitrary polygon annotation (Polygon geometry)
    """
    MULTI_POINT = "MULTI_POINT"
    """
    Multi-point tool result (MultiPoint geometry)
    """
    MULTI_POLYGON = "MULTI_POLYGON"
    """
    Multi-polygon tool result (MultiPolygon geometry)
    """
    SYSTEM_RECORD = "SYSTEM_RECORD"
    """
    Plot-level system record (snapshot chain, branches)
    """
    STORYBOARD = "STORYBOARD"
    """
    Storyboard parent feature (panel-only entity, Polygon hull over child Scene viewports)
    """
    STORYBOARD_SCENE = "STORYBOARD_SCENE"
    """
    Storyboard Scene feature (Polygon viewport bounds, captured moment in a Storyboard)
    """


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


class PointShapeEnum(str, Enum):
    """
    Valid shapes for point markers
    """
    circle = "circle"
    """
    Filled/stroked circle (default marker)
    """
    square = "square"
    """
    Filled/stroked square (reference points)
    """
    triangle = "triangle"
    """
    Filled/stroked triangle (directional indicators)
    """
    diamond = "diamond"
    """
    Diamond shape
    """
    cross = "cross"
    """
    Cross/plus shape
    """


class NamedColorEnum(str, Enum):
    """
    Predefined named colours for styling tool parameters
    """
    red = "red"
    """
    Red
    """
    green = "green"
    """
    Green
    """
    blue = "blue"
    """
    Blue
    """
    yellow = "yellow"
    """
    Yellow
    """
    orange = "orange"
    """
    Orange
    """
    purple = "purple"
    """
    Purple
    """
    cyan = "cyan"
    """
    Cyan
    """
    magenta = "magenta"
    """
    Magenta
    """
    white = "white"
    """
    White
    """
    black = "black"
    """
    Black
    """
    grey = "grey"
    """
    Grey
    """


class MarkerSymbolEnum(str, Enum):
    """
    Marker shapes for tool parameter choices (superset of PointShapeEnum)
    """
    circle = "circle"
    """
    Filled/stroked circle (default marker)
    """
    square = "square"
    """
    Filled/stroked square (reference points)
    """
    triangle = "triangle"
    """
    Filled/stroked triangle (directional indicators)
    """
    diamond = "diamond"
    """
    Diamond shape
    """
    cross = "cross"
    """
    Cross/plus shape
    """


class CardinalDirectionEnum(str, Enum):
    """
    Eight-point compass directions
    """
    N = "N"
    """
    North
    """
    NE = "NE"
    """
    North-East
    """
    E = "E"
    """
    East
    """
    SE = "SE"
    """
    South-East
    """
    S = "S"
    """
    South
    """
    SW = "SW"
    """
    South-West
    """
    W = "W"
    """
    West
    """
    NW = "NW"
    """
    North-West
    """


class DurationPresetEnum(str, Enum):
    """
    Common ISO 8601 duration presets for interval parameters
    """
    PT1M = "PT1M"
    """
    1 minute
    """
    PT5M = "PT5M"
    """
    5 minutes
    """
    PT15M = "PT15M"
    """
    15 minutes
    """
    PT30M = "PT30M"
    """
    30 minutes
    """
    PT1H = "PT1H"
    """
    1 hour
    """
    PT2H = "PT2H"
    """
    2 hours
    """
    PT6H = "PT6H"
    """
    6 hours
    """
    PT12H = "PT12H"
    """
    12 hours
    """
    PT24H = "PT24H"
    """
    24 hours
    """


class NumericPresetEnum(str, Enum):
    """
    Common numeric presets for count and distance parameters
    """
    n_1 = "n_1"
    """
    One
    """
    n_2 = "n_2"
    """
    Two
    """
    n_5 = "n_5"
    """
    Five
    """
    n_10 = "n_10"
    """
    Ten
    """
    n_25 = "n_25"
    """
    Twenty-five
    """
    n_50 = "n_50"
    """
    Fifty
    """
    n_100 = "n_100"
    """
    One hundred
    """


class ReferencePointPatternEnum(str, Enum):
    """
    Generation patterns for reference point placement
    """
    grid = "grid"
    """
    Evenly spaced grid of rows and columns
    """
    scatter = "scatter"
    """
    Randomly distributed points
    """


class LineCapEnum(str, Enum):
    """
    How line endpoints are rendered (SVG/CSS standard)
    """
    butt = "butt"
    """
    Flat edge at endpoint
    """
    round = "round"
    """
    Semicircle at endpoint
    """
    square = "square"
    """
    Square projection beyond endpoint
    """


class VesselDomainEnum(str, Enum):
    """
    Top-level vessel domain classification
    """
    surface = "surface"
    """
    Surface vessels (warships, auxiliaries, merchant)
    """
    subsurface = "subsurface"
    """
    Subsurface vessels (submarines)
    """
    unknown = "unknown"
    """
    Vessel domain not determined or not applicable
    """


class LineJoinEnum(str, Enum):
    """
    How line segment joints are rendered (SVG/CSS standard)
    """
    miter = "miter"
    """
    Sharp corner (default)
    """
    round = "round"
    """
    Rounded corner
    """
    bevel = "bevel"
    """
    Flat corner
    """


class SegmentTypeEnum(str, Enum):
    """
    Discriminator for track segment types within compound tracks
    """
    TRACK = "TRACK"
    """
    Plain recorded track segment
    """
    ABSOLUTE_TMA = "ABSOLUTE_TMA"
    """
    Target Motion Analysis leg with absolute geographic coordinates
    """
    RELATIVE_TMA = "RELATIVE_TMA"
    """
    Target Motion Analysis leg relative to ownship position
    """
    DYNAMIC_INFILL = "DYNAMIC_INFILL"
    """
    Interpolated segment between TMA legs
    """


class SystemStateTypeEnum(str, Enum):
    """
    Discriminator for system state variants
    """
    temporal = "temporal"
    """
    Time viewport state (start/end times)
    """
    spatial = "spatial"
    """
    Map viewport state (bbox, zoom)
    """
    selection = "selection"
    """
    Feature selection state (selected IDs)
    """
    active_storyboard = "active_storyboard"
    """
    Per-plot active-Storyboard pin (#237)
    """


class ArrayCentreModeEnum(str, Enum):
    """
    Array centre calculation mode for towed array sensors
    """
    PLAIN = "PLAIN"
    """
    Simple backtrack along vessel heading
    """
    WORM = "WORM"
    """
    Follow vessel track path backwards
    """
    MEASURED = "MEASURED"
    """
    Use actual measured array positions
    """


class LineStyleEnum(str, Enum):
    """
    Visual style for bearing lines
    """
    SOLID = "SOLID"
    """
    Continuous line
    """
    DASHED = "DASHED"
    """
    Evenly spaced dashes
    """
    DOT = "DOT"
    """
    Evenly spaced dots
    """
    DASH_DOT = "DASH_DOT"
    """
    Alternating dash and dot
    """


class LabelLocationEnum(str, Enum):
    """
    Horizontal alignment of contact labels
    """
    LEFT = "LEFT"
    """
    Left-aligned text
    """
    CENTER = "CENTER"
    """
    Center-aligned text
    """
    RIGHT = "RIGHT"
    """
    Right-aligned text
    """


class LineLabelPositionEnum(str, Enum):
    """
    Position along the bearing line where the label is placed
    """
    START = "START"
    """
    At the origin (sensor location)
    """
    MIDDLE = "MIDDLE"
    """
    At the midpoint of the bearing line
    """
    END = "END"
    """
    At the far end of the bearing line
    """


class ActivityType(str, Enum):
    """
    Semantic discriminator for provenance records. Consumers use this field to choose rendering or handling behaviour independently of visual tool-category grouping. Introduced by feature 208 so future entry types (manual checkpoint, standalone tune, manual rationale) can be distinguished without overloading tool-category.
    """
    snapshot = "snapshot"
    """
    Manual checkpoint entry.
    """
    tool = "tool"
    """
    Regular tool invocation. Default for records without an explicit activity_type.
    """
    tune = "tune"
    """
    Reserved for future standalone tune-action entries.
    """


class OutputKindEnum(str, Enum):
    """
    Canonical output kind identifiers for tool result features. Set on feature.properties.kind by the executor after tool execution. Values use slash-delimited hierarchical paths matching domain/subtype. Both Python and TypeScript executors MUST use these values — no hand-authored kind strings in tool implementations.
    """
    trackSOLIDUSstatistics = "track/statistics"
    """
    Track statistics summary (point count, distance, speed, duration)
    """
    datasetSOLIDUSrange_bearing_series = "dataset/range_bearing_series"
    """
    Range-bearing time-series dataset between two features
    """
    regionSOLIDUSstatistics = "region/statistics"
    """
    Region/area statistics summary (extent, area, dimensions)
    """


class ResultCategoryEnum(str, Enum):
    """
    Top-level result type categories per TOOL-RESULTS.md. Used as prefix for debrief:resultType annotations.
    """
    mutation = "mutation"
    """
    Modifies existing feature(s) in the FeatureCollection
    """
    addition = "addition"
    """
    Creates new GeoJSON feature(s)
    """
    deletion = "deletion"
    """
    Removes feature(s) from the FeatureCollection
    """
    artifact = "artifact"
    """
    Creates non-GeoJSON output (image, report, dataset)
    """


class ParameterTypeEnum(str, Enum):
    """
    Names of available schema-defined parameter types. Referenced by ToolParameter.param_type to link tool parameters to their value enums defined in common.yaml.
    """
    NamedColor = "NamedColor"
    """
    Predefined named colours (maps to NamedColorEnum)
    """
    MarkerSymbol = "MarkerSymbol"
    """
    Marker shapes (maps to MarkerSymbolEnum)
    """
    CardinalDirection = "CardinalDirection"
    """
    Eight-point compass directions (maps to CardinalDirectionEnum)
    """
    DurationPreset = "DurationPreset"
    """
    Common ISO 8601 duration intervals (maps to DurationPresetEnum)
    """
    NumericPreset = "NumericPreset"
    """
    Common numeric values (maps to NumericPresetEnum)
    """
    ReferencePointPattern = "ReferencePointPattern"
    """
    Reference point generation patterns (maps to ReferencePointPatternEnum)
    """


class ToolCategoryEnum(str, Enum):
    """
    Visual category for Log Panel icon rendering. Declared by the tool at registration; consumed by frontends to colour tool-icon glyphs. See docs/log-panel-ux-srd.md §5.
This enum defines only the declarable values. The neutral-grey "unknown" state shown by the Log Panel when a tool has no declared category is NOT a value of this enum — it is a rendering-layer fallback produced when the attribute is null or absent.
    """
    import_ = "import"
    """
    File / data ingestion tools (e.g., REP loader, DPF parser, CSV import)
    """
    style = "style"
    """
    Appearance-changing tools (e.g., set-track-color, symbol style, label interval)
    """
    calc = "calc"
    """
    Analytical computation tools (e.g., range-bearing, course/speed, statistics)
    """
    filter = "filter"
    """
    Tools that narrow the dataset (time filter, spatial filter, trim)
    """
    snapshot = "snapshot"
    """
    Tools that export or capture state (export-png, export-csv, export-geojson)
    """


class FileProvEventTypeEnum(str, Enum):
    """
    Type of file-level provenance event.
    """
    snapshot = "snapshot"
    """
    Snapshot creation event
    """
    branch = "branch"
    """
    Branch creation event
    """


class FileProvDirectionEnum(str, Enum):
    """
    Direction of a branch event.
    """
    source = "source"
    """
    This file is the source of the branch
    """
    target = "target"
    """
    This file is the target of the branch
    """


class StacTypeEnum(str, Enum):
    """
    Discriminator for STAC top-level objects. STAC mandates exactly these three values for `type`:
  - "Feature"     → StacItem
  - "Catalog"     → StacCatalog
  - "Collection"  → StacCollection
Used with the `equals_string` constraint on each class's `type` slot so the generated TypeScript carries a literal-string discriminator (Research R-001).
    """
    Feature = "Feature"
    Catalog = "Catalog"
    Collection = "Collection"


class PlaybackStateEnum(str, Enum):
    """
    Current state of time playback. Component consumers treat `stopped` as equivalent to `paused`. See ADR-022 in docs/project_notes/decisions.md.
    """
    stopped = "stopped"
    """
    Playback is stopped
    """
    playing = "playing"
    """
    Playback is running
    """
    paused = "paused"
    """
    Playback is paused
    """


class DisplayModeEnum(str, Enum):
    """
    Track visualization display mode. `full` renders the entire track regardless of current time; `trail` renders a snail-trail from track start up to current time. Mirrors session-state.yaml — see comment above.
    """
    full = "full"
    """
    Render the entire track regardless of current time
    """
    trail = "trail"
    """
    Render a snail-trail from track start up to current time
    """


class TimeUnitEnum(str, Enum):
    """
    Units for time step navigation
    """
    millisecond = "millisecond"
    """
    Milliseconds
    """
    second = "second"
    """
    Seconds
    """
    minute = "minute"
    """
    Minutes
    """
    hour = "hour"
    """
    Hours
    """
    day = "day"
    """
    Days
    """


class AddressingMode(str, Enum):
    """
    How addresses in a selection path level are interpreted (Feature 053)
    """
    id = "id"
    """
    Address is a string identifier
    """
    index = "index"
    """
    Address is a numeric position index
    """


class ResultTopType(str, Enum):
    """
    Top-level result type categories
    """
    mutation = "mutation"
    """
    Modification of existing features (e.g., track smoothing)
    """
    addition = "addition"
    """
    Creation of new features (e.g., analysis results)
    """
    deletion = "deletion"
    """
    Removal of features (e.g., outlier deletion)
    """
    artifact = "artifact"
    """
    Non-GeoJSON outputs (e.g., plots, reports)
    """


class ErrorCategory(str, Enum):
    """
    Categories of tool execution errors
    """
    invalid_input = "invalid_input"
    """
    User-provided input failed validation
    """
    algorithm_failure = "algorithm_failure"
    """
    Algorithm encountered unrecoverable error
    """
    resource_not_found = "resource_not_found"
    """
    Required feature or data not found
    """


class PolygonSourceEnum(str, Enum):
    """
    Provenance of a Scene's stored polygon geometry. Render-side consumers use this to decide whether to trust the on-disk polygon ('bounds') or recompute it from (viewport, map dimensions) when the stored polygon pre-dates Spec #258 ('placeholder') or was hand-drawn ('manual').
    """
    bounds = "bounds"
    """
    Polygon was computed from real Leaflet map bounds at capture time (post-#258 norm). Renderers trust the on-disk geometry.
    """
    placeholder = "placeholder"
    """
    Pre-#258 ~100m placeholder square or otherwise non-bounds-derived. Renderers recompute from (viewport, map dimensions); the on-disk value is preserved (Article III.2 source preservation).
    """
    manual = "manual"
    """
    Reserved for future user-drawn rectangles. Renderers recompute (current behaviour) until manual editing of scene geometry ships.
    """


class SessionMCPToolName(str, Enum):
    """
    Authoritative list of session-state MCP tool names. Must mirror the `TOOLS` const at services/session-state/src/server/mcp.ts. Research R-001: replaces the TS-only `type ToolName = keyof typeof TOOLS` projection with a cross-language permissible-values enum.
    """
    sessionFULL_STOPgetState = "session.getState"
    sessionFULL_STOPgetTemporalState = "session.getTemporalState"
    sessionFULL_STOPgetSpatialState = "session.getSpatialState"
    sessionFULL_STOPgetFeaturesState = "session.getFeaturesState"
    sessionFULL_STOPgetDocumentState = "session.getDocumentState"
    sessionFULL_STOPsetCurrentTime = "session.setCurrentTime"
    sessionFULL_STOPsetViewport = "session.setViewport"
    sessionFULL_STOPsetSelection = "session.setSelection"
    sessionFULL_STOPsetHiddenFeatures = "session.setHiddenFeatures"
    sessionFULL_STOPsetPlaybackRate = "session.setPlaybackRate"
    sessionFULL_STOPsetRotation = "session.setRotation"


class MCPContentItemTypeEnum(str, Enum):
    """
    Discriminator for MCPContentItem variants.
    """
    text = "text"
    resource_link = "resource_link"
    image = "image"
    structured = "structured"


class MCPParamTypeEnum(str, Enum):
    """
    JSON-Schema-compatible primitive types for tool parameters.
    """
    string = "string"
    number = "number"
    integer = "integer"
    boolean = "boolean"
    array = "array"
    object = "object"


class ReplayStatusEnum(str, Enum):
    """
    Outcome of resolving a logged tool invocation at replay time.
    """
    unchanged = "unchanged"
    version_drift = "version_drift"
    tool_removed = "tool_removed"



class BaseFeatureProperties(ConfiguredBaseModel):
    """
    Abstract base for all GeoJSON feature properties classes. Provides shared attributes inherited by every concrete properties type.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'abstract': True, 'from_schema': 'https://debrief.info/schemas/common'})

    kind: FeatureKindEnum = Field(default=..., description="""Feature type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'SystemStateProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'SelectionRequirement',
                       'SystemRecordProperties',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPSelectionRequirement']} })
    tags: Optional[list[str]] = Field(default=[], description="""Free-text labels assigned to this feature by the analyst""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'StacExtensionProperties',
                       'StacItemSummary']} })
    provenance: Optional[list[LogEntry]] = Field(default=[], description="""PROV-aligned provenance records (append-only log of tool operations)""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'SystemStateProperties',
                       'SystemRecordProperties']} })


class TimestampedPosition(ConfiguredBaseModel):
    """
    Temporal and kinematic metadata for a single track position. Coordinates are NOT stored here - they live in geometry.coordinates[i]. Position metadata at index i corresponds to coordinate at index i.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/common'})

    time: datetime  = Field(default=..., description="""Position timestamp (ISO8601)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TimestampedPosition',
                       'MeasuredArrayPosition',
                       'SensorContact',
                       'TUASolution',
                       'NarrativeEntryProperties']} })
    depth: Optional[float] = Field(default=None, description="""Depth in meters (negative = below surface)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TimestampedPosition', 'TUASolution']} })
    course: Optional[float] = Field(default=None, description="""Course in degrees (0-360)""", ge=0, le=360, json_schema_extra = { "linkml_meta": {'domain_of': ['TimestampedPosition', 'SegmentMetadata', 'TUASolution']} })
    speed: Optional[float] = Field(default=None, description="""Speed in knots""", ge=0, json_schema_extra = { "linkml_meta": {'domain_of': ['TimestampedPosition', 'SegmentMetadata', 'TUASolution']} })


class PointProperties(ConfiguredBaseModel):
    """
    Styling schema for Point and MultiPoint geometries. Follows Leaflet CircleMarker options naming conventions.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/styling'})

    shape: PointShapeEnum = Field(default=..., description="""Marker shape""", json_schema_extra = { "linkml_meta": {'domain_of': ['PointProperties']} })
    radius: float = Field(default=..., description="""Marker radius in pixels""", ge=0, json_schema_extra = { "linkml_meta": {'domain_of': ['PointProperties', 'CircleAnnotationProperties']} })
    fill: Optional[bool] = Field(default=None, description="""Whether to fill the shape""", json_schema_extra = { "linkml_meta": {'domain_of': ['PointProperties', 'PolygonProperties']} })
    fill_color: str = Field(default=..., description="""Fill color (CSS color string)""", json_schema_extra = { "linkml_meta": {'domain_of': ['PointProperties', 'PolygonProperties']} })
    fill_opacity: Optional[float] = Field(default=None, description="""Fill transparency (0-1)""", ge=0, le=1, json_schema_extra = { "linkml_meta": {'domain_of': ['PointProperties', 'PolygonProperties']} })
    stroke: Optional[bool] = Field(default=None, description="""Whether to draw outline""", json_schema_extra = { "linkml_meta": {'domain_of': ['PointProperties', 'LineProperties', 'PolygonProperties']} })
    color: str = Field(default=..., description="""Stroke color (CSS color string)""", json_schema_extra = { "linkml_meta": {'domain_of': ['PointProperties',
                       'LineProperties',
                       'PolygonProperties',
                       'SensorContact',
                       'SensorData']} })
    weight: Optional[float] = Field(default=None, description="""Stroke width in pixels""", ge=0, json_schema_extra = { "linkml_meta": {'domain_of': ['PointProperties', 'LineProperties', 'PolygonProperties']} })
    opacity: Optional[float] = Field(default=None, description="""Stroke transparency (0-1)""", ge=0, le=1, json_schema_extra = { "linkml_meta": {'domain_of': ['PointProperties', 'LineProperties', 'PolygonProperties']} })
    legacy_style: Optional[str] = Field(default=None, description="""Legacy symbol name from Debrief symbology (e.g., 'Aircraft', 'torpedo'). Preserved for future icon rendering support.""", json_schema_extra = { "linkml_meta": {'domain_of': ['PointProperties']} })


class LineProperties(ConfiguredBaseModel):
    """
    Styling schema for LineString and MultiLineString geometries. Follows Leaflet Polyline options naming conventions.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/styling'})

    stroke: Optional[bool] = Field(default=None, description="""Whether to draw the line""", json_schema_extra = { "linkml_meta": {'domain_of': ['PointProperties', 'LineProperties', 'PolygonProperties']} })
    color: str = Field(default=..., description="""Line color (CSS color string)""", json_schema_extra = { "linkml_meta": {'domain_of': ['PointProperties',
                       'LineProperties',
                       'PolygonProperties',
                       'SensorContact',
                       'SensorData']} })
    weight: Optional[float] = Field(default=None, description="""Line width in pixels""", ge=0, json_schema_extra = { "linkml_meta": {'domain_of': ['PointProperties', 'LineProperties', 'PolygonProperties']} })
    opacity: Optional[float] = Field(default=None, description="""Line transparency (0-1)""", ge=0, le=1, json_schema_extra = { "linkml_meta": {'domain_of': ['PointProperties', 'LineProperties', 'PolygonProperties']} })
    line_cap: Optional[LineCapEnum] = Field(default=None, description="""Line endpoint style""", json_schema_extra = { "linkml_meta": {'domain_of': ['LineProperties', 'PolygonProperties']} })
    line_join: Optional[LineJoinEnum] = Field(default=None, description="""Line join style""", json_schema_extra = { "linkml_meta": {'domain_of': ['LineProperties', 'PolygonProperties']} })
    dash_array: Optional[str] = Field(default=None, description="""Dash pattern (SVG format, e.g., \"5, 10\")""", json_schema_extra = { "linkml_meta": {'domain_of': ['LineProperties', 'PolygonProperties']} })


class PolygonProperties(ConfiguredBaseModel):
    """
    Styling schema for Polygon and MultiPolygon geometries. Follows Leaflet Polygon options naming conventions.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/styling'})

    fill: Optional[bool] = Field(default=None, description="""Whether to fill the polygon""", json_schema_extra = { "linkml_meta": {'domain_of': ['PointProperties', 'PolygonProperties']} })
    fill_color: str = Field(default=..., description="""Fill color (CSS color string)""", json_schema_extra = { "linkml_meta": {'domain_of': ['PointProperties', 'PolygonProperties']} })
    fill_opacity: Optional[float] = Field(default=None, description="""Fill transparency (0-1)""", ge=0, le=1, json_schema_extra = { "linkml_meta": {'domain_of': ['PointProperties', 'PolygonProperties']} })
    stroke: Optional[bool] = Field(default=None, description="""Whether to draw border""", json_schema_extra = { "linkml_meta": {'domain_of': ['PointProperties', 'LineProperties', 'PolygonProperties']} })
    color: str = Field(default=..., description="""Border color (CSS color string)""", json_schema_extra = { "linkml_meta": {'domain_of': ['PointProperties',
                       'LineProperties',
                       'PolygonProperties',
                       'SensorContact',
                       'SensorData']} })
    weight: Optional[float] = Field(default=None, description="""Border width in pixels""", ge=0, json_schema_extra = { "linkml_meta": {'domain_of': ['PointProperties', 'LineProperties', 'PolygonProperties']} })
    opacity: Optional[float] = Field(default=None, description="""Border transparency (0-1)""", ge=0, le=1, json_schema_extra = { "linkml_meta": {'domain_of': ['PointProperties', 'LineProperties', 'PolygonProperties']} })
    line_cap: Optional[LineCapEnum] = Field(default=None, description="""Border endpoint style""", json_schema_extra = { "linkml_meta": {'domain_of': ['LineProperties', 'PolygonProperties']} })
    line_join: Optional[LineJoinEnum] = Field(default=None, description="""Border join style""", json_schema_extra = { "linkml_meta": {'domain_of': ['LineProperties', 'PolygonProperties']} })
    dash_array: Optional[str] = Field(default=None, description="""Border dash pattern (SVG format, e.g., \"5, 10\")""", json_schema_extra = { "linkml_meta": {'domain_of': ['LineProperties', 'PolygonProperties']} })


class TrackStyle(ConfiguredBaseModel):
    """
    Composite styling for TrackFeature, supporting both line path and position markers.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/styling'})

    line: LineProperties = Field(default=..., description="""Styling for the track line path""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackStyle']} })
    point: PointProperties = Field(default=..., description="""Styling for position markers""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackStyle']} })


class PositionStyle(ConfiguredBaseModel):
    """
    Default styling configuration for track positions. Applied as baseline before interval rules and overrides.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/styling'})

    show_symbol: bool = Field(default=..., description="""Whether to display a symbol at positions""", json_schema_extra = { "linkml_meta": {'domain_of': ['PositionStyle', 'PositionStyleOverride']} })
    symbol: PointShapeEnum = Field(default=..., description="""Shape to use for position symbols""", json_schema_extra = { "linkml_meta": {'domain_of': ['PositionStyle',
                       'PositionStyleOverride',
                       'ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties']} })
    show_label: bool = Field(default=..., description="""Whether to display labels at positions""", json_schema_extra = { "linkml_meta": {'domain_of': ['PositionStyle', 'PositionStyleOverride', 'SensorContact']} })


class PositionStyleOverride(ConfiguredBaseModel):
    """
    Per-position style override. Index in array determines which position. No time field - array index i applies to positions[i]. Use null for positions without custom styling.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/styling'})

    show_symbol: Optional[bool] = Field(default=None, description="""Override whether to show symbol (null = use default/interval)""", json_schema_extra = { "linkml_meta": {'domain_of': ['PositionStyle', 'PositionStyleOverride']} })
    symbol: Optional[PointShapeEnum] = Field(default=None, description="""Override symbol shape""", json_schema_extra = { "linkml_meta": {'domain_of': ['PositionStyle',
                       'PositionStyleOverride',
                       'ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties']} })
    show_label: Optional[bool] = Field(default=None, description="""Override whether to show label""", json_schema_extra = { "linkml_meta": {'domain_of': ['PositionStyle', 'PositionStyleOverride', 'SensorContact']} })
    label: Optional[str] = Field(default=None, description="""Custom label text (null = use timestamp)""", json_schema_extra = { "linkml_meta": {'domain_of': ['PositionStyleOverride',
                       'SensorContact',
                       'TUASolution',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'ToolResultAnnotations',
                       'DatasetAxisMetadata']} })


class GeoJSONPoint(ConfiguredBaseModel):
    """
    GeoJSON Point geometry
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    type: Literal["Point"] = Field(default=..., description="""Geometry type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage'],
         'equals_string': 'Point'} })
    coordinates: list[float] = Field(default=..., description="""[longitude, latitude] in degrees""", min_length=2, max_length=2, json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'ViewportPolygon']} })


class GeoJSONEmptyPoint(ConfiguredBaseModel):
    """
    GeoJSON Point geometry with empty coordinates (for non-spatial features)
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    type: Literal["Point"] = Field(default=..., description="""Geometry type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage'],
         'equals_string': 'Point'} })
    coordinates: list[float] = Field(default=..., description="""Empty array for non-spatial features""", max_length=0, json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'ViewportPolygon']} })


class GeoJSONLineString(ConfiguredBaseModel):
    """
    GeoJSON LineString geometry
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    type: Literal["LineString"] = Field(default=..., description="""Geometry type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage'],
         'equals_string': 'LineString'} })
    coordinates: list[list[float]] = Field(default=..., description="""Array of [longitude, latitude] pairs""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'ViewportPolygon']} })


class GeoJSONPolygon(ConfiguredBaseModel):
    """
    GeoJSON Polygon geometry
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    type: Literal["Polygon"] = Field(default=..., description="""Geometry type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage'],
         'equals_string': 'Polygon'} })
    coordinates: list[list[list[float]]] = Field(default=..., description="""Array of linear rings (arrays of [lon, lat] pairs)""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'ViewportPolygon']} })


class GeoJSONMultiPoint(ConfiguredBaseModel):
    """
    GeoJSON MultiPoint geometry for reference point sets
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    type: Literal["MultiPoint"] = Field(default=..., description="""Geometry type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage'],
         'equals_string': 'MultiPoint'} })
    coordinates: list[list[float]] = Field(default=..., description="""Array of [longitude, latitude] pairs""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'ViewportPolygon']} })


class GeoJSONMultiLineString(ConfiguredBaseModel):
    """
    GeoJSON MultiLineString geometry for compound tracks
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    type: Literal["MultiLineString"] = Field(default=..., description="""Geometry type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage'],
         'equals_string': 'MultiLineString'} })
    coordinates: list[list[list[float]]] = Field(default=..., description="""Array of LineString coordinate arrays""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'ViewportPolygon']} })


class GeoJSONMultiPolygon(ConfiguredBaseModel):
    """
    GeoJSON MultiPolygon geometry for multi-polygon tool results
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    type: Literal["MultiPolygon"] = Field(default=..., description="""Geometry type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage'],
         'equals_string': 'MultiPolygon'} })
    coordinates: list[list[list[list[float]]]] = Field(default=..., description="""Array of polygon coordinate arrays (each an array of linear rings)""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'ViewportPolygon']} })


class SegmentMetadata(ConfiguredBaseModel):
    """
    Per-segment metadata for compound tracks. Each segment corresponds to one LineString within a MultiLineString geometry. segments[i] describes geometry.coordinates[i].
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    segment_type: SegmentTypeEnum = Field(default=..., description="""Segment type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata', 'SelectionRequirement']} })
    start_time: datetime  = Field(default=..., description="""Segment start timestamp (ISO8601)""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata', 'TrackProperties', 'SystemStateProperties']} })
    end_time: datetime  = Field(default=..., description="""Segment end timestamp (ISO8601)""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata', 'TrackProperties', 'SystemStateProperties']} })
    positions: list[TimestampedPosition] = Field(default=..., description="""Per-position metadata (parallel to coordinates)""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata', 'TrackProperties']} })
    name: Optional[str] = Field(default=None, description="""Human-readable segment name""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata',
                       'SensorData',
                       'TUAData',
                       'PointMetadataEntry',
                       'ReferenceLocationProperties',
                       'Tool',
                       'ToolParameter',
                       'PlatformRecord',
                       'StacProvider',
                       'LevelDefinition',
                       'DatasetSeries',
                       'StoryboardProperties',
                       'MCPToolDefinition',
                       'ToolDefinition']} })
    style: Optional[LineProperties] = Field(default=None, description="""Per-segment line styling override""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties']} })
    course: Optional[float] = Field(default=None, description="""Estimated course in degrees (TMA segments)""", ge=0, le=360, json_schema_extra = { "linkml_meta": {'domain_of': ['TimestampedPosition', 'SegmentMetadata', 'TUASolution']} })
    speed: Optional[float] = Field(default=None, description="""Estimated speed in knots (TMA segments)""", ge=0, json_schema_extra = { "linkml_meta": {'domain_of': ['TimestampedPosition', 'SegmentMetadata', 'TUASolution']} })
    base_frequency: Optional[float] = Field(default=None, description="""Base frequency in Hz (TMA segments)""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata', 'SensorData']} })
    host_track_id: Optional[str] = Field(default=None, description="""ID of track this solution is relative to (RELATIVE_TMA)""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata']} })
    host_sensor_name: Optional[str] = Field(default=None, description="""Towed array sensor name (RELATIVE_TMA)""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata']} })
    offset_bearing: Optional[float] = Field(default=None, description="""Bearing offset in degrees (RELATIVE_TMA)""", ge=0, le=360, json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata']} })
    offset_range: Optional[float] = Field(default=None, description="""Range offset in metres (RELATIVE_TMA)""", ge=0, json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata']} })
    before_leg: Optional[str] = Field(default=None, description="""Name of preceding TMA leg (DYNAMIC_INFILL)""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata']} })
    after_leg: Optional[str] = Field(default=None, description="""Name of following TMA leg (DYNAMIC_INFILL)""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata']} })


class MeasuredArrayPosition(ConfiguredBaseModel):
    """
    Timestamped geographic position of a towed array centre. Used by MEASURED array centre mode for bearing line origin interpolation.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    time: datetime  = Field(default=..., description="""Position timestamp (ISO8601)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TimestampedPosition',
                       'MeasuredArrayPosition',
                       'SensorContact',
                       'TUASolution',
                       'NarrativeEntryProperties']} })
    location: list[float] = Field(default=..., description="""Array centre position [longitude, latitude] (GeoJSON coordinate order)""", min_length=2, max_length=2, json_schema_extra = { "linkml_meta": {'domain_of': ['MeasuredArrayPosition']} })


class SensorContact(ConfiguredBaseModel):
    """
    Single sensor measurement record. Represents one bearing/range observation at a point in time.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    time: datetime  = Field(default=..., description="""Contact measurement timestamp (ISO8601)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TimestampedPosition',
                       'MeasuredArrayPosition',
                       'SensorContact',
                       'TUASolution',
                       'NarrativeEntryProperties']} })
    bearing: float = Field(default=..., description="""Bearing to contact in degrees (0-360)""", ge=0, le=360, json_schema_extra = { "linkml_meta": {'domain_of': ['SensorContact',
                       'TUASolution',
                       'VectorAnnotationProperties',
                       'Viewport']} })
    has_bearing: Optional[bool] = Field(default=None, description="""Controls bearing line display (true=show, false=hide). Data stored regardless.""", json_schema_extra = { "linkml_meta": {'domain_of': ['SensorContact']} })
    ambiguous_bearing: Optional[float] = Field(default=None, description="""Ambiguous bearing (second solution) in degrees""", ge=0, le=360, json_schema_extra = { "linkml_meta": {'domain_of': ['SensorContact']} })
    has_ambiguous: Optional[bool] = Field(default=None, description="""Controls ambiguous bearing display""", json_schema_extra = { "linkml_meta": {'domain_of': ['SensorContact']} })
    range: Optional[float] = Field(default=None, description="""Range to contact in metres""", ge=0, json_schema_extra = { "linkml_meta": {'domain_of': ['SensorContact', 'TUASolution', 'VectorAnnotationProperties']} })
    frequency: Optional[float] = Field(default=None, description="""Measured frequency in Hz""", json_schema_extra = { "linkml_meta": {'domain_of': ['SensorContact']} })
    has_frequency: Optional[bool] = Field(default=None, description="""Controls frequency data display""", json_schema_extra = { "linkml_meta": {'domain_of': ['SensorContact']} })
    label: Optional[str] = Field(default=None, description="""Display label""", json_schema_extra = { "linkml_meta": {'domain_of': ['PositionStyleOverride',
                       'SensorContact',
                       'TUASolution',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'ToolResultAnnotations',
                       'DatasetAxisMetadata']} })
    comment: Optional[str] = Field(default=None, description="""Operator note""", json_schema_extra = { "linkml_meta": {'domain_of': ['SensorContact']} })
    color: Optional[str] = Field(default=None, description="""Contact color override (null = inherit from parent SensorData)""", json_schema_extra = { "linkml_meta": {'domain_of': ['PointProperties',
                       'LineProperties',
                       'PolygonProperties',
                       'SensorContact',
                       'SensorData']} })
    visible: Optional[bool] = Field(default=None, description="""Contact visibility""", json_schema_extra = { "linkml_meta": {'domain_of': ['SensorContact', 'SensorData']} })
    show_label: Optional[bool] = Field(default=None, description="""Label visibility""", json_schema_extra = { "linkml_meta": {'domain_of': ['PositionStyle', 'PositionStyleOverride', 'SensorContact']} })
    line_style: Optional[LineStyleEnum] = Field(default=None, description="""Bearing line visual style""", json_schema_extra = { "linkml_meta": {'domain_of': ['SensorContact']} })
    label_location: Optional[LabelLocationEnum] = Field(default=None, description="""Label horizontal alignment""", json_schema_extra = { "linkml_meta": {'domain_of': ['SensorContact']} })
    put_label_at: Optional[LineLabelPositionEnum] = Field(default=None, description="""Label position along bearing line""", json_schema_extra = { "linkml_meta": {'domain_of': ['SensorContact']} })
    origin: Optional[list[float]] = Field(default=None, description="""Explicit sensor location override [longitude, latitude]""", min_length=2, max_length=2, json_schema_extra = { "linkml_meta": {'domain_of': ['SensorContact', 'VectorAnnotationProperties']} })


class SensorData(ConfiguredBaseModel):
    """
    Named sensor with contact measurements. Embedded in TrackProperties to associate sensor data with the host track.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    name: str = Field(default=..., description="""Sensor identifier (e.g., \"TOWED_ARRAY\")""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata',
                       'SensorData',
                       'TUAData',
                       'PointMetadataEntry',
                       'ReferenceLocationProperties',
                       'Tool',
                       'ToolParameter',
                       'PlatformRecord',
                       'StacProvider',
                       'LevelDefinition',
                       'DatasetSeries',
                       'StoryboardProperties',
                       'MCPToolDefinition',
                       'ToolDefinition']} })
    base_frequency: Optional[float] = Field(default=None, description="""Reference frequency in Hz""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata', 'SensorData']} })
    offset: Optional[float] = Field(default=None, description="""Sensor offset from host platform in metres""", json_schema_extra = { "linkml_meta": {'domain_of': ['SensorData']} })
    array_centre_mode: Optional[ArrayCentreModeEnum] = Field(default=None, description="""How bearing line origin is calculated relative to host platform""", json_schema_extra = { "linkml_meta": {'domain_of': ['SensorData']} })
    worm_in_hole: Optional[bool] = Field(default=None, description="""Display mode flag""", json_schema_extra = { "linkml_meta": {'domain_of': ['SensorData']} })
    color: Optional[str] = Field(default=None, description="""Default color for all contacts in this sensor""", json_schema_extra = { "linkml_meta": {'domain_of': ['PointProperties',
                       'LineProperties',
                       'PolygonProperties',
                       'SensorContact',
                       'SensorData']} })
    visible: Optional[bool] = Field(default=None, description="""Sensor visibility""", json_schema_extra = { "linkml_meta": {'domain_of': ['SensorContact', 'SensorData']} })
    line_thickness: Optional[int] = Field(default=None, description="""Bearing line width in pixels""", json_schema_extra = { "linkml_meta": {'domain_of': ['SensorData']} })
    contacts: list[SensorContact] = Field(default=..., description="""Array of sensor measurements""", json_schema_extra = { "linkml_meta": {'domain_of': ['SensorData']} })
    measured_positions: Optional[list[MeasuredArrayPosition]] = Field(default=[], description="""Actual towed array positions for MEASURED array centre mode""", json_schema_extra = { "linkml_meta": {'domain_of': ['SensorData']} })


class TUASolution(ConfiguredBaseModel):
    """
    Single Target Uncertainty Area estimate. Has either absolute positioning (centre_lat/centre_lon) or relative positioning (bearing/range), plus optional ellipse and kinematics.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    time: datetime  = Field(default=..., description="""Solution timestamp (ISO8601)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TimestampedPosition',
                       'MeasuredArrayPosition',
                       'SensorContact',
                       'TUASolution',
                       'NarrativeEntryProperties']} })
    label: str = Field(default=..., description="""Solution label""", json_schema_extra = { "linkml_meta": {'domain_of': ['PositionStyleOverride',
                       'SensorContact',
                       'TUASolution',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'ToolResultAnnotations',
                       'DatasetAxisMetadata']} })
    centre_lat: Optional[float] = Field(default=None, description="""Absolute latitude (mutual exclusive with bearing/range)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TUASolution']} })
    centre_lon: Optional[float] = Field(default=None, description="""Absolute longitude (mutual exclusive with bearing/range)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TUASolution']} })
    bearing: Optional[float] = Field(default=None, description="""Relative bearing from host track in degrees""", ge=0, le=360, json_schema_extra = { "linkml_meta": {'domain_of': ['SensorContact',
                       'TUASolution',
                       'VectorAnnotationProperties',
                       'Viewport']} })
    range: Optional[float] = Field(default=None, description="""Relative range from host track in metres""", ge=0, json_schema_extra = { "linkml_meta": {'domain_of': ['SensorContact', 'TUASolution', 'VectorAnnotationProperties']} })
    orientation: Optional[float] = Field(default=None, description="""Ellipse orientation from north in degrees""", ge=0, le=360, json_schema_extra = { "linkml_meta": {'domain_of': ['TUASolution']} })
    maxima: Optional[float] = Field(default=None, description="""Semi-major axis in metres""", ge=0, json_schema_extra = { "linkml_meta": {'domain_of': ['TUASolution']} })
    minima: Optional[float] = Field(default=None, description="""Semi-minor axis in metres""", ge=0, json_schema_extra = { "linkml_meta": {'domain_of': ['TUASolution']} })
    course: Optional[float] = Field(default=None, description="""Estimated course in degrees""", ge=0, le=360, json_schema_extra = { "linkml_meta": {'domain_of': ['TimestampedPosition', 'SegmentMetadata', 'TUASolution']} })
    speed: Optional[float] = Field(default=None, description="""Estimated speed in knots""", ge=0, json_schema_extra = { "linkml_meta": {'domain_of': ['TimestampedPosition', 'SegmentMetadata', 'TUASolution']} })
    depth: Optional[float] = Field(default=None, description="""Estimated depth in metres""", json_schema_extra = { "linkml_meta": {'domain_of': ['TimestampedPosition', 'TUASolution']} })


class TUAData(ConfiguredBaseModel):
    """
    Named TUA solution collection. Embedded in TrackProperties to associate TUA data with the host track.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    name: str = Field(default=..., description="""TUA collection name""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata',
                       'SensorData',
                       'TUAData',
                       'PointMetadataEntry',
                       'ReferenceLocationProperties',
                       'Tool',
                       'ToolParameter',
                       'PlatformRecord',
                       'StacProvider',
                       'LevelDefinition',
                       'DatasetSeries',
                       'StoryboardProperties',
                       'MCPToolDefinition',
                       'ToolDefinition']} })
    host_track_name: str = Field(default=..., description="""Name of track this TUA set relates to""", json_schema_extra = { "linkml_meta": {'domain_of': ['TUAData']} })
    solutions: list[TUASolution] = Field(default=..., description="""Array of TUA estimates""", json_schema_extra = { "linkml_meta": {'domain_of': ['TUAData']} })


class TrackProperties(BaseFeatureProperties):
    """
    Properties for a TrackFeature
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    kind: Literal["TRACK"] = Field(default=..., description="""Feature type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'SystemStateProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'SelectionRequirement',
                       'SystemRecordProperties',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPSelectionRequirement'],
         'equals_string': 'TRACK'} })
    platform_id: str = Field(default=..., description="""Platform/vessel identifier""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties']} })
    platform_name: Optional[str] = Field(default=None, description="""Human-readable platform name""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties']} })
    track_type: TrackTypeEnum = Field(default=..., description="""Type of track""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties']} })
    start_time: datetime  = Field(default=..., description="""Track start time (ISO8601)""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata', 'TrackProperties', 'SystemStateProperties']} })
    end_time: datetime  = Field(default=..., description="""Track end time (ISO8601)""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata', 'TrackProperties', 'SystemStateProperties']} })
    positions: list[TimestampedPosition] = Field(default=..., description="""Array of timestamped positions""", min_length=2, json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata', 'TrackProperties']} })
    style: TrackStyle = Field(default=..., description="""Composite styling for track line and position markers""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties']} })
    default_position_style: PositionStyle = Field(default=..., description="""Default styling applied to all positions""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties']} })
    symbol_interval: Optional[str] = Field(default=None, description="""ISO 8601 duration for interval-based symbol display. E.g., \"PT5M\" = every 5 minutes, \"PT1H\" = every hour. Null means no interval-based symbols.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties']} })
    label_interval: Optional[str] = Field(default=None, description="""ISO 8601 duration for interval-based label display. Null means no interval-based labels.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties']} })
    position_style_overrides: Optional[list[Optional[PositionStyleOverride]]] = Field(default=[], description="""Parallel array of per-position style overrides. Same length as positions array. Use null entries for positions without custom styling.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties']} })
    segments: Optional[list[SegmentMetadata]] = Field(default=[], description="""Per-segment metadata for compound tracks. When present, geometry MUST be MultiLineString and segments[i] describes coordinates[i]. When absent, geometry is LineString and the flat positions array is used.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties']} })
    sensors: Optional[list[SensorData]] = Field(default=[], description="""Embedded sensor data associated with this track. Each sensor contains named metadata and an array of contact measurements.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties']} })
    tuas: Optional[list[TUAData]] = Field(default=[], description="""Embedded Target Uncertainty Area data associated with this track. Each TUA entry is a named collection of time-indexed solutions.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties']} })
    display_name: Optional[str] = Field(default=None, description="""Human-readable platform display name override. When set, overrides the registry-derived name for this track.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties']} })
    nationality: Optional[str] = Field(default=None, description="""ISO 3166-1 alpha-2 country code override (e.g., GB, US). When set, overrides the registry-derived nationality.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties', 'PlatformRecord']} })
    vessel_class: Optional[str] = Field(default=None, description="""Full vessel classification path override using slash-separated notation (e.g., surface/warship/frigate/type23). When set, overrides registry-derived path.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties', 'PlatformRecord']} })
    vessel_type: Optional[str] = Field(default=None, description="""Vessel type override (leaf of classification path, e.g., type23). When set, overrides the registry-derived type.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties', 'PlatformRecord']} })
    vessel_role: Optional[str] = Field(default=None, description="""Vessel role override (parent of leaf in classification path, e.g., frigate). When set, overrides the registry-derived role.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties', 'PlatformRecord']} })
    domain: Optional[VesselDomainEnum] = Field(default=None, description="""Vessel domain override. When set, overrides the registry-derived domain.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties', 'PlatformRecord']} })
    tags: Optional[list[str]] = Field(default=[], description="""Free-text labels assigned to this feature by the analyst""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'StacExtensionProperties',
                       'StacItemSummary']} })
    provenance: Optional[list[LogEntry]] = Field(default=[], description="""PROV-aligned provenance records (append-only log of tool operations)""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'SystemStateProperties',
                       'SystemRecordProperties']} })

    @field_validator('symbol_interval')
    def pattern_symbol_interval(cls, v):
        pattern=re.compile(r"^P(T[0-9]+[HMS])+$|^P[0-9]+D(T[0-9]+[HMS]+)?$")
        if isinstance(v, list):
            for element in v:
                if isinstance(element, str) and not pattern.match(element):
                    err_msg = f"Invalid symbol_interval format: {element}"
                    raise ValueError(err_msg)
        elif isinstance(v, str) and not pattern.match(v):
            err_msg = f"Invalid symbol_interval format: {v}"
            raise ValueError(err_msg)
        return v

    @field_validator('label_interval')
    def pattern_label_interval(cls, v):
        pattern=re.compile(r"^P(T[0-9]+[HMS])+$|^P[0-9]+D(T[0-9]+[HMS]+)?$")
        if isinstance(v, list):
            for element in v:
                if isinstance(element, str) and not pattern.match(element):
                    err_msg = f"Invalid label_interval format: {element}"
                    raise ValueError(err_msg)
        elif isinstance(v, str) and not pattern.match(v):
            err_msg = f"Invalid label_interval format: {v}"
            raise ValueError(err_msg)
        return v

    @field_validator('nationality')
    def pattern_nationality(cls, v):
        pattern=re.compile(r"^[A-Z]{2}$")
        if isinstance(v, list):
            for element in v:
                if isinstance(element, str) and not pattern.match(element):
                    err_msg = f"Invalid nationality format: {element}"
                    raise ValueError(err_msg)
        elif isinstance(v, str) and not pattern.match(v):
            err_msg = f"Invalid nationality format: {v}"
            raise ValueError(err_msg)
        return v

    @field_validator('vessel_class')
    def pattern_vessel_class(cls, v):
        pattern=re.compile(r"^[a-z0-9-]+(/[a-z0-9-]+){0,3}$")
        if isinstance(v, list):
            for element in v:
                if isinstance(element, str) and not pattern.match(element):
                    err_msg = f"Invalid vessel_class format: {element}"
                    raise ValueError(err_msg)
        elif isinstance(v, str) and not pattern.match(v):
            err_msg = f"Invalid vessel_class format: {v}"
            raise ValueError(err_msg)
        return v

    @field_validator('vessel_type')
    def pattern_vessel_type(cls, v):
        pattern=re.compile(r"^[a-z0-9-]+$")
        if isinstance(v, list):
            for element in v:
                if isinstance(element, str) and not pattern.match(element):
                    err_msg = f"Invalid vessel_type format: {element}"
                    raise ValueError(err_msg)
        elif isinstance(v, str) and not pattern.match(v):
            err_msg = f"Invalid vessel_type format: {v}"
            raise ValueError(err_msg)
        return v

    @field_validator('vessel_role')
    def pattern_vessel_role(cls, v):
        pattern=re.compile(r"^[a-z0-9-]+$")
        if isinstance(v, list):
            for element in v:
                if isinstance(element, str) and not pattern.match(element):
                    err_msg = f"Invalid vessel_role format: {element}"
                    raise ValueError(err_msg)
        elif isinstance(v, str) and not pattern.match(v):
            err_msg = f"Invalid vessel_role format: {v}"
            raise ValueError(err_msg)
        return v


class TrackFeature(ConfiguredBaseModel):
    """
    GeoJSON Feature representing a vessel track
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    type: Literal["Feature"] = Field(default=..., description="""GeoJSON type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage'],
         'equals_string': 'Feature'} })
    id: str = Field(default=..., description="""Unique identifier (UUID recommended)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'Tool',
                       'PlatformRecord',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacCatalog',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'StoryboardProperties',
                       'SceneProperties',
                       'StoryboardFeature',
                       'SceneFeature',
                       'ToolDefinition']} })
    geometry: Union[GeoJSONLineString, GeoJSONMultiLineString] = Field(default=..., description="""Track path as LineString (simple) or MultiLineString (compound)""", json_schema_extra = { "linkml_meta": {'any_of': [{'range': 'GeoJSONLineString'},
                    {'range': 'GeoJSONMultiLineString'}],
         'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })
    properties: TrackProperties = Field(default=..., description="""Track metadata""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })
    bbox: Optional[list[float]] = Field(default=None, description="""Bounding box [minLon, minLat, maxLon, maxLat]""", min_length=4, max_length=4, json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'SystemStateProperties',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacSpatialExtent',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection']} })


class PointMetadataEntry(ConfiguredBaseModel):
    """
    Metadata for a single point within a MultiPoint reference set. Entries are parallel to the MultiPoint coordinates array. Downstream tools (#081 classifier) extend entries with zone/color fields.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    index: int = Field(default=..., description="""0-based ordinal matching coordinates array position""", json_schema_extra = { "linkml_meta": {'domain_of': ['PointMetadataEntry']} })
    name: str = Field(default=..., description="""Human-readable point label (e.g., \"Ref 1\")""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata',
                       'SensorData',
                       'TUAData',
                       'PointMetadataEntry',
                       'ReferenceLocationProperties',
                       'Tool',
                       'ToolParameter',
                       'PlatformRecord',
                       'StacProvider',
                       'LevelDefinition',
                       'DatasetSeries',
                       'StoryboardProperties',
                       'MCPToolDefinition',
                       'ToolDefinition']} })


class ReferenceLocationProperties(BaseFeatureProperties):
    """
    Properties for a ReferenceLocation
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    kind: Literal["POINT"] = Field(default=..., description="""Feature type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'SystemStateProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'SelectionRequirement',
                       'SystemRecordProperties',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPSelectionRequirement'],
         'equals_string': 'POINT'} })
    name: str = Field(default=..., description="""Reference location name""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata',
                       'SensorData',
                       'TUAData',
                       'PointMetadataEntry',
                       'ReferenceLocationProperties',
                       'Tool',
                       'ToolParameter',
                       'PlatformRecord',
                       'StacProvider',
                       'LevelDefinition',
                       'DatasetSeries',
                       'StoryboardProperties',
                       'MCPToolDefinition',
                       'ToolDefinition']} })
    location_type: LocationTypeEnum = Field(default=..., description="""Type of reference""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties']} })
    description: Optional[str] = Field(default=None, description="""Additional description""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'Tool',
                       'ToolParameter',
                       'StacProvider',
                       'StacItemProperties',
                       'StacCatalog',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'LevelDefinition',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPParamSchema',
                       'MCPToolDefinition',
                       'ToolDefinition']} })
    symbol: Optional[str] = Field(default=None, description="""Map symbol identifier""", json_schema_extra = { "linkml_meta": {'domain_of': ['PositionStyle',
                       'PositionStyleOverride',
                       'ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties']} })
    style: PointProperties = Field(default=..., description="""Point styling properties for display""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties']} })
    valid_from: Optional[datetime ] = Field(default=None, description="""Start of validity period""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties']} })
    valid_until: Optional[datetime ] = Field(default=None, description="""End of validity period""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties']} })
    point_metadata: Optional[list[PointMetadataEntry]] = Field(default=[], description="""Per-point metadata array, parallel to MultiPoint coordinates. Each entry contains at minimum an index and name. Downstream tools extend entries with zone/color fields.""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties']} })
    tags: Optional[list[str]] = Field(default=[], description="""Free-text labels assigned to this feature by the analyst""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'StacExtensionProperties',
                       'StacItemSummary']} })
    provenance: Optional[list[LogEntry]] = Field(default=[], description="""PROV-aligned provenance records (append-only log of tool operations)""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'SystemStateProperties',
                       'SystemRecordProperties']} })


class ReferenceLocation(ConfiguredBaseModel):
    """
    GeoJSON Feature for fixed reference points or reference point sets
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    type: Literal["Feature"] = Field(default=..., description="""GeoJSON type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage'],
         'equals_string': 'Feature'} })
    id: str = Field(default=..., description="""Unique identifier""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'Tool',
                       'PlatformRecord',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacCatalog',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'StoryboardProperties',
                       'SceneProperties',
                       'StoryboardFeature',
                       'SceneFeature',
                       'ToolDefinition']} })
    geometry: Union[GeoJSONMultiPoint, GeoJSONPoint] = Field(default=..., description="""Location (Point) or reference point set (MultiPoint)""", json_schema_extra = { "linkml_meta": {'any_of': [{'range': 'GeoJSONPoint'}, {'range': 'GeoJSONMultiPoint'}],
         'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })
    properties: ReferenceLocationProperties = Field(default=..., description="""Reference metadata""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })


class SystemStateProperties(ConfiguredBaseModel):
    """
    Properties for SYSTEM features storing application state
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    kind: Literal["SYSTEM"] = Field(default=..., description="""Feature type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'SystemStateProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'SelectionRequirement',
                       'SystemRecordProperties',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPSelectionRequirement'],
         'equals_string': 'SYSTEM'} })
    state_type: SystemStateTypeEnum = Field(default=..., description="""Discriminator for state variant (temporal, spatial, selection, active_storyboard)""", json_schema_extra = { "linkml_meta": {'domain_of': ['SystemStateProperties']} })
    start_time: Optional[datetime ] = Field(default=None, description="""Viewport start time (ISO8601) - for temporal state""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata', 'TrackProperties', 'SystemStateProperties']} })
    end_time: Optional[datetime ] = Field(default=None, description="""Viewport end time (ISO8601) - for temporal state""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata', 'TrackProperties', 'SystemStateProperties']} })
    bbox: Optional[list[float]] = Field(default=[], description="""Bounding box [minLon, minLat, maxLon, maxLat] - for spatial state""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'SystemStateProperties',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacSpatialExtent',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection']} })
    zoom: Optional[float] = Field(default=None, description="""Map zoom level - for spatial state""", json_schema_extra = { "linkml_meta": {'domain_of': ['SystemStateProperties', 'ViewportPolygon', 'Viewport']} })
    center: Optional[list[float]] = Field(default=[], description="""Map center [longitude, latitude] - for spatial state""", json_schema_extra = { "linkml_meta": {'domain_of': ['SystemStateProperties',
                       'CircleAnnotationProperties',
                       'Viewport']} })
    selected_ids: Optional[list[str]] = Field(default=[], description="""Array of selected feature IDs - for selection state""", json_schema_extra = { "linkml_meta": {'domain_of': ['SystemStateProperties']} })
    active_storyboard_id: Optional[str] = Field(default=None, description="""Storyboard properties.id the analyst last pinned for this plot (#237)""", json_schema_extra = { "linkml_meta": {'domain_of': ['SystemStateProperties']} })
    provenance: Optional[list[LogEntry]] = Field(default=[], description="""PROV-aligned provenance records (append-only log of tool operations)""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'SystemStateProperties',
                       'SystemRecordProperties']} })


class SystemState(ConfiguredBaseModel):
    """
    GeoJSON Feature for storing non-spatial system state
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    type: Literal["Feature"] = Field(default=..., description="""GeoJSON type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage'],
         'equals_string': 'Feature'} })
    id: str = Field(default=..., description="""State identifier (must start with 'state.')""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'Tool',
                       'PlatformRecord',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacCatalog',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'StoryboardProperties',
                       'SceneProperties',
                       'StoryboardFeature',
                       'SceneFeature',
                       'ToolDefinition']} })
    geometry: GeoJSONEmptyPoint = Field(default=..., description="""Point geometry with empty coordinates for SYSTEM features""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })
    properties: SystemStateProperties = Field(default=..., description="""State-specific properties""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })

    @field_validator('id')
    def pattern_id(cls, v):
        pattern=re.compile(r"^state\.[a-z]+$")
        if isinstance(v, list):
            for element in v:
                if isinstance(element, str) and not pattern.match(element):
                    err_msg = f"Invalid id format: {element}"
                    raise ValueError(err_msg)
        elif isinstance(v, str) and not pattern.match(v):
            err_msg = f"Invalid id format: {v}"
            raise ValueError(err_msg)
        return v


class MultiPointFeatureProperties(BaseFeatureProperties):
    """
    Properties for a MultiPointFeature (multi-point tool results)
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    kind: Literal["MULTI_POINT"] = Field(default=..., description="""Feature type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'SystemStateProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'SelectionRequirement',
                       'SystemRecordProperties',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPSelectionRequirement'],
         'equals_string': 'MULTI_POINT'} })
    label: str = Field(default=..., description="""Human-readable result label""", json_schema_extra = { "linkml_meta": {'domain_of': ['PositionStyleOverride',
                       'SensorContact',
                       'TUASolution',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'ToolResultAnnotations',
                       'DatasetAxisMetadata']} })
    style: PointProperties = Field(default=..., description="""Point styling for all positions""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties']} })
    source_tool: Optional[str] = Field(default=None, description="""Name of calculation tool that produced this result""", json_schema_extra = { "linkml_meta": {'domain_of': ['MultiPointFeatureProperties', 'MultiPolygonFeatureProperties']} })
    source_features: Optional[list[str]] = Field(default=[], description="""IDs of input features used to generate this result""", json_schema_extra = { "linkml_meta": {'domain_of': ['MultiPointFeatureProperties', 'MultiPolygonFeatureProperties']} })
    description: Optional[str] = Field(default=None, description="""Additional description or notes""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'Tool',
                       'ToolParameter',
                       'StacProvider',
                       'StacItemProperties',
                       'StacCatalog',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'LevelDefinition',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPParamSchema',
                       'MCPToolDefinition',
                       'ToolDefinition']} })
    tags: Optional[list[str]] = Field(default=[], description="""Free-text labels assigned to this feature by the analyst""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'StacExtensionProperties',
                       'StacItemSummary']} })
    provenance: Optional[list[LogEntry]] = Field(default=[], description="""PROV-aligned provenance records (append-only log of tool operations)""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'SystemStateProperties',
                       'SystemRecordProperties']} })


class MultiPointFeature(ConfiguredBaseModel):
    """
    GeoJSON Feature for multi-point tool results
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    type: Literal["Feature"] = Field(default=..., description="""GeoJSON type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage'],
         'equals_string': 'Feature'} })
    id: str = Field(default=..., description="""Unique identifier (UUID recommended)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'Tool',
                       'PlatformRecord',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacCatalog',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'StoryboardProperties',
                       'SceneProperties',
                       'StoryboardFeature',
                       'SceneFeature',
                       'ToolDefinition']} })
    geometry: GeoJSONMultiPoint = Field(default=..., description="""MultiPoint geometry""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })
    properties: MultiPointFeatureProperties = Field(default=..., description="""Feature properties and styling""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })
    bbox: Optional[list[float]] = Field(default=None, description="""Bounding box [minLon, minLat, maxLon, maxLat]""", min_length=4, max_length=4, json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'SystemStateProperties',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacSpatialExtent',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection']} })


class MultiPolygonFeatureProperties(BaseFeatureProperties):
    """
    Properties for a MultiPolygonFeature (multi-polygon tool results)
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    kind: Literal["MULTI_POLYGON"] = Field(default=..., description="""Feature type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'SystemStateProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'SelectionRequirement',
                       'SystemRecordProperties',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPSelectionRequirement'],
         'equals_string': 'MULTI_POLYGON'} })
    label: str = Field(default=..., description="""Human-readable result label""", json_schema_extra = { "linkml_meta": {'domain_of': ['PositionStyleOverride',
                       'SensorContact',
                       'TUASolution',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'ToolResultAnnotations',
                       'DatasetAxisMetadata']} })
    style: PolygonProperties = Field(default=..., description="""Polygon styling for all regions""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties']} })
    source_tool: Optional[str] = Field(default=None, description="""Name of calculation tool that produced this result""", json_schema_extra = { "linkml_meta": {'domain_of': ['MultiPointFeatureProperties', 'MultiPolygonFeatureProperties']} })
    source_features: Optional[list[str]] = Field(default=[], description="""IDs of input features used to generate this result""", json_schema_extra = { "linkml_meta": {'domain_of': ['MultiPointFeatureProperties', 'MultiPolygonFeatureProperties']} })
    description: Optional[str] = Field(default=None, description="""Additional description or notes""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'Tool',
                       'ToolParameter',
                       'StacProvider',
                       'StacItemProperties',
                       'StacCatalog',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'LevelDefinition',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPParamSchema',
                       'MCPToolDefinition',
                       'ToolDefinition']} })
    tags: Optional[list[str]] = Field(default=[], description="""Free-text labels assigned to this feature by the analyst""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'StacExtensionProperties',
                       'StacItemSummary']} })
    provenance: Optional[list[LogEntry]] = Field(default=[], description="""PROV-aligned provenance records (append-only log of tool operations)""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'SystemStateProperties',
                       'SystemRecordProperties']} })


class MultiPolygonFeature(ConfiguredBaseModel):
    """
    GeoJSON Feature for multi-polygon tool results
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/geojson'})

    type: Literal["Feature"] = Field(default=..., description="""GeoJSON type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage'],
         'equals_string': 'Feature'} })
    id: str = Field(default=..., description="""Unique identifier (UUID recommended)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'Tool',
                       'PlatformRecord',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacCatalog',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'StoryboardProperties',
                       'SceneProperties',
                       'StoryboardFeature',
                       'SceneFeature',
                       'ToolDefinition']} })
    geometry: GeoJSONMultiPolygon = Field(default=..., description="""MultiPolygon geometry""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })
    properties: MultiPolygonFeatureProperties = Field(default=..., description="""Feature properties and styling""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })
    bbox: Optional[list[float]] = Field(default=None, description="""Bounding box [minLon, minLat, maxLon, maxLat]""", min_length=4, max_length=4, json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'SystemStateProperties',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacSpatialExtent',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection']} })


class LogEntry(ConfiguredBaseModel):
    """
    A PROV-aligned provenance record stored on GeoJSON features. Contains activity identity, timestamp, generator information, input/output references, execution duration, and tuning annotations.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/log-entry'})

    activity_id: str = Field(default=..., description="""Unique operation identifier (UUID v4). Shared across features in multi-feature operations.""", json_schema_extra = { "linkml_meta": {'domain_of': ['LogEntry', 'FileProvEntry', 'PropertiesProvenanceEntry']} })
    timestamp: datetime  = Field(default=..., description="""When the operation occurred (ISO 8601 with timezone).""", json_schema_extra = { "linkml_meta": {'domain_of': ['LogEntry',
                       'TuneAnnotation',
                       'FileProvEntry',
                       'PropertiesProvenanceEntry',
                       'FeatureSelection',
                       'SceneProperties']} })
    was_generated_by: WasGeneratedBy = Field(default=..., description="""Tool identity and parameters for this invocation.""", json_schema_extra = { "linkml_meta": {'domain_of': ['LogEntry']} })
    used: list[str] = Field(default=..., description="""Feature IDs of inputs. May be empty for operations with no explicit inputs.""", json_schema_extra = { "linkml_meta": {'domain_of': ['LogEntry']} })
    generated: list[str] = Field(default=..., description="""Feature IDs or versioned asset paths of outputs. May be empty for in-place modifications.""", json_schema_extra = { "linkml_meta": {'domain_of': ['LogEntry']} })
    execution_duration: str = Field(default=..., description="""Wall-clock execution time in ISO 8601 duration format (e.g., PT0.3S).""", json_schema_extra = { "linkml_meta": {'domain_of': ['LogEntry']} })
    generated_result_id: Optional[str] = Field(default=None, description="""Stable logical identity for artifact-producing tools. Null for non-artifact tools.""", json_schema_extra = { "linkml_meta": {'domain_of': ['LogEntry']} })
    tune: Optional[TuneAnnotation] = Field(default=None, description="""Parameter tuning record. Null until a tuning operation modifies this entry.""", json_schema_extra = { "linkml_meta": {'domain_of': ['LogEntry']} })
    input_state: Optional[list[InputFeatureState]] = Field(default=[], description="""Pre-operation feature states for coordinate-mutating tools. Captures geometry and spatial properties as they were immediately before the operation, enabling correct replay with modified parameters. Null for non-mutation tools.""", json_schema_extra = { "linkml_meta": {'domain_of': ['LogEntry', 'ToolResultForLog']} })
    disabled: Optional[bool] = Field(default=False, description="""Whether this entry is skipped during replay. Toggled via the flip-card edit face.""", json_schema_extra = { "linkml_meta": {'domain_of': ['LogEntry'], 'ifabsent': 'false'} })
    rationale: Optional[str] = Field(default=None, description="""Free-text analyst annotation explaining the reasoning for this operation.""", json_schema_extra = { "linkml_meta": {'domain_of': ['LogEntry']} })
    agent: Optional[str] = Field(default=None, description="""Human actor (e.g. analyst username) who triggered the operation. Added by #215 for Storyboarding CRUD provenance; optional and useful to any tool emitting LogEntry records.""", json_schema_extra = { "linkml_meta": {'domain_of': ['LogEntry']} })
    activity_type: Optional[ActivityType] = Field(default=None, description="""Semantic kind of this provenance record. Optional; absent records are treated as `tool` by consumers. Introduced by feature 208 so future entry types (manual checkpoint, standalone tune, manual rationale) can be distinguished without overloading visual tool-category. See `shared/components/src/LogPanel/types.ts` `TimelineEntryKind` for the UI-side mirror.""", json_schema_extra = { "linkml_meta": {'domain_of': ['LogEntry']} })

    @field_validator('execution_duration')
    def pattern_execution_duration(cls, v):
        pattern=re.compile(r"^PT[0-9]+(\.[0-9]+)?S$")
        if isinstance(v, list):
            for element in v:
                if isinstance(element, str) and not pattern.match(element):
                    err_msg = f"Invalid execution_duration format: {element}"
                    raise ValueError(err_msg)
        elif isinstance(v, str) and not pattern.match(v):
            err_msg = f"Invalid execution_duration format: {v}"
            raise ValueError(err_msg)
        return v


class WasGeneratedBy(ConfiguredBaseModel):
    """
    Identifies the tool and its parameters for a specific invocation. Named after the W3C PROV vocabulary term.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/log-entry'})

    tool: str = Field(default=..., description="""Tool identifier (kebab-case, e.g., calculate-range).""", json_schema_extra = { "linkml_meta": {'domain_of': ['WasGeneratedBy', 'PropertiesProvenanceEntry', 'MCPRequest']} })
    tool_version: str = Field(default=..., description="""Semantic version of the tool (e.g., 1.2.0).""", json_schema_extra = { "linkml_meta": {'domain_of': ['WasGeneratedBy', 'ToolExecutionResultForReplay']} })
    parameters: list[ParameterValue] = Field(default=..., description="""Full resolved parameter set. Keys are parameter names, values are ParameterValue objects. May be empty dict.""", json_schema_extra = { "linkml_meta": {'domain_of': ['WasGeneratedBy', 'ToolResult']} })


class ParameterValue(ConfiguredBaseModel):
    """
    A typed parameter value with replay metadata.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/log-entry'})

    value: str = Field(default=..., description="""The parameter value (any JSON type).""", json_schema_extra = { "linkml_meta": {'domain_of': ['ParameterValue', 'TimeStep', 'ToolParameterMeta']} })
    default: Optional[bool] = Field(default=False, description="""Whether this is the default value.""", json_schema_extra = { "linkml_meta": {'domain_of': ['ParameterValue', 'ToolParameterMeta'], 'ifabsent': 'false'} })
    tunable: Optional[bool] = Field(default=True, description="""Whether this parameter can be modified during replay.""", json_schema_extra = { "linkml_meta": {'domain_of': ['ParameterValue', 'ToolParameterMeta'], 'ifabsent': 'true'} })


class InputFeatureState(ConfiguredBaseModel):
    """
    Pre-operation state of a feature captured before a coordinate-mutating tool executes. Enables correct replay by providing the original geometry as the anchor for re-computation with modified parameters.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/log-entry'})

    feature_id: str = Field(default=..., description="""ID of the feature whose pre-operation state is captured.""", json_schema_extra = { "linkml_meta": {'domain_of': ['InputFeatureState']} })
    geometry: str = Field(default=..., description="""Full GeoJSON geometry object (type + coordinates) as it was immediately before the operation. Stored as a JSON object.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature'],
         'notes': ['Typed as string in LinkML but serialized as a JSON object in '
                   'practice. GeoJSON geometry is polymorphic (Point, Polygon, '
                   'LineString, etc.) and LinkML does not have a native geometry '
                   'type.']} })
    properties: Optional[str] = Field(default=None, description="""Kind-specific spatial properties captured before the operation. Excludes provenance (which is append-only). Null if no spatial properties need capturing.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature'],
         'notes': ['Typed as string in LinkML but serialized as a JSON object in '
                   'practice. Contains keys like "center", "origin", "radius_km" etc.']} })


class TuneAnnotation(ConfiguredBaseModel):
    """
    Records a parameter modification (appended, not replacing original).
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/log-entry'})

    timestamp: datetime  = Field(default=..., description="""When the tuning occurred (ISO 8601 with timezone).""", json_schema_extra = { "linkml_meta": {'domain_of': ['LogEntry',
                       'TuneAnnotation',
                       'FileProvEntry',
                       'PropertiesProvenanceEntry',
                       'FeatureSelection',
                       'SceneProperties']} })
    parameter: str = Field(default=..., description="""Name of the parameter that was changed.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TuneAnnotation']} })
    previous_value: str = Field(default=..., description="""Value before tuning.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TuneAnnotation']} })
    new_value: str = Field(default=..., description="""Value after tuning.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TuneAnnotation']} })


class NarrativeEntryProperties(BaseFeatureProperties):
    """
    Properties for a NarrativeEntry annotation
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/annotations'})

    kind: Literal["NARRATIVE"] = Field(default=..., description="""Feature type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'SystemStateProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'SelectionRequirement',
                       'SystemRecordProperties',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPSelectionRequirement'],
         'equals_string': 'NARRATIVE'} })
    time: datetime  = Field(default=..., description="""Narrative timestamp (ISO8601)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TimestampedPosition',
                       'MeasuredArrayPosition',
                       'SensorContact',
                       'TUASolution',
                       'NarrativeEntryProperties']} })
    text: str = Field(default=..., description="""Narrative text content""", json_schema_extra = { "linkml_meta": {'domain_of': ['NarrativeEntryProperties',
                       'TextAnnotationProperties',
                       'MCPContentItem']} })
    track_id: Optional[str] = Field(default=None, description="""Associated track identifier (optional)""", json_schema_extra = { "linkml_meta": {'domain_of': ['NarrativeEntryProperties']} })
    symbol: Optional[str] = Field(default=None, description="""Display symbol code from REP file""", json_schema_extra = { "linkml_meta": {'domain_of': ['PositionStyle',
                       'PositionStyleOverride',
                       'ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties']} })
    style: PointProperties = Field(default=..., description="""Point styling properties for display position""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties']} })
    tags: Optional[list[str]] = Field(default=[], description="""Free-text labels assigned to this feature by the analyst""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'StacExtensionProperties',
                       'StacItemSummary']} })
    provenance: Optional[list[LogEntry]] = Field(default=[], description="""PROV-aligned provenance records (append-only log of tool operations)""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'SystemStateProperties',
                       'SystemRecordProperties']} })


class NarrativeEntry(ConfiguredBaseModel):
    """
    GeoJSON Feature for timestamped narrative/log entries. Narratives are operator notes associated with a timestamp and optionally a track. Geometry is optional (Point for display position, or null).
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/annotations'})

    type: Literal["Feature"] = Field(default=..., description="""GeoJSON type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage'],
         'equals_string': 'Feature'} })
    id: str = Field(default=..., description="""Unique identifier""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'Tool',
                       'PlatformRecord',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacCatalog',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'StoryboardProperties',
                       'SceneProperties',
                       'StoryboardFeature',
                       'SceneFeature',
                       'ToolDefinition']} })
    geometry: Optional[GeoJSONPoint] = Field(default=None, description="""Optional display position (Point) or null""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })
    properties: NarrativeEntryProperties = Field(default=..., description="""Narrative metadata""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })


class CircleAnnotationProperties(BaseFeatureProperties):
    """
    Properties for a CircleAnnotation
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/annotations'})

    kind: Literal["CIRCLE"] = Field(default=..., description="""Feature type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'SystemStateProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'SelectionRequirement',
                       'SystemRecordProperties',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPSelectionRequirement'],
         'equals_string': 'CIRCLE'} })
    center: list[float] = Field(default=..., description="""Circle center as [longitude, latitude] for precise reconstruction""", min_length=2, max_length=2, json_schema_extra = { "linkml_meta": {'domain_of': ['SystemStateProperties',
                       'CircleAnnotationProperties',
                       'Viewport']} })
    radius: float = Field(default=..., description="""Circle radius in meters for precise reconstruction""", ge=0, json_schema_extra = { "linkml_meta": {'domain_of': ['PointProperties', 'CircleAnnotationProperties']} })
    label: Optional[str] = Field(default=None, description="""Annotation label text""", json_schema_extra = { "linkml_meta": {'domain_of': ['PositionStyleOverride',
                       'SensorContact',
                       'TUASolution',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'ToolResultAnnotations',
                       'DatasetAxisMetadata']} })
    symbol: Optional[str] = Field(default=None, description="""Display symbol code from REP file""", json_schema_extra = { "linkml_meta": {'domain_of': ['PositionStyle',
                       'PositionStyleOverride',
                       'ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties']} })
    style: PolygonProperties = Field(default=..., description="""Polygon styling properties for the circle area""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties']} })
    tags: Optional[list[str]] = Field(default=[], description="""Free-text labels assigned to this feature by the analyst""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'StacExtensionProperties',
                       'StacItemSummary']} })
    provenance: Optional[list[LogEntry]] = Field(default=[], description="""PROV-aligned provenance records (append-only log of tool operations)""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'SystemStateProperties',
                       'SystemRecordProperties']} })


class CircleAnnotation(ConfiguredBaseModel):
    """
    GeoJSON Feature for circle annotations. Geometry is a Polygon approximating the circle (vertices at regular intervals). Properties contain center and radius for precise reconstruction and smooth rendering.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/annotations'})

    type: Literal["Feature"] = Field(default=..., description="""GeoJSON type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage'],
         'equals_string': 'Feature'} })
    id: str = Field(default=..., description="""Unique identifier""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'Tool',
                       'PlatformRecord',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacCatalog',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'StoryboardProperties',
                       'SceneProperties',
                       'StoryboardFeature',
                       'SceneFeature',
                       'ToolDefinition']} })
    geometry: GeoJSONPolygon = Field(default=..., description="""Circle as Polygon (approximated with vertices, e.g., every 45 degrees)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })
    properties: CircleAnnotationProperties = Field(default=..., description="""Circle metadata including center and radius for reconstruction""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })


class RectangleAnnotationProperties(BaseFeatureProperties):
    """
    Properties for a RectangleAnnotation
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/annotations'})

    kind: Literal["RECTANGLE"] = Field(default=..., description="""Feature type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'SystemStateProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'SelectionRequirement',
                       'SystemRecordProperties',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPSelectionRequirement'],
         'equals_string': 'RECTANGLE'} })
    label: Optional[str] = Field(default=None, description="""Annotation label text""", json_schema_extra = { "linkml_meta": {'domain_of': ['PositionStyleOverride',
                       'SensorContact',
                       'TUASolution',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'ToolResultAnnotations',
                       'DatasetAxisMetadata']} })
    symbol: Optional[str] = Field(default=None, description="""Display symbol code from REP file""", json_schema_extra = { "linkml_meta": {'domain_of': ['PositionStyle',
                       'PositionStyleOverride',
                       'ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties']} })
    style: PolygonProperties = Field(default=..., description="""Polygon styling properties for the rectangle area""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties']} })
    tags: Optional[list[str]] = Field(default=[], description="""Free-text labels assigned to this feature by the analyst""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'StacExtensionProperties',
                       'StacItemSummary']} })
    provenance: Optional[list[LogEntry]] = Field(default=[], description="""PROV-aligned provenance records (append-only log of tool operations)""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'SystemStateProperties',
                       'SystemRecordProperties']} })


class RectangleAnnotation(ConfiguredBaseModel):
    """
    GeoJSON Feature for rectangle annotations. Geometry is a Polygon with 4 corners (plus closing point).
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/annotations'})

    type: Literal["Feature"] = Field(default=..., description="""GeoJSON type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage'],
         'equals_string': 'Feature'} })
    id: str = Field(default=..., description="""Unique identifier""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'Tool',
                       'PlatformRecord',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacCatalog',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'StoryboardProperties',
                       'SceneProperties',
                       'StoryboardFeature',
                       'SceneFeature',
                       'ToolDefinition']} })
    geometry: GeoJSONPolygon = Field(default=..., description="""Rectangle as Polygon (4 corners + close)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })
    properties: RectangleAnnotationProperties = Field(default=..., description="""Rectangle metadata""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })


class LineAnnotationProperties(BaseFeatureProperties):
    """
    Properties for a LineAnnotation
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/annotations'})

    kind: Literal["LINE"] = Field(default=..., description="""Feature type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'SystemStateProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'SelectionRequirement',
                       'SystemRecordProperties',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPSelectionRequirement'],
         'equals_string': 'LINE'} })
    label: Optional[str] = Field(default=None, description="""Annotation label text""", json_schema_extra = { "linkml_meta": {'domain_of': ['PositionStyleOverride',
                       'SensorContact',
                       'TUASolution',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'ToolResultAnnotations',
                       'DatasetAxisMetadata']} })
    symbol: Optional[str] = Field(default=None, description="""Display symbol code from REP file""", json_schema_extra = { "linkml_meta": {'domain_of': ['PositionStyle',
                       'PositionStyleOverride',
                       'ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties']} })
    style: LineProperties = Field(default=..., description="""Line styling properties for the line segment""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties']} })
    tags: Optional[list[str]] = Field(default=[], description="""Free-text labels assigned to this feature by the analyst""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'StacExtensionProperties',
                       'StacItemSummary']} })
    provenance: Optional[list[LogEntry]] = Field(default=[], description="""PROV-aligned provenance records (append-only log of tool operations)""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'SystemStateProperties',
                       'SystemRecordProperties']} })


class LineAnnotation(ConfiguredBaseModel):
    """
    GeoJSON Feature for line segment annotations. Geometry is a LineString with 2 points (start and end).
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/annotations'})

    type: Literal["Feature"] = Field(default=..., description="""GeoJSON type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage'],
         'equals_string': 'Feature'} })
    id: str = Field(default=..., description="""Unique identifier""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'Tool',
                       'PlatformRecord',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacCatalog',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'StoryboardProperties',
                       'SceneProperties',
                       'StoryboardFeature',
                       'SceneFeature',
                       'ToolDefinition']} })
    geometry: GeoJSONLineString = Field(default=..., description="""Line as LineString (2 points)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })
    properties: LineAnnotationProperties = Field(default=..., description="""Line metadata""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })


class TextAnnotationProperties(BaseFeatureProperties):
    """
    Properties for a TextAnnotation
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/annotations'})

    kind: Literal["TEXT"] = Field(default=..., description="""Feature type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'SystemStateProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'SelectionRequirement',
                       'SystemRecordProperties',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPSelectionRequirement'],
         'equals_string': 'TEXT'} })
    text: str = Field(default=..., description="""Text content to display""", json_schema_extra = { "linkml_meta": {'domain_of': ['NarrativeEntryProperties',
                       'TextAnnotationProperties',
                       'MCPContentItem']} })
    symbol: Optional[str] = Field(default=None, description="""Display symbol code from REP file""", json_schema_extra = { "linkml_meta": {'domain_of': ['PositionStyle',
                       'PositionStyleOverride',
                       'ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties']} })
    style: PointProperties = Field(default=..., description="""Point styling properties for the text position marker""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties']} })
    tags: Optional[list[str]] = Field(default=[], description="""Free-text labels assigned to this feature by the analyst""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'StacExtensionProperties',
                       'StacItemSummary']} })
    provenance: Optional[list[LogEntry]] = Field(default=[], description="""PROV-aligned provenance records (append-only log of tool operations)""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'SystemStateProperties',
                       'SystemRecordProperties']} })


class TextAnnotation(ConfiguredBaseModel):
    """
    GeoJSON Feature for text annotations at a position. Geometry is the Point where text should be displayed.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/annotations'})

    type: Literal["Feature"] = Field(default=..., description="""GeoJSON type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage'],
         'equals_string': 'Feature'} })
    id: str = Field(default=..., description="""Unique identifier""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'Tool',
                       'PlatformRecord',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacCatalog',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'StoryboardProperties',
                       'SceneProperties',
                       'StoryboardFeature',
                       'SceneFeature',
                       'ToolDefinition']} })
    geometry: GeoJSONPoint = Field(default=..., description="""Text display position""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })
    properties: TextAnnotationProperties = Field(default=..., description="""Text metadata""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })


class VectorAnnotationProperties(BaseFeatureProperties):
    """
    Properties for a VectorAnnotation
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/annotations'})

    kind: Literal["VECTOR"] = Field(default=..., description="""Feature type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'SystemStateProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'SelectionRequirement',
                       'SystemRecordProperties',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPSelectionRequirement'],
         'equals_string': 'VECTOR'} })
    origin: list[float] = Field(default=..., description="""Vector origin as [longitude, latitude] for precise reconstruction""", min_length=2, max_length=2, json_schema_extra = { "linkml_meta": {'domain_of': ['SensorContact', 'VectorAnnotationProperties']} })
    range: float = Field(default=..., description="""Vector length/range in meters for precise reconstruction""", ge=0, json_schema_extra = { "linkml_meta": {'domain_of': ['SensorContact', 'TUASolution', 'VectorAnnotationProperties']} })
    bearing: float = Field(default=..., description="""Vector bearing in degrees (0-360, from north) for precise reconstruction""", ge=0, le=360, json_schema_extra = { "linkml_meta": {'domain_of': ['SensorContact',
                       'TUASolution',
                       'VectorAnnotationProperties',
                       'Viewport']} })
    label: Optional[str] = Field(default=None, description="""Annotation label text""", json_schema_extra = { "linkml_meta": {'domain_of': ['PositionStyleOverride',
                       'SensorContact',
                       'TUASolution',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'ToolResultAnnotations',
                       'DatasetAxisMetadata']} })
    symbol: Optional[str] = Field(default=None, description="""Display symbol code from REP file""", json_schema_extra = { "linkml_meta": {'domain_of': ['PositionStyle',
                       'PositionStyleOverride',
                       'ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties']} })
    style: LineProperties = Field(default=..., description="""Line styling properties for the vector""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties']} })
    tags: Optional[list[str]] = Field(default=[], description="""Free-text labels assigned to this feature by the analyst""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'StacExtensionProperties',
                       'StacItemSummary']} })
    provenance: Optional[list[LogEntry]] = Field(default=[], description="""PROV-aligned provenance records (append-only log of tool operations)""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'SystemStateProperties',
                       'SystemRecordProperties']} })


class VectorAnnotation(ConfiguredBaseModel):
    """
    GeoJSON Feature for vector annotations. Geometry is a LineString from origin to endpoint (computed from range/bearing). Properties contain origin, range, and bearing for precise reconstruction.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/annotations'})

    type: Literal["Feature"] = Field(default=..., description="""GeoJSON type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage'],
         'equals_string': 'Feature'} })
    id: str = Field(default=..., description="""Unique identifier""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'Tool',
                       'PlatformRecord',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacCatalog',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'StoryboardProperties',
                       'SceneProperties',
                       'StoryboardFeature',
                       'SceneFeature',
                       'ToolDefinition']} })
    geometry: GeoJSONLineString = Field(default=..., description="""Vector as LineString (origin to computed endpoint)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })
    properties: VectorAnnotationProperties = Field(default=..., description="""Vector metadata including origin, range, and bearing for reconstruction""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })


class PolyAnnotationProperties(BaseFeatureProperties):
    """
    Properties for a PolyAnnotation
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/annotations'})

    kind: Literal["POLY"] = Field(default=..., description="""Feature type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'SystemStateProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'SelectionRequirement',
                       'SystemRecordProperties',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPSelectionRequirement'],
         'equals_string': 'POLY'} })
    vertex_count: int = Field(default=..., description="""Number of unique vertices (excluding ring closure point)""", ge=3, json_schema_extra = { "linkml_meta": {'domain_of': ['PolyAnnotationProperties']} })
    label: Optional[str] = Field(default=None, description="""Annotation label text""", json_schema_extra = { "linkml_meta": {'domain_of': ['PositionStyleOverride',
                       'SensorContact',
                       'TUASolution',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'ToolResultAnnotations',
                       'DatasetAxisMetadata']} })
    symbol: Optional[str] = Field(default=None, description="""Display symbol code from REP file""", json_schema_extra = { "linkml_meta": {'domain_of': ['PositionStyle',
                       'PositionStyleOverride',
                       'ReferenceLocationProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties']} })
    style: PolygonProperties = Field(default=..., description="""Polygon styling properties for the polygon area""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties']} })
    line_number: Optional[int] = Field(default=None, description="""Source line number for debugging""", json_schema_extra = { "linkml_meta": {'domain_of': ['PolyAnnotationProperties']} })
    tags: Optional[list[str]] = Field(default=[], description="""Free-text labels assigned to this feature by the analyst""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'StacExtensionProperties',
                       'StacItemSummary']} })
    provenance: Optional[list[LogEntry]] = Field(default=[], description="""PROV-aligned provenance records (append-only log of tool operations)""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'SystemStateProperties',
                       'SystemRecordProperties']} })


class PolyAnnotation(ConfiguredBaseModel):
    """
    GeoJSON Feature for arbitrary polygon annotations. Geometry is a Polygon with user-defined vertices (freeform shape). Used for patrol zones, exclusion areas, search grids, etc.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/annotations'})

    type: Literal["Feature"] = Field(default=..., description="""GeoJSON type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage'],
         'equals_string': 'Feature'} })
    id: str = Field(default=..., description="""Unique identifier""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'Tool',
                       'PlatformRecord',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacCatalog',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'StoryboardProperties',
                       'SceneProperties',
                       'StoryboardFeature',
                       'SceneFeature',
                       'ToolDefinition']} })
    geometry: GeoJSONPolygon = Field(default=..., description="""Polygon with user-defined vertices (closed ring)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })
    properties: PolyAnnotationProperties = Field(default=..., description="""Polygon metadata including vertex count and styling""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })


class SelectionRequirement(ConfiguredBaseModel):
    """
    A constraint specifying which feature kinds a tool accepts, with minimum and maximum counts. Used to determine if a tool is applicable to the current selection.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/tool'})

    kind: str = Field(default=..., description="""The feature kind this requirement applies to. Supports flat values (e.g., \"TRACK\", \"POINT\") matching the 'kind' property of GeoJSON features, and dot-delimited hierarchical paths (e.g., \"TRACK.SENSOR\", \"TRACK.SEGMENT\") for targeting embedded children within compound features.""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'SystemStateProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'SelectionRequirement',
                       'SystemRecordProperties',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPSelectionRequirement']} })
    segment_type: Optional[SegmentTypeEnum] = Field(default=None, description="""Optional filter for segment type when kind targets TRACK.SEGMENT. Must be a valid SegmentTypeEnum value (e.g., \"ABSOLUTE_TMA\"). Only meaningful when kind is \"TRACK.SEGMENT\".""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata', 'SelectionRequirement']} })
    min: Optional[int] = Field(default=None, description="""Minimum number of features of this kind required. Must be >= 0. Defaults to 0 if not specified.""", ge=0, json_schema_extra = { "linkml_meta": {'domain_of': ['SelectionRequirement', 'MCPSelectionRequirement']} })
    max: Optional[int] = Field(default=None, description="""Maximum number of features of this kind allowed. Must be >= min if both specified. Null means no upper limit.""", ge=0, json_schema_extra = { "linkml_meta": {'domain_of': ['SelectionRequirement', 'MCPSelectionRequirement']} })


class Tool(ConfiguredBaseModel):
    """
    An analysis operation with a name, description, version, and selection requirements. Tools are discovered from debrief-calc via MCP and matched to analyst selections.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/tool'})

    id: str = Field(default=..., description="""Unique identifier for the tool. Used for execution and deduplication. Should be stable across versions.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'Tool',
                       'PlatformRecord',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacCatalog',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'StoryboardProperties',
                       'SceneProperties',
                       'StoryboardFeature',
                       'SceneFeature',
                       'ToolDefinition']} })
    name: str = Field(default=..., description="""Human-readable name displayed in menus and panels. Should be concise (2-4 words).""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata',
                       'SensorData',
                       'TUAData',
                       'PointMetadataEntry',
                       'ReferenceLocationProperties',
                       'Tool',
                       'ToolParameter',
                       'PlatformRecord',
                       'StacProvider',
                       'LevelDefinition',
                       'DatasetSeries',
                       'StoryboardProperties',
                       'MCPToolDefinition',
                       'ToolDefinition']} })
    description: Optional[str] = Field(default=None, description="""Brief description of what the tool does. Displayed in tooltips and help text. Should be one sentence.""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'Tool',
                       'ToolParameter',
                       'StacProvider',
                       'StacItemProperties',
                       'StacCatalog',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'LevelDefinition',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPParamSchema',
                       'MCPToolDefinition',
                       'ToolDefinition']} })
    version: Optional[str] = Field(default=None, description="""Tool version string for provenance tracking. Follows semantic versioning (e.g., \"1.0.0\").""", json_schema_extra = { "linkml_meta": {'domain_of': ['Tool', 'SessionFile']} })
    requirements: Optional[list[SelectionRequirement]] = Field(default=[], description="""List of selection requirements. Tool is active when ALL requirements are satisfied by the current selection. Empty list means tool accepts any selection.""", json_schema_extra = { "linkml_meta": {'domain_of': ['Tool']} })
    category: Optional[ToolCategoryEnum] = Field(default=None, description="""Visual category for Log Panel icon rendering. Null / absent tools render with the neutral-grey \"Other\" icon. First-party tools MUST declare a value (enforced by test policy; see specs/207-tool-manifest-categories/research.md §R5). Feature 207.""", json_schema_extra = { "linkml_meta": {'domain_of': ['Tool']} })


class ToolParameter(ConfiguredBaseModel):
    """
    A configurable parameter for a tool. Supports string, number, boolean, and enum types with optional default values, explicit choices, and schema-defined parameter type references.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/tool'})

    name: str = Field(default=..., description="""Parameter identifier (kebab-case)""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata',
                       'SensorData',
                       'TUAData',
                       'PointMetadataEntry',
                       'ReferenceLocationProperties',
                       'Tool',
                       'ToolParameter',
                       'PlatformRecord',
                       'StacProvider',
                       'LevelDefinition',
                       'DatasetSeries',
                       'StoryboardProperties',
                       'MCPToolDefinition',
                       'ToolDefinition']} })
    type: str = Field(default=..., description="""Value type discriminator: string, number, boolean, enum""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage']} })
    description: str = Field(default=..., description="""Human-readable parameter description""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'Tool',
                       'ToolParameter',
                       'StacProvider',
                       'StacItemProperties',
                       'StacCatalog',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'LevelDefinition',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPParamSchema',
                       'MCPToolDefinition',
                       'ToolDefinition']} })
    required: Optional[bool] = Field(default=None, description="""Whether parameter must be provided""", json_schema_extra = { "linkml_meta": {'domain_of': ['ToolParameter']} })
    default_value: Optional[str] = Field(default=None, description="""Default value if not provided""", json_schema_extra = { "linkml_meta": {'domain_of': ['ToolParameter']} })
    param_type: Optional[ParameterTypeEnum] = Field(default=None, description="""References a schema-defined parameter-type enum by name. When set, the client resolves enum values from generated types rather than using inline choices.""", json_schema_extra = { "linkml_meta": {'domain_of': ['ToolParameter']} })
    choices: Optional[list[str]] = Field(default=[], description="""Explicit choice list for enum-typed parameters when the client cannot (or chooses not to) resolve a schema-defined `param_type`. Used by both the ToolMatch picker (shared/components) and the VS Code activity-panel adapter (apps/vscode/src/services/mcpToolAdapter.ts). Added under spec 222 (P2) to collapse the drift cluster attributed to ToolParameter (audit §3.2 rows 37 and 86).""", json_schema_extra = { "linkml_meta": {'domain_of': ['ToolParameter']} })


class SystemRecordProperties(ConfiguredBaseModel):
    """
    Properties for the non-spatial system record feature. A system record is a GeoJSON Feature with kind SYSTEM_RECORD and Point geometry with empty coordinates.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/system-record'})

    kind: Literal["SYSTEM_RECORD"] = Field(default=..., description="""Feature type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'SystemStateProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'SelectionRequirement',
                       'SystemRecordProperties',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPSelectionRequirement'],
         'equals_string': 'SYSTEM_RECORD'} })
    snapshot_links: Optional[SnapshotLinks] = Field(default=None, description="""Doubly-linked snapshot chain. Null when no snapshots exist.""", json_schema_extra = { "linkml_meta": {'domain_of': ['SystemRecordProperties']} })
    branches: Optional[list[BranchRecord]] = Field(default=[], description="""Branch records. Empty array when no branches exist.""", json_schema_extra = { "linkml_meta": {'domain_of': ['SystemRecordProperties']} })
    branch_origin: Optional[BranchOrigin] = Field(default=None, description="""Reverse link to source plot (set when this plot is a branch).""", json_schema_extra = { "linkml_meta": {'domain_of': ['SystemRecordProperties']} })
    provenance: Optional[list[FileProvEntry]] = Field(default=[], description="""File-level provenance events (snapshot and branch creation).""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'SystemStateProperties',
                       'SystemRecordProperties']} })


class SnapshotLinks(ConfiguredBaseModel):
    """
    Doubly-linked references to adjacent snapshots.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/system-record'})

    prev: Optional[SnapshotRef] = Field(default=None, description="""Link to previous snapshot. Null if this is the first snapshot.""", json_schema_extra = { "linkml_meta": {'domain_of': ['SnapshotLinks']} })
    next: Optional[SnapshotRef] = Field(default=None, description="""Link to next snapshot. Null if this is the current working file.""", json_schema_extra = { "linkml_meta": {'domain_of': ['SnapshotLinks']} })


class SnapshotRef(ConfiguredBaseModel):
    """
    Reference to a snapshot file.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/system-record'})

    asset: str = Field(default=..., description="""Relative path to snapshot GeoJSON file.""", json_schema_extra = { "linkml_meta": {'domain_of': ['SnapshotRef', 'FileProvEntry']} })
    prov_entry_count: int = Field(default=..., description="""Number of provenance entries in the snapshot.""", ge=0, json_schema_extra = { "linkml_meta": {'domain_of': ['SnapshotRef']} })


class BranchRecord(ConfiguredBaseModel):
    """
    Reference to a branched plot.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/system-record'})

    branch_id: str = Field(default=..., description="""Unique branch identifier.""", json_schema_extra = { "linkml_meta": {'domain_of': ['BranchRecord', 'BranchOrigin', 'FileProvEntry']} })
    branched_from: str = Field(default=..., description="""Activity ID of the branch point.""", json_schema_extra = { "linkml_meta": {'domain_of': ['BranchRecord', 'BranchOrigin']} })
    branched_at: datetime  = Field(default=..., description="""When the branch was created (ISO 8601 with timezone).""", json_schema_extra = { "linkml_meta": {'domain_of': ['BranchRecord', 'BranchOrigin']} })
    target_asset: str = Field(default=..., description="""Relative path to the branched plot file.""", json_schema_extra = { "linkml_meta": {'domain_of': ['BranchRecord']} })


class BranchOrigin(ConfiguredBaseModel):
    """
    Reverse link on a branch plot's system record, pointing to the source plot.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/system-record'})

    source_asset: str = Field(default=..., description="""Relative path to the source plot file.""", json_schema_extra = { "linkml_meta": {'domain_of': ['BranchOrigin']} })
    branched_from: str = Field(default=..., description="""Activity ID of the branch point.""", json_schema_extra = { "linkml_meta": {'domain_of': ['BranchRecord', 'BranchOrigin']} })
    branched_at: datetime  = Field(default=..., description="""When the branch was created (ISO 8601 with timezone).""", json_schema_extra = { "linkml_meta": {'domain_of': ['BranchRecord', 'BranchOrigin']} })
    branch_id: str = Field(default=..., description="""Branch identifier matching the source BranchRecord.""", json_schema_extra = { "linkml_meta": {'domain_of': ['BranchRecord', 'BranchOrigin', 'FileProvEntry']} })


class FileProvEntry(ConfiguredBaseModel):
    """
    File-level provenance event (snapshot or branch creation).
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/system-record'})

    activity_id: str = Field(default=..., description="""Unique event identifier.""", json_schema_extra = { "linkml_meta": {'domain_of': ['LogEntry', 'FileProvEntry', 'PropertiesProvenanceEntry']} })
    type: FileProvEventTypeEnum = Field(default=..., description="""Event type: snapshot or branch.""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage']} })
    timestamp: datetime  = Field(default=..., description="""When the event occurred (ISO 8601 with timezone).""", json_schema_extra = { "linkml_meta": {'domain_of': ['LogEntry',
                       'TuneAnnotation',
                       'FileProvEntry',
                       'PropertiesProvenanceEntry',
                       'FeatureSelection',
                       'SceneProperties']} })
    asset: Optional[str] = Field(default=None, description="""Path to snapshot file (for snapshot events).""", json_schema_extra = { "linkml_meta": {'domain_of': ['SnapshotRef', 'FileProvEntry']} })
    branch_id: Optional[str] = Field(default=None, description="""Branch identifier (for branch events).""", json_schema_extra = { "linkml_meta": {'domain_of': ['BranchRecord', 'BranchOrigin', 'FileProvEntry']} })
    direction: Optional[FileProvDirectionEnum] = Field(default=None, description="""'source' or 'target' (for branch events).""", json_schema_extra = { "linkml_meta": {'domain_of': ['FileProvEntry']} })


class PlatformRecord(ConfiguredBaseModel):
    """
    Fully-resolved metadata for a single platform within a STAC item. Produced by save-time resolution merging registry lookups with analyst overrides. Only id is required; all other fields may be absent for unregistered platforms.

    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/stac-extension'})

    id: str = Field(default=..., description="""Platform identifier (e.g., \"NELSON\"). Matches platform_id on TrackProperties.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'Tool',
                       'PlatformRecord',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacCatalog',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'StoryboardProperties',
                       'SceneProperties',
                       'StoryboardFeature',
                       'SceneFeature',
                       'ToolDefinition']} })
    name: Optional[str] = Field(default=None, description="""Human-readable platform name (e.g., \"HMS Nelson\")""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata',
                       'SensorData',
                       'TUAData',
                       'PointMetadataEntry',
                       'ReferenceLocationProperties',
                       'Tool',
                       'ToolParameter',
                       'PlatformRecord',
                       'StacProvider',
                       'LevelDefinition',
                       'DatasetSeries',
                       'StoryboardProperties',
                       'MCPToolDefinition',
                       'ToolDefinition']} })
    nationality: Optional[str] = Field(default=None, description="""ISO 3166-1 alpha-2 country code (e.g., GB, US)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties', 'PlatformRecord']} })
    vessel_class: Optional[str] = Field(default=None, description="""Full vessel classification path using slash-separated notation (e.g., surface/warship/frigate/type23).
""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties', 'PlatformRecord']} })
    vessel_type: Optional[str] = Field(default=None, description="""Vessel type — leaf of classification path (e.g., type23)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties', 'PlatformRecord']} })
    vessel_role: Optional[str] = Field(default=None, description="""Vessel role — parent of leaf in classification path (e.g., frigate)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties', 'PlatformRecord']} })
    domain: Optional[VesselDomainEnum] = Field(default=None, description="""Top-level vessel domain classification""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackProperties', 'PlatformRecord']} })

    @field_validator('nationality')
    def pattern_nationality(cls, v):
        pattern=re.compile(r"^[A-Z]{2}$")
        if isinstance(v, list):
            for element in v:
                if isinstance(element, str) and not pattern.match(element):
                    err_msg = f"Invalid nationality format: {element}"
                    raise ValueError(err_msg)
        elif isinstance(v, str) and not pattern.match(v):
            err_msg = f"Invalid nationality format: {v}"
            raise ValueError(err_msg)
        return v

    @field_validator('vessel_class')
    def pattern_vessel_class(cls, v):
        pattern=re.compile(r"^[a-z0-9-]+(/[a-z0-9-]+){0,3}$")
        if isinstance(v, list):
            for element in v:
                if isinstance(element, str) and not pattern.match(element):
                    err_msg = f"Invalid vessel_class format: {element}"
                    raise ValueError(err_msg)
        elif isinstance(v, str) and not pattern.match(v):
            err_msg = f"Invalid vessel_class format: {v}"
            raise ValueError(err_msg)
        return v

    @field_validator('vessel_type')
    def pattern_vessel_type(cls, v):
        pattern=re.compile(r"^[a-z0-9-]+$")
        if isinstance(v, list):
            for element in v:
                if isinstance(element, str) and not pattern.match(element):
                    err_msg = f"Invalid vessel_type format: {element}"
                    raise ValueError(err_msg)
        elif isinstance(v, str) and not pattern.match(v):
            err_msg = f"Invalid vessel_type format: {v}"
            raise ValueError(err_msg)
        return v

    @field_validator('vessel_role')
    def pattern_vessel_role(cls, v):
        pattern=re.compile(r"^[a-z0-9-]+$")
        if isinstance(v, list):
            for element in v:
                if isinstance(element, str) and not pattern.match(element):
                    err_msg = f"Invalid vessel_role format: {element}"
                    raise ValueError(err_msg)
        elif isinstance(v, str) and not pattern.match(v):
            err_msg = f"Invalid vessel_role format: {v}"
            raise ValueError(err_msg)
        return v


class PropertiesProvenanceEntry(ConfiguredBaseModel):
    """
    Single entry in item.properties[\"debrief:provenance_log\"] recording one Properties Panel commit. Appended by stacService.updateItemMetadata (single writer — Article IV.2). Immutable once written (Article III.3); archive rotation preserves entries by moving to a sibling provenance_log_archive.jsonl — entries are never mutated or deleted in place.

    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/stac-extension'})

    activity_id: str = Field(default=..., description="""ULID generated by the service writer at commit time. Monotonic sort key for replay, undo, and LogPanel cross-referencing.
""", json_schema_extra = { "linkml_meta": {'domain_of': ['LogEntry', 'FileProvEntry', 'PropertiesProvenanceEntry']} })
    timestamp: str = Field(default=..., description="""ISO-8601 UTC timestamp set by the service at write time.""", json_schema_extra = { "linkml_meta": {'domain_of': ['LogEntry',
                       'TuneAnnotation',
                       'FileProvEntry',
                       'PropertiesProvenanceEntry',
                       'FeatureSelection',
                       'SceneProperties']} })
    tool: str = Field(default=..., description="""Sentinel identifying the Properties Panel as the writer. MUST equal \"debrief.propertiesPanel\".
""", json_schema_extra = { "linkml_meta": {'domain_of': ['WasGeneratedBy', 'PropertiesProvenanceEntry', 'MCPRequest']} })
    method: str = Field(default=..., description="""Versioned method identifier matching ^properties-panel@.+$, populated from the @debrief/components package.json version.
""", json_schema_extra = { "linkml_meta": {'domain_of': ['PropertiesProvenanceEntry']} })
    fields: list[str] = Field(default=..., description="""Non-empty list of field names touched in this commit. Sorted alphabetically for deterministic replay.
""", min_length=1, json_schema_extra = { "linkml_meta": {'domain_of': ['PropertiesProvenanceEntry']} })
    source: str = Field(default=..., description="""Origin of the edit. MUST equal \"user\" — Properties Panel edits are human-initiated.
""", json_schema_extra = { "linkml_meta": {'domain_of': ['PropertiesProvenanceEntry']} })

    @field_validator('tool')
    def pattern_tool(cls, v):
        pattern=re.compile(r"^debrief\.propertiesPanel$")
        if isinstance(v, list):
            for element in v:
                if isinstance(element, str) and not pattern.match(element):
                    err_msg = f"Invalid tool format: {element}"
                    raise ValueError(err_msg)
        elif isinstance(v, str) and not pattern.match(v):
            err_msg = f"Invalid tool format: {v}"
            raise ValueError(err_msg)
        return v

    @field_validator('method')
    def pattern_method(cls, v):
        pattern=re.compile(r"^properties-panel@.+$")
        if isinstance(v, list):
            for element in v:
                if isinstance(element, str) and not pattern.match(element):
                    err_msg = f"Invalid method format: {element}"
                    raise ValueError(err_msg)
        elif isinstance(v, str) and not pattern.match(v):
            err_msg = f"Invalid method format: {v}"
            raise ValueError(err_msg)
        return v

    @field_validator('source')
    def pattern_source(cls, v):
        pattern=re.compile(r"^user$")
        if isinstance(v, list):
            for element in v:
                if isinstance(element, str) and not pattern.match(element):
                    err_msg = f"Invalid source format: {element}"
                    raise ValueError(err_msg)
        elif isinstance(v, str) and not pattern.match(v):
            err_msg = f"Invalid source format: {v}"
            raise ValueError(err_msg)
        return v


class StacExtensionProperties(ConfiguredBaseModel):
    """
    Extension properties added to STAC item.properties under the debrief: namespace. All properties are optional — existing items without extension properties remain valid. These properties enable filtering, searching, and colour-coding in the Discovery UI.

    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/stac-extension'})

    platforms: Optional[list[PlatformRecord]] = Field(default=[], description="""Fully-resolved per-platform metadata array. Each entry represents one platform in the plot with merged registry + override data.
""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacExtensionProperties', 'StacItemSummary'],
         'slot_uri': 'debrief:platforms'} })
    tags: Optional[list[str]] = Field(default=[], description="""Plot-level tags — free-text labels applied to the entire plot by the analyst. Trimmed non-empty strings with no duplicates.
""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'StacExtensionProperties',
                       'StacItemSummary'],
         'slot_uri': 'debrief:tags'} })
    feature_tags: Optional[list[str]] = Field(default=[], description="""Union of all feature-level tags from the plot's GeoJSON features. Aggregated at item level for discoverability. Authoritative per-feature tags remain in each GeoJSON feature's properties.
""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacExtensionProperties', 'StacItemSummary'],
         'slot_uri': 'debrief:feature_tags'} })
    overrides: Optional[list[str]] = Field(default=[], description="""Flat list of field names on item.properties that the analyst has overridden via the Properties Panel. Auto-derivation routines (e.g. stacService.updateTemporalMetadata) MUST skip any field whose name appears here. Sorted alphabetically on write; deduplicated.
""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacExtensionProperties'], 'slot_uri': 'debrief:overrides'} })
    provenance_log: Optional[list[PropertiesProvenanceEntry]] = Field(default=[], description="""Per-commit provenance entries written by the Properties Panel. Bounded at 500 entries per item; overflow rotates to sibling provenance_log_archive.jsonl in the item directory. Append-only (Article III.3 — audit trail immutable).
""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacExtensionProperties'], 'slot_uri': 'debrief:provenance_log'} })


class PlotTimeExtent(ConfiguredBaseModel):
    """
    Temporal extent of a plot expressed as ISO 8601 strings. Used within PlotSummary and StacItemSummary for lightweight display without the full epoch+iso dual representation of TimeInstant.

    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/stac-extension'})

    start: str = Field(default=..., description="""Start of time extent (ISO 8601)""", json_schema_extra = { "linkml_meta": {'domain_of': ['PlotTimeExtent', 'TimeRange', 'TimeFilter']} })
    end: str = Field(default=..., description="""End of time extent (ISO 8601)""", json_schema_extra = { "linkml_meta": {'domain_of': ['PlotTimeExtent', 'TimeRange', 'TimeFilter']} })


class PlotSummary(ConfiguredBaseModel):
    """
    Projection of a STAC Item for UI consumption (e.g., browser tree rows). Carries only the fields required for listing and opening a plot, derived from the STAC Item plus its debrief: extension properties. Replaces the Plot interface from apps/vscode/src/types/plot.ts as the canonical summary type.

    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/stac-extension'})

    id: str = Field(default=..., description="""STAC Item ID""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'Tool',
                       'PlatformRecord',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacCatalog',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'StoryboardProperties',
                       'SceneProperties',
                       'StoryboardFeature',
                       'SceneFeature',
                       'ToolDefinition']} })
    title: str = Field(default=..., description="""Plot title from STAC metadata""", json_schema_extra = { "linkml_meta": {'domain_of': ['PlotSummary',
                       'StacItemSummary',
                       'StacItemProperties',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'DatasetEntry',
                       'SceneProperties',
                       'SceneThumbnailAssetEntry']} })
    datetime: str = Field(default=..., description="""Creation/capture timestamp (ISO 8601)""", json_schema_extra = { "linkml_meta": {'domain_of': ['PlotSummary', 'StacItemSummary', 'StacItemProperties']} })
    item_path: str = Field(default=..., description="""Path to item.json relative to store root""", json_schema_extra = { "linkml_meta": {'domain_of': ['PlotSummary', 'StacItemSummary']} })
    catalog_id: str = Field(default=..., description="""Parent catalog identifier""", json_schema_extra = { "linkml_meta": {'domain_of': ['PlotSummary', 'StacItemSummary']} })
    source_path: Optional[str] = Field(default=None, description="""Original source file path (for provenance)""", json_schema_extra = { "linkml_meta": {'domain_of': ['PlotSummary']} })
    bbox: Optional[list[float]] = Field(default=None, description="""Geographic bounding box as [west, south, east, north]""", min_length=4, max_length=4, json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'SystemStateProperties',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacSpatialExtent',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection']} })
    time_extent: Optional[PlotTimeExtent] = Field(default=None, description="""Temporal extent of the plot (start/end ISO 8601 strings)""", json_schema_extra = { "linkml_meta": {'domain_of': ['PlotSummary']} })
    track_count: Optional[int] = Field(default=None, description="""Number of tracks in this plot""", ge=0, json_schema_extra = { "linkml_meta": {'domain_of': ['PlotSummary']} })
    location_count: Optional[int] = Field(default=None, description="""Number of reference locations in this plot""", ge=0, json_schema_extra = { "linkml_meta": {'domain_of': ['PlotSummary']} })


class StacItemSummary(ConfiguredBaseModel):
    """
    Minimal STAC Item projection for browser tree display and metadata filtering. Unifies StacItemSummary (apps/vscode/src/types/stac.ts) and CatalogOverviewItem (shared/components/src/filter-engine/types.ts) into a single canonical summary type that carries both navigation fields and the full set of debrief: extension properties needed for filtering.

    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/stac-extension'})

    id: str = Field(default=..., description="""STAC Item ID""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'Tool',
                       'PlatformRecord',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacCatalog',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'StoryboardProperties',
                       'SceneProperties',
                       'StoryboardFeature',
                       'SceneFeature',
                       'ToolDefinition']} })
    title: str = Field(default=..., description="""Item title""", json_schema_extra = { "linkml_meta": {'domain_of': ['PlotSummary',
                       'StacItemSummary',
                       'StacItemProperties',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'DatasetEntry',
                       'SceneProperties',
                       'SceneThumbnailAssetEntry']} })
    datetime: Optional[str] = Field(default=None, description="""Single datetime (ISO 8601) — fallback when start/end not available""", json_schema_extra = { "linkml_meta": {'domain_of': ['PlotSummary', 'StacItemSummary', 'StacItemProperties']} })
    item_path: str = Field(default=..., description="""Path to item.json relative to store root""", json_schema_extra = { "linkml_meta": {'domain_of': ['PlotSummary', 'StacItemSummary']} })
    catalog_id: str = Field(default=..., description="""Parent catalog identifier""", json_schema_extra = { "linkml_meta": {'domain_of': ['PlotSummary', 'StacItemSummary']} })
    store_id: str = Field(default=..., description="""Parent store identifier (needed for URI construction)""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacItemSummary']} })
    bbox: Optional[list[float]] = Field(default=None, description="""Geographic bounding box as [west, south, east, north]""", min_length=4, max_length=4, json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'SystemStateProperties',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacSpatialExtent',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection']} })
    start_datetime: Optional[str] = Field(default=None, description="""Range start datetime (ISO 8601)""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacItemSummary', 'StacItemProperties']} })
    end_datetime: Optional[str] = Field(default=None, description="""Range end datetime (ISO 8601)""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacItemSummary', 'StacItemProperties']} })
    platforms: Optional[list[PlatformRecord]] = Field(default=[], description="""Fully-resolved per-platform metadata array for filtering. Same structure as StacExtensionProperties.platforms.
""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacExtensionProperties', 'StacItemSummary']} })
    tags: Optional[list[str]] = Field(default=[], description="""Plot-level tags from debrief:tags""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'StacExtensionProperties',
                       'StacItemSummary']} })
    feature_tags: Optional[list[str]] = Field(default=[], description="""Feature-level tags from debrief:feature_tags""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacExtensionProperties', 'StacItemSummary']} })


class StacProvider(ConfiguredBaseModel):
    """
    STAC provider entry. Captures organisations involved in producing or hosting the asset. STAC 1.1 spec — present in every live preview/workspace/samples/local-store/ item.json under `properties.providers`. Captured explicitly (rather than as a wildcard) because the shape is stable in the STAC spec.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/stac'})

    name: str = Field(default=..., description="""Organization or person responsible for providing the data.""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata',
                       'SensorData',
                       'TUAData',
                       'PointMetadataEntry',
                       'ReferenceLocationProperties',
                       'Tool',
                       'ToolParameter',
                       'PlatformRecord',
                       'StacProvider',
                       'LevelDefinition',
                       'DatasetSeries',
                       'StoryboardProperties',
                       'MCPToolDefinition',
                       'ToolDefinition']} })
    description: Optional[str] = Field(default=None, description="""Optional human-readable description.""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'Tool',
                       'ToolParameter',
                       'StacProvider',
                       'StacItemProperties',
                       'StacCatalog',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'LevelDefinition',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPParamSchema',
                       'MCPToolDefinition',
                       'ToolDefinition']} })
    roles: Optional[list[str]] = Field(default=[], description="""Roles played by this provider — \"licensor\", \"producer\", \"processor\", or \"host\".""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacProvider',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'SceneThumbnailAssetEntry']} })
    url: Optional[str] = Field(default=None, description="""Provider homepage / contact URL.""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacProvider']} })


class StacItemProperties(StacExtensionProperties):
    """
    STAC Item `properties` block. Carries STAC-spec core fields (`datetime`, `start_datetime?`, `end_datetime?`, `title?`, `description?`, `license?`, `providers?`, `created?`, `updated?`) and mixes in `StacExtensionProperties` from stac-extension.yaml for the `debrief:*` extension fields (Research R-003).
    Open-record per Article XV.2 — the generator post-processor at `shared/schemas/scripts/generate.py` adds Pydantic `model_config = ConfigDict(extra='allow', ...)` and TypeScript `[key: string]: unknown` so additional `<extension>:<key>` keys (`processing:*`, `proj:*`, future extensions) pass through without rejection. Consumers narrow per extension via per-extension Zod / type-guard helpers (the pattern already established for `debrief:platforms`).
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/stac',
         'mixins': ['StacExtensionProperties']})
    model_config = ConfigDict(
        extra='allow',
        serialize_by_alias=True,
        validate_by_name=True,
        validate_assignment=True,
        validate_default=True,
        arbitrary_types_allowed=True,
        use_enum_values=True,
    )

    datetime: str = Field(default=..., description="""Item datetime per STAC spec (ISO 8601). May be null when start_datetime + end_datetime are set; the live fixtures always carry a non-null value so it is modelled as required string.""", json_schema_extra = { "linkml_meta": {'domain_of': ['PlotSummary', 'StacItemSummary', 'StacItemProperties']} })
    start_datetime: Optional[str] = Field(default=None, description="""ISO 8601 range start. Required when datetime is null.""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacItemSummary', 'StacItemProperties']} })
    end_datetime: Optional[str] = Field(default=None, description="""ISO 8601 range end. Required when datetime is null.""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacItemSummary', 'StacItemProperties']} })
    title: Optional[str] = Field(default=None, description="""Human-readable plot title.""", json_schema_extra = { "linkml_meta": {'domain_of': ['PlotSummary',
                       'StacItemSummary',
                       'StacItemProperties',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'DatasetEntry',
                       'SceneProperties',
                       'SceneThumbnailAssetEntry']} })
    description: Optional[str] = Field(default=None, description="""Human-readable plot description.""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'Tool',
                       'ToolParameter',
                       'StacProvider',
                       'StacItemProperties',
                       'StacCatalog',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'LevelDefinition',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPParamSchema',
                       'MCPToolDefinition',
                       'ToolDefinition']} })
    license: Optional[str] = Field(default=None, description="""SPDX identifier or \"other\" (STAC 1.1 addition).""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacItemProperties', 'StacCollection']} })
    providers: Optional[list[StacProvider]] = Field(default=[], description="""Organisations involved in producing / hosting this plot. STAC 1.1 addition; present on every live preview/workspace/samples item.""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacItemProperties', 'StacCollection']} })
    created: Optional[str] = Field(default=None, description="""Processing-time creation timestamp (ISO 8601).""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacItemProperties']} })
    updated: Optional[str] = Field(default=None, description="""Processing-time last-update timestamp (ISO 8601).""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacItemProperties']} })
    platforms: Optional[list[PlatformRecord]] = Field(default=[], description="""Fully-resolved per-platform metadata array. Each entry represents one platform in the plot with merged registry + override data.
""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacExtensionProperties', 'StacItemSummary'],
         'slot_uri': 'debrief:platforms'} })
    tags: Optional[list[str]] = Field(default=[], description="""Plot-level tags — free-text labels applied to the entire plot by the analyst. Trimmed non-empty strings with no duplicates.
""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'StacExtensionProperties',
                       'StacItemSummary'],
         'slot_uri': 'debrief:tags'} })
    feature_tags: Optional[list[str]] = Field(default=[], description="""Union of all feature-level tags from the plot's GeoJSON features. Aggregated at item level for discoverability. Authoritative per-feature tags remain in each GeoJSON feature's properties.
""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacExtensionProperties', 'StacItemSummary'],
         'slot_uri': 'debrief:feature_tags'} })
    overrides: Optional[list[str]] = Field(default=[], description="""Flat list of field names on item.properties that the analyst has overridden via the Properties Panel. Auto-derivation routines (e.g. stacService.updateTemporalMetadata) MUST skip any field whose name appears here. Sorted alphabetically on write; deduplicated.
""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacExtensionProperties'], 'slot_uri': 'debrief:overrides'} })
    provenance_log: Optional[list[PropertiesProvenanceEntry]] = Field(default=[], description="""Per-commit provenance entries written by the Properties Panel. Bounded at 500 entries per item; overflow rotates to sibling provenance_log_archive.jsonl in the item directory. Append-only (Article III.3 — audit trail immutable).
""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacExtensionProperties'], 'slot_uri': 'debrief:provenance_log'} })


class StacItem(ConfiguredBaseModel):
    """
    A STAC 1.1 Item describing one plot. Closes audit §3.1 rows for `apps/vscode/src/types/stac.ts`, `apps/vscode/src/services/sceneThumbnailService.ts`, and `apps/web-shell/src/mocks/stacService.ts`. Persisted to `<store>/<catalog>/<plot-slug>/item.json`.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/stac'})

    type: Literal["Feature"] = Field(default=..., description="""STAC discriminator — always \"Feature\" for Items.""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage'],
         'equals_string': 'Feature'} })
    stac_version: str = Field(default=..., description="""STAC version string — \"1.0.0\" or \"1.1.0\" (Research R-005).""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacItem', 'StacCatalog', 'StacCollection']} })
    stac_extensions: Optional[list[str]] = Field(default=[], description="""Optional STAC extension schema URIs. Absent on STAC 1.0 fixtures, present on STAC 1.1 fixtures (Research R-005).""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacItem', 'StacCatalog', 'StacCollection']} })
    id: str = Field(default=..., description="""Item identifier (slug, UUID, or composite).""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'Tool',
                       'PlatformRecord',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacCatalog',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'StoryboardProperties',
                       'SceneProperties',
                       'StoryboardFeature',
                       'SceneFeature',
                       'ToolDefinition']} })
    geometry: Union[GeoJSONEmptyPoint, GeoJSONLineString, GeoJSONMultiLineString, GeoJSONMultiPoint, GeoJSONMultiPolygon, GeoJSONPoint, GeoJSONPolygon] = Field(default=..., description="""GeoJSON geometry — any_of union over the seven existing geometry classes in geojson.yaml. Reuses the same pattern as RawGeoJSONFeature.geometry.""", json_schema_extra = { "linkml_meta": {'any_of': [{'range': 'GeoJSONPoint'},
                    {'range': 'GeoJSONEmptyPoint'},
                    {'range': 'GeoJSONLineString'},
                    {'range': 'GeoJSONPolygon'},
                    {'range': 'GeoJSONMultiPoint'},
                    {'range': 'GeoJSONMultiLineString'},
                    {'range': 'GeoJSONMultiPolygon'}],
         'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })
    bbox: list[float] = Field(default=..., description="""Bounding box — either [west, south, east, north] (4-element 2D) or [west, south, min_alt, east, north, max_alt] (6-element 3D). Live fixtures use 4-element 2D (Research R-004).""", min_length=4, max_length=6, json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'SystemStateProperties',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacSpatialExtent',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection']} })
    properties: StacItemProperties = Field(default=..., description="""STAC Item properties — core fields + debrief: extension + open-record additional keys (Research R-002 / R-003).""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })
    links: list[StacLink] = Field(default=..., description="""Catalog navigation links (`self`, `root`, `parent`, `derived_from`, etc.). Order is preserved.""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacItem', 'StacCatalog', 'StacCollection']} })
    assets: dict[str, StacAsset] = Field(default=..., description="""Asset map keyed by arbitrary string (`features`, `thumbnail`, `overview`, `source-<id>`, `scene-thumbnail-<id>`). Open-record per Research R-002 — modelled as `range: Any` here because the STAC wire format is a dict, not a list. The generator post-processor rewrites this to `dict[str, StacAsset]` (Pydantic) and `Record<string, StacAsset>` (TypeScript).""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacItem']} })
    collection: Optional[str] = Field(default=None, description="""Parent Collection ID, when the Item belongs to a Collection (STAC 1.1 optional field).""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacItem']} })


class StacCatalog(ConfiguredBaseModel):
    """
    A flat STAC Catalog (no extent, no summaries). Closes audit §3.1 rows for `apps/vscode/src/types/stac.ts` and `apps/web-shell/src/mocks/stacService.ts`. Persisted to `<store>/<catalog>/catalog.json` for stores not upgraded to STAC 1.1 Collection.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/stac'})

    type: Literal["Catalog"] = Field(default=..., description="""STAC discriminator — always \"Catalog\" for flat Catalogs.""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage'],
         'equals_string': 'Catalog'} })
    stac_version: str = Field(default=..., description="""STAC version string (\"1.0.0\" or \"1.1.0\").""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacItem', 'StacCatalog', 'StacCollection']} })
    stac_extensions: Optional[list[str]] = Field(default=[], description="""Optional STAC extension schema URIs.""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacItem', 'StacCatalog', 'StacCollection']} })
    id: str = Field(default=..., description="""Catalog identifier.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'Tool',
                       'PlatformRecord',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacCatalog',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'StoryboardProperties',
                       'SceneProperties',
                       'StoryboardFeature',
                       'SceneFeature',
                       'ToolDefinition']} })
    title: Optional[str] = Field(default=None, description="""Human-readable catalog title.""", json_schema_extra = { "linkml_meta": {'domain_of': ['PlotSummary',
                       'StacItemSummary',
                       'StacItemProperties',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'DatasetEntry',
                       'SceneProperties',
                       'SceneThumbnailAssetEntry']} })
    description: str = Field(default=..., description="""STAC-mandated catalog description.""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'Tool',
                       'ToolParameter',
                       'StacProvider',
                       'StacItemProperties',
                       'StacCatalog',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'LevelDefinition',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPParamSchema',
                       'MCPToolDefinition',
                       'ToolDefinition']} })
    links: list[StacLink] = Field(default=..., description="""Catalog navigation links — `self`, `root`, `parent`, and one `item` per child Item.""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacItem', 'StacCatalog', 'StacCollection']} })


class StacLink(ConfiguredBaseModel):
    """
    A single link entry within `links[]`. Used by StacItem, StacCatalog, and StacCollection. Closes R4-masked audit row for `apps/vscode/src/types/stac.ts`.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/stac'})

    rel: str = Field(default=..., description="""Link relation (`self`, `root`, `parent`, `item`, `child`, `derived_from`, etc.).""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacLink']} })
    href: str = Field(default=..., description="""URI (relative or absolute) to the linked resource.""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacLink',
                       'StacAsset',
                       'ToolResultAnnotations',
                       'SceneThumbnailAssetEntry']} })
    type: Optional[str] = Field(default=None, description="""IANA media type of the linked resource.""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage']} })
    title: Optional[str] = Field(default=None, description="""Human-readable link title.""", json_schema_extra = { "linkml_meta": {'domain_of': ['PlotSummary',
                       'StacItemSummary',
                       'StacItemProperties',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'DatasetEntry',
                       'SceneProperties',
                       'SceneThumbnailAssetEntry']} })


class StacAsset(ConfiguredBaseModel):
    """
    A single asset entry within `assets[<key>]`. Closes R4-masked audit row for `apps/vscode/src/types/stac.ts` and the inline `StacItemAssets` alias at `apps/vscode/src/services/sceneThumbnailService.ts`.
    Open-record per Article XV.2 — accepts arbitrary extension keys (`file:checksum`, `file:size`, `processing:datetime`, `processing:software`, `proj:shape`, `debrief:provenance`, `debrief:toolId`, `debrief:sourceFeatures`) observed in the live fixtures. The generator post-processes this into Pydantic `extra='allow'` and TypeScript `[key: string]: unknown`.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/stac'})
    model_config = ConfigDict(
        extra='allow',
        serialize_by_alias=True,
        validate_by_name=True,
        validate_assignment=True,
        validate_default=True,
        arbitrary_types_allowed=True,
        use_enum_values=True,
    )

    href: str = Field(default=..., description="""URI to the asset. Required on `StacItem.assets[<key>]` — STAC 1.1 mandates a concrete URI on Item assets. The declaration-only shape on `StacCollection.item_assets[<key>]` (no `href`) is covered by the sibling `StacItemAssetDefinition` class.""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacLink',
                       'StacAsset',
                       'ToolResultAnnotations',
                       'SceneThumbnailAssetEntry']} })
    type: Optional[str] = Field(default=None, description="""IANA media type.""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage']} })
    title: Optional[str] = Field(default=None, description="""Human-readable asset title.""", json_schema_extra = { "linkml_meta": {'domain_of': ['PlotSummary',
                       'StacItemSummary',
                       'StacItemProperties',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'DatasetEntry',
                       'SceneProperties',
                       'SceneThumbnailAssetEntry']} })
    description: Optional[str] = Field(default=None, description="""Asset description (STAC 1.1 addition).""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'Tool',
                       'ToolParameter',
                       'StacProvider',
                       'StacItemProperties',
                       'StacCatalog',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'LevelDefinition',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPParamSchema',
                       'MCPToolDefinition',
                       'ToolDefinition']} })
    roles: Optional[list[str]] = Field(default=[], description="""Asset roles — \"data\", \"thumbnail\", \"overview\", \"source\", \"result\", etc.""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacProvider',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'SceneThumbnailAssetEntry']} })


class StacItemAssetDefinition(ConfiguredBaseModel):
    """
    Item Asset Definition Object — declares the shape of an asset that child Items in a Collection are expected to carry. Distinct from `StacAsset` because it does NOT carry an `href`; the asset URI lives on the concrete Item assets that conform to this template (see STAC 1.1 Item Asset Definition spec).
    Open-record per Article XV.2 — same boundary-loose semantics as `StacAsset` so item-asset declarations may carry extension keys. The generator post-processes this class with Pydantic `extra='allow'` and TypeScript `[key: string]: unknown`.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/stac'})
    model_config = ConfigDict(
        extra='allow',
        serialize_by_alias=True,
        validate_by_name=True,
        validate_assignment=True,
        validate_default=True,
        arbitrary_types_allowed=True,
        use_enum_values=True,
    )

    type: Optional[str] = Field(default=None, description="""IANA media type expected on child Item assets.""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage']} })
    title: Optional[str] = Field(default=None, description="""Human-readable asset title.""", json_schema_extra = { "linkml_meta": {'domain_of': ['PlotSummary',
                       'StacItemSummary',
                       'StacItemProperties',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'DatasetEntry',
                       'SceneProperties',
                       'SceneThumbnailAssetEntry']} })
    description: Optional[str] = Field(default=None, description="""Asset description.""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'Tool',
                       'ToolParameter',
                       'StacProvider',
                       'StacItemProperties',
                       'StacCatalog',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'LevelDefinition',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPParamSchema',
                       'MCPToolDefinition',
                       'ToolDefinition']} })
    roles: Optional[list[str]] = Field(default=[], description="""Asset roles expected on child Item assets.""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacProvider',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'SceneThumbnailAssetEntry']} })


class StacSpatialExtent(ConfiguredBaseModel):
    """
    Spatial extent on a Collection. The wire shape is `{ \"bbox\": [[west, south, east, north], ...] }` — a list of bounding-box arrays. LinkML emits a flat `list[float]` / `number[]` which the post-processor in `shared/schemas/scripts/generate.py` rewrites to nested list-of-lists per Research R-011 (same precedent as GeoJSON coordinates).
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/stac'})

    bbox: list[list[float]] = Field(default=..., description="""List of bounding-box arrays `[[w, s, e, n], ...]`. Each inner array is 4-element 2D or 6-element 3D.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'SystemStateProperties',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacSpatialExtent',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection']} })


class StacTemporalExtent(ConfiguredBaseModel):
    """
    Temporal extent on a Collection. The wire shape is `{ \"interval\": [[start, end], ...] }` — a list of `[start_iso, end_iso]` pairs (either side may be null per STAC spec). LinkML emits a flat `list[string]` which the post-processor rewrites to nested list-of-lists per Research R-011.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/stac'})

    interval: list[list[Optional[str]]] = Field(default=..., description="""List of `[start_datetime, end_datetime]` pairs. Either side may be null (unbounded).""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacTemporalExtent']} })


class StacExtent(ConfiguredBaseModel):
    """
    Spatial + temporal extent on a Collection. Closes R4-masked audit row for `apps/vscode/src/types/stac.ts`.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/stac'})

    spatial: StacSpatialExtent = Field(default=..., description="""Spatial extent — one or more bounding boxes.""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacExtent', 'SessionState', 'SessionFile']} })
    temporal: StacTemporalExtent = Field(default=..., description="""Temporal extent — one or more start/end intervals.""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacExtent', 'SessionState', 'SessionFile']} })


class StacSummaries(ConfiguredBaseModel):
    """
    Pre-aggregated extension summaries on a Collection. Closes R4-masked audit row for `apps/vscode/src/types/stac.ts`. Carries the debrief: extension summary fields plus open-record additional keys (Article XV.2 exception).
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/stac'})
    model_config = ConfigDict(
        extra='allow',
        serialize_by_alias=True,
        validate_by_name=True,
        validate_assignment=True,
        validate_default=True,
        arbitrary_types_allowed=True,
        use_enum_values=True,
    )

    debrief_platforms: Optional[list[PlatformRecord]] = Field(default=[], description="""Aggregated per-platform metadata across all Items in the Collection. Same shape as StacExtensionProperties.platforms. Disk key is `debrief:platforms` (colon syntax preserved via slot_uri).""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacSummaries'], 'slot_uri': 'debrief:platforms'} })
    debrief_tags: Optional[list[str]] = Field(default=[], description="""Aggregated plot-level tags across all Items in the Collection. Disk key is `debrief:tags`.""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacSummaries'], 'slot_uri': 'debrief:tags'} })
    debrief_feature_tags: Optional[list[str]] = Field(default=[], description="""Aggregated feature-level tags across all Items in the Collection. Disk key is `debrief:feature_tags`.""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacSummaries'], 'slot_uri': 'debrief:feature_tags'} })


class StacCollection(ConfiguredBaseModel):
    """
    A STAC 1.1 Collection — flat Catalog plus license, extent, optional summaries, optional providers, optional item_assets. Closes R4-masked audit row for `apps/vscode/src/types/stac.ts`. Persisted to `<store>/<catalog>/catalog.json` for stores upgraded to STAC 1.1.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/stac'})

    type: Literal["Collection"] = Field(default=..., description="""STAC discriminator — always \"Collection\".""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage'],
         'equals_string': 'Collection'} })
    stac_version: str = Field(default=..., description="""STAC version string (always \"1.1.0\" in current fixtures).""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacItem', 'StacCatalog', 'StacCollection']} })
    stac_extensions: Optional[list[str]] = Field(default=[], description="""Optional STAC extension schema URIs.""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacItem', 'StacCatalog', 'StacCollection']} })
    id: str = Field(default=..., description="""Collection identifier.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'Tool',
                       'PlatformRecord',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacCatalog',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'StoryboardProperties',
                       'SceneProperties',
                       'StoryboardFeature',
                       'SceneFeature',
                       'ToolDefinition']} })
    title: Optional[str] = Field(default=None, description="""Human-readable collection title.""", json_schema_extra = { "linkml_meta": {'domain_of': ['PlotSummary',
                       'StacItemSummary',
                       'StacItemProperties',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'DatasetEntry',
                       'SceneProperties',
                       'SceneThumbnailAssetEntry']} })
    description: str = Field(default=..., description="""STAC-mandated collection description.""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'Tool',
                       'ToolParameter',
                       'StacProvider',
                       'StacItemProperties',
                       'StacCatalog',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'LevelDefinition',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPParamSchema',
                       'MCPToolDefinition',
                       'ToolDefinition']} })
    license: str = Field(default=..., description="""SPDX identifier or \"other\" (STAC 1.1 mandates this).""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacItemProperties', 'StacCollection']} })
    extent: StacExtent = Field(default=..., description="""Spatial + temporal extent.""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacCollection']} })
    summaries: Optional[StacSummaries] = Field(default=None, description="""Optional pre-aggregated extension summaries (open-record per Research R-002).""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacCollection']} })
    providers: Optional[list[StacProvider]] = Field(default=[], description="""Organisations involved in producing / hosting this collection (STAC 1.1 addition).""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacItemProperties', 'StacCollection']} })
    item_assets: Optional[dict[str, StacItemAssetDefinition]] = Field(default=None, description="""Optional Item-asset declarations (STAC 1.1 addition). Each entry is a `StacItemAssetDefinition` (no `href`) — distinct from the concrete `StacAsset` shape used by `StacItem.assets[<key>]`. The generator post-processor rewrites this to `dict[str, StacItemAssetDefinition]` (Pydantic) / `Record<string, StacItemAssetDefinition>` (TypeScript) so the call site narrows correctly.""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacCollection']} })
    links: list[StacLink] = Field(default=..., description="""Collection navigation links — `self`, `root`, `parent`, `item` entries pointing at child Items.""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacItem', 'StacCatalog', 'StacCollection']} })


class RawGeoJSONFeature(ConfiguredBaseModel):
    """
    Parse-boundary GeoJSON Feature (RFC 7946 §3.2). Consumers narrow this to a domain feature (TrackFeature, ReferenceLocation, SystemState, MultiPointFeature, MultiPolygonFeature) after validating the properties.kind discriminator. Narrowing is done via the existing isDebriefFeature / isTrackFeature / isReferenceLocation type guards in @debrief/schemas/unions.ts (TypeScript) and debrief_schemas.unions (Python). Note: geometry is REQUIRED — callers handling possibly-null geometry payloads (e.g. NarrativeEntry features) either narrow at the parse boundary or defer to the domain-specific feature class that allows the looser shape (see ADR-021 for the ingress-coercion deferral).
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/raw-geojson'})

    type: Literal["Feature"] = Field(default=..., description="""GeoJSON object type — always \"Feature\".""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage'],
         'equals_string': 'Feature'} })
    id: Optional[Union[int, str]] = Field(default=None, description="""Optional feature identifier. RFC 7946 permits either a string or an integer; both are retained without coercion.""", json_schema_extra = { "linkml_meta": {'any_of': [{'range': 'string'}, {'range': 'integer'}],
         'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'Tool',
                       'PlatformRecord',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacCatalog',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'StoryboardProperties',
                       'SceneProperties',
                       'StoryboardFeature',
                       'SceneFeature',
                       'ToolDefinition']} })
    geometry: Union[GeoJSONEmptyPoint, GeoJSONLineString, GeoJSONMultiLineString, GeoJSONMultiPoint, GeoJSONMultiPolygon, GeoJSONPoint, GeoJSONPolygon] = Field(default=..., description="""GeoJSON geometry — any_of union over the seven existing geometry classes in geojson.yaml (GeoJSONPoint, GeoJSONEmptyPoint, GeoJSONLineString, GeoJSONPolygon, GeoJSONMultiPoint, GeoJSONMultiLineString, GeoJSONMultiPolygon). Pydantic validates via try-each-alternative; observed cost is ~25µs per feature (10 000 features in ~250ms).""", json_schema_extra = { "linkml_meta": {'any_of': [{'range': 'GeoJSONPoint'},
                    {'range': 'GeoJSONEmptyPoint'},
                    {'range': 'GeoJSONLineString'},
                    {'range': 'GeoJSONPolygon'},
                    {'range': 'GeoJSONMultiPoint'},
                    {'range': 'GeoJSONMultiLineString'},
                    {'range': 'GeoJSONMultiPolygon'}],
         'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })
    properties: Optional[dict[str, object]] = Field(default=None, description="""Free-form properties dictionary. Consumers narrow to a domain properties class (TrackProperties, ReferenceLocationProperties, etc.) after validating the kind discriminator. May be absent or null per RFC 7946 §3.2.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })
    bbox: Optional[list[float]] = Field(default=[], description="""Optional bounding box. Either [minLon, minLat, maxLon, maxLat] (length 4) or [minLon, minLat, minAlt, maxLon, maxLat, maxAlt] (length 6).""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'SystemStateProperties',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacSpatialExtent',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection']} })


class RawGeoJSONFeatureCollection(ConfiguredBaseModel):
    """
    Parse-boundary GeoJSON FeatureCollection (RFC 7946 §3.3). Used by STAC item payloads and tool-result layers before narrowing.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/raw-geojson'})

    type: Literal["FeatureCollection"] = Field(default=..., description="""GeoJSON object type — always \"FeatureCollection\".""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage'],
         'equals_string': 'FeatureCollection'} })
    features: list[RawGeoJSONFeature] = Field(default=..., description="""The collection's features, in document order.""", json_schema_extra = { "linkml_meta": {'domain_of': ['RawGeoJSONFeatureCollection',
                       'SessionState',
                       'SessionFile',
                       'ToolResultForLog',
                       'ToolExecutionResultForReplay']} })
    bbox: Optional[list[float]] = Field(default=[], description="""Optional bounding box, shaped as in RawGeoJSONFeature.bbox.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'SystemStateProperties',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacSpatialExtent',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection']} })


class TimeInstant(ConfiguredBaseModel):
    """
    A point in time with dual representations (FR-032, FR-033)
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/session-state'})

    epoch: int = Field(default=..., description="""Milliseconds since Unix epoch""", json_schema_extra = { "linkml_meta": {'domain_of': ['TimeInstant']} })
    iso: str = Field(default=..., description="""ISO 8601 UTC format string""", json_schema_extra = { "linkml_meta": {'domain_of': ['TimeInstant']} })

    @field_validator('iso')
    def pattern_iso(cls, v):
        pattern=re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$")
        if isinstance(v, list):
            for element in v:
                if isinstance(element, str) and not pattern.match(element):
                    err_msg = f"Invalid iso format: {element}"
                    raise ValueError(err_msg)
        elif isinstance(v, str) and not pattern.match(v):
            err_msg = f"Invalid iso format: {v}"
            raise ValueError(err_msg)
        return v


class TimeRange(ConfiguredBaseModel):
    """
    Time interval for a time-range Scene (#263). The interval is closed on both ends. `end` MUST be strictly greater than `start`. Introduced by Spec #263 to make `SceneProperties.time_range` a first-class slot.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/storyboard'})

    start: datetime  = Field(default=..., description="""ISO-8601 instant; the slider position at the first capture action. By convention CRUD writes the owning Scene's `timestamp` into this slot, but the system does not depend on the two being equal — ordering reads `time_range?.start ?? timestamp`.""", json_schema_extra = { "linkml_meta": {'domain_of': ['PlotTimeExtent', 'TimeRange', 'TimeFilter']} })
    end: datetime  = Field(default=..., description="""ISO-8601 instant; the slider position at the second (confirm) capture action. MUST be strictly greater than `start`.""", json_schema_extra = { "linkml_meta": {'domain_of': ['PlotTimeExtent', 'TimeRange', 'TimeFilter']} })


class TimeFilter(ConfiguredBaseModel):
    """
    Constraints on the visible time window (epoch milliseconds; null = unbounded)
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/session-state'})

    start: Optional[int] = Field(default=None, description="""Filter start as epoch milliseconds (null/missing = unbounded on the start)""", json_schema_extra = { "linkml_meta": {'domain_of': ['PlotTimeExtent', 'TimeRange', 'TimeFilter']} })
    end: Optional[int] = Field(default=None, description="""Filter end as epoch milliseconds (null/missing = unbounded on the end)""", json_schema_extra = { "linkml_meta": {'domain_of': ['PlotTimeExtent', 'TimeRange', 'TimeFilter']} })


class TimeStep(ConfiguredBaseModel):
    """
    Step size for discrete time navigation (FR-008)
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/session-state'})

    value: float = Field(default=..., description="""Numeric step value""", ge=0, json_schema_extra = { "linkml_meta": {'domain_of': ['ParameterValue', 'TimeStep', 'ToolParameterMeta']} })
    unit: TimeUnitEnum = Field(default=..., description="""Unit of the step""", json_schema_extra = { "linkml_meta": {'domain_of': ['TimeStep']} })


class Coordinate(ConfiguredBaseModel):
    """
    A geographic coordinate [longitude, latitude]
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/session-state'})

    longitude: float = Field(default=..., description="""Longitude in degrees (-180 to 180)""", ge=-180, le=180, json_schema_extra = { "linkml_meta": {'domain_of': ['Coordinate']} })
    latitude: float = Field(default=..., description="""Latitude in degrees (-90 to 90)""", ge=-90, le=90, json_schema_extra = { "linkml_meta": {'domain_of': ['Coordinate']} })


class ViewportPolygon(ConfiguredBaseModel):
    """
    Geographic area as a 4-corner polygon supporting rotated views (FR-012, FR-013)
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/session-state'})

    coordinates: list[Coordinate] = Field(default=..., description="""Four corners in clockwise order [NW, NE, SE, SW]""", min_length=4, max_length=4, json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'ViewportPolygon']} })
    zoom: Optional[float] = Field(default=None, description="""Map zoom level for restoring the view (optional)""", json_schema_extra = { "linkml_meta": {'domain_of': ['SystemStateProperties', 'ViewportPolygon', 'Viewport']} })


class LevelDefinition(ConfiguredBaseModel):
    """
    Named nesting level within a feature hierarchy (Feature 053, FR-010). Defines how addresses at this level are interpreted.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/session-state'})

    name: str = Field(default=..., description="""Level identifier used in selection paths""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata',
                       'SensorData',
                       'TUAData',
                       'PointMetadataEntry',
                       'ReferenceLocationProperties',
                       'Tool',
                       'ToolParameter',
                       'PlatformRecord',
                       'StacProvider',
                       'LevelDefinition',
                       'DatasetSeries',
                       'StoryboardProperties',
                       'MCPToolDefinition',
                       'ToolDefinition']} })
    addressingMode: AddressingMode = Field(default=..., description="""How addresses at this level are interpreted""", json_schema_extra = { "linkml_meta": {'domain_of': ['LevelDefinition']} })
    description: Optional[str] = Field(default=None, description="""Human-readable description""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'Tool',
                       'ToolParameter',
                       'StacProvider',
                       'StacItemProperties',
                       'StacCatalog',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'LevelDefinition',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPParamSchema',
                       'MCPToolDefinition',
                       'ToolDefinition']} })


class FeatureSelection(ConfiguredBaseModel):
    """
    Set of selected feature identifiers with metadata (FR-017). featureIds accepts selection path strings: forward-slash-separated segments following RFC 6901 escaping. A single-segment path is a flat feature ID (backward compatible). Feature 053.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/session-state'})

    featureIds: list[str] = Field(default=..., description="""Selected feature paths. Each entry is a forward-slash-separated selection path (e.g. \"track-001/positions/4\") or a flat feature ID.""", json_schema_extra = { "linkml_meta": {'domain_of': ['FeatureSelection']} })
    primary: Optional[str] = Field(default=None, description="""Primary selection path for properties display""", json_schema_extra = { "linkml_meta": {'domain_of': ['FeatureSelection']} })
    timestamp: TimeInstant = Field(default=..., description="""When selection was made""", json_schema_extra = { "linkml_meta": {'domain_of': ['LogEntry',
                       'TuneAnnotation',
                       'FileProvEntry',
                       'PropertiesProvenanceEntry',
                       'FeatureSelection',
                       'SceneProperties']} })


class TemporalSlice(ConfiguredBaseModel):
    """
    Time-related state including navigation, playback, and filtering
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/session-state'})

    currentTime: Optional[TimeInstant] = Field(default=None, description="""Current playback/display time (FR-005)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TemporalSlice']} })
    timeRange: Optional[TimeRange] = Field(default=None, description="""Full temporal extent of loaded data (FR-006)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TemporalSlice']} })
    timeFilter: Optional[TimeFilter] = Field(default=None, description="""Optional visible time window constraint (FR-007)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TemporalSlice']} })
    stepSize: TimeStep = Field(default=..., description="""Step size for discrete navigation (FR-008)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TemporalSlice']} })
    playbackRate: float = Field(default=..., description="""Playback speed multiplier 0.1-100x (FR-009)""", ge=0.1, le=100.0, json_schema_extra = { "linkml_meta": {'domain_of': ['TemporalSlice']} })
    playbackState: PlaybackStateEnum = Field(default=..., description="""Current playback state - ephemeral (FR-010)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TemporalSlice']} })
    displayMode: DisplayModeEnum = Field(default=..., description="""Track visualization mode (FR-011)""", json_schema_extra = { "linkml_meta": {'domain_of': ['TemporalSlice']} })


class SpatialSlice(ConfiguredBaseModel):
    """
    Geographic view state for the map display
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/session-state'})

    viewport: Optional[ViewportPolygon] = Field(default=None, description="""Visible map area as 4-corner polygon (FR-012)""", json_schema_extra = { "linkml_meta": {'domain_of': ['SpatialSlice', 'SceneProperties']} })
    rotation: float = Field(default=..., description="""Map rotation in degrees 0-360 (FR-013)""", ge=0, le=360, json_schema_extra = { "linkml_meta": {'domain_of': ['SpatialSlice']} })


class FeaturesSlice(ConfiguredBaseModel):
    """
    Feature selection and visibility state
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/session-state'})

    featureCollectionUri: Optional[str] = Field(default=None, description="""Reference to external feature collection (FR-016)""", json_schema_extra = { "linkml_meta": {'domain_of': ['FeaturesSlice']} })
    selection: FeatureSelection = Field(default=..., description="""Currently selected features (FR-017)""", json_schema_extra = { "linkml_meta": {'domain_of': ['FeaturesSlice']} })
    hiddenFeatureIds: Optional[list[str]] = Field(default=[], description="""Features hidden from display (FR-018)""", json_schema_extra = { "linkml_meta": {'domain_of': ['FeaturesSlice']} })


class DocumentSlice(ConfiguredBaseModel):
    """
    Editor lifecycle state including dirty tracking and undo history
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/session-state'})

    dirty: bool = Field(default=..., description="""Unsaved changes exist - ephemeral (FR-020)""", json_schema_extra = { "linkml_meta": {'domain_of': ['DocumentSlice']} })
    savePath: Optional[str] = Field(default=None, description="""Last save location""", json_schema_extra = { "linkml_meta": {'domain_of': ['DocumentSlice']} })


class LastToolExecution(ConfiguredBaseModel):
    """
    Record of the last tool execution, enabling single-step undo. Feature 110-tool-level-undo-gap.

    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/session-state'})

    tool_id: str = Field(default=..., description="""Identifier of the tool that was executed""", json_schema_extra = { "linkml_meta": {'domain_of': ['LastToolExecution', 'ToolResultForLog']} })
    source_feature_ids: list[str] = Field(default=..., description="""IDs of the source features the tool operated on""", json_schema_extra = { "linkml_meta": {'domain_of': ['LastToolExecution', 'ToolResultForLog']} })
    result_layer_ids: list[str] = Field(default=..., description="""IDs of the result layers produced by the tool""", json_schema_extra = { "linkml_meta": {'domain_of': ['LastToolExecution']} })


class ResultsSlice(ConfiguredBaseModel):
    """
    Accumulated tool result layers and last-execution record for undo support. Features 109-unify-result-layer-lifecycle and 110-tool-level-undo-gap.

    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/session-state'})

    result_layers: list[RawGeoJSONFeature] = Field(default=..., description="""Accumulated tool result features""", json_schema_extra = { "linkml_meta": {'domain_of': ['ResultsSlice']} })
    last_tool_execution: Optional[LastToolExecution] = Field(default=None, description="""Last tool execution record for single-step undo""", json_schema_extra = { "linkml_meta": {'domain_of': ['ResultsSlice']} })


class BrowserFilterSlice(ConfiguredBaseModel):
    """
    Multi-axis filter state for the STAC browser panel. Manages the metadata filter expression plus active flags for spatial (viewport) and temporal (timeline) filter axes. Feature 132-three-view-sync. Note: spatial bounds and temporal range live in SpatialSlice/TemporalSlice; this slice only tracks the metadata expression and axis-activation flags.

    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/session-state'})

    metadata_filtered_ids: Optional[list[str]] = Field(default=[], description="""Set of exercise IDs passing the current metadata filter. Absent/null means all items pass (no filter applied).
""", json_schema_extra = { "linkml_meta": {'domain_of': ['BrowserFilterSlice']} })
    metadata_expression: Optional[str] = Field(default=None, description="""Serialised CQL2 filter expression from the filter bar, stored as an opaque JSON object (Record<string, unknown>). Absent/null means no filter is active. Stored for debugging and round-trip serialisation.
""", json_schema_extra = { "linkml_meta": {'domain_of': ['BrowserFilterSlice']} })
    spatial_filter_active: bool = Field(default=..., description="""Whether the map viewport is used as a spatial filter""", json_schema_extra = { "linkml_meta": {'domain_of': ['BrowserFilterSlice']} })
    temporal_filter_active: bool = Field(default=..., description="""Whether the timeline range is used as a temporal filter""", json_schema_extra = { "linkml_meta": {'domain_of': ['BrowserFilterSlice']} })


class SessionState(ConfiguredBaseModel):
    """
    Root entity containing all session state slices (FR-001, FR-002)
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/session-state', 'tree_root': True})

    schemaVersion: str = Field(default=..., description="""Schema version for persistence compatibility (FR-026)""", json_schema_extra = { "linkml_meta": {'domain_of': ['SessionState']} })
    temporal: TemporalSlice = Field(default=..., description="""Time-related state""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacExtent', 'SessionState', 'SessionFile']} })
    spatial: SpatialSlice = Field(default=..., description="""Geographic view state""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacExtent', 'SessionState', 'SessionFile']} })
    features: FeaturesSlice = Field(default=..., description="""Feature-related state""", json_schema_extra = { "linkml_meta": {'domain_of': ['RawGeoJSONFeatureCollection',
                       'SessionState',
                       'SessionFile',
                       'ToolResultForLog',
                       'ToolExecutionResultForReplay']} })
    document: DocumentSlice = Field(default=..., description="""Editor state""", json_schema_extra = { "linkml_meta": {'domain_of': ['SessionState']} })

    @field_validator('schemaVersion')
    def pattern_schemaVersion(cls, v):
        pattern=re.compile(r"^\d+\.\d+\.\d+$")
        if isinstance(v, list):
            for element in v:
                if isinstance(element, str) and not pattern.match(element):
                    err_msg = f"Invalid schemaVersion format: {element}"
                    raise ValueError(err_msg)
        elif isinstance(v, str) and not pattern.match(v):
            err_msg = f"Invalid schemaVersion format: {v}"
            raise ValueError(err_msg)
        return v


class SessionFile(ConfiguredBaseModel):
    """
    Persisted session file format (FR-024)
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/session-state'})

    schema: Optional[str] = Field(default=None, alias="$schema", description="""JSON Schema URI""", json_schema_extra = { "linkml_meta": {'domain_of': ['SessionFile']} })
    version: str = Field(default=..., description="""Schema version""", json_schema_extra = { "linkml_meta": {'domain_of': ['Tool', 'SessionFile']} })
    savedAt: str = Field(default=..., description="""When the session was saved (ISO 8601)""", json_schema_extra = { "linkml_meta": {'domain_of': ['SessionFile']} })
    temporal: TemporalSlice = Field(default=..., description="""Temporal state (excluding ephemeral playbackState)""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacExtent', 'SessionState', 'SessionFile']} })
    spatial: SpatialSlice = Field(default=..., description="""Spatial state""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacExtent', 'SessionState', 'SessionFile']} })
    features: FeaturesSlice = Field(default=..., description="""Features state""", json_schema_extra = { "linkml_meta": {'domain_of': ['RawGeoJSONFeatureCollection',
                       'SessionState',
                       'SessionFile',
                       'ToolResultForLog',
                       'ToolExecutionResultForReplay']} })

    @field_validator('version')
    def pattern_version(cls, v):
        pattern=re.compile(r"^\d+\.\d+\.\d+$")
        if isinstance(v, list):
            for element in v:
                if isinstance(element, str) and not pattern.match(element):
                    err_msg = f"Invalid version format: {element}"
                    raise ValueError(err_msg)
        elif isinstance(v, str) and not pattern.match(v):
            err_msg = f"Invalid version format: {v}"
            raise ValueError(err_msg)
        return v


class ResultTypePath(ConfiguredBaseModel):
    """
    Slash-delimited hierarchical type path. Format: {top_type}/{domain}/{specific_type} Example: mutation/track/smoothed

    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.com/schemas/tool-result'})

    path: str = Field(default=..., description="""Full hierarchical path""", json_schema_extra = { "linkml_meta": {'domain_of': ['ResultTypePath']} })

    @field_validator('path')
    def pattern_path(cls, v):
        pattern=re.compile(r"^(mutation|addition|deletion|artifact)/[a-z_]+/[a-z_]+$")
        if isinstance(v, list):
            for element in v:
                if isinstance(element, str) and not pattern.match(element):
                    err_msg = f"Invalid path format: {element}"
                    raise ValueError(err_msg)
        elif isinstance(v, str) and not pattern.match(v):
            err_msg = f"Invalid path format: {v}"
            raise ValueError(err_msg)
        return v


class ToolResultAnnotations(ConfiguredBaseModel):
    """
    Annotations for MCP tool result content items. All results MUST include resultType, sourceFeatures, and label. Deletions MUST include deletedFeatures. Artifacts MUST include href.

    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.com/schemas/tool-result'})

    resultType: str = Field(default=..., description="""Hierarchical result type (e.g., mutation/track/smoothed)""", json_schema_extra = { "linkml_meta": {'domain_of': ['ToolResultAnnotations'], 'slot_uri': 'debrief:resultType'} })
    sourceFeatures: list[str] = Field(default=..., description="""IDs of input features used to generate this result""", min_length=1, json_schema_extra = { "linkml_meta": {'domain_of': ['ToolResultAnnotations'], 'slot_uri': 'debrief:sourceFeatures'} })
    label: str = Field(default=..., description="""Human-readable description of the result""", json_schema_extra = { "linkml_meta": {'domain_of': ['PositionStyleOverride',
                       'SensorContact',
                       'TUASolution',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'ToolResultAnnotations',
                       'DatasetAxisMetadata'],
         'slot_uri': 'debrief:label'} })
    href: Optional[str] = Field(default=None, description="""Relative path to artifact file (REQUIRED for artifacts)""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacLink',
                       'StacAsset',
                       'ToolResultAnnotations',
                       'SceneThumbnailAssetEntry'],
         'slot_uri': 'debrief:href'} })
    deletedFeatures: Optional[list[str]] = Field(default=None, description="""IDs of features removed (REQUIRED for deletions)""", min_length=1, json_schema_extra = { "linkml_meta": {'domain_of': ['ToolResultAnnotations'], 'slot_uri': 'debrief:deletedFeatures'} })

    @field_validator('resultType')
    def pattern_resultType(cls, v):
        pattern=re.compile(r"^(mutation|addition|deletion|artifact)/[a-z_]+/[a-z_]+$")
        if isinstance(v, list):
            for element in v:
                if isinstance(element, str) and not pattern.match(element):
                    err_msg = f"Invalid resultType format: {element}"
                    raise ValueError(err_msg)
        elif isinstance(v, str) and not pattern.match(v):
            err_msg = f"Invalid resultType format: {v}"
            raise ValueError(err_msg)
        return v


class DatasetAxisMetadata(ConfiguredBaseModel):
    """
    Axis label and type metadata for a dataset chart
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.com/schemas/tool-result'})

    label: str = Field(default=..., description="""Human-readable axis label (e.g., \"Time\", \"Range\")""", json_schema_extra = { "linkml_meta": {'domain_of': ['PositionStyleOverride',
                       'SensorContact',
                       'TUASolution',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'ToolResultAnnotations',
                       'DatasetAxisMetadata']} })
    type: str = Field(default=..., description="""Axis data type (temporal, quantitative)""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage']} })
    units: Optional[str] = Field(default=None, description="""Units for the axis values (e.g., \"m\", \"°\")""", json_schema_extra = { "linkml_meta": {'domain_of': ['DatasetAxisMetadata']} })


class DatasetMetadata(ConfiguredBaseModel):
    """
    Chart metadata for a dataset entry
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.com/schemas/tool-result'})

    xAxis: DatasetAxisMetadata = Field(default=..., description="""X-axis metadata""", json_schema_extra = { "linkml_meta": {'domain_of': ['DatasetMetadata']} })
    yAxis: DatasetAxisMetadata = Field(default=..., description="""Y-axis metadata""", json_schema_extra = { "linkml_meta": {'domain_of': ['DatasetMetadata']} })


class DatasetDataPoint(ConfiguredBaseModel):
    """
    A single structured data record within a series or flat dataset. Fields are open-ended (the axes are described by DatasetMetadata) to accommodate any combination of x/y/series-key values produced by tools. At minimum one of x_value or y_value is expected, but additional domain-specific fields (e.g., \"zone\", \"bearing\", \"time\") are allowed.

    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.com/schemas/tool-result'})

    x_value: Optional[str] = Field(default=None, description="""Primary independent-axis value serialised as a string. For temporal axes this is an ISO 8601 datetime; for quantitative axes it is a decimal string; for nominal/ordinal axes it is the category label.
""", json_schema_extra = { "linkml_meta": {'domain_of': ['DatasetDataPoint']} })
    y_value: Optional[str] = Field(default=None, description="""Primary dependent-axis value serialised as a string (decimal or label).
""", json_schema_extra = { "linkml_meta": {'domain_of': ['DatasetDataPoint']} })
    series_key: Optional[str] = Field(default=None, description="""Series discriminator for multi-series datasets (e.g., track name). Absent for single-series (flat) datasets.
""", json_schema_extra = { "linkml_meta": {'domain_of': ['DatasetDataPoint']} })


class DatasetSeries(ConfiguredBaseModel):
    """
    A named data series within a multi-series dataset. Replaces the earlier float[] data field with a list of structured DatasetDataPoint records to match the runtime DataSeries shape from shared/components/src/ChartRenderer/types.ts (Record<string, unknown>[]).

    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.com/schemas/tool-result'})

    name: str = Field(default=..., description="""Series display name (shown in chart legend)""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata',
                       'SensorData',
                       'TUAData',
                       'PointMetadataEntry',
                       'ReferenceLocationProperties',
                       'Tool',
                       'ToolParameter',
                       'PlatformRecord',
                       'StacProvider',
                       'LevelDefinition',
                       'DatasetSeries',
                       'StoryboardProperties',
                       'MCPToolDefinition',
                       'ToolDefinition']} })
    data_points: list[DatasetDataPoint] = Field(default=..., description="""Array of structured data records for this series. Each record carries open x/y/domain fields; see DatasetDataPoint.
""", json_schema_extra = { "linkml_meta": {'domain_of': ['DatasetSeries', 'DatasetEntry']} })


class DatasetEntry(ConfiguredBaseModel):
    """
    Standard envelope for all tool result datasets, matching the runtime DatasetEnvelope interface from shared/components/src/ChartRenderer/types.ts. Exactly one of data_points (flat/single-series) or series (multi-series) should be populated per instance.

    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.com/schemas/tool-result'})

    type: str = Field(default=..., description="""Dataset subtype identifier (e.g., \"zone_histogram\", \"range_bearing_series\")""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage']} })
    title: str = Field(default=..., description="""Human-readable chart title""", json_schema_extra = { "linkml_meta": {'domain_of': ['PlotSummary',
                       'StacItemSummary',
                       'StacItemProperties',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'DatasetEntry',
                       'SceneProperties',
                       'SceneThumbnailAssetEntry']} })
    metadata: DatasetMetadata = Field(default=..., description="""Axis definitions and display hints""", json_schema_extra = { "linkml_meta": {'domain_of': ['DatasetEntry']} })
    data_points: Optional[list[DatasetDataPoint]] = Field(default=[], description="""Flat array of structured data records for histograms and single-series charts. Corresponds to DatasetEnvelope.data (Record<string, unknown>[]). Absent when series is populated.
""", json_schema_extra = { "linkml_meta": {'domain_of': ['DatasetSeries', 'DatasetEntry']} })
    series: Optional[list[DatasetSeries]] = Field(default=[], description="""Named data series for multi-line/multi-series charts. Corresponds to DatasetEnvelope.series (DataSeries[]). Absent when data_points is populated.
""", json_schema_extra = { "linkml_meta": {'domain_of': ['DatasetEntry']} })


class Viewport(ConfiguredBaseModel):
    """
    Camera state sub-record inside a Scene. Captures the map viewport at capture time.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/storyboard'})

    center: list[float] = Field(default=..., description="""[longitude, latitude] in degrees""", min_length=2, max_length=2, json_schema_extra = { "linkml_meta": {'domain_of': ['SystemStateProperties',
                       'CircleAnnotationProperties',
                       'Viewport']} })
    zoom: float = Field(default=..., description="""Leaflet-compatible zoom level""", json_schema_extra = { "linkml_meta": {'domain_of': ['SystemStateProperties', 'ViewportPolygon', 'Viewport']} })
    bearing: float = Field(default=..., description="""Viewport bearing in degrees. MUST be 0 in schema v1 (reserved slot for future rotated viewports).""", ge=0, le=0, json_schema_extra = { "linkml_meta": {'domain_of': ['SensorContact',
                       'TUASolution',
                       'VectorAnnotationProperties',
                       'Viewport']} })


class StoryboardProperties(BaseFeatureProperties):
    """
    Properties class for a Storyboard parent Feature. A Storyboard is a named, ordered collection of Scenes attached to a single plot.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/storyboard'})

    kind: Literal["STORYBOARD"] = Field(default=..., description="""Feature kind discriminator (pinned to STORYBOARD)""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'SystemStateProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'SelectionRequirement',
                       'SystemRecordProperties',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPSelectionRequirement'],
         'equals_string': 'STORYBOARD'} })
    id: str = Field(default=..., description="""ULID (26 chars, Crockford base-32). Immutable after create.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'Tool',
                       'PlatformRecord',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacCatalog',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'StoryboardProperties',
                       'SceneProperties',
                       'StoryboardFeature',
                       'SceneFeature',
                       'ToolDefinition']} })
    name: str = Field(default=..., description="""Display title. Non-empty. Unique within plot FeatureCollection.""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata',
                       'SensorData',
                       'TUAData',
                       'PointMetadataEntry',
                       'ReferenceLocationProperties',
                       'Tool',
                       'ToolParameter',
                       'PlatformRecord',
                       'StacProvider',
                       'LevelDefinition',
                       'DatasetSeries',
                       'StoryboardProperties',
                       'MCPToolDefinition',
                       'ToolDefinition']} })
    description: Optional[str] = Field(default=None, description="""Markdown narrative description""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'Tool',
                       'ToolParameter',
                       'StacProvider',
                       'StacItemProperties',
                       'StacCatalog',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'LevelDefinition',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPParamSchema',
                       'MCPToolDefinition',
                       'ToolDefinition']} })
    schema_version: int = Field(default=..., description="""Schema version. Bumped to 2 by #259 (relax timestamp uniqueness + add `SceneProperties.creation_order`). Pre-#259 plots carrying `schema_version: 1` are rejected at load with `UnsupportedSchemaVersionError` — no in-place migration is provided (Article XIV pre-release freedom; FR-010 in #259 spec). Monotonically non-decreasing across edits; bumped only by migrations or breaking schema changes.""", ge=2, json_schema_extra = { "linkml_meta": {'domain_of': ['StoryboardProperties']} })
    tags: Optional[list[str]] = Field(default=[], description="""Free-text labels assigned to this feature by the analyst""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'StacExtensionProperties',
                       'StacItemSummary']} })
    provenance: Optional[list[LogEntry]] = Field(default=[], description="""PROV-aligned provenance records (append-only log of tool operations)""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'SystemStateProperties',
                       'SystemRecordProperties']} })

    @field_validator('id')
    def pattern_id(cls, v):
        pattern=re.compile(r"^[0-9A-HJKMNP-TV-Z]{26}$")
        if isinstance(v, list):
            for element in v:
                if isinstance(element, str) and not pattern.match(element):
                    err_msg = f"Invalid id format: {element}"
                    raise ValueError(err_msg)
        elif isinstance(v, str) and not pattern.match(v):
            err_msg = f"Invalid id format: {v}"
            raise ValueError(err_msg)
        return v


class SceneProperties(BaseFeatureProperties):
    """
    Properties class for a Scene child Feature. A Scene is a single captured moment in a Storyboard — viewport, timestamp, and per-feature visibility.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/storyboard',
         'rules': [{'description': 'Scene flavour XOR (#263): a Scene is either the '
                                   'instant flavour (both `time_range` and '
                                   '`viewport_end` absent) or the time-range flavour '
                                   '(both present). Any other combination is rejected '
                                   'with `SceneFlavourXorViolation`.',
                    'postconditions': {'slot_conditions': {'viewport_end': {'name': 'viewport_end',
                                                                            'value_presence': 'PRESENT'}}},
                    'preconditions': {'slot_conditions': {'time_range': {'name': 'time_range',
                                                                         'value_presence': 'PRESENT'}}}},
                   {'description': 'Scene flavour XOR (#263, reverse): if '
                                   '`viewport_end` is present then `time_range` MUST '
                                   'also be present.',
                    'postconditions': {'slot_conditions': {'time_range': {'name': 'time_range',
                                                                          'value_presence': 'PRESENT'}}},
                    'preconditions': {'slot_conditions': {'viewport_end': {'name': 'viewport_end',
                                                                           'value_presence': 'PRESENT'}}}}]})

    kind: Literal["STORYBOARD_SCENE"] = Field(default=..., description="""Feature kind discriminator (pinned to STORYBOARD_SCENE)""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'SystemStateProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'SelectionRequirement',
                       'SystemRecordProperties',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPSelectionRequirement'],
         'equals_string': 'STORYBOARD_SCENE'} })
    id: str = Field(default=..., description="""ULID (26 chars, Crockford base-32). Immutable after create.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'Tool',
                       'PlatformRecord',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacCatalog',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'StoryboardProperties',
                       'SceneProperties',
                       'StoryboardFeature',
                       'SceneFeature',
                       'ToolDefinition']} })
    storyboard_id: str = Field(default=..., description="""Foreign key to parent Storyboard.properties.id (ULID).""", json_schema_extra = { "linkml_meta": {'domain_of': ['SceneProperties']} })
    title: str = Field(default=..., description="""Display title. Defaults to DTG of timestamp in DDHHmmZ MMM YY; falls back to ISO-8601 on parse failure.""", json_schema_extra = { "linkml_meta": {'domain_of': ['PlotSummary',
                       'StacItemSummary',
                       'StacItemProperties',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'DatasetEntry',
                       'SceneProperties',
                       'SceneThumbnailAssetEntry']} })
    description: Optional[str] = Field(default=None, description="""Markdown per-scene narrative""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'Tool',
                       'ToolParameter',
                       'StacProvider',
                       'StacItemProperties',
                       'StacCatalog',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'LevelDefinition',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPParamSchema',
                       'MCPToolDefinition',
                       'ToolDefinition']} })
    viewport: Viewport = Field(default=..., description="""Map viewport camera state at capture time""", json_schema_extra = { "linkml_meta": {'domain_of': ['SpatialSlice', 'SceneProperties']} })
    timestamp: datetime  = Field(default=..., description="""ISO-8601 instant when the Scene was captured. Drives Scene ordering (ascending within a Storyboard) as the primary sort key. Multiple Scenes MAY share the same timestamp; ties are broken by `creation_order` ascending (see #259).""", json_schema_extra = { "linkml_meta": {'domain_of': ['LogEntry',
                       'TuneAnnotation',
                       'FileProvEntry',
                       'PropertiesProvenanceEntry',
                       'FeatureSelection',
                       'SceneProperties']} })
    creation_order: int = Field(default=..., description="""Per-Storyboard monotonic sequence value assigned by the platform at capture time. Acts as the secondary sort key for Scenes — when two Scenes share a `timestamp` the one with the lower `creation_order` comes first. Unique within a Storyboard; gaps are permitted (left by deletion). The platform — not the client — is the source of truth. Introduced by #259; absent on pre-#259 plots which are rejected at load (no migration shim — Article XIV pre-release freedom).""", ge=0, json_schema_extra = { "linkml_meta": {'domain_of': ['SceneProperties']} })
    time_range: Optional[TimeRange] = Field(default=None, description="""For instant Scenes (#215 default): MUST be absent. For time-range Scenes (#263): a TimeRange sub-record. When present, the Scene is the time-range flavour and `viewport_end` MUST also be present. See cross-field rule `scene-flavour-xor-rule`.""", json_schema_extra = { "linkml_meta": {'domain_of': ['SceneProperties']} })
    viewport_end: Optional[Viewport] = Field(default=None, description="""Map viewport camera state at the end of a time-range Scene (#263). MUST be present if and only if `time_range` is present. Reuses the Viewport sub-record (`bearing` MUST be 0). For instant Scenes this slot MUST be absent.""", json_schema_extra = { "linkml_meta": {'domain_of': ['SceneProperties']} })
    visible_feature_ids: list[str] = Field(default=..., description="""Stable feature IDs visible at capture. Canonicalised (trim, reject empty, dedupe, sort lexicographically) by the CRUD module before hashing. Order-insensitive from the consumer's perspective.""", json_schema_extra = { "linkml_meta": {'domain_of': ['SceneProperties']} })
    feature_set_hash: str = Field(default=..., description="""SHA-256 hex (lowercase, 64 chars) of JSON.stringify(canonical visible_feature_ids). Recomputed on every create/update touching visible_feature_ids.""", json_schema_extra = { "linkml_meta": {'domain_of': ['SceneProperties']} })
    thumbnail_asset_ref: str = Field(default=..., description="""STAC asset key (path + name within the plot's STAC item). Populated by #216 at capture time via #174 helpers.""", json_schema_extra = { "linkml_meta": {'domain_of': ['SceneProperties']} })
    transition_duration_ms: int = Field(default=..., description="""Playback transition duration in milliseconds. Default 500.""", ge=0, json_schema_extra = { "linkml_meta": {'domain_of': ['SceneProperties']} })
    display_mode: Optional[DisplayModeEnum] = Field(default=None, description="""Time-controller display mode at capture time (full = entire track history; trail = only the tail behind each platform). Reuses DisplayModeEnum from session-state.yaml. Optional for legacy compatibility (Spec #258): readers MUST leave the time controller untouched when this slot is absent (FR-003). Writers populate it from session.displayMode at the moment the scene is created.""", json_schema_extra = { "linkml_meta": {'domain_of': ['SceneProperties']} })
    polygon_source: Optional[PolygonSourceEnum] = Field(default=None, alias="_polygon_source", description="""Provenance of the scene's stored polygon geometry (Spec #258). 'bounds' = computed from real Leaflet map bounds at capture time; 'placeholder' = pre-#258 ~100m square; 'manual' = reserved for future user-drawn rectangles. Render-side consumers recompute the polygon from (viewport, map dimensions) when this value is anything other than 'bounds' (including absent, for legacy scenes). The stored geometry is NEVER rewritten on read (Article III.2 source preservation).""", json_schema_extra = { "linkml_meta": {'domain_of': ['SceneProperties']} })
    tags: Optional[list[str]] = Field(default=[], description="""Free-text labels assigned to this feature by the analyst""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'StacExtensionProperties',
                       'StacItemSummary']} })
    provenance: Optional[list[LogEntry]] = Field(default=[], description="""PROV-aligned provenance records (append-only log of tool operations)""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'SystemStateProperties',
                       'SystemRecordProperties']} })

    @field_validator('id')
    def pattern_id(cls, v):
        pattern=re.compile(r"^[0-9A-HJKMNP-TV-Z]{26}$")
        if isinstance(v, list):
            for element in v:
                if isinstance(element, str) and not pattern.match(element):
                    err_msg = f"Invalid id format: {element}"
                    raise ValueError(err_msg)
        elif isinstance(v, str) and not pattern.match(v):
            err_msg = f"Invalid id format: {v}"
            raise ValueError(err_msg)
        return v

    @field_validator('storyboard_id')
    def pattern_storyboard_id(cls, v):
        pattern=re.compile(r"^[0-9A-HJKMNP-TV-Z]{26}$")
        if isinstance(v, list):
            for element in v:
                if isinstance(element, str) and not pattern.match(element):
                    err_msg = f"Invalid storyboard_id format: {element}"
                    raise ValueError(err_msg)
        elif isinstance(v, str) and not pattern.match(v):
            err_msg = f"Invalid storyboard_id format: {v}"
            raise ValueError(err_msg)
        return v

    @field_validator('feature_set_hash')
    def pattern_feature_set_hash(cls, v):
        pattern=re.compile(r"^[0-9a-f]{64}$")
        if isinstance(v, list):
            for element in v:
                if isinstance(element, str) and not pattern.match(element):
                    err_msg = f"Invalid feature_set_hash format: {element}"
                    raise ValueError(err_msg)
        elif isinstance(v, str) and not pattern.match(v):
            err_msg = f"Invalid feature_set_hash format: {v}"
            raise ValueError(err_msg)
        return v


class StoryboardFeature(ConfiguredBaseModel):
    """
    GeoJSON Feature representing a Storyboard parent entity
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/storyboard'})

    type: Literal["Feature"] = Field(default=..., description="""GeoJSON type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage'],
         'equals_string': 'Feature'} })
    id: str = Field(default=..., description="""Stable identifier (equal to properties.id). ULID.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'Tool',
                       'PlatformRecord',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacCatalog',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'StoryboardProperties',
                       'SceneProperties',
                       'StoryboardFeature',
                       'SceneFeature',
                       'ToolDefinition']} })
    geometry: GeoJSONPolygon = Field(default=..., description="""Polygon hull covering the union of child Scene viewport bounds. Recomputed whenever the Scene set changes.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })
    properties: StoryboardProperties = Field(default=..., description="""Storyboard properties""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })


class SceneFeature(ConfiguredBaseModel):
    """
    GeoJSON Feature representing a Scene child entity
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/storyboard'})

    type: Literal["Feature"] = Field(default=..., description="""GeoJSON type discriminator""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage'],
         'equals_string': 'Feature'} })
    id: str = Field(default=..., description="""Stable identifier (equal to properties.id). ULID.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'Tool',
                       'PlatformRecord',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacCatalog',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'StoryboardProperties',
                       'SceneProperties',
                       'StoryboardFeature',
                       'SceneFeature',
                       'ToolDefinition']} })
    geometry: GeoJSONPolygon = Field(default=..., description="""Polygon covering the map viewport bounds at capture time. Antimeridian-crossing viewports produce a best-effort Polygon in MVP (module logs a warning; does not throw).""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })
    properties: SceneProperties = Field(default=..., description="""Scene properties""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'InputFeatureState',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'StacItem',
                       'RawGeoJSONFeature',
                       'StoryboardFeature',
                       'SceneFeature']} })


class SceneThumbnailAssetEntry(ConfiguredBaseModel):
    """
    A single STAC Item asset entry produced by Storyboarding (#216) for one
    variant of one Scene's thumbnail. Always appears as part of a
    pair in an Item's `assets` map: a large entry under the key
    `scene-thumbnail-{ULID}` and a small entry under the key
    `scene-thumbnail-{ULID}-sm`, where `{ULID}` is the owning Scene's
    identifier (matches SceneProperties.id).

    Why ULID: the owning Scene's id; lets every per-Scene asset be
    traced back to its Scene without an explicit foreign-key field
    in the asset payload.

    Why pairs: the Storyboarding capture pipeline produces both
    sizes atomically (800x600 large for inspection; 200x150 small
    for timeline strips). A single-variant entry is a defect — see
    schema rule scene-thumbnail-pair-rule-001.

    Lifecycle: created when a Scene is captured. Deleted when the
    Scene is deleted (garbage-collection invariant — see schema
    rule scene-thumbnail-orphan-rule-001). Both rules are enforced
    by the debrief-stac audit module; the JSON Schema layer
    enforces the value shape and key format only (see schema rule
    scene-thumbnail-key-format-rule-001).

    Supersedes the spec-241 placeholder `item_assets[\"scene-thumbnail\"]`
    and the `^scene-thumbnail(-.+)?$` patternProperties rule.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/storyboard'})

    href: str = Field(default=..., description="""URI-reference relative to the Item directory; conventionally ./scene-thumbnails/scene-{ULID}.png (large) or ./scene-thumbnails/scene-{ULID}-sm.png (small).""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacLink',
                       'StacAsset',
                       'ToolResultAnnotations',
                       'SceneThumbnailAssetEntry']} })
    type: Literal["image/png"] = Field(default=..., description="""Always image/png — Storyboarding capture writes PNGs only.""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage'],
         'equals_string': 'image/png'} })
    roles: list[str] = Field(default=..., description="""Exactly [\"thumbnail\"]. Storyboarding-derived thumbnails are not declared as overview (which is reserved for plot-level overviews of dimensions 600x800).""", json_schema_extra = { "linkml_meta": {'domain_of': ['StacProvider',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'SceneThumbnailAssetEntry']} })
    title: Optional[str] = Field(default=None, description="""Optional human label. Storyboarding writer emits \"Scene thumbnail\" (large) or \"Scene thumbnail (small)\" (small).""", json_schema_extra = { "linkml_meta": {'domain_of': ['PlotSummary',
                       'StacItemSummary',
                       'StacItemProperties',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'DatasetEntry',
                       'SceneProperties',
                       'SceneThumbnailAssetEntry']} })


class MCPRequest(ConfiguredBaseModel):
    """
    MCP tool invocation envelope. Sent by consumers (VS Code, web-shell) to the MCP server. Closes audit §3.1 row 13.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/mcp'})

    tool: str = Field(default=..., description="""Tool name (one of SessionMCPToolName for the session-state server).""", json_schema_extra = { "linkml_meta": {'domain_of': ['WasGeneratedBy', 'PropertiesProvenanceEntry', 'MCPRequest']} })
    input: Any = Field(default=..., description="""Free-form per-tool input payload (Article XV.2 exception — narrowed by per-tool Pydantic input model at dispatch).""", json_schema_extra = { "linkml_meta": {'domain_of': ['MCPRequest']} })


class MCPContentItem(ConfiguredBaseModel):
    """
    A single MCP content item (resource, text, or image). Carries Debrief-specific annotations (debrief:* keys) on every item. Closes audit §3.1 row 15.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/mcp'})

    type: str = Field(default=..., description="""Content-item discriminator. Current consumers emit `resource`, `text`, `image`. Kept as string to remain additive over any future MCP content-item types.""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage']} })
    resource: Optional[dict[str, object]] = Field(default=None, description="""Nested resource descriptor `{ uri, mimeType, text }` when type=resource. Free-form per Article XV.2 (the inner shape is driven by individual tool authors).""", json_schema_extra = { "linkml_meta": {'domain_of': ['MCPContentItem']} })
    text: Optional[str] = Field(default=None, description="""Body text when type=text.""", json_schema_extra = { "linkml_meta": {'domain_of': ['NarrativeEntryProperties',
                       'TextAnnotationProperties',
                       'MCPContentItem']} })
    data: Optional[str] = Field(default=None, description="""Base64-encoded payload when type=image.""", json_schema_extra = { "linkml_meta": {'domain_of': ['MCPContentItem']} })
    mimeType: Optional[str] = Field(default=None, description="""IANA media type when type=image or type=resource.""", json_schema_extra = { "linkml_meta": {'domain_of': ['MCPContentItem']} })
    annotations: Any = Field(default=..., description="""Debrief-specific annotations (`debrief:resultType`, `debrief:label`, `debrief:sourceFeatures`, etc). Free-form per Article XV.2 because the key set is open-ended and uses colons (`debrief:*`) that LinkML cannot constrain as slot names.""", json_schema_extra = { "linkml_meta": {'domain_of': ['MCPContentItem', 'MCPToolDefinition']} })


class MCPToolResponse(ConfiguredBaseModel):
    """
    Successful MCP tool response. Closes audit §3.1 row 16. The `duration_ms` slot preserves the wire format used by the live MCP server and replay subsystem.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/mcp'})

    content: list[MCPContentItem] = Field(default=..., description="""Ordered list of content items returned by the tool.""", json_schema_extra = { "linkml_meta": {'domain_of': ['MCPToolResponse']} })
    duration_ms: int = Field(default=..., description="""Wall-clock duration of the tool invocation in milliseconds.""", json_schema_extra = { "linkml_meta": {'domain_of': ['MCPToolResponse',
                       'MCPErrorResponse',
                       'ToolResultForLog',
                       'ToolExecutionResultForReplay']} })
    is_error: Optional[bool] = Field(default=None, description="""Reserved for streaming partial-error responses (additive over the live wire format).""", json_schema_extra = { "linkml_meta": {'domain_of': ['MCPToolResponse']} })
    structured_content: Optional[dict[str, object]] = Field(default=None, description="""Reserved for top-level free-form payload (e.g. vega-spec) — Article XV.2 exception. Additive over the live wire format.""", json_schema_extra = { "linkml_meta": {'domain_of': ['MCPToolResponse']} })


class MCPErrorResponse(ConfiguredBaseModel):
    """
    MCP error response envelope. Closes audit §3.1 row 17. The error payload is nested (matches the JSON-RPC convention used by the live server).
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/mcp'})

    error: Any = Field(default=..., description="""Nested error object `{ code, message, data: { debrief:errorCategory, debrief:affectedFeatures } }`. Free-form per Article XV.2 because the inner `data` map uses colon-bearing keys outside LinkML slot syntax.""", json_schema_extra = { "linkml_meta": {'domain_of': ['MCPErrorResponse']} })
    duration_ms: Optional[int] = Field(default=None, description="""Wall-clock duration before failure.""", json_schema_extra = { "linkml_meta": {'domain_of': ['MCPToolResponse',
                       'MCPErrorResponse',
                       'ToolResultForLog',
                       'ToolExecutionResultForReplay']} })


class MCPParamSchema(ConfiguredBaseModel):
    """
    JSON-Schema-like parameter fragment used inside MCPToolDefinition.input_schema. Closes audit §3.1 rows 1 and 27 (two-site drift). Open at the wire level — consumers narrow with additional fields (`enum`, `default`, `x-debrief-param-type`) via intersection in the local adapter modules.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/mcp'})

    type: Optional[str] = Field(default=None, description="""JSON-Schema primitive type (string / number / integer / boolean / array / object).""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage']} })
    description: Optional[str] = Field(default=None, description="""Human-readable parameter description.""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'Tool',
                       'ToolParameter',
                       'StacProvider',
                       'StacItemProperties',
                       'StacCatalog',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'LevelDefinition',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPParamSchema',
                       'MCPToolDefinition',
                       'ToolDefinition']} })


class MCPSelectionRequirement(ConfiguredBaseModel):
    """
    Predicate describing what feature selection a tool needs (e.g. \"at least one Track\", \"exactly one Point\"). Closes audit §3.1 row 18. Slot names match shared/utils/src/mcp-types.ts (`kind`, `min`, `max`).
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/mcp'})

    kind: str = Field(default=..., description="""Feature kind this requirement applies to. Supports flat values (e.g. \"TRACK\", \"POINT\") and dot-delimited hierarchical paths (e.g. \"TRACK.SEGMENT\").""", json_schema_extra = { "linkml_meta": {'domain_of': ['BaseFeatureProperties',
                       'TrackProperties',
                       'ReferenceLocationProperties',
                       'SystemStateProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'NarrativeEntryProperties',
                       'CircleAnnotationProperties',
                       'RectangleAnnotationProperties',
                       'LineAnnotationProperties',
                       'TextAnnotationProperties',
                       'VectorAnnotationProperties',
                       'PolyAnnotationProperties',
                       'SelectionRequirement',
                       'SystemRecordProperties',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPSelectionRequirement']} })
    min: int = Field(default=..., description="""Minimum number of features of this kind required.""", json_schema_extra = { "linkml_meta": {'domain_of': ['SelectionRequirement', 'MCPSelectionRequirement']} })
    max: Optional[int] = Field(default=None, description="""Maximum number of features of this kind allowed.""", json_schema_extra = { "linkml_meta": {'domain_of': ['SelectionRequirement', 'MCPSelectionRequirement']} })


class MCPToolDefinition(ConfiguredBaseModel):
    """
    Static catalogue entry advertised by the MCP server. Closes audit §3.1 row 19. `input_schema` and `annotations` are free-form per Article XV.2 — `input_schema` is a JSON-Schema fragment and `annotations` carries open-ended `debrief:*` keys (colons in key names cannot be slot-modelled).
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/mcp'})

    name: str = Field(default=..., description="""Tool identifier.""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata',
                       'SensorData',
                       'TUAData',
                       'PointMetadataEntry',
                       'ReferenceLocationProperties',
                       'Tool',
                       'ToolParameter',
                       'PlatformRecord',
                       'StacProvider',
                       'LevelDefinition',
                       'DatasetSeries',
                       'StoryboardProperties',
                       'MCPToolDefinition',
                       'ToolDefinition']} })
    description: str = Field(default=..., description="""Human-readable tool description.""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'Tool',
                       'ToolParameter',
                       'StacProvider',
                       'StacItemProperties',
                       'StacCatalog',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'LevelDefinition',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPParamSchema',
                       'MCPToolDefinition',
                       'ToolDefinition']} })
    input_schema: Any = Field(default=..., description="""JSON-Schema fragment describing the tool's input payload. Free-form per Article XV.2 — consumers narrow at point of use.""", json_schema_extra = { "linkml_meta": {'domain_of': ['MCPToolDefinition']} })
    annotations: Any = Field(default=..., description="""Debrief-specific annotations (`debrief:selectionRequirements`, `debrief:category`, `debrief:version`, `debrief:outputKind`, `debrief:uiCategory`). Free-form per Article XV.2.""", json_schema_extra = { "linkml_meta": {'domain_of': ['MCPContentItem', 'MCPToolDefinition']} })


class ToolParameterMeta(ConfiguredBaseModel):
    """
    Tunable parameter metadata recorded alongside a tool result for provenance. Closes audit §3.1 row 21. Matches the live web-shell mock shape — three slots tracking value, default-ness, and whether the parameter is operator-tunable.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/mcp'})

    value: Any = Field(default=..., description="""Parameter value used during the invocation.""", json_schema_extra = { "linkml_meta": {'domain_of': ['ParameterValue', 'TimeStep', 'ToolParameterMeta']} })
    default: bool = Field(default=..., description="""Whether the parameter took its default value.""", json_schema_extra = { "linkml_meta": {'domain_of': ['ParameterValue', 'ToolParameterMeta']} })
    tunable: bool = Field(default=..., description="""Whether the parameter is operator-tunable.""", json_schema_extra = { "linkml_meta": {'domain_of': ['ParameterValue', 'ToolParameterMeta']} })


class ToolDefinition(ConfiguredBaseModel):
    """
    Consumer-facing flattened view of a tool catalogue entry. Closes audit §3.1 row 22. Slot names match `apps/web-shell/src/mocks/calcService.ts` (`min_tracks`, `max_tracks`, `min_features` — preserved as-is).
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/mcp'})

    id: str = Field(default=..., description="""Unique tool identifier.""", json_schema_extra = { "linkml_meta": {'domain_of': ['TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'Tool',
                       'PlatformRecord',
                       'PlotSummary',
                       'StacItemSummary',
                       'StacItem',
                       'StacCatalog',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'StoryboardProperties',
                       'SceneProperties',
                       'StoryboardFeature',
                       'SceneFeature',
                       'ToolDefinition']} })
    name: str = Field(default=..., description="""Human-readable name.""", json_schema_extra = { "linkml_meta": {'domain_of': ['SegmentMetadata',
                       'SensorData',
                       'TUAData',
                       'PointMetadataEntry',
                       'ReferenceLocationProperties',
                       'Tool',
                       'ToolParameter',
                       'PlatformRecord',
                       'StacProvider',
                       'LevelDefinition',
                       'DatasetSeries',
                       'StoryboardProperties',
                       'MCPToolDefinition',
                       'ToolDefinition']} })
    description: str = Field(default=..., description="""Brief description.""", json_schema_extra = { "linkml_meta": {'domain_of': ['ReferenceLocationProperties',
                       'MultiPointFeatureProperties',
                       'MultiPolygonFeatureProperties',
                       'Tool',
                       'ToolParameter',
                       'StacProvider',
                       'StacItemProperties',
                       'StacCatalog',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'LevelDefinition',
                       'StoryboardProperties',
                       'SceneProperties',
                       'MCPParamSchema',
                       'MCPToolDefinition',
                       'ToolDefinition']} })
    minTracks: Optional[int] = Field(default=None, description="""Minimum number of tracks required.""", json_schema_extra = { "linkml_meta": {'domain_of': ['ToolDefinition']} })
    maxTracks: Optional[int] = Field(default=None, description="""Maximum number of tracks (absent = no upper limit).""", json_schema_extra = { "linkml_meta": {'domain_of': ['ToolDefinition']} })
    minFeatures: Optional[int] = Field(default=None, description="""Minimum number of features required (any type).""", json_schema_extra = { "linkml_meta": {'domain_of': ['ToolDefinition']} })


class ToolResult(ConfiguredBaseModel):
    """
    Logical tool invocation result as seen by the consumer (after the MCP layer has unwrapped MCPToolResponse). Closes audit §3.1 row 20. Slot names match `apps/web-shell/src/mocks/calcService.ts` — includes `resultLayer`, `resultLayers`, `parameters`, `datasets` which are free-form per Article XV.2 (their inner shapes are tool-specific).
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/mcp'})

    success: bool = Field(default=..., description="""Whether the tool succeeded.""", json_schema_extra = { "linkml_meta": {'domain_of': ['ToolResult',
                       'ToolResultForLog',
                       'ToolExecutionResultForReplay']} })
    message: str = Field(default=..., description="""Status / explanation message.""", json_schema_extra = { "linkml_meta": {'domain_of': ['ToolResult']} })
    resultLayer: Optional[dict[str, object]] = Field(default=None, description="""Optional single result layer (e.g. bounding-box polygon).""", json_schema_extra = { "linkml_meta": {'domain_of': ['ToolResult']} })
    resultLayers: Optional[list[Any]] = Field(default=[], description="""Optional multiple result layers (e.g. buffer-zone polygons).""", json_schema_extra = { "linkml_meta": {'domain_of': ['ToolResult']} })
    parameters: Optional[dict[str, object]] = Field(default=None, description="""Optional record of operator-tunable parameters and their values (keyed by parameter name, values shaped like ToolParameterMeta). Free-form per Article XV.2 (a LinkML `inlined_as_dict` of ToolParameterMeta would express it, but consumers already build a plain `Record<string, ToolParameterMeta>` and narrow on the way out — keeping it free-form preserves the live wire shape).""", json_schema_extra = { "linkml_meta": {'domain_of': ['WasGeneratedBy', 'ToolResult']} })
    datasets: Optional[list[Any]] = Field(default=[], description="""Optional dataset results for the Results panel (range-bearing charts, etc). Each entry shaped like `{ filename: string, envelope: Record<string, unknown> }`.""", json_schema_extra = { "linkml_meta": {'domain_of': ['ToolResult']} })


class ToolResultForLog(ConfiguredBaseModel):
    """
    Persisted tool-result shape written by the live tool-result logger and read back by the replay subsystem. Closes audit §3.1 row 4. Slot names match `services/session-state/src/log/types.ts:97` verbatim so existing log fixtures under the session-state fixtures directories continue to deserialise unchanged (FR-011).
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/mcp'})

    success: bool = Field(default=..., description="""Whether the tool succeeded.""", json_schema_extra = { "linkml_meta": {'domain_of': ['ToolResult',
                       'ToolResultForLog',
                       'ToolExecutionResultForReplay']} })
    features: Optional[dict[str, object]] = Field(default=None, description="""GeoJSON FeatureCollection produced by the tool. Free-form per Article XV.2 (the tool's output shape is its own contract).""", json_schema_extra = { "linkml_meta": {'domain_of': ['RawGeoJSONFeatureCollection',
                       'SessionState',
                       'SessionFile',
                       'ToolResultForLog',
                       'ToolExecutionResultForReplay']} })
    duration_ms: int = Field(default=..., description="""Wall-clock duration of the tool invocation in milliseconds.""", json_schema_extra = { "linkml_meta": {'domain_of': ['MCPToolResponse',
                       'MCPErrorResponse',
                       'ToolResultForLog',
                       'ToolExecutionResultForReplay']} })
    result_type: Optional[str] = Field(default=None, description="""Hierarchical result type (e.g. mutation/track/smoothed).""", json_schema_extra = { "linkml_meta": {'domain_of': ['ToolResultForLog']} })
    source_feature_ids: Optional[list[str]] = Field(default=[], description="""IDs of input features used to generate this result.""", json_schema_extra = { "linkml_meta": {'domain_of': ['LastToolExecution', 'ToolResultForLog']} })
    artifact_href: Optional[str] = Field(default=None, description="""Path to an exported artifact (for non-GeoJSON tool results).""", json_schema_extra = { "linkml_meta": {'domain_of': ['ToolResultForLog', 'ToolExecutionResultForReplay']} })
    tool_id: Optional[str] = Field(default=None, description="""Tool identifier (mirrors LogEntry.was_generated_by.tool).""", json_schema_extra = { "linkml_meta": {'domain_of': ['LastToolExecution', 'ToolResultForLog']} })
    input_state: Optional[list[Any]] = Field(default=[], description="""Pre-tool geometry snapshot for mutation tools — passed through to LogEntry. Free-form per Article XV.2 (the inner InputFeatureState shape is owned by #224 session-state).""", json_schema_extra = { "linkml_meta": {'domain_of': ['LogEntry', 'ToolResultForLog']} })


class ToolExecutionResultForReplay(ConfiguredBaseModel):
    """
    Minimal tool-execution result returned by the Replay Engine's `execute_tool` callback. Closes audit §3.1 row 6. Distinct from `ToolResultForLog` (no inheritance) because the replay path's observable surface is intentionally narrower — see services/session-state/src/log/types.ts:373.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/mcp'})

    success: bool = Field(default=..., description="""Whether the tool succeeded.""", json_schema_extra = { "linkml_meta": {'domain_of': ['ToolResult',
                       'ToolResultForLog',
                       'ToolExecutionResultForReplay']} })
    features: Optional[dict[str, object]] = Field(default=None, description="""GeoJSON FeatureCollection produced by the tool during replay. Free-form per Article XV.2.""", json_schema_extra = { "linkml_meta": {'domain_of': ['RawGeoJSONFeatureCollection',
                       'SessionState',
                       'SessionFile',
                       'ToolResultForLog',
                       'ToolExecutionResultForReplay']} })
    duration_ms: int = Field(default=..., description="""Wall-clock duration of the replay invocation in milliseconds.""", json_schema_extra = { "linkml_meta": {'domain_of': ['MCPToolResponse',
                       'MCPErrorResponse',
                       'ToolResultForLog',
                       'ToolExecutionResultForReplay']} })
    tool_version: Optional[str] = Field(default=None, description="""Tool version observed at replay time.""", json_schema_extra = { "linkml_meta": {'domain_of': ['WasGeneratedBy', 'ToolExecutionResultForReplay']} })
    artifact_href: Optional[str] = Field(default=None, description="""Path to an exported artifact (for non-GeoJSON tool results).""", json_schema_extra = { "linkml_meta": {'domain_of': ['ToolResultForLog', 'ToolExecutionResultForReplay']} })
    result_id: Optional[str] = Field(default=None, description="""Stable result identifier (used by the activity panel).""", json_schema_extra = { "linkml_meta": {'domain_of': ['ToolExecutionResultForReplay']} })


class ToolsUpdateMessage(ConfiguredBaseModel):
    """
    Push notification from the extension host to the activity-panel webview when the tool catalogue changes. Closes audit §3.1 row 28. `payload` is free-form per Article XV.2 — its inner shape `{ tools: ToolsPanelItem[], hasToolInventory?, hasSelection? }` is narrowed at the activity-panel consumer.
    """
    linkml_meta: ClassVar[LinkMLMeta] = LinkMLMeta({'from_schema': 'https://debrief.info/schemas/mcp'})

    type: Literal["tools:update"] = Field(default=..., description="""Discriminator — always the literal `tools:update`.""", json_schema_extra = { "linkml_meta": {'domain_of': ['GeoJSONPoint',
                       'GeoJSONEmptyPoint',
                       'GeoJSONLineString',
                       'GeoJSONPolygon',
                       'GeoJSONMultiPoint',
                       'GeoJSONMultiLineString',
                       'GeoJSONMultiPolygon',
                       'TrackFeature',
                       'ReferenceLocation',
                       'SystemState',
                       'MultiPointFeature',
                       'MultiPolygonFeature',
                       'NarrativeEntry',
                       'CircleAnnotation',
                       'RectangleAnnotation',
                       'LineAnnotation',
                       'TextAnnotation',
                       'VectorAnnotation',
                       'PolyAnnotation',
                       'ToolParameter',
                       'FileProvEntry',
                       'StacItem',
                       'StacCatalog',
                       'StacLink',
                       'StacAsset',
                       'StacItemAssetDefinition',
                       'StacCollection',
                       'RawGeoJSONFeature',
                       'RawGeoJSONFeatureCollection',
                       'DatasetAxisMetadata',
                       'DatasetEntry',
                       'StoryboardFeature',
                       'SceneFeature',
                       'SceneThumbnailAssetEntry',
                       'MCPContentItem',
                       'MCPParamSchema',
                       'ToolsUpdateMessage'],
         'equals_string': 'tools:update'} })
    payload: Any = Field(default=..., description="""Nested payload `{ tools, hasToolInventory?, hasSelection? }`. Free-form per Article XV.2.""", json_schema_extra = { "linkml_meta": {'domain_of': ['ToolsUpdateMessage']} })


# Model rebuild
# see https://pydantic-docs.helpmanual.io/usage/models/#rebuilding-a-model
BaseFeatureProperties.model_rebuild()
TimestampedPosition.model_rebuild()
PointProperties.model_rebuild()
LineProperties.model_rebuild()
PolygonProperties.model_rebuild()
TrackStyle.model_rebuild()
PositionStyle.model_rebuild()
PositionStyleOverride.model_rebuild()
GeoJSONPoint.model_rebuild()
GeoJSONEmptyPoint.model_rebuild()
GeoJSONLineString.model_rebuild()
GeoJSONPolygon.model_rebuild()
GeoJSONMultiPoint.model_rebuild()
GeoJSONMultiLineString.model_rebuild()
GeoJSONMultiPolygon.model_rebuild()
SegmentMetadata.model_rebuild()
MeasuredArrayPosition.model_rebuild()
SensorContact.model_rebuild()
SensorData.model_rebuild()
TUASolution.model_rebuild()
TUAData.model_rebuild()
TrackProperties.model_rebuild()
TrackFeature.model_rebuild()
PointMetadataEntry.model_rebuild()
ReferenceLocationProperties.model_rebuild()
ReferenceLocation.model_rebuild()
SystemStateProperties.model_rebuild()
SystemState.model_rebuild()
MultiPointFeatureProperties.model_rebuild()
MultiPointFeature.model_rebuild()
MultiPolygonFeatureProperties.model_rebuild()
MultiPolygonFeature.model_rebuild()
LogEntry.model_rebuild()
WasGeneratedBy.model_rebuild()
ParameterValue.model_rebuild()
InputFeatureState.model_rebuild()
TuneAnnotation.model_rebuild()
NarrativeEntryProperties.model_rebuild()
NarrativeEntry.model_rebuild()
CircleAnnotationProperties.model_rebuild()
CircleAnnotation.model_rebuild()
RectangleAnnotationProperties.model_rebuild()
RectangleAnnotation.model_rebuild()
LineAnnotationProperties.model_rebuild()
LineAnnotation.model_rebuild()
TextAnnotationProperties.model_rebuild()
TextAnnotation.model_rebuild()
VectorAnnotationProperties.model_rebuild()
VectorAnnotation.model_rebuild()
PolyAnnotationProperties.model_rebuild()
PolyAnnotation.model_rebuild()
SelectionRequirement.model_rebuild()
Tool.model_rebuild()
ToolParameter.model_rebuild()
SystemRecordProperties.model_rebuild()
SnapshotLinks.model_rebuild()
SnapshotRef.model_rebuild()
BranchRecord.model_rebuild()
BranchOrigin.model_rebuild()
FileProvEntry.model_rebuild()
PlatformRecord.model_rebuild()
PropertiesProvenanceEntry.model_rebuild()
StacExtensionProperties.model_rebuild()
PlotTimeExtent.model_rebuild()
PlotSummary.model_rebuild()
StacItemSummary.model_rebuild()
StacProvider.model_rebuild()
StacItemProperties.model_rebuild()
StacItem.model_rebuild()
StacCatalog.model_rebuild()
StacLink.model_rebuild()
StacAsset.model_rebuild()
StacItemAssetDefinition.model_rebuild()
StacSpatialExtent.model_rebuild()
StacTemporalExtent.model_rebuild()
StacExtent.model_rebuild()
StacSummaries.model_rebuild()
StacCollection.model_rebuild()
RawGeoJSONFeature.model_rebuild()
RawGeoJSONFeatureCollection.model_rebuild()
TimeInstant.model_rebuild()
TimeRange.model_rebuild()
TimeFilter.model_rebuild()
TimeStep.model_rebuild()
Coordinate.model_rebuild()
ViewportPolygon.model_rebuild()
LevelDefinition.model_rebuild()
FeatureSelection.model_rebuild()
TemporalSlice.model_rebuild()
SpatialSlice.model_rebuild()
FeaturesSlice.model_rebuild()
DocumentSlice.model_rebuild()
LastToolExecution.model_rebuild()
ResultsSlice.model_rebuild()
BrowserFilterSlice.model_rebuild()
SessionState.model_rebuild()
SessionFile.model_rebuild()
ResultTypePath.model_rebuild()
ToolResultAnnotations.model_rebuild()
DatasetAxisMetadata.model_rebuild()
DatasetMetadata.model_rebuild()
DatasetDataPoint.model_rebuild()
DatasetSeries.model_rebuild()
DatasetEntry.model_rebuild()
Viewport.model_rebuild()
StoryboardProperties.model_rebuild()
SceneProperties.model_rebuild()
StoryboardFeature.model_rebuild()
SceneFeature.model_rebuild()
SceneThumbnailAssetEntry.model_rebuild()
MCPRequest.model_rebuild()
MCPContentItem.model_rebuild()
MCPToolResponse.model_rebuild()
MCPErrorResponse.model_rebuild()
MCPParamSchema.model_rebuild()
MCPSelectionRequirement.model_rebuild()
MCPToolDefinition.model_rebuild()
ToolParameterMeta.model_rebuild()
ToolDefinition.model_rebuild()
ToolResult.model_rebuild()
ToolResultForLog.model_rebuild()
ToolExecutionResultForReplay.model_rebuild()
ToolsUpdateMessage.model_rebuild()
