

# Slot: temporal_filter_active 


_Whether the timeline range is used as a temporal filter_





URI: [debrief:slot/temporal_filter_active](https://debrief.info/schemas/slot/temporal_filter_active)
Alias: temporal_filter_active

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [BrowserFilterSlice](../classes/BrowserFilterSlice.md) | Multi-axis filter state for the STAC browser panel |  no  |






## Properties

* Range: [Boolean](../types/Boolean.md)

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:temporal_filter_active |
| native | debrief:temporal_filter_active |




## LinkML Source

<details>
```yaml
name: temporal_filter_active
description: Whether the timeline range is used as a temporal filter
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: temporal_filter_active
owner: BrowserFilterSlice
domain_of:
- BrowserFilterSlice
range: boolean
required: true

```
</details>