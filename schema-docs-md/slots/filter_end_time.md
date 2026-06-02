

# Slot: filter_end_time 


_Visible-window filter end (ISO-8601). Absent = unbounded end._





URI: [debrief:slot/filter_end_time](https://debrief.info/schemas/slot/filter_end_time)
Alias: filter_end_time

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
| self | debrief:filter_end_time |
| native | debrief:filter_end_time |




## LinkML Source

<details>
```yaml
name: filter_end_time
description: Visible-window filter end (ISO-8601). Absent = unbounded end.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: filter_end_time
owner: SystemStateProperties
domain_of:
- SystemStateProperties
range: datetime

```
</details>