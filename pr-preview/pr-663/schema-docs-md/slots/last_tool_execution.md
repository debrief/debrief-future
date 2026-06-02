

# Slot: last_tool_execution 


_Last tool execution record for single-step undo_





URI: [debrief:slot/last_tool_execution](https://debrief.info/schemas/slot/last_tool_execution)
Alias: last_tool_execution

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [ResultsSlice](../classes/ResultsSlice.md) | Accumulated tool result layers and last-execution record for undo support |  no  |






## Properties

* Range: [LastToolExecution](../classes/LastToolExecution.md)




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:last_tool_execution |
| native | debrief:last_tool_execution |




## LinkML Source

<details>
```yaml
name: last_tool_execution
description: Last tool execution record for single-step undo
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: last_tool_execution
owner: ResultsSlice
domain_of:
- ResultsSlice
range: LastToolExecution
required: false

```
</details>