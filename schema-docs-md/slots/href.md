

# Slot: href 



URI: [debrief:slot/href](https://debrief.info/schemas/slot/href)
Alias: href

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SceneThumbnailAssetEntry](../classes/SceneThumbnailAssetEntry.md) | A single STAC Item asset entry produced by Storyboarding (#216) for one |  no  |
| [ToolResultAnnotations](../classes/ToolResultAnnotations.md) | Annotations for MCP tool result content items |  no  |
| [StacAsset](../classes/StacAsset.md) | A single asset entry within `assets[<key>]` |  no  |
| [StacLink](../classes/StacLink.md) | A single link entry within `links[]` |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:href |
| native | debrief:href |




## LinkML Source

<details>
```yaml
name: href
alias: href
domain_of:
- StacLink
- StacAsset
- ToolResultAnnotations
- SceneThumbnailAssetEntry
range: string

```
</details>