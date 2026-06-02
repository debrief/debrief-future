

# Slot: end_time 



URI: [debrief:slot/end_time](https://debrief.info/schemas/slot/end_time)
Alias: end_time

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [TrackProperties](../classes/TrackProperties.md) | Properties for a TrackFeature |  no  |
| [SegmentMetadata](../classes/SegmentMetadata.md) | Per-segment metadata for compound tracks |  no  |
| [SystemStateProperties](../classes/SystemStateProperties.md) | Properties for SYSTEM features storing application state |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:end_time |
| native | debrief:end_time |




## LinkML Source

<details>
```yaml
name: end_time
alias: end_time
domain_of:
- SegmentMetadata
- TrackProperties
- SystemStateProperties
range: string

```
</details>