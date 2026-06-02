

# Slot: message 


_Status / explanation message._





URI: [debrief:slot/message](https://debrief.info/schemas/slot/message)
Alias: message

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [ToolResult](../classes/ToolResult.md) | Logical tool invocation result as seen by the consumer (after the MCP layer h... |  no  |






## Properties

* Range: [String](../types/String.md)

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:message |
| native | debrief:message |




## LinkML Source

<details>
```yaml
name: message
description: Status / explanation message.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: message
owner: ToolResult
domain_of:
- ToolResult
range: string
required: true

```
</details>