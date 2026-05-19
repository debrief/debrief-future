

# Slot: id 



URI: [debrief:slot/id](https://debrief.info/schemas/slot/id)
Alias: id

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [ToolDefinition](../classes/ToolDefinition.md) | Consumer-facing flattened view of a tool catalogue entry |  no  |
| [TrackFeature](../classes/TrackFeature.md) | GeoJSON Feature representing a vessel track |  no  |
| [StoryboardProperties](../classes/StoryboardProperties.md) | Properties class for a Storyboard parent Feature |  no  |
| [ReferenceLocation](../classes/ReferenceLocation.md) | GeoJSON Feature for fixed reference points or reference point sets |  no  |
| [RectangleAnnotation](../classes/RectangleAnnotation.md) | GeoJSON Feature for rectangle annotations |  no  |
| [TextAnnotation](../classes/TextAnnotation.md) | GeoJSON Feature for text annotations at a position |  no  |
| [SceneFeature](../classes/SceneFeature.md) | GeoJSON Feature representing a Scene child entity |  no  |
| [PlatformRecord](../classes/PlatformRecord.md) | Fully-resolved metadata for a single platform within a STAC item |  no  |
| [NarrativeEntry](../classes/NarrativeEntry.md) | GeoJSON Feature for timestamped narrative/log entries |  no  |
| [SystemState](../classes/SystemState.md) | GeoJSON Feature for storing non-spatial system state |  no  |
| [StacItemSummary](../classes/StacItemSummary.md) | Minimal STAC Item projection for browser tree display and metadata filtering |  no  |
| [SceneProperties](../classes/SceneProperties.md) | Properties class for a Scene child Feature |  no  |
| [PlotSummary](../classes/PlotSummary.md) | Projection of a STAC Item for UI consumption (e |  no  |
| [Tool](../classes/Tool.md) | An analysis operation with a name, description, version, and selection requir... |  no  |
| [PolyAnnotation](../classes/PolyAnnotation.md) | GeoJSON Feature for arbitrary polygon annotations |  no  |
| [VectorAnnotation](../classes/VectorAnnotation.md) | GeoJSON Feature for vector annotations |  no  |
| [MultiPolygonFeature](../classes/MultiPolygonFeature.md) | GeoJSON Feature for multi-polygon tool results |  no  |
| [StoryboardFeature](../classes/StoryboardFeature.md) | GeoJSON Feature representing a Storyboard parent entity |  no  |
| [CircleAnnotation](../classes/CircleAnnotation.md) | GeoJSON Feature for circle annotations |  no  |
| [MultiPointFeature](../classes/MultiPointFeature.md) | GeoJSON Feature for multi-point tool results |  no  |
| [LineAnnotation](../classes/LineAnnotation.md) | GeoJSON Feature for line segment annotations |  no  |
| [RawGeoJSONFeature](../classes/RawGeoJSONFeature.md) | Parse-boundary GeoJSON Feature (RFC 7946 §3 |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:id |
| native | debrief:id |




## LinkML Source

<details>
```yaml
name: id
alias: id
domain_of:
- TrackFeature
- ReferenceLocation
- SystemState
- MultiPointFeature
- MultiPolygonFeature
- NarrativeEntry
- CircleAnnotation
- RectangleAnnotation
- LineAnnotation
- TextAnnotation
- VectorAnnotation
- PolyAnnotation
- Tool
- PlatformRecord
- PlotSummary
- StacItemSummary
- RawGeoJSONFeature
- StoryboardProperties
- SceneProperties
- StoryboardFeature
- SceneFeature
- ToolDefinition
range: string

```
</details>