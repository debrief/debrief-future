

# Slot: filter_start_time 


_Visible-window filter start (ISO-8601). Absent = unbounded start._





URI: [debrief:slot/filter_start_time](https://debrief.info/schemas/slot/filter_start_time)
Alias: filter_start_time

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SystemStateProperties](../classes/SystemStateProperties.md) | Properties for SYSTEM features storing application state |  no  |






## Properties

* Range: [datetime](../slots/datetime.md)




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:filter_start_time |
| native | debrief:filter_start_time |




## LinkML Source

<details>
```yaml
name: filter_start_time
description: Visible-window filter start (ISO-8601). Absent = unbounded start.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: filter_start_time
owner: SystemStateProperties
domain_of:
- SystemStateProperties
range: datetime

```
</details>