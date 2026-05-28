

# Slot: temporal 


_Temporal extent — one or more start/end intervals._





URI: [debrief:slot/temporal](https://debrief.info/schemas/slot/temporal)
Alias: temporal

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [StacExtent](../classes/StacExtent.md) | Spatial + temporal extent on a Collection |  no  |






## Properties

* Range: [StacTemporalExtent](../classes/StacTemporalExtent.md)

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:temporal |
| native | debrief:temporal |




## LinkML Source

<details>
```yaml
name: temporal
description: Temporal extent — one or more start/end intervals.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: temporal
owner: StacExtent
domain_of:
- StacExtent
range: StacTemporalExtent
required: true
inlined: true

```
</details>