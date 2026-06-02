

# Slot: description 



URI: [debrief:slot/description](https://debrief.info/schemas/slot/description)
Alias: description

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [StacItemProperties](../classes/StacItemProperties.md) | STAC Item `properties` block |  no  |
| [Tool](../classes/Tool.md) | An analysis operation with a name, description, version, and selection requir... |  no  |
| [SceneProperties](../classes/SceneProperties.md) | Properties class for a Scene child Feature |  no  |
| [MCPParamSchema](../classes/MCPParamSchema.md) | JSON-Schema-like parameter fragment used inside MCPToolDefinition |  no  |
| [MultiPolygonFeatureProperties](../classes/MultiPolygonFeatureProperties.md) | Properties for a MultiPolygonFeature (multi-polygon tool results) |  no  |
| [ReferenceLocationProperties](../classes/ReferenceLocationProperties.md) | Properties for a ReferenceLocation |  no  |
| [ToolDefinition](../classes/ToolDefinition.md) | Consumer-facing flattened view of a tool catalogue entry |  no  |
| [MultiPointFeatureProperties](../classes/MultiPointFeatureProperties.md) | Properties for a MultiPointFeature (multi-point tool results) |  no  |
| [StacAsset](../classes/StacAsset.md) | A single asset entry within `assets[<key>]` |  no  |
| [LevelDefinition](../classes/LevelDefinition.md) | Named nesting level within a feature hierarchy (Feature 053, FR-010) |  no  |
| [StacCatalog](../classes/StacCatalog.md) | A flat STAC Catalog (no extent, no summaries) |  no  |
| [StacItemAssetDefinition](../classes/StacItemAssetDefinition.md) | Item Asset Definition Object — declares the shape of an asset that child Item... |  no  |
| [ToolParameter](../classes/ToolParameter.md) | A configurable parameter for a tool |  no  |
| [StacCollection](../classes/StacCollection.md) | A STAC 1 |  no  |
| [StacProvider](../classes/StacProvider.md) | STAC provider entry |  no  |
| [StoryboardProperties](../classes/StoryboardProperties.md) | Properties class for a Storyboard parent Feature |  no  |
| [MCPToolDefinition](../classes/MCPToolDefinition.md) | Static catalogue entry advertised by the MCP server |  no  |






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
- StacProvider
- StacItemProperties
- StacCatalog
- StacAsset
- StacItemAssetDefinition
- StacCollection
- LevelDefinition
- StoryboardProperties
- SceneProperties
- MCPParamSchema
- MCPToolDefinition
- ToolDefinition
range: string

```
</details>