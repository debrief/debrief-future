

# Slot: symbol_interval 


_ISO 8601 duration for interval-based symbol display. E.g., "PT5M" = every 5 minutes, "PT1H" = every hour. Null means no interval-based symbols._





URI: [debrief:slot/symbol_interval](https://debrief.info/schemas/slot/symbol_interval)
Alias: symbol_interval

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [TrackProperties](../classes/TrackProperties.md) | Properties for a TrackFeature |  no  |






## Properties

* Range: [String](../types/String.md)

* Regex pattern: `^P(T[0-9]+[HMS])+$|^P[0-9]+D(T[0-9]+[HMS]+)?$`




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:symbol_interval |
| native | debrief:symbol_interval |




## LinkML Source

<details>
```yaml
name: symbol_interval
description: ISO 8601 duration for interval-based symbol display. E.g., "PT5M" = every
  5 minutes, "PT1H" = every hour. Null means no interval-based symbols.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: symbol_interval
owner: TrackProperties
domain_of:
- TrackProperties
range: string
pattern: ^P(T[0-9]+[HMS])+$|^P[0-9]+D(T[0-9]+[HMS]+)?$

```
</details>