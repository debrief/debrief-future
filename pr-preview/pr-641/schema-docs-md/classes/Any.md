

# Class: Any 


_Wildcard class used for open-record extension-properties slots (StacItemProperties additional keys, StacAsset additional keys, StacSummaries additional keys). Maps to dict[str, object] in Pydantic and Record<string, unknown> in TypeScript. Article XV.2 exception documented in plan.md Complexity Tracking — see also raw-geojson.yaml `Any` precedent._





URI: [linkml:Any](https://w3id.org/linkml/Any)






```mermaid
 classDiagram
    class Any
    click Any href "../../classes/Any/"
      
```




<!-- no inheritance hierarchy -->


## Slots

| Name | Cardinality and Range | Description | Inheritance |
| ---  | --- | --- | --- |





## Usages

| used by | used in | type | used |
| ---  | --- | --- | --- |
| [StacItem](../classes/StacItem.md) | [assets](../slots/assets.md) | range | [Any](../classes/Any.md) |
| [StacCollection](../classes/StacCollection.md) | [item_assets](../slots/item_assets.md) | range | [Any](../classes/Any.md) |
| [RawGeoJSONFeature](../classes/RawGeoJSONFeature.md) | [properties](../slots/properties.md) | range | [Any](../classes/Any.md) |
| [MCPRequest](../classes/MCPRequest.md) | [input](../slots/input.md) | range | [Any](../classes/Any.md) |
| [MCPContentItem](../classes/MCPContentItem.md) | [resource](../slots/resource.md) | range | [Any](../classes/Any.md) |
| [MCPContentItem](../classes/MCPContentItem.md) | [annotations](../slots/annotations.md) | range | [Any](../classes/Any.md) |
| [MCPToolResponse](../classes/MCPToolResponse.md) | [structured_content](../slots/structured_content.md) | range | [Any](../classes/Any.md) |
| [MCPErrorResponse](../classes/MCPErrorResponse.md) | [error](../slots/error.md) | range | [Any](../classes/Any.md) |
| [MCPToolDefinition](../classes/MCPToolDefinition.md) | [input_schema](../slots/input_schema.md) | range | [Any](../classes/Any.md) |
| [MCPToolDefinition](../classes/MCPToolDefinition.md) | [annotations](../slots/annotations.md) | range | [Any](../classes/Any.md) |
| [ToolParameterMeta](../classes/ToolParameterMeta.md) | [value](../slots/value.md) | range | [Any](../classes/Any.md) |
| [ToolResult](../classes/ToolResult.md) | [resultLayer](../slots/resultLayer.md) | range | [Any](../classes/Any.md) |
| [ToolResult](../classes/ToolResult.md) | [resultLayers](../slots/resultLayers.md) | range | [Any](../classes/Any.md) |
| [ToolResult](../classes/ToolResult.md) | [parameters](../slots/parameters.md) | range | [Any](../classes/Any.md) |
| [ToolResult](../classes/ToolResult.md) | [datasets](../slots/datasets.md) | range | [Any](../classes/Any.md) |
| [ToolResultForLog](../classes/ToolResultForLog.md) | [features](../slots/features.md) | range | [Any](../classes/Any.md) |
| [ToolResultForLog](../classes/ToolResultForLog.md) | [input_state](../slots/input_state.md) | range | [Any](../classes/Any.md) |
| [ToolExecutionResultForReplay](../classes/ToolExecutionResultForReplay.md) | [features](../slots/features.md) | range | [Any](../classes/Any.md) |
| [ToolsUpdateMessage](../classes/ToolsUpdateMessage.md) | [payload](../slots/payload.md) | range | [Any](../classes/Any.md) |








## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | linkml:Any |
| native | debrief:Any |






## LinkML Source

<!-- TODO: investigate https://stackoverflow.com/questions/37606292/how-to-create-tabbed-code-blocks-in-mkdocs-or-sphinx -->

### Direct

<details>
```yaml
name: Any
description: Wildcard class used for open-record extension-properties slots (StacItemProperties
  additional keys, StacAsset additional keys, StacSummaries additional keys). Maps
  to dict[str, object] in Pydantic and Record<string, unknown> in TypeScript. Article
  XV.2 exception documented in plan.md Complexity Tracking — see also raw-geojson.yaml
  `Any` precedent.
from_schema: https://debrief.info/schemas/debrief
class_uri: linkml:Any

```
</details>

### Induced

<details>
```yaml
name: Any
description: Wildcard class used for open-record extension-properties slots (StacItemProperties
  additional keys, StacAsset additional keys, StacSummaries additional keys). Maps
  to dict[str, object] in Pydantic and Record<string, unknown> in TypeScript. Article
  XV.2 exception documented in plan.md Complexity Tracking — see also raw-geojson.yaml
  `Any` precedent.
from_schema: https://debrief.info/schemas/debrief
class_uri: linkml:Any

```
</details>