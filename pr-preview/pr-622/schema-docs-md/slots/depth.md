

# Slot: depth 



URI: [debrief:slot/depth](https://debrief.info/schemas/slot/depth)
Alias: depth

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [TUASolution](../classes/TUASolution.md) | Single Target Uncertainty Area estimate |  no  |
| [TimestampedPosition](../classes/TimestampedPosition.md) | Temporal and kinematic metadata for a single track position |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:depth |
| native | debrief:depth |




## LinkML Source

<details>
```yaml
name: depth
alias: depth
domain_of:
- TimestampedPosition
- TUASolution
range: string

```
</details>