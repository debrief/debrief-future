

# Slot: tool 


_Tool identifier (kebab-case, e.g., calculate-range)._





URI: [debrief:slot/tool](https://debrief.info/schemas/slot/tool)
Alias: tool

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [WasGeneratedBy](../classes/WasGeneratedBy.md) | Identifies the tool and its parameters for a specific invocation |  no  |






## Properties

* Range: [String](../types/String.md)

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:tool |
| native | debrief:tool |




## LinkML Source

<details>
```yaml
name: tool
description: Tool identifier (kebab-case, e.g., calculate-range).
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: tool
owner: WasGeneratedBy
domain_of:
- WasGeneratedBy
range: string
required: true

```
</details>