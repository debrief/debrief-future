

# Slot: metadata_filtered_ids 


_Set of exercise IDs passing the current metadata filter. Absent/null means all items pass (no filter applied)._

__





URI: [debrief:slot/metadata_filtered_ids](https://debrief.info/schemas/slot/metadata_filtered_ids)
Alias: metadata_filtered_ids

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [BrowserFilterSlice](../classes/BrowserFilterSlice.md) | Multi-axis filter state for the STAC browser panel |  no  |






## Properties

* Range: [String](../types/String.md)

* Multivalued: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:metadata_filtered_ids |
| native | debrief:metadata_filtered_ids |




## LinkML Source

<details>
```yaml
name: metadata_filtered_ids
description: 'Set of exercise IDs passing the current metadata filter. Absent/null
  means all items pass (no filter applied).

  '
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: metadata_filtered_ids
owner: BrowserFilterSlice
domain_of:
- BrowserFilterSlice
range: string
required: false
multivalued: true

```
</details>