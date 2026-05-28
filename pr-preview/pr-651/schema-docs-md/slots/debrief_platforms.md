

# Slot: debrief_platforms 


_Aggregated per-platform metadata across all Items in the Collection. Same shape as StacExtensionProperties.platforms. Disk key is `debrief:platforms` (colon syntax preserved via slot_uri)._





URI: [debrief:platforms](https://debrief.info/schemas/platforms)
Alias: debrief_platforms

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [StacSummaries](../classes/StacSummaries.md) | Pre-aggregated extension summaries on a Collection |  no  |






## Properties

* Range: [PlatformRecord](../classes/PlatformRecord.md)

* Multivalued: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:platforms |
| native | debrief:debrief_platforms |




## LinkML Source

<details>
```yaml
name: debrief_platforms
description: Aggregated per-platform metadata across all Items in the Collection.
  Same shape as StacExtensionProperties.platforms. Disk key is `debrief:platforms`
  (colon syntax preserved via slot_uri).
from_schema: https://debrief.info/schemas/debrief
rank: 1000
slot_uri: debrief:platforms
alias: debrief_platforms
owner: StacSummaries
domain_of:
- StacSummaries
range: PlatformRecord
required: false
multivalued: true
inlined: true
inlined_as_list: true

```
</details>