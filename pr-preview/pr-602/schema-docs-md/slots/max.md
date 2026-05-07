

# Slot: max 


_Maximum number of features of this kind allowed. Must be >= min if both specified. Null means no upper limit._





URI: [debrief:slot/max](https://debrief.info/schemas/slot/max)
Alias: max

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SelectionRequirement](../classes/SelectionRequirement.md) | A constraint specifying which feature kinds a tool accepts, with minimum and ... |  no  |






## Properties

* Range: [Integer](../types/Integer.md)

* Minimum Value: 0




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:max |
| native | debrief:max |




## LinkML Source

<details>
```yaml
name: max
description: Maximum number of features of this kind allowed. Must be >= min if both
  specified. Null means no upper limit.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: max
owner: SelectionRequirement
domain_of:
- SelectionRequirement
range: integer
required: false
minimum_value: 0

```
</details>