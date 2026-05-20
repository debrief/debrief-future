

# Slot: debrief_feature_tags 


_Aggregated feature-level tags across all Items in the Collection. Disk key is `debrief:feature_tags`._





URI: [debrief:feature_tags](https://debrief.info/schemas/feature_tags)
Alias: debrief_feature_tags

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [StacSummaries](../classes/StacSummaries.md) | Pre-aggregated extension summaries on a Collection |  no  |






## Properties

* Range: [String](../types/String.md)

* Multivalued: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:feature_tags |
| native | debrief:debrief_feature_tags |




## LinkML Source

<details>
```yaml
name: debrief_feature_tags
description: Aggregated feature-level tags across all Items in the Collection. Disk
  key is `debrief:feature_tags`.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
slot_uri: debrief:feature_tags
alias: debrief_feature_tags
owner: StacSummaries
domain_of:
- StacSummaries
range: string
required: false
multivalued: true

```
</details>