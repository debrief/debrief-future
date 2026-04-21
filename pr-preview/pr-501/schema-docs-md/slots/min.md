

# Slot: min 


_Minimum number of features of this kind required. Must be >= 0. Defaults to 0 if not specified._





URI: [debrief:slot/min](https://debrief.info/schemas/slot/min)
Alias: min

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
| self | debrief:min |
| native | debrief:min |




## LinkML Source

<details>
```yaml
name: min
description: Minimum number of features of this kind required. Must be >= 0. Defaults
  to 0 if not specified.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: min
owner: SelectionRequirement
domain_of:
- SelectionRequirement
range: integer
required: false
minimum_value: 0

```
</details>