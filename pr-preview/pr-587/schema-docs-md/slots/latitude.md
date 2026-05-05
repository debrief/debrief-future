

# Slot: latitude 


_Latitude in degrees (-90 to 90)_





URI: [debrief:slot/latitude](https://debrief.info/schemas/slot/latitude)
Alias: latitude

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [Coordinate](../classes/Coordinate.md) | A geographic coordinate [longitude, latitude] |  no  |






## Properties

* Range: [Float](../types/Float.md)

* Required: True

* Minimum Value: -90

* Maximum Value: 90




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:latitude |
| native | debrief:latitude |




## LinkML Source

<details>
```yaml
name: latitude
description: Latitude in degrees (-90 to 90)
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: latitude
owner: Coordinate
domain_of:
- Coordinate
range: float
required: true
minimum_value: -90
maximum_value: 90

```
</details>