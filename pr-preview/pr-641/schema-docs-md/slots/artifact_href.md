

# Slot: artifact_href 



URI: [debrief:slot/artifact_href](https://debrief.info/schemas/slot/artifact_href)
Alias: artifact_href

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [ToolResultForLog](../classes/ToolResultForLog.md) | Persisted tool-result shape written by the live tool-result logger and read b... |  no  |
| [ToolExecutionResultForReplay](../classes/ToolExecutionResultForReplay.md) | Minimal tool-execution result returned by the Replay Engine's `execute_tool` ... |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:artifact_href |
| native | debrief:artifact_href |




## LinkML Source

<details>
```yaml
name: artifact_href
alias: artifact_href
domain_of:
- ToolResultForLog
- ToolExecutionResultForReplay
range: string

```
</details>