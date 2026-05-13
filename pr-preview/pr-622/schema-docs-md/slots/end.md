

# Slot: end 



URI: [debrief:slot/end](https://debrief.info/schemas/slot/end)
Alias: end

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [PlotTimeExtent](../classes/PlotTimeExtent.md) | Temporal extent of a plot expressed as ISO 8601 strings |  no  |
| [TimeFilter](../classes/TimeFilter.md) | Constraints on the visible time window (epoch milliseconds; null = unbounded) |  no  |
| [TimeRange](../classes/TimeRange.md) | A temporal interval with inclusive start and end |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:end |
| native | debrief:end |




## LinkML Source

<details>
```yaml
name: end
alias: end
domain_of:
- PlotTimeExtent
- TimeRange
- TimeFilter
range: string

```
</details>