

# Slot: visible_feature_ids 


_Stable feature IDs visible at capture. Canonicalised (trim, reject empty, dedupe, sort lexicographically) by the CRUD module before hashing. Order-insensitive from the consumer's perspective._





URI: [debrief:slot/visible_feature_ids](https://debrief.info/schemas/slot/visible_feature_ids)
Alias: visible_feature_ids

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SceneProperties](../classes/SceneProperties.md) | Properties class for a Scene child Feature |  no  |






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
| self | debrief:visible_feature_ids |
| native | debrief:visible_feature_ids |




## LinkML Source

<details>
```yaml
name: visible_feature_ids
description: Stable feature IDs visible at capture. Canonicalised (trim, reject empty,
  dedupe, sort lexicographically) by the CRUD module before hashing. Order-insensitive
  from the consumer's perspective.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: visible_feature_ids
owner: SceneProperties
domain_of:
- SceneProperties
range: string
required: true
multivalued: true

```
</details>