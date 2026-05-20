

# Slot: debrief_tags 


_Aggregated plot-level tags across all Items in the Collection. Disk key is `debrief:tags`._





URI: [debrief:tags](https://debrief.info/schemas/tags)
Alias: debrief_tags

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
| self | debrief:tags |
| native | debrief:debrief_tags |




## LinkML Source

<details>
```yaml
name: debrief_tags
description: Aggregated plot-level tags across all Items in the Collection. Disk key
  is `debrief:tags`.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
slot_uri: debrief:tags
alias: debrief_tags
owner: StacSummaries
domain_of:
- StacSummaries
range: string
required: false
multivalued: true

```
</details>