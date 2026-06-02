

# Slot: item_assets 


_Optional Item-asset declarations (STAC 1.1 addition). Each entry is a `StacItemAssetDefinition` (no `href`) — distinct from the concrete `StacAsset` shape used by `StacItem.assets[<key>]`. The generator post-processor rewrites this to `dict[str, StacItemAssetDefinition]` (Pydantic) / `Record<string, StacItemAssetDefinition>` (TypeScript) so the call site narrows correctly._





URI: [debrief:slot/item_assets](https://debrief.info/schemas/slot/item_assets)
Alias: item_assets

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [StacCollection](../classes/StacCollection.md) | A STAC 1 |  no  |






## Properties

* Range: [Any](../classes/Any.md)




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:item_assets |
| native | debrief:item_assets |




## LinkML Source

<details>
```yaml
name: item_assets
description: Optional Item-asset declarations (STAC 1.1 addition). Each entry is a
  `StacItemAssetDefinition` (no `href`) — distinct from the concrete `StacAsset` shape
  used by `StacItem.assets[<key>]`. The generator post-processor rewrites this to
  `dict[str, StacItemAssetDefinition]` (Pydantic) / `Record<string, StacItemAssetDefinition>`
  (TypeScript) so the call site narrows correctly.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: item_assets
owner: StacCollection
domain_of:
- StacCollection
range: Any
required: false

```
</details>