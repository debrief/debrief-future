

# Slot: epoch 


_Milliseconds since Unix epoch_





URI: [debrief:slot/epoch](https://debrief.info/schemas/slot/epoch)
Alias: epoch

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [TimeInstant](../classes/TimeInstant.md) | A point in time with dual representations (FR-032, FR-033) |  no  |






## Properties

* Range: [Integer](../types/Integer.md)

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:epoch |
| native | debrief:epoch |




## LinkML Source

<details>
```yaml
name: epoch
description: Milliseconds since Unix epoch
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: epoch
owner: TimeInstant
domain_of:
- TimeInstant
range: integer
required: true

```
</details>