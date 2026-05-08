

# Slot: type 



URI: [debrief:slot/type](https://debrief.info/schemas/slot/type)
Alias: type

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [NarrativeEntry](../classes/NarrativeEntry.md) | GeoJSON Feature for timestamped narrative/log entries |  no  |
| [GeoJSONMultiPolygon](../classes/GeoJSONMultiPolygon.md) | GeoJSON MultiPolygon geometry for multi-polygon tool results |  no  |
| [GeoJSONPoint](../classes/GeoJSONPoint.md) | GeoJSON Point geometry |  no  |
| [CircleAnnotation](../classes/CircleAnnotation.md) | GeoJSON Feature for circle annotations |  no  |
| [LineAnnotation](../classes/LineAnnotation.md) | GeoJSON Feature for line segment annotations |  no  |
| [RectangleAnnotation](../classes/RectangleAnnotation.md) | GeoJSON Feature for rectangle annotations |  no  |
| [ReferenceLocation](../classes/ReferenceLocation.md) | GeoJSON Feature for fixed reference points or reference point sets |  no  |
| [GeoJSONLineString](../classes/GeoJSONLineString.md) | GeoJSON LineString geometry |  no  |
| [PolyAnnotation](../classes/PolyAnnotation.md) | GeoJSON Feature for arbitrary polygon annotations |  no  |
| [ToolParameter](../classes/ToolParameter.md) | A configurable parameter for a tool |  no  |
| [GeoJSONMultiPoint](../classes/GeoJSONMultiPoint.md) | GeoJSON MultiPoint geometry for reference point sets |  no  |
| [GeoJSONPolygon](../classes/GeoJSONPolygon.md) | GeoJSON Polygon geometry |  no  |
| [MultiPolygonFeature](../classes/MultiPolygonFeature.md) | GeoJSON Feature for multi-polygon tool results |  no  |
| [DatasetAxisMetadata](../classes/DatasetAxisMetadata.md) | Axis label and type metadata for a dataset chart |  no  |
| [StoryboardFeature](../classes/StoryboardFeature.md) | GeoJSON Feature representing a Storyboard parent entity |  no  |
| [DatasetEntry](../classes/DatasetEntry.md) | Standard envelope for all tool result datasets, matching the runtime DatasetE... |  no  |
| [TrackFeature](../classes/TrackFeature.md) | GeoJSON Feature representing a vessel track |  no  |
| [SystemState](../classes/SystemState.md) | GeoJSON Feature for storing non-spatial system state |  no  |
| [VectorAnnotation](../classes/VectorAnnotation.md) | GeoJSON Feature for vector annotations |  no  |
| [SceneThumbnailAssetEntry](../classes/SceneThumbnailAssetEntry.md) | A single STAC Item asset entry produced by Storyboarding (#216) for one |  no  |
| [TextAnnotation](../classes/TextAnnotation.md) | GeoJSON Feature for text annotations at a position |  no  |
| [RawGeoJSONFeature](../classes/RawGeoJSONFeature.md) | Parse-boundary GeoJSON Feature (RFC 7946 §3 |  no  |
| [FileProvEntry](../classes/FileProvEntry.md) | File-level provenance event (snapshot or branch creation) |  no  |
| [RawGeoJSONFeatureCollection](../classes/RawGeoJSONFeatureCollection.md) | Parse-boundary GeoJSON FeatureCollection (RFC 7946 §3 |  no  |
| [GeoJSONMultiLineString](../classes/GeoJSONMultiLineString.md) | GeoJSON MultiLineString geometry for compound tracks |  no  |
| [MultiPointFeature](../classes/MultiPointFeature.md) | GeoJSON Feature for multi-point tool results |  no  |
| [GeoJSONEmptyPoint](../classes/GeoJSONEmptyPoint.md) | GeoJSON Point geometry with empty coordinates (for non-spatial features) |  no  |
| [SceneFeature](../classes/SceneFeature.md) | GeoJSON Feature representing a Scene child entity |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:type |
| native | debrief:type |




## LinkML Source

<details>
```yaml
name: type
alias: type
domain_of:
- GeoJSONPoint
- GeoJSONEmptyPoint
- GeoJSONLineString
- GeoJSONPolygon
- GeoJSONMultiPoint
- GeoJSONMultiLineString
- GeoJSONMultiPolygon
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
- ToolParameter
- FileProvEntry
- RawGeoJSONFeature
- RawGeoJSONFeatureCollection
- DatasetAxisMetadata
- DatasetEntry
- StoryboardFeature
- SceneFeature
- SceneThumbnailAssetEntry
range: string

```
</details>