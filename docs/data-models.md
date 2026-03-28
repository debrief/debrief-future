# Data Models

Visual reference for the Debrief v4.x data model, derived from the LinkML schemas in `shared/schemas/src/linkml/`.

## STAC Storage Hierarchy

How plots are organised on disk using STAC (SpatioTemporal Asset Catalog).

```mermaid
classDiagram
    direction TB

    class STACStore {
        +path: string
        catalog.json
    }

    class STACCatalog {
        +id: string
        +title: string
        +description: string
        +stac_version: "1.0.0"
        +type: "Catalog"
        +links: Link[]
    }

    class STACCollection {
        +id: string
        +title: string
        +extent: CollectionExtent
        +summaries: CollectionSummaries
        +links: Link[]
    }

    class STACItem {
        +id: string [a-z0-9_-]+
        +type: "Feature"
        +geometry: GeoJSON Polygon (bbox)
        +bbox: float[4]
        +properties: ItemProperties
        +assets: Assets
        +links: Link[]
    }

    class ItemProperties {
        +datetime: ISO8601
        +start_datetime: ISO8601
        +end_datetime: ISO8601
        +title: string
        debrief:vessel_classes: string[]
        debrief:tags: string[]
        debrief:feature_tags: string[]
        debrief:track_names: string[]
        debrief:nationalities: string[]
    }

    class Assets {
        +geojson: Asset → features.geojson
        +source: Asset → original file
        +artifacts: Asset → tool outputs
    }

    class CollectionExtent {
        +bbox: [west, south, east, north]
        +temporal_start: ISO8601
        +temporal_end: ISO8601
    }

    class CollectionSummaries {
        +vessel_classes: string[]
        +tags: string[]
        +feature_tags: string[]
        +track_names: string[]
        +nationalities: string[]
    }

    STACStore "1" --> "1" STACCatalog : contains
    STACCatalog "1" --> "0..*" STACCollection : organises
    STACCollection "1" --> "0..*" STACItem : contains
    STACCatalog "1" --> "0..*" STACItem : flat (no collection)
    STACItem "1" --> "1" ItemProperties : properties
    STACItem "1" --> "1" Assets : assets
    STACCollection "1" --> "1" CollectionExtent : extent
    STACCollection "1" --> "1" CollectionSummaries : summaries
```

A STAC Store is a directory containing a root `catalog.json`. Items can live directly under the catalog (flat layout) or be grouped into collections. Each item's primary `geojson` asset points to a `features.geojson` file containing the plot's GeoJSON FeatureCollection.

### On-Disk Layout (Per-Item Folders)

Each STAC Item gets its own directory with sub-folders for source assets and tool output artifacts:

```
store-root/
├── catalog.json                       # Root STAC Catalog
├── exercise-alpha/                    # Item directory (named by plot ID)
│   ├── item.json                      # STAC Item metadata + asset refs
│   ├── features.geojson               # GeoJSON FeatureCollection (the plot)
│   ├── assets/                        # Original source files (provenance)
│   │   └── exercise-alpha.rep         # Imported REP file
│   └── results/                       # Tool output artifacts
│       ├── range-bearing-series.json  # Dataset from calc tool
│       └── bt_plot.png                # Generated chart image
└── training-run-1/
    ├── item.json
    ├── features.geojson
    └── assets/
        └── training-run-1.rep
```

- **`item.json`** contains STAC metadata, debrief: extension properties, and relative `href` links to assets
- **`features.geojson`** is the primary data asset (GeoJSON FeatureCollection with all domain features)
- **`assets/`** preserves original source files with provenance (source path, timestamp, tool version)
- **`results/`** stores computed artifacts from analysis tools (charts, reports, datasets)

## GeoJSON FeatureCollection (Plot Contents)

The `features.geojson` asset inside each STAC Item. All domain entities are GeoJSON Features discriminated by `properties.kind`.

```mermaid
classDiagram
    direction TB

    class FeatureCollection {
        +type: "FeatureCollection"
        +features: Feature[]
    }

    class Feature {
        <<abstract>>
        +type: "Feature"
        +id: string
        +geometry: Geometry
        +properties: BaseFeatureProperties
    }

    class BaseFeatureProperties {
        <<abstract>>
        +kind: FeatureKindEnum
        +tags: string[]
        +provenance: LogEntry[]
    }

    class TrackFeature {
        +geometry: LineString | MultiLineString
        +properties: TrackProperties
        kind = TRACK
    }

    class ReferenceLocation {
        +geometry: Point | MultiPoint
        +properties: ReferenceLocationProperties
        kind = POINT
    }

    class NarrativeEntry {
        +geometry: Point | null
        +properties: NarrativeEntryProperties
        kind = NARRATIVE
    }

    class CircleAnnotation {
        +geometry: Polygon
        +properties: CircleAnnotationProperties
        kind = CIRCLE
    }

    class RectangleAnnotation {
        +geometry: Polygon
        +properties: RectangleAnnotationProperties
        kind = RECTANGLE
    }

    class LineAnnotation {
        +geometry: LineString
        +properties: LineAnnotationProperties
        kind = LINE
    }

    class TextAnnotation {
        +geometry: Point
        +properties: TextAnnotationProperties
        kind = TEXT
    }

    class VectorAnnotation {
        +geometry: LineString
        +properties: VectorAnnotationProperties
        kind = VECTOR
    }

    class PolyAnnotation {
        +geometry: Polygon
        +properties: PolyAnnotationProperties
        kind = POLY
    }

    class MultiPointFeature {
        +geometry: MultiPoint
        +properties: MultiPointFeatureProperties
        kind = MULTI_POINT
    }

    class MultiPolygonFeature {
        +geometry: MultiPolygon
        +properties: MultiPolygonFeatureProperties
        kind = MULTI_POLYGON
    }

    class SystemState {
        +geometry: Point (empty coords)
        +properties: SystemStateProperties
        kind = SYSTEM
    }

    class SystemRecord {
        +geometry: Point (empty coords)
        +properties: SystemRecordProperties
        kind = SYSTEM_RECORD
    }

    FeatureCollection "1" --> "0..*" Feature : features
    Feature --> BaseFeatureProperties : properties
    Feature <|-- TrackFeature
    Feature <|-- ReferenceLocation
    Feature <|-- NarrativeEntry
    Feature <|-- CircleAnnotation
    Feature <|-- RectangleAnnotation
    Feature <|-- LineAnnotation
    Feature <|-- TextAnnotation
    Feature <|-- VectorAnnotation
    Feature <|-- PolyAnnotation
    Feature <|-- MultiPointFeature
    Feature <|-- MultiPolygonFeature
    Feature <|-- SystemState
    Feature <|-- SystemRecord
```

The `kind` property on each feature acts as a discriminator. Frontends use it to select the correct renderer and property panel.

> **Schema note:** Most properties classes inherit from `BaseFeatureProperties` via `is_a`. The exception is `SystemStateProperties`, which defines its own `provenance` field directly rather than inheriting. This is a minor inconsistency in the schema -- functionally equivalent but structurally divergent.

## TrackFeature Detail

Tracks are the richest feature type, supporting simple and compound (multi-segment) geometries, embedded sensor data, and TUA solutions.

```mermaid
classDiagram
    direction LR

    class TrackFeature {
        +id: string
        +type: "Feature"
        +bbox: float[4]
    }

    class TrackProperties {
        +kind: TRACK
        +platform_id: string
        +platform_name: string
        +track_type: TrackTypeEnum
        +start_time: datetime
        +end_time: datetime
        +positions: TimestampedPosition[]
        +style: TrackStyle
        +default_position_style: PositionStyle
        +symbol_interval: ISO8601 duration
        +label_interval: ISO8601 duration
        +position_style_overrides: PositionStyleOverride[]
        +segments: SegmentMetadata[]
        +sensors: SensorData[]
        +tuas: TUAData[]
        +provenance: LogEntry[]
    }

    class TrackTypeEnum {
        <<enumeration>>
        OWNSHIP
        CONTACT
        REFERENCE
        SOLUTION
    }

    class TimestampedPosition {
        +time: datetime
        +depth: float
        +course: float 0-360
        +speed: float knots
    }

    class SegmentMetadata {
        +segment_type: SegmentTypeEnum
        +start_time: datetime
        +end_time: datetime
        +positions: TimestampedPosition[]
        +name: string
        +style: LineProperties
        +course: float
        +speed: float
    }

    class SegmentTypeEnum {
        <<enumeration>>
        TRACK
        ABSOLUTE_TMA
        RELATIVE_TMA
        DYNAMIC_INFILL
    }

    class SensorData {
        +name: string
        +base_frequency: float Hz
        +offset: float metres
        +contacts: SensorContact[]
    }

    class SensorContact {
        +time: datetime
        +bearing: float 0-360
        +range: float metres
        +frequency: float Hz
        +ambiguous_bearing: float
    }

    class TUAData {
        +name: string
        +host_track_name: string
        +solutions: TUASolution[]
    }

    class TUASolution {
        +time: datetime
        +label: string
        +centre_lat / centre_lon: float
        +bearing / range: float
        +orientation: float
        +maxima / minima: float
        +course: float
        +speed: float
    }

    TrackFeature "1" --> "1" TrackProperties : properties
    TrackProperties --> TrackTypeEnum
    TrackProperties "1" --> "2..*" TimestampedPosition : positions
    TrackProperties "1" --> "0..*" SegmentMetadata : segments (compound)
    TrackProperties "1" --> "0..*" SensorData : sensors
    TrackProperties "1" --> "0..*" TUAData : tuas
    SegmentMetadata --> SegmentTypeEnum
    SegmentMetadata "1" --> "1..*" TimestampedPosition : positions
    SensorData "1" --> "1..*" SensorContact : contacts
    TUAData "1" --> "1..*" TUASolution : solutions
```

**Simple vs compound tracks:** When `segments` is absent, geometry is `LineString` and the flat `positions` array maps 1:1 to coordinates. When `segments` is present, geometry is `MultiLineString` and each segment's `positions` maps to one LineString within the multi-geometry.

## Styling Model

All features carry styling properties following Leaflet naming conventions.

```mermaid
classDiagram
    direction TB

    class TrackStyle {
        +line: LineProperties
        +point: PointProperties
    }

    class PointProperties {
        +shape: PointShapeEnum
        +radius: float px
        +fill: boolean
        +fill_color: CSSColor
        +fill_opacity: float 0-1
        +stroke: boolean
        +color: CSSColor
        +weight: float px
        +opacity: float 0-1
    }

    class LineProperties {
        +stroke: boolean
        +color: CSSColor
        +weight: float px
        +opacity: float 0-1
        +line_cap: LineCapEnum
        +line_join: LineJoinEnum
        +dash_array: string
    }

    class PolygonProperties {
        +fill: boolean
        +fill_color: CSSColor
        +fill_opacity: float 0-1
        +stroke: boolean
        +color: CSSColor
        +weight: float px
        +opacity: float 0-1
        +line_cap: LineCapEnum
        +line_join: LineJoinEnum
        +dash_array: string
    }

    class PositionStyle {
        +show_symbol: boolean
        +symbol: PointShapeEnum
        +show_label: boolean
    }

    class PositionStyleOverride {
        +show_symbol: boolean
        +symbol: PointShapeEnum
        +show_label: boolean
        +label: string
    }

    class PointShapeEnum {
        <<enumeration>>
        circle
        square
        triangle
        diamond
        cross
    }

    TrackStyle --> LineProperties : line
    TrackStyle --> PointProperties : point
    PointProperties --> PointShapeEnum
    PositionStyle --> PointShapeEnum
    PositionStyleOverride --> PointShapeEnum

    note for TrackStyle "Tracks use TrackStyle (line + point).\nAnnotations use Line/Polygon/PointProperties directly."
```

## Provenance (PROV-Aligned Logging)

Every feature carries an append-only provenance log recording tool operations.

```mermaid
classDiagram
    direction LR

    class BaseFeatureProperties {
        <<abstract>>
        +kind: FeatureKindEnum
        +tags: string[]
        +provenance: LogEntry[]
    }

    class LogEntry {
        +activity_id: UUID
        +timestamp: datetime
        +was_generated_by: WasGeneratedBy
        +used: string[] (input feature IDs)
        +generated: string[] (output IDs)
        +execution_duration: ISO8601 duration
        +generated_result_id: string
        +tune: TuneAnnotation
        +input_state: InputFeatureState[]
        +disabled: boolean
        +rationale: string
    }

    class WasGeneratedBy {
        +tool: string (kebab-case)
        +tool_version: semver
        +parameters: ParameterValue[]
    }

    class ParameterValue {
        +value: any
        +default: boolean
        +tunable: boolean
    }

    class TuneAnnotation {
        +timestamp: datetime
        +parameter: string
        +previous_value: any
        +new_value: any
    }

    class InputFeatureState {
        +feature_id: string
        +geometry: GeoJSON geometry
        +properties: JSON object
    }

    BaseFeatureProperties "1" --> "0..*" LogEntry : provenance
    LogEntry "1" --> "1" WasGeneratedBy : was_generated_by
    WasGeneratedBy "1" --> "0..*" ParameterValue : parameters
    LogEntry "1" --> "0..1" TuneAnnotation : tune
    LogEntry "1" --> "0..*" InputFeatureState : input_state
```

## System Record (Plot-Level Metadata)

A special non-spatial feature per plot that carries snapshot chain links and branch records for versioning.

```mermaid
classDiagram
    direction LR

    class SystemRecordFeature {
        +id: "system.record"
        +type: "Feature"
        +geometry: EmptyPoint
    }

    class SystemRecordProperties {
        +kind: SYSTEM_RECORD
        +snapshot_links: SnapshotLinks
        +branches: BranchRecord[]
        +branch_origin: BranchOrigin
        +provenance: FileProvEntry[]
    }

    class SnapshotLinks {
        +prev: SnapshotRef
        +next: SnapshotRef
    }

    class SnapshotRef {
        +asset: string (relative path)
        +prov_entry_count: integer
    }

    class BranchRecord {
        +branch_id: string
        +branched_from: activity_id
        +branched_at: datetime
        +target_asset: string (path)
    }

    class BranchOrigin {
        +source_asset: string (path)
        +branched_from: activity_id
        +branched_at: datetime
        +branch_id: string
    }

    SystemRecordFeature --> SystemRecordProperties
    SystemRecordProperties --> SnapshotLinks
    SnapshotLinks --> SnapshotRef : prev / next
    SystemRecordProperties --> BranchRecord
    SystemRecordProperties --> BranchOrigin
```

## Tool Metadata

Tools are analysis operations discovered via MCP, matched to the current selection.

```mermaid
classDiagram
    direction LR

    class Tool {
        +id: string
        +name: string
        +description: string
        +version: semver
        +requirements: SelectionRequirement[]
    }

    class SelectionRequirement {
        +kind: string (e.g. TRACK, POINT)
        +segment_type: SegmentTypeEnum
        +min: integer
        +max: integer
    }

    class ToolParameter {
        +name: string (kebab-case)
        +type: string | number | boolean | enum
        +description: string
        +required: boolean
        +default_value: string
        +param_type: ParameterTypeEnum
    }

    Tool "1" --> "0..*" SelectionRequirement : requirements
    Tool "1" --> "0..*" ToolParameter : parameters
```

## Tool Results

When a tool executes, its MCP response carries `ToolResultAnnotations` that tell the frontend how to apply the result. Results flow into `LogEntry.was_generated_by` on the affected features for provenance.

```mermaid
classDiagram
    direction LR

    class ToolResultAnnotations {
        +resultType: "top/domain/specific"
        +sourceFeatures: string[]
        +label: string
        +href: string (artifacts only)
        +deletedFeatures: string[]
    }

    class ResultCategoryEnum {
        <<enumeration>>
        mutation
        addition
        deletion
        artifact
    }

    class DatasetEntry {
        +type: string
        +title: string
        +metadata: DatasetMetadata
        +data_points: DatasetDataPoint[]
        +series: DatasetSeries[]
    }

    class DatasetSeries {
        +name: string
        +data_points: DatasetDataPoint[]
    }

    class DatasetDataPoint {
        +x_value: string
        +y_value: string
        +series_key: string
    }

    ToolResultAnnotations --> ResultCategoryEnum : resultType prefix
    DatasetEntry "1" --> "0..*" DatasetDataPoint : flat data
    DatasetEntry "1" --> "0..*" DatasetSeries : multi-series
    DatasetSeries "1" --> "1..*" DatasetDataPoint : data_points
```

## Session State

Runtime state managed by the VS Code extension, persisted as JSON.

```mermaid
classDiagram
    direction TB

    class SessionState {
        +schemaVersion: semver
        +temporal: TemporalSlice
        +spatial: SpatialSlice
        +features: FeaturesSlice
        +document: DocumentSlice
    }

    class TemporalSlice {
        +currentTime: TimeInstant
        +timeRange: TimeRange
        +timeFilter: TimeFilter
        +stepSize: TimeStep
        +playbackRate: float 0.1-100
        +playbackState: PlaybackStateEnum
        +displayMode: DisplayModeEnum
    }

    class SpatialSlice {
        +viewport: ViewportPolygon
        +rotation: float 0-360
    }

    class FeaturesSlice {
        +featureCollectionUri: string
        +selection: FeatureSelection
        +hiddenFeatureIds: string[]
    }

    class DocumentSlice {
        +dirty: boolean
        +savePath: string
    }

    class ResultsSlice {
        +result_layers: GeoJSONFeature[]
        +last_tool_execution: LastToolExecution
    }

    class BrowserFilterSlice {
        +metadata_filtered_ids: string[]
        +metadata_expression: CQL2 JSON
        +spatial_filter_active: boolean
        +temporal_filter_active: boolean
    }

    class TimeInstant {
        +epoch: integer (ms)
        +iso: ISO8601 string
    }

    class FeatureSelection {
        +featureIds: string[] (path notation)
        +primary: string
        +timestamp: TimeInstant
    }

    SessionState --> TemporalSlice
    SessionState --> SpatialSlice
    SessionState --> FeaturesSlice
    SessionState --> DocumentSlice
    SessionState --> ResultsSlice
    SessionState --> BrowserFilterSlice
    TemporalSlice --> TimeInstant : currentTime
    FeaturesSlice --> FeatureSelection
    FeatureSelection --> TimeInstant
```

## STAC Extension Properties

Extension properties stored on STAC Items under the `debrief:` namespace, enabling discovery and filtering.

```mermaid
classDiagram
    direction TB

    class STACItem {
        +id: string
        +properties: ItemProperties
    }

    class StacExtensionProperties {
        +vessel_classes: string[]
        +tags: string[]
        +feature_tags: string[]
        +track_names: string[]
        +nationalities: string[]
    }

    class VesselClassPath {
        <<example>>
        "surface/warship/frigate/type23"
        "subsurface/submarine"
        "surface/auxiliary"
    }

    class VesselDomainEnum {
        <<enumeration>>
        surface
        subsurface
        unknown
    }

    class PlotSummary {
        +id: string
        +title: string
        +datetime: ISO8601
        +item_path: string
        +catalog_id: string
        +bbox: float[4]
        +time_extent: PlotTimeExtent
        +track_count: integer
        +location_count: integer
    }

    class StacItemSummary {
        +id: string
        +title: string
        +item_path: string
        +catalog_id: string
        +store_id: string
        +bbox: float[4]
        +start_datetime: ISO8601
        +end_datetime: ISO8601
        +vessel_classes: string[]
        +tags: string[]
        +nationalities: string[]
    }

    STACItem --> StacExtensionProperties : debrief:* properties
    StacExtensionProperties --> VesselDomainEnum
    VesselClassPath ..> StacExtensionProperties : vessel_classes
    PlotSummary ..> STACItem : derived from
    StacItemSummary ..> STACItem : derived from
```

## End-to-End: From Disk to Feature

How data flows from STAC storage through to individual GeoJSON features.

```mermaid
flowchart LR
    Store["STAC Store<br/>(directory)"]
    Cat["catalog.json"]
    Coll["collection.json<br/>(optional)"]
    ItemDir["plot-id/<br/>(item directory)"]
    Item["item.json<br/>(STAC Item)"]
    FC["features.geojson<br/>(FeatureCollection)"]
    Assets["assets/<br/>(source files)"]
    Results["results/<br/>(tool artifacts)"]
    Track["TrackFeature<br/>kind=TRACK"]
    Ref["ReferenceLocation<br/>kind=POINT"]
    Ann["Annotations<br/>kind=CIRCLE|LINE|..."]
    Sys["SystemRecord<br/>kind=SYSTEM_RECORD"]

    Store --> Cat
    Cat --> Coll
    Cat --> ItemDir
    Coll --> ItemDir
    ItemDir --> Item
    ItemDir --> FC
    ItemDir --> Assets
    ItemDir --> Results
    FC --> Track
    FC --> Ref
    FC --> Ann
    FC --> Sys
```
