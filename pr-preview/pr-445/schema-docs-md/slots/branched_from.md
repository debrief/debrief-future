

# Slot: branched_from 



URI: [debrief:slot/branched_from](https://debrief.info/schemas/slot/branched_from)
Alias: branched_from

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [BranchRecord](../classes/BranchRecord.md) | Reference to a branched plot |  no  |
| [BranchOrigin](../classes/BranchOrigin.md) | Reverse link on a branch plot's system record, pointing to the source plot |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:branched_from |
| native | debrief:branched_from |




## LinkML Source

<details>
```yaml
name: branched_from
alias: branched_from
domain_of:
- BranchRecord
- BranchOrigin
range: string

```
</details>