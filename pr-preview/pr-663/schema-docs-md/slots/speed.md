

# Slot: speed 



URI: [debrief:slot/speed](https://debrief.info/schemas/slot/speed)
Alias: speed

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [TUASolution](../classes/TUASolution.md) | Single Target Uncertainty Area estimate |  no  |
| [TimestampedPosition](../classes/TimestampedPosition.md) | Temporal and kinematic metadata for a single track position |  no  |
| [SegmentMetadata](../classes/SegmentMetadata.md) | Per-segment metadata for compound tracks |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:speed |
| native | debrief:speed |




## LinkML Source

<details>
```yaml
name: speed
alias: speed
domain_of:
- TimestampedPosition
- SegmentMetadata
- TUASolution
range: string

```
</details>