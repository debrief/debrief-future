

# Slot: tool_version 


_Semantic version of the tool (e.g., 1.2.0)._





URI: [debrief:slot/tool_version](https://debrief.info/schemas/slot/tool_version)
Alias: tool_version

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
| self | debrief:tool_version |
| native | debrief:tool_version |




## LinkML Source

<details>
```yaml
name: tool_version
description: Semantic version of the tool (e.g., 1.2.0).
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: tool_version
owner: WasGeneratedBy
domain_of:
- WasGeneratedBy
range: string
required: true

```
</details>