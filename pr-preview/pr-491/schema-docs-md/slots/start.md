

# Slot: start 



URI: [debrief:slot/start](https://debrief.info/schemas/slot/start)
Alias: start

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [TimeFilter](../classes/TimeFilter.md) | Constraints on the visible time window (epoch milliseconds; null = unbounded) |  no  |
| [TimeRange](../classes/TimeRange.md) | A temporal interval with inclusive start and end |  no  |
| [PlotTimeExtent](../classes/PlotTimeExtent.md) | Temporal extent of a plot expressed as ISO 8601 strings |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:start |
| native | debrief:start |




## LinkML Source

<details>
```yaml
name: start
alias: start
domain_of:
- PlotTimeExtent
- TimeRange
- TimeFilter
range: string

```
</details>