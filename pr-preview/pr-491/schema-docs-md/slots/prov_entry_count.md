

# Slot: prov_entry_count 


_Number of provenance entries in the snapshot._





URI: [debrief:slot/prov_entry_count](https://debrief.info/schemas/slot/prov_entry_count)
Alias: prov_entry_count

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SnapshotRef](../classes/SnapshotRef.md) | Reference to a snapshot file |  no  |






## Properties

* Range: [Integer](../types/Integer.md)

* Required: True

* Minimum Value: 0




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:prov_entry_count |
| native | debrief:prov_entry_count |




## LinkML Source

<details>
```yaml
name: prov_entry_count
description: Number of provenance entries in the snapshot.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: prov_entry_count
owner: SnapshotRef
domain_of:
- SnapshotRef
range: integer
required: true
minimum_value: 0

```
</details>