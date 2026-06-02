

# Slot: id 



URI: [debrief:slot/id](https://debrief.info/schemas/slot/id)
Alias: id

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [PolyAnnotation](../classes/PolyAnnotation.md) | GeoJSON Feature for arbitrary polygon annotations |  no  |
| [MultiPolygonFeature](../classes/MultiPolygonFeature.md) | GeoJSON Feature for multi-polygon tool results |  no  |
| [ToolDefinition](../classes/ToolDefinition.md) | Consumer-facing flattened view of a tool catalogue entry |  no  |
| [MultiPointFeature](../classes/MultiPointFeature.md) | GeoJSON Feature for multi-point tool results |  no  |
| [StoryboardFeature](../classes/StoryboardFeature.md) | GeoJSON Feature representing a Storyboard parent entity |  no  |
| [Tool](../classes/Tool.md) | An analysis operation with a name, description, version, and selection requir... |  no  |
| [SceneFeature](../classes/SceneFeature.md) | GeoJSON Feature representing a Scene child entity |  no  |
| [TextAnnotation](../classes/TextAnnotation.md) | GeoJSON Feature for text annotations at a position |  no  |
| [PlatformRecord](../classes/PlatformRecord.md) | Fully-resolved metadata for a single platform within a STAC item |  no  |
| [RawGeoJSONFeature](../classes/RawGeoJSONFeature.md) | Parse-boundary GeoJSON Feature (RFC 7946 §3 |  no  |
| [SystemState](../classes/SystemState.md) | GeoJSON Feature for storing non-spatial system state |  no  |
| [TrackFeature](../classes/TrackFeature.md) | GeoJSON Feature representing a vessel track |  no  |
| [StacItem](../classes/StacItem.md) | A STAC 1 |  no  |
| [StacCatalog](../classes/StacCatalog.md) | A flat STAC Catalog (no extent, no summaries) |  no  |
| [VectorAnnotation](../classes/VectorAnnotation.md) | GeoJSON Feature for vector annotations |  no  |
| [RectangleAnnotation](../classes/RectangleAnnotation.md) | GeoJSON Feature for rectangle annotations |  no  |
| [StoryboardProperties](../classes/StoryboardProperties.md) | Properties class for a Storyboard parent Feature |  no  |
| [PlotSummary](../classes/PlotSummary.md) | Projection of a STAC Item for UI consumption (e |  no  |
| [ReferenceLocation](../classes/ReferenceLocation.md) | GeoJSON Feature for fixed reference points or reference point sets |  no  |
| [StacItemSummary](../classes/StacItemSummary.md) | Minimal STAC Item projection for browser tree display and metadata filtering |  no  |
| [CircleAnnotation](../classes/CircleAnnotation.md) | GeoJSON Feature for circle annotations |  no  |
| [LineAnnotation](../classes/LineAnnotation.md) | GeoJSON Feature for line segment annotations |  no  |
| [StacCollection](../classes/StacCollection.md) | A STAC 1 |  no  |
| [NarrativeEntry](../classes/NarrativeEntry.md) | GeoJSON Feature for timestamped narrative/log entries |  no  |
| [SceneProperties](../classes/SceneProperties.md) | Properties class for a Scene child Feature |  no  |






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
- StacItem
- StacCatalog
- StacCollection
- RawGeoJSONFeature
- StoryboardProperties
- SceneProperties
- StoryboardFeature
- SceneFeature
- ToolDefinition
range: string

```
</details>