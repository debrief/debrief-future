

# Slot: feature_set_hash 


_SHA-256 hex (lowercase, 64 chars) of JSON.stringify(canonical visible_feature_ids). Recomputed on every create/update touching visible_feature_ids._





URI: [debrief:slot/feature_set_hash](https://debrief.info/schemas/slot/feature_set_hash)
Alias: feature_set_hash

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SceneProperties](../classes/SceneProperties.md) | Properties class for a Scene child Feature |  no  |






## Properties

* Range: [String](../types/String.md)

* Required: True

* Regex pattern: `^[0-9a-f]{64}$`




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:feature_set_hash |
| native | debrief:feature_set_hash |




## LinkML Source

<details>
```yaml
name: feature_set_hash
description: SHA-256 hex (lowercase, 64 chars) of JSON.stringify(canonical visible_feature_ids).
  Recomputed on every create/update touching visible_feature_ids.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: feature_set_hash
owner: SceneProperties
domain_of:
- SceneProperties
range: string
required: true
pattern: ^[0-9a-f]{64}$

```
</details>