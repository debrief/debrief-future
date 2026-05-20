

# Slot: location 


_Array centre position [longitude, latitude] (GeoJSON coordinate order)_





URI: [debrief:slot/location](https://debrief.info/schemas/slot/location)
Alias: location

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [MeasuredArrayPosition](../classes/MeasuredArrayPosition.md) | Timestamped geographic position of a towed array centre |  no  |






## Properties

* Range: [Float](../types/Float.md)

* Multivalued: True

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:location |
| native | debrief:location |




## LinkML Source

<details>
```yaml
name: location
description: Array centre position [longitude, latitude] (GeoJSON coordinate order)
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: location
owner: MeasuredArrayPosition
domain_of:
- MeasuredArrayPosition
range: float
required: true
multivalued: true
minimum_cardinality: 2
maximum_cardinality: 2

```
</details>