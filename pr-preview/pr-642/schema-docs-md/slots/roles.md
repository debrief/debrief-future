

# Slot: roles 



URI: [debrief:slot/roles](https://debrief.info/schemas/slot/roles)
Alias: roles

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [StacItemAssetDefinition](../classes/StacItemAssetDefinition.md) | Item Asset Definition Object — declares the shape of an asset that child Item... |  no  |
| [StacAsset](../classes/StacAsset.md) | A single asset entry within `assets[<key>]` |  no  |
| [SceneThumbnailAssetEntry](../classes/SceneThumbnailAssetEntry.md) | A single STAC Item asset entry produced by Storyboarding (#216) for one |  no  |
| [StacProvider](../classes/StacProvider.md) | STAC provider entry |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:roles |
| native | debrief:roles |




## LinkML Source

<details>
```yaml
name: roles
alias: roles
domain_of:
- StacProvider
- StacAsset
- StacItemAssetDefinition
- SceneThumbnailAssetEntry
range: string

```
</details>