

# Slot: sensors 


_Embedded sensor data associated with this track. Each sensor contains named metadata and an array of contact measurements._





URI: [debrief:slot/sensors](https://debrief.info/schemas/slot/sensors)
Alias: sensors

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [TrackProperties](../classes/TrackProperties.md) | Properties for a TrackFeature |  no  |






## Properties

* Range: [SensorData](../classes/SensorData.md)

* Multivalued: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:sensors |
| native | debrief:sensors |




## LinkML Source

<details>
```yaml
name: sensors
description: Embedded sensor data associated with this track. Each sensor contains
  named metadata and an array of contact measurements.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: sensors
owner: TrackProperties
domain_of:
- TrackProperties
range: SensorData
multivalued: true
inlined: true
inlined_as_list: true

```
</details>