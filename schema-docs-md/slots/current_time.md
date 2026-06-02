

# Slot: current_time 


_Playhead position at save (ISO-8601). When present, must lie within [start_time, end_time] (enforced by the load validator, not the schema)._





URI: [debrief:slot/current_time](https://debrief.info/schemas/slot/current_time)
Alias: current_time

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
| self | debrief:current_time |
| native | debrief:current_time |




## LinkML Source

<details>
```yaml
name: current_time
description: Playhead position at save (ISO-8601). When present, must lie within [start_time,
  end_time] (enforced by the load validator, not the schema).
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: current_time
owner: SystemStateProperties
domain_of:
- SystemStateProperties
range: datetime

```
</details>