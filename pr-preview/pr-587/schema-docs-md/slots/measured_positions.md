

# Slot: measured_positions 


_Actual towed array positions for MEASURED array centre mode_





URI: [debrief:slot/measured_positions](https://debrief.info/schemas/slot/measured_positions)
Alias: measured_positions

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SensorData](../classes/SensorData.md) | Named sensor with contact measurements |  no  |






## Properties

* Range: [MeasuredArrayPosition](../classes/MeasuredArrayPosition.md)

* Multivalued: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:measured_positions |
| native | debrief:measured_positions |




## LinkML Source

<details>
```yaml
name: measured_positions
description: Actual towed array positions for MEASURED array centre mode
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: measured_positions
owner: SensorData
domain_of:
- SensorData
range: MeasuredArrayPosition
multivalued: true
inlined: true
inlined_as_list: true

```
</details>