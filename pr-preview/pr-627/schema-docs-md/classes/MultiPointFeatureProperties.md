

# Class: MultiPointFeatureProperties 


_Properties for a MultiPointFeature (multi-point tool results)_





URI: [debrief:class/MultiPointFeatureProperties](https://debrief.info/schemas/class/MultiPointFeatureProperties)






```mermaid
 classDiagram
    class MultiPointFeatureProperties
    click MultiPointFeatureProperties href "../../classes/MultiPointFeatureProperties/"
      BaseFeatureProperties <|-- MultiPointFeatureProperties
        click BaseFeatureProperties href "../../classes/BaseFeatureProperties/"
      
      MultiPointFeatureProperties : description
        
      MultiPointFeatureProperties : kind
        
          
    
        
        
        MultiPointFeatureProperties --> "1" FeatureKindEnum : kind
        click FeatureKindEnum href "../../enums/FeatureKindEnum/"
    

        
      MultiPointFeatureProperties : label
        
      MultiPointFeatureProperties : provenance
        
          
    
        
        
        MultiPointFeatureProperties --> "*" LogEntry : provenance
        click LogEntry href "../../classes/LogEntry/"
    

        
      MultiPointFeatureProperties : source_features
        
      MultiPointFeatureProperties : source_tool
        
      MultiPointFeatureProperties : style
        
          
    
        
        
        MultiPointFeatureProperties --> "1" PointProperties : style
        click PointProperties href "../../classes/PointProperties/"
    

        
      MultiPointFeatureProperties : tags
        
      
```





## Inheritance
* [BaseFeatureProperties](../classes/BaseFeatureProperties.md)
    * **MultiPointFeatureProperties**



## Slots

| Name | Cardinality and Range | Description | Inheritance |
| ---  | --- | --- | --- |
| [kind](../slots/kind.md) | 1 <br/> [FeatureKindEnum](../enums/FeatureKindEnum.md) | Feature type discriminator | direct |
| [label](../slots/label.md) | 1 <br/> [String](../types/String.md) | Human-readable result label | direct |
| [style](../slots/style.md) | 1 <br/> [PointProperties](../classes/PointProperties.md) | Point styling for all positions | direct |
| [source_tool](../slots/source_tool.md) | 0..1 <br/> [String](../types/String.md) | Name of calculation tool that produced this result | direct |
| [source_features](../slots/source_features.md) | * <br/> [String](../types/String.md) | IDs of input features used to generate this result | direct |
| [description](../slots/description.md) | 0..1 <br/> [String](../types/String.md) | Additional description or notes | direct |
| [tags](../slots/tags.md) | * <br/> [String](../types/String.md) | Free-text labels assigned to this feature by the analyst | [BaseFeatureProperties](../classes/BaseFeatureProperties.md) |
| [provenance](../slots/provenance.md) | * <br/> [LogEntry](../classes/LogEntry.md) | PROV-aligned provenance records (append-only log of tool operations) | [BaseFeatureProperties](../classes/BaseFeatureProperties.md) |





## Usages

| used by | used in | type | used |
| ---  | --- | --- | --- |
| [MultiPointFeature](../classes/MultiPointFeature.md) | [properties](../slots/properties.md) | range | [MultiPointFeatureProperties](../classes/MultiPointFeatureProperties.md) |








## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:MultiPointFeatureProperties |
| native | debrief:MultiPointFeatureProperties |






## LinkML Source

<!-- TODO: investigate https://stackoverflow.com/questions/37606292/how-to-create-tabbed-code-blocks-in-mkdocs-or-sphinx -->

### Direct

<details>
```yaml
name: MultiPointFeatureProperties
description: Properties for a MultiPointFeature (multi-point tool results)
from_schema: https://debrief.info/schemas/debrief
is_a: BaseFeatureProperties
attributes:
  kind:
    name: kind
    description: Feature type discriminator
    from_schema: https://debrief.info/schemas/geojson
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
    range: FeatureKindEnum
    required: true
    equals_string: MULTI_POINT
  label:
    name: label
    description: Human-readable result label
    from_schema: https://debrief.info/schemas/geojson
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
    required: true
  style:
    name: style
    description: Point styling for all positions
    from_schema: https://debrief.info/schemas/geojson
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
    range: PointProperties
    required: true
  source_tool:
    name: source_tool
    description: Name of calculation tool that produced this result
    from_schema: https://debrief.info/schemas/geojson
    rank: 1000
    domain_of:
    - MultiPointFeatureProperties
    - MultiPolygonFeatureProperties
  source_features:
    name: source_features
    description: IDs of input features used to generate this result
    from_schema: https://debrief.info/schemas/geojson
    rank: 1000
    domain_of:
    - MultiPointFeatureProperties
    - MultiPolygonFeatureProperties
    range: string
    multivalued: true
  description:
    name: description
    description: Additional description or notes
    from_schema: https://debrief.info/schemas/geojson
    domain_of:
    - ReferenceLocationProperties
    - MultiPointFeatureProperties
    - MultiPolygonFeatureProperties
    - Tool
    - ToolParameter
    - LevelDefinition
    - StoryboardProperties
    - SceneProperties
    - MCPParamSchema
    - MCPToolDefinition
    - ToolDefinition

```
</details>

### Induced

<details>
```yaml
name: MultiPointFeatureProperties
description: Properties for a MultiPointFeature (multi-point tool results)
from_schema: https://debrief.info/schemas/debrief
is_a: BaseFeatureProperties
attributes:
  kind:
    name: kind
    description: Feature type discriminator
    from_schema: https://debrief.info/schemas/geojson
    alias: kind
    owner: MultiPointFeatureProperties
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
    range: FeatureKindEnum
    required: true
    equals_string: MULTI_POINT
  label:
    name: label
    description: Human-readable result label
    from_schema: https://debrief.info/schemas/geojson
    alias: label
    owner: MultiPointFeatureProperties
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
    required: true
  style:
    name: style
    description: Point styling for all positions
    from_schema: https://debrief.info/schemas/geojson
    alias: style
    owner: MultiPointFeatureProperties
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
    range: PointProperties
    required: true
  source_tool:
    name: source_tool
    description: Name of calculation tool that produced this result
    from_schema: https://debrief.info/schemas/geojson
    rank: 1000
    alias: source_tool
    owner: MultiPointFeatureProperties
    domain_of:
    - MultiPointFeatureProperties
    - MultiPolygonFeatureProperties
    range: string
  source_features:
    name: source_features
    description: IDs of input features used to generate this result
    from_schema: https://debrief.info/schemas/geojson
    rank: 1000
    alias: source_features
    owner: MultiPointFeatureProperties
    domain_of:
    - MultiPointFeatureProperties
    - MultiPolygonFeatureProperties
    range: string
    multivalued: true
  description:
    name: description
    description: Additional description or notes
    from_schema: https://debrief.info/schemas/geojson
    alias: description
    owner: MultiPointFeatureProperties
    domain_of:
    - ReferenceLocationProperties
    - MultiPointFeatureProperties
    - MultiPolygonFeatureProperties
    - Tool
    - ToolParameter
    - LevelDefinition
    - StoryboardProperties
    - SceneProperties
    - MCPParamSchema
    - MCPToolDefinition
    - ToolDefinition
    range: string
  tags:
    name: tags
    description: Free-text labels assigned to this feature by the analyst
    from_schema: https://debrief.info/schemas/common
    rank: 1000
    alias: tags
    owner: MultiPointFeatureProperties
    domain_of:
    - BaseFeatureProperties
    - StacExtensionProperties
    - StacItemSummary
    range: string
    required: false
    multivalued: true
  provenance:
    name: provenance
    description: PROV-aligned provenance records (append-only log of tool operations)
    from_schema: https://debrief.info/schemas/common
    rank: 1000
    alias: provenance
    owner: MultiPointFeatureProperties
    domain_of:
    - BaseFeatureProperties
    - SystemStateProperties
    - SystemRecordProperties
    range: LogEntry
    multivalued: true
    inlined: true
    inlined_as_list: true

```
</details>