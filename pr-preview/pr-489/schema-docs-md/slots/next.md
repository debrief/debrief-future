

# Slot: next 


_Link to next snapshot. Null if this is the current working file._





URI: [debrief:slot/next](https://debrief.info/schemas/slot/next)
Alias: next

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
| self | debrief:next |
| native | debrief:next |




## LinkML Source

<details>
```yaml
name: next
description: Link to next snapshot. Null if this is the current working file.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: next
owner: SnapshotLinks
domain_of:
- SnapshotLinks
range: SnapshotRef
required: false

```
</details>