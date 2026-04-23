

# Slot: solutions 


_Array of TUA estimates_





URI: [debrief:slot/solutions](https://debrief.info/schemas/slot/solutions)
Alias: solutions

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [TUAData](../classes/TUAData.md) | Named TUA solution collection |  no  |






## Properties

* Range: [TUASolution](../classes/TUASolution.md)

* Multivalued: True

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:solutions |
| native | debrief:solutions |




## LinkML Source

<details>
```yaml
name: solutions
description: Array of TUA estimates
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: solutions
owner: TUAData
domain_of:
- TUAData
range: TUASolution
required: true
multivalued: true
inlined: true
inlined_as_list: true

```
</details>