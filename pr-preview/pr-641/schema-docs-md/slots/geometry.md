

# Slot: geometry 



URI: [debrief:slot/geometry](https://debrief.info/schemas/slot/geometry)
Alias: geometry

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [NarrativeEntry](../classes/NarrativeEntry.md) | GeoJSON Feature for timestamped narrative/log entries |  no  |
| [MultiPointFeature](../classes/MultiPointFeature.md) | GeoJSON Feature for multi-point tool results |  no  |
| [RectangleAnnotation](../classes/RectangleAnnotation.md) | GeoJSON Feature for rectangle annotations |  no  |
| [TrackFeature](../classes/TrackFeature.md) | GeoJSON Feature representing a vessel track |  no  |
| [SystemState](../classes/SystemState.md) | GeoJSON Feature for storing non-spatial system state |  no  |
| [SceneFeature](../classes/SceneFeature.md) | GeoJSON Feature representing a Scene child entity |  no  |
| [CircleAnnotation](../classes/CircleAnnotation.md) | GeoJSON Feature for circle annotations |  no  |
| [RawGeoJSONFeature](../classes/RawGeoJSONFeature.md) | Parse-boundary GeoJSON Feature (RFC 7946 §3 |  no  |
| [StoryboardFeature](../classes/StoryboardFeature.md) | GeoJSON Feature representing a Storyboard parent entity |  no  |
| [LineAnnotation](../classes/LineAnnotation.md) | GeoJSON Feature for line segment annotations |  no  |
| [TextAnnotation](../classes/TextAnnotation.md) | GeoJSON Feature for text annotations at a position |  no  |
| [ReferenceLocation](../classes/ReferenceLocation.md) | GeoJSON Feature for fixed reference points or reference point sets |  no  |
| [VectorAnnotation](../classes/VectorAnnotation.md) | GeoJSON Feature for vector annotations |  no  |
| [MultiPolygonFeature](../classes/MultiPolygonFeature.md) | GeoJSON Feature for multi-polygon tool results |  no  |
| [PolyAnnotation](../classes/PolyAnnotation.md) | GeoJSON Feature for arbitrary polygon annotations |  no  |
| [InputFeatureState](../classes/InputFeatureState.md) | Pre-operation state of a feature captured before a coordinate-mutating tool e... |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:geometry |
| native | debrief:geometry |




## LinkML Source

<details>
```yaml
name: geometry
alias: geometry
domain_of:
- TrackFeature
- ReferenceLocation
- SystemState
- MultiPointFeature
- MultiPolygonFeature
- InputFeatureState
- NarrativeEntry
- CircleAnnotation
- RectangleAnnotation
- LineAnnotation
- TextAnnotation
- VectorAnnotation
- PolyAnnotation
- RawGeoJSONFeature
- StoryboardFeature
- SceneFeature
range: string

```
</details>