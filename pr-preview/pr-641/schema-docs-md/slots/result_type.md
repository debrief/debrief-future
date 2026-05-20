

# Slot: result_type 


_Hierarchical result type (e.g. mutation/track/smoothed)._





URI: [debrief:slot/result_type](https://debrief.info/schemas/slot/result_type)
Alias: result_type

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [ToolResultForLog](../classes/ToolResultForLog.md) | Persisted tool-result shape written by the live tool-result logger and read b... |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:result_type |
| native | debrief:result_type |




## LinkML Source

<details>
```yaml
name: result_type
description: Hierarchical result type (e.g. mutation/track/smoothed).
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: result_type
owner: ToolResultForLog
domain_of:
- ToolResultForLog
range: string

```
</details>