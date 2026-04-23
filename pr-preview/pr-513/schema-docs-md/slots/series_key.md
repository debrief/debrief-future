

# Slot: series_key 


_Series discriminator for multi-series datasets (e.g., track name). Absent for single-series (flat) datasets._

__





URI: [debrief:slot/series_key](https://debrief.info/schemas/slot/series_key)
Alias: series_key

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [DatasetDataPoint](../classes/DatasetDataPoint.md) | A single structured data record within a series or flat dataset |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:series_key |
| native | debrief:series_key |




## LinkML Source

<details>
```yaml
name: series_key
description: 'Series discriminator for multi-series datasets (e.g., track name). Absent
  for single-series (flat) datasets.

  '
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: series_key
owner: DatasetDataPoint
domain_of:
- DatasetDataPoint
range: string
required: false

```
</details>