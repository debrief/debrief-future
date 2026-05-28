

# Slot: branches 


_Branch records. Empty array when no branches exist._





URI: [debrief:slot/branches](https://debrief.info/schemas/slot/branches)
Alias: branches

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SystemRecordProperties](../classes/SystemRecordProperties.md) | Properties for the non-spatial system record feature |  no  |






## Properties

* Range: [BranchRecord](../classes/BranchRecord.md)

* Multivalued: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:branches |
| native | debrief:branches |




## LinkML Source

<details>
```yaml
name: branches
description: Branch records. Empty array when no branches exist.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: branches
owner: SystemRecordProperties
domain_of:
- SystemRecordProperties
range: BranchRecord
required: false
multivalued: true

```
</details>