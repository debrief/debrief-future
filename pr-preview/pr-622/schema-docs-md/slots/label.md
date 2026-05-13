

# Slot: label 



URI: [debrief:slot/label](https://debrief.info/schemas/slot/label)
Alias: label

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [PositionStyleOverride](../classes/PositionStyleOverride.md) | Per-position style override |  no  |
| [MultiPolygonFeatureProperties](../classes/MultiPolygonFeatureProperties.md) | Properties for a MultiPolygonFeature (multi-polygon tool results) |  no  |
| [SensorContact](../classes/SensorContact.md) | Single sensor measurement record |  no  |
| [VectorAnnotationProperties](../classes/VectorAnnotationProperties.md) | Properties for a VectorAnnotation |  no  |
| [DatasetAxisMetadata](../classes/DatasetAxisMetadata.md) | Axis label and type metadata for a dataset chart |  no  |
| [MultiPointFeatureProperties](../classes/MultiPointFeatureProperties.md) | Properties for a MultiPointFeature (multi-point tool results) |  no  |
| [TUASolution](../classes/TUASolution.md) | Single Target Uncertainty Area estimate |  no  |
| [CircleAnnotationProperties](../classes/CircleAnnotationProperties.md) | Properties for a CircleAnnotation |  no  |
| [LineAnnotationProperties](../classes/LineAnnotationProperties.md) | Properties for a LineAnnotation |  no  |
| [ToolResultAnnotations](../classes/ToolResultAnnotations.md) | Annotations for MCP tool result content items |  no  |
| [RectangleAnnotationProperties](../classes/RectangleAnnotationProperties.md) | Properties for a RectangleAnnotation |  no  |
| [PolyAnnotationProperties](../classes/PolyAnnotationProperties.md) | Properties for a PolyAnnotation |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:label |
| native | debrief:label |




## LinkML Source

<details>
```yaml
name: label
alias: label
domain_of:
- PositionStyleOverride
- SensorContact
- TUASolution
- MultiPointFeatureProperties
- MultiPolygonFeatureProperties
- CircleAnnotationProperties
- RectangleAnnotationProperties
- LineAnnotationProperties
- VectorAnnotationProperties
- PolyAnnotationProperties
- ToolResultAnnotations
- DatasetAxisMetadata
range: string

```
</details>