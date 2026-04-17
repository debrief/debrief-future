

# Slot: course 



URI: [debrief:slot/course](https://debrief.info/schemas/slot/course)
Alias: course

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [TUASolution](../classes/TUASolution.md) | Single Target Uncertainty Area estimate |  no  |
| [SegmentMetadata](../classes/SegmentMetadata.md) | Per-segment metadata for compound tracks |  no  |
| [TimestampedPosition](../classes/TimestampedPosition.md) | Temporal and kinematic metadata for a single track position |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:course |
| native | debrief:course |




## LinkML Source

<details>
```yaml
name: course
alias: course
domain_of:
- TimestampedPosition
- SegmentMetadata
- TUASolution
range: string

```
</details>