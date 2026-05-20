

# Slot: roles 


_Exactly ["thumbnail"]. Storyboarding-derived thumbnails are not declared as overview (which is reserved for plot-level overviews of dimensions 600x800)._





URI: [debrief:slot/roles](https://debrief.info/schemas/slot/roles)
Alias: roles

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SceneThumbnailAssetEntry](../classes/SceneThumbnailAssetEntry.md) | A single STAC Item asset entry produced by Storyboarding (#216) for one |  no  |






## Properties

* Range: [String](../types/String.md)

* Multivalued: True

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:roles |
| native | debrief:roles |




## LinkML Source

<details>
```yaml
name: roles
description: Exactly ["thumbnail"]. Storyboarding-derived thumbnails are not declared
  as overview (which is reserved for plot-level overviews of dimensions 600x800).
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: roles
owner: SceneThumbnailAssetEntry
domain_of:
- SceneThumbnailAssetEntry
range: string
required: true
multivalued: true

```
</details>