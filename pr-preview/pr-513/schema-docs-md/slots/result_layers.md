

# Slot: result_layers 


_Accumulated tool result features_





URI: [debrief:slot/result_layers](https://debrief.info/schemas/slot/result_layers)
Alias: result_layers

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [ResultsSlice](../classes/ResultsSlice.md) | Accumulated tool result layers and last-execution record for undo support |  no  |






## Properties

* Range: [RawGeoJSONFeature](../classes/RawGeoJSONFeature.md)

* Multivalued: True

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:result_layers |
| native | debrief:result_layers |




## LinkML Source

<details>
```yaml
name: result_layers
description: Accumulated tool result features
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: result_layers
owner: ResultsSlice
domain_of:
- ResultsSlice
range: RawGeoJSONFeature
required: true
multivalued: true
inlined: true
inlined_as_list: true

```
</details>