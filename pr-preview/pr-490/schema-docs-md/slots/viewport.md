

# Slot: viewport 


_Visible map area as 4-corner polygon (FR-012)_





URI: [debrief:slot/viewport](https://debrief.info/schemas/slot/viewport)
Alias: viewport

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SpatialSlice](../classes/SpatialSlice.md) | Geographic view state for the map display |  no  |






## Properties

* Range: [ViewportPolygon](../classes/ViewportPolygon.md)




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:viewport |
| native | debrief:viewport |




## LinkML Source

<details>
```yaml
name: viewport
description: Visible map area as 4-corner polygon (FR-012)
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: viewport
owner: SpatialSlice
domain_of:
- SpatialSlice
range: ViewportPolygon

```
</details>