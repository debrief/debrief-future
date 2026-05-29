

# Slot: source_feature_ids 



URI: [debrief:slot/source_feature_ids](https://debrief.info/schemas/slot/source_feature_ids)
Alias: source_feature_ids

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
| self | debrief:source_feature_ids |
| native | debrief:source_feature_ids |




## LinkML Source

<details>
```yaml
name: source_feature_ids
alias: source_feature_ids
domain_of:
- LastToolExecution
- ToolResultForLog
range: string

```
</details>