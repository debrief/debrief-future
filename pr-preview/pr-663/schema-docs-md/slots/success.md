

# Slot: success 



URI: [debrief:slot/success](https://debrief.info/schemas/slot/success)
Alias: success

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [ToolResultForLog](../classes/ToolResultForLog.md) | Persisted tool-result shape written by the live tool-result logger and read b... |  no  |
| [ToolResult](../classes/ToolResult.md) | Logical tool invocation result as seen by the consumer (after the MCP layer h... |  no  |
| [ToolExecutionResultForReplay](../classes/ToolExecutionResultForReplay.md) | Minimal tool-execution result returned by the Replay Engine's `execute_tool` ... |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:success |
| native | debrief:success |




## LinkML Source

<details>
```yaml
name: success
alias: success
domain_of:
- ToolResult
- ToolResultForLog
- ToolExecutionResultForReplay
range: string

```
</details>