

# Slot: thumbnail_asset_ref 


_STAC asset key (path + name within the plot's STAC item). Populated by #216 at capture time via #174 helpers._





URI: [debrief:slot/thumbnail_asset_ref](https://debrief.info/schemas/slot/thumbnail_asset_ref)
Alias: thumbnail_asset_ref

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SceneProperties](../classes/SceneProperties.md) | Properties class for a Scene child Feature |  no  |






## Properties

* Range: [String](../types/String.md)

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:thumbnail_asset_ref |
| native | debrief:thumbnail_asset_ref |




## LinkML Source

<details>
```yaml
name: thumbnail_asset_ref
description: 'STAC asset key (path + name within the plot''s STAC item). Populated
  by #216 at capture time via #174 helpers.'
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: thumbnail_asset_ref
owner: SceneProperties
domain_of:
- SceneProperties
range: string
required: true

```
</details>