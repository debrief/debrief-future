

# Slot: spatial 


_Spatial extent — one or more bounding boxes._





URI: [debrief:slot/spatial](https://debrief.info/schemas/slot/spatial)
Alias: spatial

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [StacExtent](../classes/StacExtent.md) | Spatial + temporal extent on a Collection |  no  |






## Properties

* Range: [StacSpatialExtent](../classes/StacSpatialExtent.md)

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:spatial |
| native | debrief:spatial |




## LinkML Source

<details>
```yaml
name: spatial
description: Spatial extent — one or more bounding boxes.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: spatial
owner: StacExtent
domain_of:
- StacExtent
range: StacSpatialExtent
required: true
inlined: true

```
</details>