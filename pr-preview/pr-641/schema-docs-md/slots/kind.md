

# Slot: kind 



URI: [debrief:slot/kind](https://debrief.info/schemas/slot/kind)
Alias: kind

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [RectangleAnnotationProperties](../classes/RectangleAnnotationProperties.md) | Properties for a RectangleAnnotation |  no  |
| [TextAnnotationProperties](../classes/TextAnnotationProperties.md) | Properties for a TextAnnotation |  no  |
| [BaseFeatureProperties](../classes/BaseFeatureProperties.md) | Abstract base for all GeoJSON feature properties classes |  no  |
| [CircleAnnotationProperties](../classes/CircleAnnotationProperties.md) | Properties for a CircleAnnotation |  no  |
| [VectorAnnotationProperties](../classes/VectorAnnotationProperties.md) | Properties for a VectorAnnotation |  no  |
| [MCPSelectionRequirement](../classes/MCPSelectionRequirement.md) | Predicate describing what feature selection a tool needs (e |  no  |
| [ReferenceLocationProperties](../classes/ReferenceLocationProperties.md) | Properties for a ReferenceLocation |  no  |
| [MultiPointFeatureProperties](../classes/MultiPointFeatureProperties.md) | Properties for a MultiPointFeature (multi-point tool results) |  no  |
| [LineAnnotationProperties](../classes/LineAnnotationProperties.md) | Properties for a LineAnnotation |  no  |
| [SystemRecordProperties](../classes/SystemRecordProperties.md) | Properties for the non-spatial system record feature |  no  |
| [MultiPolygonFeatureProperties](../classes/MultiPolygonFeatureProperties.md) | Properties for a MultiPolygonFeature (multi-polygon tool results) |  no  |
| [NarrativeEntryProperties](../classes/NarrativeEntryProperties.md) | Properties for a NarrativeEntry annotation |  no  |
| [SceneProperties](../classes/SceneProperties.md) | Properties class for a Scene child Feature |  no  |
| [PolyAnnotationProperties](../classes/PolyAnnotationProperties.md) | Properties for a PolyAnnotation |  no  |
| [SystemStateProperties](../classes/SystemStateProperties.md) | Properties for SYSTEM features storing application state |  no  |
| [StoryboardProperties](../classes/StoryboardProperties.md) | Properties class for a Storyboard parent Feature |  no  |
| [SelectionRequirement](../classes/SelectionRequirement.md) | A constraint specifying which feature kinds a tool accepts, with minimum and ... |  no  |
| [TrackProperties](../classes/TrackProperties.md) | Properties for a TrackFeature |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:kind |
| native | debrief:kind |




## LinkML Source

<details>
```yaml
name: kind
alias: kind
domain_of:
- BaseFeatureProperties
- TrackProperties
- ReferenceLocationProperties
- SystemStateProperties
- MultiPointFeatureProperties
- MultiPolygonFeatureProperties
- NarrativeEntryProperties
- CircleAnnotationProperties
- RectangleAnnotationProperties
- LineAnnotationProperties
- TextAnnotationProperties
- VectorAnnotationProperties
- PolyAnnotationProperties
- SelectionRequirement
- SystemRecordProperties
- StoryboardProperties
- SceneProperties
- MCPSelectionRequirement
range: string

```
</details>