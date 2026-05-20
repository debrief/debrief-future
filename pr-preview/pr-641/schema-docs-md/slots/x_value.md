

# Slot: x_value 


_Primary independent-axis value serialised as a string. For temporal axes this is an ISO 8601 datetime; for quantitative axes it is a decimal string; for nominal/ordinal axes it is the category label._

__





URI: [debrief:slot/x_value](https://debrief.info/schemas/slot/x_value)
Alias: x_value

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
| self | debrief:x_value |
| native | debrief:x_value |




## LinkML Source

<details>
```yaml
name: x_value
description: 'Primary independent-axis value serialised as a string. For temporal
  axes this is an ISO 8601 datetime; for quantitative axes it is a decimal string;
  for nominal/ordinal axes it is the category label.

  '
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: x_value
owner: DatasetDataPoint
domain_of:
- DatasetDataPoint
range: string
required: false

```
</details>