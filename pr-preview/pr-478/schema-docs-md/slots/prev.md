

# Slot: prev 


_Link to previous snapshot. Null if this is the first snapshot._





URI: [debrief:slot/prev](https://debrief.info/schemas/slot/prev)
Alias: prev

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SnapshotLinks](../classes/SnapshotLinks.md) | Doubly-linked references to adjacent snapshots |  no  |






## Properties

* Range: [SnapshotRef](../classes/SnapshotRef.md)




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:prev |
| native | debrief:prev |




## LinkML Source

<details>
```yaml
name: prev
description: Link to previous snapshot. Null if this is the first snapshot.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: prev
owner: SnapshotLinks
domain_of:
- SnapshotLinks
range: SnapshotRef
required: false

```
</details>