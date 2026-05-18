

# Slot: style 



URI: [debrief:slot/style](https://debrief.info/schemas/slot/style)
Alias: style

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [CircleAnnotationProperties](../classes/CircleAnnotationProperties.md) | Properties for a CircleAnnotation |  no  |
| [RectangleAnnotationProperties](../classes/RectangleAnnotationProperties.md) | Properties for a RectangleAnnotation |  no  |
| [MultiPointFeatureProperties](../classes/MultiPointFeatureProperties.md) | Properties for a MultiPointFeature (multi-point tool results) |  no  |
| [LineAnnotationProperties](../classes/LineAnnotationProperties.md) | Properties for a LineAnnotation |  no  |
| [TrackProperties](../classes/TrackProperties.md) | Properties for a TrackFeature |  no  |
| [SegmentMetadata](../classes/SegmentMetadata.md) | Per-segment metadata for compound tracks |  no  |
| [NarrativeEntryProperties](../classes/NarrativeEntryProperties.md) | Properties for a NarrativeEntry annotation |  no  |
| [PolyAnnotationProperties](../classes/PolyAnnotationProperties.md) | Properties for a PolyAnnotation |  no  |
| [TextAnnotationProperties](../classes/TextAnnotationProperties.md) | Properties for a TextAnnotation |  no  |
| [MultiPolygonFeatureProperties](../classes/MultiPolygonFeatureProperties.md) | Properties for a MultiPolygonFeature (multi-polygon tool results) |  no  |
| [ReferenceLocationProperties](../classes/ReferenceLocationProperties.md) | Properties for a ReferenceLocation |  no  |
| [VectorAnnotationProperties](../classes/VectorAnnotationProperties.md) | Properties for a VectorAnnotation |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:style |
| native | debrief:style |




## LinkML Source

<details>
```yaml
name: style
alias: style
domain_of:
- SegmentMetadata
- TrackProperties
- ReferenceLocationProperties
- MultiPointFeatureProperties
- MultiPolygonFeatureProperties
- NarrativeEntryProperties
- CircleAnnotationProperties
- RectangleAnnotationProperties
- LineAnnotationProperties
- TextAnnotationProperties
- VectorAnnotationProperties
- PolyAnnotationProperties
range: string

```
</details>