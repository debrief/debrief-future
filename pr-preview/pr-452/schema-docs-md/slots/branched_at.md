

# Slot: branched_at 



URI: [debrief:slot/branched_at](https://debrief.info/schemas/slot/branched_at)
Alias: branched_at

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [BranchOrigin](../classes/BranchOrigin.md) | Reverse link on a branch plot's system record, pointing to the source plot |  no  |
| [BranchRecord](../classes/BranchRecord.md) | Reference to a branched plot |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:branched_at |
| native | debrief:branched_at |




## LinkML Source

<details>
```yaml
name: branched_at
alias: branched_at
domain_of:
- BranchRecord
- BranchOrigin
range: string

```
</details>