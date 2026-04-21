

# Slot: previous_value 


_Value before tuning._





URI: [debrief:slot/previous_value](https://debrief.info/schemas/slot/previous_value)
Alias: previous_value

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [TuneAnnotation](../classes/TuneAnnotation.md) | Records a parameter modification (appended, not replacing original) |  no  |






## Properties

* Range: [String](../types/String.md)

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:previous_value |
| native | debrief:previous_value |




## LinkML Source

<details>
```yaml
name: previous_value
description: Value before tuning.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: previous_value
owner: TuneAnnotation
domain_of:
- TuneAnnotation
range: string
required: true

```
</details>