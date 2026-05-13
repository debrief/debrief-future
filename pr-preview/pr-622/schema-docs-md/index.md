
# Debrief Maritime Analysis Schemas

LinkML schemas for Debrief v4.x maritime tactical analysis platform. Defines GeoJSON profile extensions for tracks and reference locations. This is a tracer bullet implementation covering core entity types.

URI: https://debrief.info/schemas/debrief

Name: debrief

## Featured Classes

The schemas below see the most use across the Debrief codebase. Start here for a quick tour; the full alphabetical tree is below.

### Plot features (GeoJSON)

These classes define what actually gets drawn on the map and persisted in a STAC item's GeoJSON payload.

- [TrackFeature](classes/TrackFeature.md) — vessel track with timestamped positions and styling
- [ReferenceLocation](classes/ReferenceLocation.md) — fixed reference point or set of points
- [SensorData](classes/SensorData.md) — named sensor and its bearing/range contact series
- [SensorContact](classes/SensorContact.md) — a single bearing / range observation

### Analysis tooling

Metadata that describes the analysis tools exposed by `debrief-calc` and their inputs.

- [Tool](classes/Tool.md) — analysis operation with name, version, selection requirements
- [ToolParameter](classes/ToolParameter.md) — typed parameter declaration (string / number / bool / enum)
- [SelectionRequirement](classes/SelectionRequirement.md) — feature-kind and cardinality constraints

### Provenance and replay

Every transformation records lineage so it can be replayed — these classes capture that chain.

- [LogEntry](classes/LogEntry.md) — activity record (what ran, when, against which features)
- [WasGeneratedBy](classes/WasGeneratedBy.md) — W3C PROV term linking outputs to tool + parameters
- [ParameterValue](classes/ParameterValue.md) — typed parameter value preserved for replay
- [InputFeatureState](classes/InputFeatureState.md) — pre-operation feature snapshot

### Session state (live plot)

The shape of the in-memory state a VS Code / web-shell session exposes to the rest of the app.

- [GeoJSONFeature](classes/GeoJSONFeature.md) — tool-result feature layer entry
- [FeatureSelection](classes/FeatureSelection.md) — currently-selected feature identifiers
- [ViewportPolygon](classes/ViewportPolygon.md) — 4-corner polygon describing current view
- [TimeInstant](classes/TimeInstant.md) — a single point in time (epoch + ISO forms)
- [TimeRange](classes/TimeRange.md) — a temporal interval (start, end)

### Catalog and platform metadata

How Debrief identifies vessels and discovers their metadata from STAC catalogs.

- [PlatformRecord](classes/PlatformRecord.md) — resolved metadata for a single platform (ship, aircraft, etc.)
- [BranchRecord](classes/BranchRecord.md) — reference to a branched plot in the STAC catalog

### Styling

- [PositionStyle](classes/PositionStyle.md) — default styling applied to track positions

---



## Classes

| Class | Description |
| --- | --- |
| [Any](classes/Any.md) | Permissive wildcard class used for free-form JSON object ranges (e |
| [BaseFeatureProperties](classes/BaseFeatureProperties.md) | Abstract base for all GeoJSON feature properties classes |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[CircleAnnotationProperties](classes/CircleAnnotationProperties.md) | Properties for a CircleAnnotation |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[LineAnnotationProperties](classes/LineAnnotationProperties.md) | Properties for a LineAnnotation |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[MultiPointFeatureProperties](classes/MultiPointFeatureProperties.md) | Properties for a MultiPointFeature (multi-point tool results) |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[MultiPolygonFeatureProperties](classes/MultiPolygonFeatureProperties.md) | Properties for a MultiPolygonFeature (multi-polygon tool results) |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[NarrativeEntryProperties](classes/NarrativeEntryProperties.md) | Properties for a NarrativeEntry annotation |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[PolyAnnotationProperties](classes/PolyAnnotationProperties.md) | Properties for a PolyAnnotation |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[RectangleAnnotationProperties](classes/RectangleAnnotationProperties.md) | Properties for a RectangleAnnotation |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[ReferenceLocationProperties](classes/ReferenceLocationProperties.md) | Properties for a ReferenceLocation |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[SceneProperties](classes/SceneProperties.md) | Properties class for a Scene child Feature |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[StoryboardProperties](classes/StoryboardProperties.md) | Properties class for a Storyboard parent Feature |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[TextAnnotationProperties](classes/TextAnnotationProperties.md) | Properties for a TextAnnotation |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[TrackProperties](classes/TrackProperties.md) | Properties for a TrackFeature |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[VectorAnnotationProperties](classes/VectorAnnotationProperties.md) | Properties for a VectorAnnotation |
| [BranchOrigin](classes/BranchOrigin.md) | Reverse link on a branch plot's system record, pointing to the source plot |
| [BranchRecord](classes/BranchRecord.md) | Reference to a branched plot |
| [BrowserFilterSlice](classes/BrowserFilterSlice.md) | Multi-axis filter state for the STAC browser panel |
| [CircleAnnotation](classes/CircleAnnotation.md) | GeoJSON Feature for circle annotations |
| [Coordinate](classes/Coordinate.md) | A geographic coordinate [longitude, latitude] |
| [DatasetAxisMetadata](classes/DatasetAxisMetadata.md) | Axis label and type metadata for a dataset chart |
| [DatasetDataPoint](classes/DatasetDataPoint.md) | A single structured data record within a series or flat dataset |
| [DatasetEntry](classes/DatasetEntry.md) | Standard envelope for all tool result datasets, matching the runtime DatasetE... |
| [DatasetMetadata](classes/DatasetMetadata.md) | Chart metadata for a dataset entry |
| [DatasetSeries](classes/DatasetSeries.md) | A named data series within a multi-series dataset |
| [DocumentSlice](classes/DocumentSlice.md) | Editor lifecycle state including dirty tracking and undo history |
| [FeatureSelection](classes/FeatureSelection.md) | Set of selected feature identifiers with metadata (FR-017) |
| [FeaturesSlice](classes/FeaturesSlice.md) | Feature selection and visibility state |
| [FileProvEntry](classes/FileProvEntry.md) | File-level provenance event (snapshot or branch creation) |
| [GeoJSONEmptyPoint](classes/GeoJSONEmptyPoint.md) | GeoJSON Point geometry with empty coordinates (for non-spatial features) |
| [GeoJSONLineString](classes/GeoJSONLineString.md) | GeoJSON LineString geometry |
| [GeoJSONMultiLineString](classes/GeoJSONMultiLineString.md) | GeoJSON MultiLineString geometry for compound tracks |
| [GeoJSONMultiPoint](classes/GeoJSONMultiPoint.md) | GeoJSON MultiPoint geometry for reference point sets |
| [GeoJSONMultiPolygon](classes/GeoJSONMultiPolygon.md) | GeoJSON MultiPolygon geometry for multi-polygon tool results |
| [GeoJSONPoint](classes/GeoJSONPoint.md) | GeoJSON Point geometry |
| [GeoJSONPolygon](classes/GeoJSONPolygon.md) | GeoJSON Polygon geometry |
| [InputFeatureState](classes/InputFeatureState.md) | Pre-operation state of a feature captured before a coordinate-mutating tool e... |
| [LastToolExecution](classes/LastToolExecution.md) | Record of the last tool execution, enabling single-step undo |
| [LevelDefinition](classes/LevelDefinition.md) | Named nesting level within a feature hierarchy (Feature 053, FR-010) |
| [LineAnnotation](classes/LineAnnotation.md) | GeoJSON Feature for line segment annotations |
| [LineProperties](classes/LineProperties.md) | Styling schema for LineString and MultiLineString geometries |
| [LogEntry](classes/LogEntry.md) | A PROV-aligned provenance record stored on GeoJSON features |
| [MCPContentItem](classes/MCPContentItem.md) | A single MCP content item (resource, text, or image) |
| [MCPErrorResponse](classes/MCPErrorResponse.md) | MCP error response envelope |
| [MCPParamSchema](classes/MCPParamSchema.md) | JSON-Schema-like parameter fragment used inside MCPToolDefinition |
| [MCPRequest](classes/MCPRequest.md) | MCP tool invocation envelope |
| [MCPSelectionRequirement](classes/MCPSelectionRequirement.md) | Predicate describing what feature selection a tool needs (e |
| [MCPToolDefinition](classes/MCPToolDefinition.md) | Static catalogue entry advertised by the MCP server |
| [MCPToolResponse](classes/MCPToolResponse.md) | Successful MCP tool response |
| [MeasuredArrayPosition](classes/MeasuredArrayPosition.md) | Timestamped geographic position of a towed array centre |
| [MultiPointFeature](classes/MultiPointFeature.md) | GeoJSON Feature for multi-point tool results |
| [MultiPolygonFeature](classes/MultiPolygonFeature.md) | GeoJSON Feature for multi-polygon tool results |
| [NarrativeEntry](classes/NarrativeEntry.md) | GeoJSON Feature for timestamped narrative/log entries |
| [ParameterValue](classes/ParameterValue.md) | A typed parameter value with replay metadata |
| [PlatformRecord](classes/PlatformRecord.md) | Fully-resolved metadata for a single platform within a STAC item |
| [PlotSummary](classes/PlotSummary.md) | Projection of a STAC Item for UI consumption (e |
| [PlotTimeExtent](classes/PlotTimeExtent.md) | Temporal extent of a plot expressed as ISO 8601 strings |
| [PointMetadataEntry](classes/PointMetadataEntry.md) | Metadata for a single point within a MultiPoint reference set |
| [PointProperties](classes/PointProperties.md) | Styling schema for Point and MultiPoint geometries |
| [PolyAnnotation](classes/PolyAnnotation.md) | GeoJSON Feature for arbitrary polygon annotations |
| [PolygonProperties](classes/PolygonProperties.md) | Styling schema for Polygon and MultiPolygon geometries |
| [PositionStyle](classes/PositionStyle.md) | Default styling configuration for track positions |
| [PositionStyleOverride](classes/PositionStyleOverride.md) | Per-position style override |
| [PropertiesProvenanceEntry](classes/PropertiesProvenanceEntry.md) | Single entry in item |
| [RawGeoJSONFeature](classes/RawGeoJSONFeature.md) | Parse-boundary GeoJSON Feature (RFC 7946 §3 |
| [RawGeoJSONFeatureCollection](classes/RawGeoJSONFeatureCollection.md) | Parse-boundary GeoJSON FeatureCollection (RFC 7946 §3 |
| [RectangleAnnotation](classes/RectangleAnnotation.md) | GeoJSON Feature for rectangle annotations |
| [ReferenceLocation](classes/ReferenceLocation.md) | GeoJSON Feature for fixed reference points or reference point sets |
| [ResultsSlice](classes/ResultsSlice.md) | Accumulated tool result layers and last-execution record for undo support |
| [ResultTypePath](classes/ResultTypePath.md) | Slash-delimited hierarchical type path |
| [SceneFeature](classes/SceneFeature.md) | GeoJSON Feature representing a Scene child entity |
| [SceneThumbnailAssetEntry](classes/SceneThumbnailAssetEntry.md) | A single STAC Item asset entry produced by Storyboarding (#216) for one |
| [SegmentMetadata](classes/SegmentMetadata.md) | Per-segment metadata for compound tracks |
| [SelectionRequirement](classes/SelectionRequirement.md) | A constraint specifying which feature kinds a tool accepts, with minimum and ... |
| [SensorContact](classes/SensorContact.md) | Single sensor measurement record |
| [SensorData](classes/SensorData.md) | Named sensor with contact measurements |
| [SessionFile](classes/SessionFile.md) | Persisted session file format (FR-024) |
| [SessionState](classes/SessionState.md) | Root entity containing all session state slices (FR-001, FR-002) |
| [SnapshotLinks](classes/SnapshotLinks.md) | Doubly-linked references to adjacent snapshots |
| [SnapshotRef](classes/SnapshotRef.md) | Reference to a snapshot file |
| [SpatialSlice](classes/SpatialSlice.md) | Geographic view state for the map display |
| [StacExtensionProperties](classes/StacExtensionProperties.md) | Extension properties added to STAC item |
| [StacItemSummary](classes/StacItemSummary.md) | Minimal STAC Item projection for browser tree display and metadata filtering |
| [StoryboardFeature](classes/StoryboardFeature.md) | GeoJSON Feature representing a Storyboard parent entity |
| [SystemRecordProperties](classes/SystemRecordProperties.md) | Properties for the non-spatial system record feature |
| [SystemState](classes/SystemState.md) | GeoJSON Feature for storing non-spatial system state |
| [SystemStateProperties](classes/SystemStateProperties.md) | Properties for SYSTEM features storing application state |
| [TemporalSlice](classes/TemporalSlice.md) | Time-related state including navigation, playback, and filtering |
| [TextAnnotation](classes/TextAnnotation.md) | GeoJSON Feature for text annotations at a position |
| [TimeFilter](classes/TimeFilter.md) | Constraints on the visible time window (epoch milliseconds; null = unbounded) |
| [TimeInstant](classes/TimeInstant.md) | A point in time with dual representations (FR-032, FR-033) |
| [TimeRange](classes/TimeRange.md) | A temporal interval with inclusive start and end |
| [TimestampedPosition](classes/TimestampedPosition.md) | Temporal and kinematic metadata for a single track position |
| [TimeStep](classes/TimeStep.md) | Step size for discrete time navigation (FR-008) |
| [Tool](classes/Tool.md) | An analysis operation with a name, description, version, and selection requir... |
| [ToolDefinition](classes/ToolDefinition.md) | Consumer-facing flattened view of a tool catalogue entry |
| [ToolExecutionResultForReplay](classes/ToolExecutionResultForReplay.md) | Minimal tool-execution result returned by the Replay Engine's `execute_tool` ... |
| [ToolParameter](classes/ToolParameter.md) | A configurable parameter for a tool |
| [ToolParameterMeta](classes/ToolParameterMeta.md) | Tunable parameter metadata recorded alongside a tool result for provenance |
| [ToolResult](classes/ToolResult.md) | Logical tool invocation result as seen by the consumer (after the MCP layer h... |
| [ToolResultAnnotations](classes/ToolResultAnnotations.md) | Annotations for MCP tool result content items |
| [ToolResultForLog](classes/ToolResultForLog.md) | Persisted tool-result shape written by the live tool-result logger and read b... |
| [ToolsUpdateMessage](classes/ToolsUpdateMessage.md) | Push notification from the extension host to the activity-panel webview when ... |
| [TrackFeature](classes/TrackFeature.md) | GeoJSON Feature representing a vessel track |
| [TrackStyle](classes/TrackStyle.md) | Composite styling for TrackFeature, supporting both line path and position ma... |
| [TUAData](classes/TUAData.md) | Named TUA solution collection |
| [TUASolution](classes/TUASolution.md) | Single Target Uncertainty Area estimate |
| [TuneAnnotation](classes/TuneAnnotation.md) | Records a parameter modification (appended, not replacing original) |
| [VectorAnnotation](classes/VectorAnnotation.md) | GeoJSON Feature for vector annotations |
| [Viewport](classes/Viewport.md) | Camera state sub-record inside a Scene |
| [ViewportPolygon](classes/ViewportPolygon.md) | Geographic area as a 4-corner polygon supporting rotated views (FR-012, FR-01... |
| [WasGeneratedBy](classes/WasGeneratedBy.md) | Identifies the tool and its parameters for a specific invocation |



## Slots

| Slot | Description |
| --- | --- |
| [$schema](slots/$schema.md) | JSON Schema URI |
| [_polygon_source](slots/_polygon_source.md) | Provenance of the scene's stored polygon geometry (Spec #258) |
| [active_storyboard_id](slots/active_storyboard_id.md) | Storyboard properties |
| [activity_id](slots/activity_id.md) | Unique operation identifier (UUID v4) |
| [activity_type](slots/activity_type.md) | Semantic kind of this provenance record |
| [addressingMode](slots/addressingMode.md) | How addresses at this level are interpreted |
| [after_leg](slots/after_leg.md) | Name of following TMA leg (DYNAMIC_INFILL) |
| [agent](slots/agent.md) | Human actor (e |
| [ambiguous_bearing](slots/ambiguous_bearing.md) | Ambiguous bearing (second solution) in degrees |
| [annotations](slots/annotations.md) | Debrief-specific annotations (`debrief:resultType`, `debrief:label`, `debrief... |
| [array_centre_mode](slots/array_centre_mode.md) | How bearing line origin is calculated relative to host platform |
| [artifact_href](slots/artifact_href.md) | Path to an exported artifact (for non-GeoJSON tool results) |
| [asset](slots/asset.md) | Relative path to snapshot GeoJSON file |
| [base_frequency](slots/base_frequency.md) | Base frequency in Hz (TMA segments) |
| [bbox](slots/bbox.md) | Bounding box [minLon, minLat, maxLon, maxLat] |
| [bearing](slots/bearing.md) | Bearing to contact in degrees (0-360) |
| [before_leg](slots/before_leg.md) | Name of preceding TMA leg (DYNAMIC_INFILL) |
| [branch_id](slots/branch_id.md) | Unique branch identifier |
| [branch_origin](slots/branch_origin.md) | Reverse link to source plot (set when this plot is a branch) |
| [branched_at](slots/branched_at.md) | When the branch was created (ISO 8601 with timezone) |
| [branched_from](slots/branched_from.md) | Activity ID of the branch point |
| [branches](slots/branches.md) | Branch records |
| [catalog_id](slots/catalog_id.md) | Parent catalog identifier |
| [category](slots/category.md) | Visual category for Log Panel icon rendering |
| [center](slots/center.md) | Map center [longitude, latitude] - for spatial state |
| [centre_lat](slots/centre_lat.md) | Absolute latitude (mutual exclusive with bearing/range) |
| [centre_lon](slots/centre_lon.md) | Absolute longitude (mutual exclusive with bearing/range) |
| [choices](slots/choices.md) | Explicit choice list for enum-typed parameters when the client cannot (or cho... |
| [color](slots/color.md) | Stroke color (CSS color string) |
| [comment](slots/comment.md) | Operator note |
| [contacts](slots/contacts.md) | Array of sensor measurements |
| [content](slots/content.md) | Ordered list of content items returned by the tool |
| [coordinates](slots/coordinates.md) | [longitude, latitude] in degrees |
| [course](slots/course.md) | Course in degrees (0-360) |
| [currentTime](slots/currentTime.md) | Current playback/display time (FR-005) |
| [dash_array](slots/dash_array.md) | Dash pattern (SVG format, e |
| [data](slots/data.md) | Base64-encoded payload when type=image |
| [data_points](slots/data_points.md) | Array of structured data records for this series |
| [datasets](slots/datasets.md) | Optional dataset results for the Results panel (range-bearing charts, etc) |
| [datetime](slots/datetime.md) | Creation/capture timestamp (ISO 8601) |
| [default](slots/default.md) | Whether this is the default value |
| [default_position_style](slots/default_position_style.md) | Default styling applied to all positions |
| [default_value](slots/default_value.md) | Default value if not provided |
| [deletedFeatures](slots/deletedFeatures.md) | IDs of features removed (REQUIRED for deletions) |
| [depth](slots/depth.md) | Depth in meters (negative = below surface) |
| [description](slots/description.md) | Additional description |
| [direction](slots/direction.md) | 'source' or 'target' (for branch events) |
| [dirty](slots/dirty.md) | Unsaved changes exist - ephemeral (FR-020) |
| [disabled](slots/disabled.md) | Whether this entry is skipped during replay |
| [display_mode](slots/display_mode.md) | Time-controller display mode at capture time (full = entire track history; tr... |
| [display_name](slots/display_name.md) | Human-readable platform display name override |
| [displayMode](slots/displayMode.md) | Track visualization mode (FR-011) |
| [document](slots/document.md) | Editor state |
| [domain](slots/domain.md) | Vessel domain override |
| [duration_ms](slots/duration_ms.md) | Wall-clock duration of the tool invocation in milliseconds |
| [end](slots/end.md) | End of time extent (ISO 8601) |
| [end_datetime](slots/end_datetime.md) | Range end datetime (ISO 8601) |
| [end_time](slots/end_time.md) | Segment end timestamp (ISO8601) |
| [epoch](slots/epoch.md) | Milliseconds since Unix epoch |
| [error](slots/error.md) | Nested error object `{ code, message, data: { debrief:errorCategory, debrief:... |
| [execution_duration](slots/execution_duration.md) | Wall-clock execution time in ISO 8601 duration format (e |
| [feature_id](slots/feature_id.md) | ID of the feature whose pre-operation state is captured |
| [feature_set_hash](slots/feature_set_hash.md) | SHA-256 hex (lowercase, 64 chars) of JSON |
| [feature_tags](slots/feature_tags.md) | Union of all feature-level tags from the plot's GeoJSON features |
| [featureCollectionUri](slots/featureCollectionUri.md) | Reference to external feature collection (FR-016) |
| [featureIds](slots/featureIds.md) | Selected feature paths |
| [features](slots/features.md) | The collection's features, in document order |
| [fields](slots/fields.md) | Non-empty list of field names touched in this commit |
| [fill](slots/fill.md) | Whether to fill the shape |
| [fill_color](slots/fill_color.md) | Fill color (CSS color string) |
| [fill_opacity](slots/fill_opacity.md) | Fill transparency (0-1) |
| [frequency](slots/frequency.md) | Measured frequency in Hz |
| [generated](slots/generated.md) | Feature IDs or versioned asset paths of outputs |
| [generated_result_id](slots/generated_result_id.md) | Stable logical identity for artifact-producing tools |
| [geometry](slots/geometry.md) | Track path as LineString (simple) or MultiLineString (compound) |
| [has_ambiguous](slots/has_ambiguous.md) | Controls ambiguous bearing display |
| [has_bearing](slots/has_bearing.md) | Controls bearing line display (true=show, false=hide) |
| [has_frequency](slots/has_frequency.md) | Controls frequency data display |
| [hiddenFeatureIds](slots/hiddenFeatureIds.md) | Features hidden from display (FR-018) |
| [host_sensor_name](slots/host_sensor_name.md) | Towed array sensor name (RELATIVE_TMA) |
| [host_track_id](slots/host_track_id.md) | ID of track this solution is relative to (RELATIVE_TMA) |
| [host_track_name](slots/host_track_name.md) | Name of track this TUA set relates to |
| [href](slots/href.md) | Relative path to artifact file (REQUIRED for artifacts) |
| [id](slots/id.md) | Unique identifier (UUID recommended) |
| [index](slots/index.md) | 0-based ordinal matching coordinates array position |
| [input](slots/input.md) | Free-form per-tool input payload (Article XV |
| [input_schema](slots/input_schema.md) | JSON-Schema fragment describing the tool's input payload |
| [input_state](slots/input_state.md) | Pre-operation feature states for coordinate-mutating tools |
| [is_error](slots/is_error.md) | Reserved for streaming partial-error responses (additive over the live wire f... |
| [iso](slots/iso.md) | ISO 8601 UTC format string |
| [item_path](slots/item_path.md) | Path to item |
| [kind](slots/kind.md) | Feature type discriminator |
| [label](slots/label.md) | Custom label text (null = use timestamp) |
| [label_interval](slots/label_interval.md) | ISO 8601 duration for interval-based label display |
| [label_location](slots/label_location.md) | Label horizontal alignment |
| [last_tool_execution](slots/last_tool_execution.md) | Last tool execution record for single-step undo |
| [latitude](slots/latitude.md) | Latitude in degrees (-90 to 90) |
| [legacy_style](slots/legacy_style.md) | Legacy symbol name from Debrief symbology (e |
| [line](slots/line.md) | Styling for the track line path |
| [line_cap](slots/line_cap.md) | Line endpoint style |
| [line_join](slots/line_join.md) | Line join style |
| [line_number](slots/line_number.md) | Source line number for debugging |
| [line_style](slots/line_style.md) | Bearing line visual style |
| [line_thickness](slots/line_thickness.md) | Bearing line width in pixels |
| [location](slots/location.md) | Array centre position [longitude, latitude] (GeoJSON coordinate order) |
| [location_count](slots/location_count.md) | Number of reference locations in this plot |
| [location_type](slots/location_type.md) | Type of reference |
| [longitude](slots/longitude.md) | Longitude in degrees (-180 to 180) |
| [max](slots/max.md) | Maximum number of features of this kind allowed |
| [maxima](slots/maxima.md) | Semi-major axis in metres |
| [maxTracks](slots/maxTracks.md) | Maximum number of tracks (absent = no upper limit) |
| [measured_positions](slots/measured_positions.md) | Actual towed array positions for MEASURED array centre mode |
| [message](slots/message.md) | Status / explanation message |
| [metadata](slots/metadata.md) | Axis definitions and display hints |
| [metadata_expression](slots/metadata_expression.md) | Serialised CQL2 filter expression from the filter bar, stored as an opaque JS... |
| [metadata_filtered_ids](slots/metadata_filtered_ids.md) | Set of exercise IDs passing the current metadata filter |
| [method](slots/method.md) | Versioned method identifier matching ^properties-panel@ |
| [mimeType](slots/mimeType.md) | IANA media type when type=image or type=resource |
| [min](slots/min.md) | Minimum number of features of this kind required |
| [minFeatures](slots/minFeatures.md) | Minimum number of features required (any type) |
| [minima](slots/minima.md) | Semi-minor axis in metres |
| [minTracks](slots/minTracks.md) | Minimum number of tracks required |
| [name](slots/name.md) | Human-readable segment name |
| [nationality](slots/nationality.md) | ISO 3166-1 alpha-2 country code override (e |
| [new_value](slots/new_value.md) | Value after tuning |
| [next](slots/next.md) | Link to next snapshot |
| [offset](slots/offset.md) | Sensor offset from host platform in metres |
| [offset_bearing](slots/offset_bearing.md) | Bearing offset in degrees (RELATIVE_TMA) |
| [offset_range](slots/offset_range.md) | Range offset in metres (RELATIVE_TMA) |
| [opacity](slots/opacity.md) | Stroke transparency (0-1) |
| [orientation](slots/orientation.md) | Ellipse orientation from north in degrees |
| [origin](slots/origin.md) | Explicit sensor location override [longitude, latitude] |
| [overrides](slots/overrides.md) | Flat list of field names on item |
| [param_type](slots/param_type.md) | References a schema-defined parameter-type enum by name |
| [parameter](slots/parameter.md) | Name of the parameter that was changed |
| [parameters](slots/parameters.md) | Full resolved parameter set |
| [path](slots/path.md) | Full hierarchical path |
| [payload](slots/payload.md) | Nested payload `{ tools, hasToolInventory?, hasSelection? }` |
| [platform_id](slots/platform_id.md) | Platform/vessel identifier |
| [platform_name](slots/platform_name.md) | Human-readable platform name |
| [platforms](slots/platforms.md) | Fully-resolved per-platform metadata array |
| [playbackRate](slots/playbackRate.md) | Playback speed multiplier 0 |
| [playbackState](slots/playbackState.md) | Current playback state - ephemeral (FR-010) |
| [point](slots/point.md) | Styling for position markers |
| [point_metadata](slots/point_metadata.md) | Per-point metadata array, parallel to MultiPoint coordinates |
| [position_style_overrides](slots/position_style_overrides.md) | Parallel array of per-position style overrides |
| [positions](slots/positions.md) | Per-position metadata (parallel to coordinates) |
| [prev](slots/prev.md) | Link to previous snapshot |
| [previous_value](slots/previous_value.md) | Value before tuning |
| [primary](slots/primary.md) | Primary selection path for properties display |
| [properties](slots/properties.md) | Track metadata |
| [prov_entry_count](slots/prov_entry_count.md) | Number of provenance entries in the snapshot |
| [provenance](slots/provenance.md) | PROV-aligned provenance records (append-only log of tool operations) |
| [provenance_log](slots/provenance_log.md) | Per-commit provenance entries written by the Properties Panel |
| [put_label_at](slots/put_label_at.md) | Label position along bearing line |
| [radius](slots/radius.md) | Marker radius in pixels |
| [range](slots/range.md) | Range to contact in metres |
| [rationale](slots/rationale.md) | Free-text analyst annotation explaining the reasoning for this operation |
| [required](slots/required.md) | Whether parameter must be provided |
| [requirements](slots/requirements.md) | List of selection requirements |
| [resource](slots/resource.md) | Nested resource descriptor `{ uri, mimeType, text }` when type=resource |
| [result_id](slots/result_id.md) | Stable result identifier (used by the activity panel) |
| [result_layer_ids](slots/result_layer_ids.md) | IDs of the result layers produced by the tool |
| [result_layers](slots/result_layers.md) | Accumulated tool result features |
| [result_type](slots/result_type.md) | Hierarchical result type (e |
| [resultLayer](slots/resultLayer.md) | Optional single result layer (e |
| [resultLayers](slots/resultLayers.md) | Optional multiple result layers (e |
| [resultType](slots/resultType.md) | Hierarchical result type (e |
| [roles](slots/roles.md) | Exactly ["thumbnail"] |
| [rotation](slots/rotation.md) | Map rotation in degrees 0-360 (FR-013) |
| [savedAt](slots/savedAt.md) | When the session was saved (ISO 8601) |
| [savePath](slots/savePath.md) | Last save location |
| [schema_version](slots/schema_version.md) | Schema version |
| [schemaVersion](slots/schemaVersion.md) | Schema version for persistence compatibility (FR-026) |
| [segment_type](slots/segment_type.md) | Segment type discriminator |
| [segments](slots/segments.md) | Per-segment metadata for compound tracks |
| [selected_ids](slots/selected_ids.md) | Array of selected feature IDs - for selection state |
| [selection](slots/selection.md) | Currently selected features (FR-017) |
| [sensors](slots/sensors.md) | Embedded sensor data associated with this track |
| [series](slots/series.md) | Named data series for multi-line/multi-series charts |
| [series_key](slots/series_key.md) | Series discriminator for multi-series datasets (e |
| [shape](slots/shape.md) | Marker shape |
| [show_label](slots/show_label.md) | Whether to display labels at positions |
| [show_symbol](slots/show_symbol.md) | Whether to display a symbol at positions |
| [snapshot_links](slots/snapshot_links.md) | Doubly-linked snapshot chain |
| [solutions](slots/solutions.md) | Array of TUA estimates |
| [source](slots/source.md) | Origin of the edit |
| [source_asset](slots/source_asset.md) | Relative path to the source plot file |
| [source_feature_ids](slots/source_feature_ids.md) | IDs of the source features the tool operated on |
| [source_features](slots/source_features.md) | IDs of input features used to generate this result |
| [source_path](slots/source_path.md) | Original source file path (for provenance) |
| [source_tool](slots/source_tool.md) | Name of calculation tool that produced this result |
| [sourceFeatures](slots/sourceFeatures.md) | IDs of input features used to generate this result |
| [spatial](slots/spatial.md) | Geographic view state |
| [spatial_filter_active](slots/spatial_filter_active.md) | Whether the map viewport is used as a spatial filter |
| [speed](slots/speed.md) | Speed in knots |
| [start](slots/start.md) | Start of time extent (ISO 8601) |
| [start_datetime](slots/start_datetime.md) | Range start datetime (ISO 8601) |
| [start_time](slots/start_time.md) | Segment start timestamp (ISO8601) |
| [state_type](slots/state_type.md) | Discriminator for state variant (temporal, spatial, selection, active_storybo... |
| [stepSize](slots/stepSize.md) | Step size for discrete navigation (FR-008) |
| [store_id](slots/store_id.md) | Parent store identifier (needed for URI construction) |
| [storyboard_id](slots/storyboard_id.md) | Foreign key to parent Storyboard |
| [stroke](slots/stroke.md) | Whether to draw outline |
| [structured_content](slots/structured_content.md) | Reserved for top-level free-form payload (e |
| [style](slots/style.md) | Per-segment line styling override |
| [success](slots/success.md) | Whether the tool succeeded |
| [symbol](slots/symbol.md) | Shape to use for position symbols |
| [symbol_interval](slots/symbol_interval.md) | ISO 8601 duration for interval-based symbol display |
| [tags](slots/tags.md) | Free-text labels assigned to this feature by the analyst |
| [target_asset](slots/target_asset.md) | Relative path to the branched plot file |
| [temporal](slots/temporal.md) | Time-related state |
| [temporal_filter_active](slots/temporal_filter_active.md) | Whether the timeline range is used as a temporal filter |
| [text](slots/text.md) | Narrative text content |
| [thumbnail_asset_ref](slots/thumbnail_asset_ref.md) | STAC asset key (path + name within the plot's STAC item) |
| [time](slots/time.md) | Position timestamp (ISO8601) |
| [time_extent](slots/time_extent.md) | Temporal extent of the plot (start/end ISO 8601 strings) |
| [time_range](slots/time_range.md) | Reserved slot for v2 animated time-range Scenes |
| [timeFilter](slots/timeFilter.md) | Optional visible time window constraint (FR-007) |
| [timeRange](slots/timeRange.md) | Full temporal extent of loaded data (FR-006) |
| [timestamp](slots/timestamp.md) | When the operation occurred (ISO 8601 with timezone) |
| [title](slots/title.md) | Plot title from STAC metadata |
| [tool](slots/tool.md) | Tool identifier (kebab-case, e |
| [tool_id](slots/tool_id.md) | Identifier of the tool that was executed |
| [tool_version](slots/tool_version.md) | Semantic version of the tool (e |
| [track_count](slots/track_count.md) | Number of tracks in this plot |
| [track_id](slots/track_id.md) | Associated track identifier (optional) |
| [track_type](slots/track_type.md) | Type of track |
| [transition_duration_ms](slots/transition_duration_ms.md) | Playback transition duration in milliseconds |
| [tuas](slots/tuas.md) | Embedded Target Uncertainty Area data associated with this track |
| [tunable](slots/tunable.md) | Whether this parameter can be modified during replay |
| [tune](slots/tune.md) | Parameter tuning record |
| [type](slots/type.md) | Geometry type discriminator |
| [unit](slots/unit.md) | Unit of the step |
| [units](slots/units.md) | Units for the axis values (e |
| [used](slots/used.md) | Feature IDs of inputs |
| [valid_from](slots/valid_from.md) | Start of validity period |
| [valid_until](slots/valid_until.md) | End of validity period |
| [value](slots/value.md) | The parameter value (any JSON type) |
| [version](slots/version.md) | Tool version string for provenance tracking |
| [vertex_count](slots/vertex_count.md) | Number of unique vertices (excluding ring closure point) |
| [vessel_class](slots/vessel_class.md) | Full vessel classification path override using slash-separated notation (e |
| [vessel_role](slots/vessel_role.md) | Vessel role override (parent of leaf in classification path, e |
| [vessel_type](slots/vessel_type.md) | Vessel type override (leaf of classification path, e |
| [viewport](slots/viewport.md) | Visible map area as 4-corner polygon (FR-012) |
| [visible](slots/visible.md) | Contact visibility |
| [visible_feature_ids](slots/visible_feature_ids.md) | Stable feature IDs visible at capture |
| [was_generated_by](slots/was_generated_by.md) | Tool identity and parameters for this invocation |
| [weight](slots/weight.md) | Stroke width in pixels |
| [worm_in_hole](slots/worm_in_hole.md) | Display mode flag |
| [x_value](slots/x_value.md) | Primary independent-axis value serialised as a string |
| [xAxis](slots/xAxis.md) | X-axis metadata |
| [y_value](slots/y_value.md) | Primary dependent-axis value serialised as a string (decimal or label) |
| [yAxis](slots/yAxis.md) | Y-axis metadata |
| [zoom](slots/zoom.md) | Map zoom level - for spatial state |


## Enumerations

| Enumeration | Description |
| --- | --- |
| [ActivityType](enums/ActivityType.md) | Semantic discriminator for provenance records |
| [AddressingMode](enums/AddressingMode.md) | How addresses in a selection path level are interpreted (Feature 053) |
| [ArrayCentreModeEnum](enums/ArrayCentreModeEnum.md) | Array centre calculation mode for towed array sensors |
| [CardinalDirectionEnum](enums/CardinalDirectionEnum.md) | Eight-point compass directions |
| [DisplayModeEnum](enums/DisplayModeEnum.md) | Track visualization display mode |
| [DurationPresetEnum](enums/DurationPresetEnum.md) | Common ISO 8601 duration presets for interval parameters |
| [ErrorCategory](enums/ErrorCategory.md) | Categories of tool execution errors |
| [FeatureKindEnum](enums/FeatureKindEnum.md) | Discriminator for GeoJSON feature types |
| [FileProvDirectionEnum](enums/FileProvDirectionEnum.md) | Direction of a branch event |
| [FileProvEventTypeEnum](enums/FileProvEventTypeEnum.md) | Type of file-level provenance event |
| [LabelLocationEnum](enums/LabelLocationEnum.md) | Horizontal alignment of contact labels |
| [LineCapEnum](enums/LineCapEnum.md) | How line endpoints are rendered (SVG/CSS standard) |
| [LineJoinEnum](enums/LineJoinEnum.md) | How line segment joints are rendered (SVG/CSS standard) |
| [LineLabelPositionEnum](enums/LineLabelPositionEnum.md) | Position along the bearing line where the label is placed |
| [LineStyleEnum](enums/LineStyleEnum.md) | Visual style for bearing lines |
| [LocationTypeEnum](enums/LocationTypeEnum.md) | Type of reference location |
| [MarkerSymbolEnum](enums/MarkerSymbolEnum.md) | Marker shapes for tool parameter choices (superset of PointShapeEnum) |
| [MCPContentItemTypeEnum](enums/MCPContentItemTypeEnum.md) | Discriminator for MCPContentItem variants |
| [MCPParamTypeEnum](enums/MCPParamTypeEnum.md) | JSON-Schema-compatible primitive types for tool parameters |
| [NamedColorEnum](enums/NamedColorEnum.md) | Predefined named colours for styling tool parameters |
| [NumericPresetEnum](enums/NumericPresetEnum.md) | Common numeric presets for count and distance parameters |
| [OutputKindEnum](enums/OutputKindEnum.md) | Canonical output kind identifiers for tool result features |
| [ParameterTypeEnum](enums/ParameterTypeEnum.md) | Names of available schema-defined parameter types |
| [PlaybackStateEnum](enums/PlaybackStateEnum.md) | Current state of time playback |
| [PointShapeEnum](enums/PointShapeEnum.md) | Valid shapes for point markers |
| [PolygonSourceEnum](enums/PolygonSourceEnum.md) | Provenance of a Scene's stored polygon geometry |
| [ReferencePointPatternEnum](enums/ReferencePointPatternEnum.md) | Generation patterns for reference point placement |
| [ReplayStatusEnum](enums/ReplayStatusEnum.md) | Outcome of resolving a logged tool invocation at replay time |
| [ResultCategoryEnum](enums/ResultCategoryEnum.md) | Top-level result type categories per TOOL-RESULTS |
| [ResultTopType](enums/ResultTopType.md) | Top-level result type categories |
| [SegmentTypeEnum](enums/SegmentTypeEnum.md) | Discriminator for track segment types within compound tracks |
| [SessionMCPToolName](enums/SessionMCPToolName.md) | Authoritative list of session-state MCP tool names |
| [SystemStateTypeEnum](enums/SystemStateTypeEnum.md) | Discriminator for system state variants |
| [TimeUnitEnum](enums/TimeUnitEnum.md) | Units for time step navigation |
| [ToolCategoryEnum](enums/ToolCategoryEnum.md) | Visual category for Log Panel icon rendering |
| [TrackTypeEnum](enums/TrackTypeEnum.md) | Type of track feature |
| [VesselDomainEnum](enums/VesselDomainEnum.md) | Top-level vessel domain classification |


## Types

| Type | Description |
| --- | --- |
| [Boolean](types/Boolean.md) | A binary (true or false) value |
| [Coordinate](types/Coordinate.md) | A geographic coordinate value (longitude or latitude in degrees) |
| [CSSColor](types/CSSColor.md) | A CSS color string (e |
| [Curie](types/Curie.md) | a compact URI |
| [Date](types/Date.md) | a date (year, month and day) in an idealized calendar |
| [DateOrDatetime](types/DateOrDatetime.md) | Either a date or a datetime |
| [Datetime](types/Datetime.md) | The combination of a date and time |
| [Decimal](types/Decimal.md) | A real number with arbitrary precision that conforms to the xsd:decimal speci... |
| [Double](types/Double.md) | A real number that conforms to the xsd:double specification |
| [Float](types/Float.md) | A real number that conforms to the xsd:float specification |
| [Integer](types/Integer.md) | An integer |
| [Jsonpath](types/Jsonpath.md) | A string encoding a JSON Path |
| [Jsonpointer](types/Jsonpointer.md) | A string encoding a JSON Pointer |
| [Ncname](types/Ncname.md) | Prefix part of CURIE |
| [Nodeidentifier](types/Nodeidentifier.md) | A URI, CURIE or BNODE that represents a node in a model |
| [Objectidentifier](types/Objectidentifier.md) | A URI or CURIE that represents an object in the model |
| [Sparqlpath](types/Sparqlpath.md) | A string encoding a SPARQL Property Path |
| [String](types/String.md) | A character string |
| [Time](types/Time.md) | A time object represents a (local) time of day, independent of any particular... |
| [Uri](types/Uri.md) | a complete URI |
| [Uriorcurie](types/Uriorcurie.md) | a URI or a CURIE |


## Subsets

| Subset | Description |
| --- | --- |
