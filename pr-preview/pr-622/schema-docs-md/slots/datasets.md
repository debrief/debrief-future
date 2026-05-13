

# Slot: datasets 


_Optional dataset results for the Results panel (range-bearing charts, etc). Each entry shaped like `{ filename: string, envelope: Record<string, unknown> }`._





URI: [debrief:slot/datasets](https://debrief.info/schemas/slot/datasets)
Alias: datasets

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [ToolResult](../classes/ToolResult.md) | Logical tool invocation result as seen by the consumer (after the MCP layer h... |  no  |






## Properties

* Range: [Any](../classes/Any.md)

* Multivalued: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:datasets |
| native | debrief:datasets |




## LinkML Source

<details>
```yaml
name: datasets
description: 'Optional dataset results for the Results panel (range-bearing charts,
  etc). Each entry shaped like `{ filename: string, envelope: Record<string, unknown>
  }`.'
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: datasets
owner: ToolResult
domain_of:
- ToolResult
range: Any
multivalued: true

```
</details>