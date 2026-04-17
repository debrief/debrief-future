

# Slot: label_interval 


_ISO 8601 duration for interval-based label display. Null means no interval-based labels._





URI: [debrief:slot/label_interval](https://debrief.info/schemas/slot/label_interval)
Alias: label_interval

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
| self | debrief:label_interval |
| native | debrief:label_interval |




## LinkML Source

<details>
```yaml
name: label_interval
description: ISO 8601 duration for interval-based label display. Null means no interval-based
  labels.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: label_interval
owner: TrackProperties
domain_of:
- TrackProperties
range: string
pattern: ^P(T[0-9]+[HMS])+$|^P[0-9]+D(T[0-9]+[HMS]+)?$

```
</details>