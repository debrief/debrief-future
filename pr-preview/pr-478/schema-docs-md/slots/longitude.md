

# Slot: longitude 


_Longitude in degrees (-180 to 180)_





URI: [debrief:slot/longitude](https://debrief.info/schemas/slot/longitude)
Alias: longitude

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [Coordinate](../classes/Coordinate.md) | A geographic coordinate [longitude, latitude] |  no  |






## Properties

* Range: [Float](../types/Float.md)

* Required: True

* Minimum Value: -180

* Maximum Value: 180




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:longitude |
| native | debrief:longitude |




## LinkML Source

<details>
```yaml
name: longitude
description: Longitude in degrees (-180 to 180)
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: longitude
owner: Coordinate
domain_of:
- Coordinate
range: float
required: true
minimum_value: -180
maximum_value: 180

```
</details>