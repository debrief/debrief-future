

# Slot: resultType 


_Hierarchical result type (e.g., mutation/track/smoothed)_





URI: [debrief:resultType](https://debrief.info/schemas/resultType)
Alias: resultType

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [ToolResultAnnotations](../classes/ToolResultAnnotations.md) | Annotations for MCP tool result content items |  no  |






## Properties

* Range: [String](../types/String.md)

* Required: True

* Regex pattern: `^(mutation|addition|deletion|artifact)/[a-z_]+/[a-z_]+$`




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:resultType |
| native | debrief:resultType |




## LinkML Source

<details>
```yaml
name: resultType
description: Hierarchical result type (e.g., mutation/track/smoothed)
from_schema: https://debrief.info/schemas/debrief
rank: 1000
slot_uri: debrief:resultType
alias: resultType
owner: ToolResultAnnotations
domain_of:
- ToolResultAnnotations
range: string
required: true
pattern: ^(mutation|addition|deletion|artifact)/[a-z_]+/[a-z_]+$

```
</details>