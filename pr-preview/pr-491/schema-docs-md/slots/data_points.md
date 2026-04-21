

# Slot: data_points 



URI: [debrief:slot/data_points](https://debrief.info/schemas/slot/data_points)
Alias: data_points

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [DatasetEntry](../classes/DatasetEntry.md) | Standard envelope for all tool result datasets, matching the runtime DatasetE... |  no  |
| [DatasetSeries](../classes/DatasetSeries.md) | A named data series within a multi-series dataset |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:data_points |
| native | debrief:data_points |




## LinkML Source

<details>
```yaml
name: data_points
alias: data_points
domain_of:
- DatasetSeries
- DatasetEntry
range: string

```
</details>