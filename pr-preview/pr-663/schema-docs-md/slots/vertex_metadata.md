

# Slot: vertex_metadata 


_Sparse list of per-vertex metadata, keyed by `path`. Empty arrays MUST be omitted from the serialised feature (FR-010). Duplicate `path` values MUST be rejected by validators (contract §Cross-cutting #3). Every concrete subclass of `BaseFeatureProperties` gains this slot by inheritance — see spec #192, contracts/vertex-metadata-slot.md._





URI: [debrief:slot/vertex_metadata](https://debrief.info/schemas/slot/vertex_metadata)
Alias: vertex_metadata

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [TextAnnotationProperties](../classes/TextAnnotationProperties.md) | Properties for a TextAnnotation |  no  |
| [RectangleAnnotationProperties](../classes/RectangleAnnotationProperties.md) | Properties for a RectangleAnnotation |  no  |
| [MultiPolygonFeatureProperties](../classes/MultiPolygonFeatureProperties.md) | Properties for a MultiPolygonFeature (multi-polygon tool results) |  no  |
| [MultiPointFeatureProperties](../classes/MultiPointFeatureProperties.md) | Properties for a MultiPointFeature (multi-point tool results) |  no  |
| [BaseFeatureProperties](../classes/BaseFeatureProperties.md) | Abstract base for all GeoJSON feature properties classes |  no  |
| [TrackProperties](../classes/TrackProperties.md) | Properties for a TrackFeature |  no  |
| [ReferenceLocationProperties](../classes/ReferenceLocationProperties.md) | Properties for a ReferenceLocation |  no  |
| [VectorAnnotationProperties](../classes/VectorAnnotationProperties.md) | Properties for a VectorAnnotation |  no  |
| [PolyAnnotationProperties](../classes/PolyAnnotationProperties.md) | Properties for a PolyAnnotation |  no  |
| [SceneProperties](../classes/SceneProperties.md) | Properties class for a Scene child Feature |  no  |
| [LineAnnotationProperties](../classes/LineAnnotationProperties.md) | Properties for a LineAnnotation |  no  |
| [StoryboardProperties](../classes/StoryboardProperties.md) | Properties class for a Storyboard parent Feature |  no  |
| [NarrativeEntryProperties](../classes/NarrativeEntryProperties.md) | Properties for a NarrativeEntry annotation |  no  |
| [CircleAnnotationProperties](../classes/CircleAnnotationProperties.md) | Properties for a CircleAnnotation |  no  |






## Properties

* Range: [VertexMetadata](../classes/VertexMetadata.md)

* Multivalued: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:vertex_metadata |
| native | debrief:vertex_metadata |




## LinkML Source

<details>
```yaml
name: vertex_metadata
description: 'Sparse list of per-vertex metadata, keyed by `path`. Empty arrays MUST
  be omitted from the serialised feature (FR-010). Duplicate `path` values MUST be
  rejected by validators (contract §Cross-cutting #3). Every concrete subclass of
  `BaseFeatureProperties` gains this slot by inheritance — see spec #192, contracts/vertex-metadata-slot.md.'
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: vertex_metadata
owner: BaseFeatureProperties
domain_of:
- BaseFeatureProperties
range: VertexMetadata
required: false
multivalued: true
inlined: true
inlined_as_list: true

```
</details>