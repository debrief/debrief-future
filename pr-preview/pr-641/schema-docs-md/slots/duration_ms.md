

# Slot: duration_ms 



URI: [debrief:slot/duration_ms](https://debrief.info/schemas/slot/duration_ms)
Alias: duration_ms

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [MCPErrorResponse](../classes/MCPErrorResponse.md) | MCP error response envelope |  no  |
| [ToolResultForLog](../classes/ToolResultForLog.md) | Persisted tool-result shape written by the live tool-result logger and read b... |  no  |
| [MCPToolResponse](../classes/MCPToolResponse.md) | Successful MCP tool response |  no  |
| [ToolExecutionResultForReplay](../classes/ToolExecutionResultForReplay.md) | Minimal tool-execution result returned by the Replay Engine's `execute_tool` ... |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:duration_ms |
| native | debrief:duration_ms |




## LinkML Source

<details>
```yaml
name: duration_ms
alias: duration_ms
domain_of:
- MCPToolResponse
- MCPErrorResponse
- ToolResultForLog
- ToolExecutionResultForReplay
range: string

```
</details>