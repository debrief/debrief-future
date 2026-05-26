

# Slot: title 



URI: [debrief:slot/title](https://debrief.info/schemas/slot/title)
Alias: title

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [StacLink](../classes/StacLink.md) | A single link entry within `links[]` |  no  |
| [PlotSummary](../classes/PlotSummary.md) | Projection of a STAC Item for UI consumption (e |  no  |
| [StacCollection](../classes/StacCollection.md) | A STAC 1 |  no  |
| [StacAsset](../classes/StacAsset.md) | A single asset entry within `assets[<key>]` |  no  |
| [StacItemSummary](../classes/StacItemSummary.md) | Minimal STAC Item projection for browser tree display and metadata filtering |  no  |
| [StacItemAssetDefinition](../classes/StacItemAssetDefinition.md) | Item Asset Definition Object — declares the shape of an asset that child Item... |  no  |
| [SceneProperties](../classes/SceneProperties.md) | Properties class for a Scene child Feature |  no  |
| [StacItemProperties](../classes/StacItemProperties.md) | STAC Item `properties` block |  no  |
| [SceneThumbnailAssetEntry](../classes/SceneThumbnailAssetEntry.md) | A single STAC Item asset entry produced by Storyboarding (#216) for one |  no  |
| [DatasetEntry](../classes/DatasetEntry.md) | Standard envelope for all tool result datasets, matching the runtime DatasetE... |  no  |
| [StacCatalog](../classes/StacCatalog.md) | A flat STAC Catalog (no extent, no summaries) |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:title |
| native | debrief:title |




## LinkML Source

<details>
```yaml
name: title
alias: title
domain_of:
- PlotSummary
- StacItemSummary
- StacItemProperties
- StacCatalog
- StacLink
- StacAsset
- StacItemAssetDefinition
- StacCollection
- DatasetEntry
- SceneProperties
- SceneThumbnailAssetEntry
range: string

```
</details>