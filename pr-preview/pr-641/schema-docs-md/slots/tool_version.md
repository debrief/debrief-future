

# Slot: tool_version 



URI: [debrief:slot/tool_version](https://debrief.info/schemas/slot/tool_version)
Alias: tool_version

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [ToolExecutionResultForReplay](../classes/ToolExecutionResultForReplay.md) | Minimal tool-execution result returned by the Replay Engine's `execute_tool` ... |  no  |
| [WasGeneratedBy](../classes/WasGeneratedBy.md) | Identifies the tool and its parameters for a specific invocation |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:tool_version |
| native | debrief:tool_version |




## LinkML Source

<details>
```yaml
name: tool_version
alias: tool_version
domain_of:
- WasGeneratedBy
- ToolExecutionResultForReplay
range: string

```
</details>