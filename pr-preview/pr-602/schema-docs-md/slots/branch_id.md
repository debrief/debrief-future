

# Slot: branch_id 



URI: [debrief:slot/branch_id](https://debrief.info/schemas/slot/branch_id)
Alias: branch_id

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [FileProvEntry](../classes/FileProvEntry.md) | File-level provenance event (snapshot or branch creation) |  no  |
| [BranchOrigin](../classes/BranchOrigin.md) | Reverse link on a branch plot's system record, pointing to the source plot |  no  |
| [BranchRecord](../classes/BranchRecord.md) | Reference to a branched plot |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:branch_id |
| native | debrief:branch_id |




## LinkML Source

<details>
```yaml
name: branch_id
alias: branch_id
domain_of:
- BranchRecord
- BranchOrigin
- FileProvEntry
range: string

```
</details>