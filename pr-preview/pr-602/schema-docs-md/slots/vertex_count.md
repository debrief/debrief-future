

# Slot: vertex_count 


_Number of unique vertices (excluding ring closure point)_





URI: [debrief:slot/vertex_count](https://debrief.info/schemas/slot/vertex_count)
Alias: vertex_count

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [PolyAnnotationProperties](../classes/PolyAnnotationProperties.md) | Properties for a PolyAnnotation |  no  |






## Properties

* Range: [Integer](../types/Integer.md)

* Required: True

* Minimum Value: 3




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:vertex_count |
| native | debrief:vertex_count |




## LinkML Source

<details>
```yaml
name: vertex_count
description: Number of unique vertices (excluding ring closure point)
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: vertex_count
owner: PolyAnnotationProperties
domain_of:
- PolyAnnotationProperties
range: integer
required: true
minimum_value: 3

```
</details>