

# Slot: series 


_Named data series for multi-line/multi-series charts. Corresponds to DatasetEnvelope.series (DataSeries[]). Absent when data_points is populated._

__





URI: [debrief:slot/series](https://debrief.info/schemas/slot/series)
Alias: series

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [DatasetEntry](../classes/DatasetEntry.md) | Standard envelope for all tool result datasets, matching the runtime DatasetE... |  no  |






## Properties

* Range: [DatasetSeries](../classes/DatasetSeries.md)

* Multivalued: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:series |
| native | debrief:series |




## LinkML Source

<details>
```yaml
name: series
description: 'Named data series for multi-line/multi-series charts. Corresponds to
  DatasetEnvelope.series (DataSeries[]). Absent when data_points is populated.

  '
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: series
owner: DatasetEntry
domain_of:
- DatasetEntry
range: DatasetSeries
required: false
multivalued: true
inlined: true
inlined_as_list: true

```
</details>