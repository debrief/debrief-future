

# Slot: description 



URI: [debrief:slot/description](https://debrief.info/schemas/slot/description)
Alias: description

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [MultiPolygonFeatureProperties](../classes/MultiPolygonFeatureProperties.md) | Properties for a MultiPolygonFeature (multi-polygon tool results) |  no  |
| [StoryboardProperties](../classes/StoryboardProperties.md) | Properties class for a Storyboard parent Feature |  no  |
| [SceneProperties](../classes/SceneProperties.md) | Properties class for a Scene child Feature |  no  |
| [Tool](../classes/Tool.md) | An analysis operation with a name, description, version, and selection requir... |  no  |
| [MultiPointFeatureProperties](../classes/MultiPointFeatureProperties.md) | Properties for a MultiPointFeature (multi-point tool results) |  no  |
| [ReferenceLocationProperties](../classes/ReferenceLocationProperties.md) | Properties for a ReferenceLocation |  no  |
| [LevelDefinition](../classes/LevelDefinition.md) | Named nesting level within a feature hierarchy (Feature 053, FR-010) |  no  |
| [ToolParameter](../classes/ToolParameter.md) | A configurable parameter for a tool |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:description |
| native | debrief:description |




## LinkML Source

<details>
```yaml
name: description
alias: description
domain_of:
- ReferenceLocationProperties
- MultiPointFeatureProperties
- MultiPolygonFeatureProperties
- Tool
- ToolParameter
- LevelDefinition
- StoryboardProperties
- SceneProperties
range: string

```
</details>