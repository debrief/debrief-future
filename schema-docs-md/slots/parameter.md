

# Slot: parameter 


_Name of the parameter that was changed._





URI: [debrief:slot/parameter](https://debrief.info/schemas/slot/parameter)
Alias: parameter

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
| self | debrief:parameter |
| native | debrief:parameter |




## LinkML Source

<details>
```yaml
name: parameter
description: Name of the parameter that was changed.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: parameter
owner: TuneAnnotation
domain_of:
- TuneAnnotation
range: string
required: true

```
</details>