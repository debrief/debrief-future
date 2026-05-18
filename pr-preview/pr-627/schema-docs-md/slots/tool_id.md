

# Slot: tool_id 



URI: [debrief:slot/tool_id](https://debrief.info/schemas/slot/tool_id)
Alias: tool_id

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [ToolResultForLog](../classes/ToolResultForLog.md) | Persisted tool-result shape written by the live tool-result logger and read b... |  no  |
| [LastToolExecution](../classes/LastToolExecution.md) | Record of the last tool execution, enabling single-step undo |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:tool_id |
| native | debrief:tool_id |




## LinkML Source

<details>
```yaml
name: tool_id
alias: tool_id
domain_of:
- LastToolExecution
- ToolResultForLog
range: string

```
</details>