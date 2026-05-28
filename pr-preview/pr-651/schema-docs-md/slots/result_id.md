

# Slot: result_id 


_Stable result identifier (used by the activity panel)._





URI: [debrief:slot/result_id](https://debrief.info/schemas/slot/result_id)
Alias: result_id

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [ToolExecutionResultForReplay](../classes/ToolExecutionResultForReplay.md) | Minimal tool-execution result returned by the Replay Engine's `execute_tool` ... |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:result_id |
| native | debrief:result_id |




## LinkML Source

<details>
```yaml
name: result_id
description: Stable result identifier (used by the activity panel).
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: result_id
owner: ToolExecutionResultForReplay
domain_of:
- ToolExecutionResultForReplay
range: string

```
</details>