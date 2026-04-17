

# Slot: tool_id 


_Identifier of the tool that was executed_





URI: [debrief:slot/tool_id](https://debrief.info/schemas/slot/tool_id)
Alias: tool_id

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [LastToolExecution](../classes/LastToolExecution.md) | Record of the last tool execution, enabling single-step undo |  no  |






## Properties

* Range: [String](../types/String.md)

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:tool_id |
| native | debrief:tool_id |




## LinkML Source

<details>
```yaml
name: tool_id
description: Identifier of the tool that was executed
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: tool_id
owner: LastToolExecution
domain_of:
- LastToolExecution
range: string
required: true

```
</details>