

# Slot: asset 



URI: [debrief:slot/asset](https://debrief.info/schemas/slot/asset)
Alias: asset

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [FileProvEntry](../classes/FileProvEntry.md) | File-level provenance event (snapshot or branch creation) |  no  |
| [SnapshotRef](../classes/SnapshotRef.md) | Reference to a snapshot file |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:asset |
| native | debrief:asset |




## LinkML Source

<details>
```yaml
name: asset
alias: asset
domain_of:
- SnapshotRef
- FileProvEntry
range: string

```
</details>