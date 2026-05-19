

# Slot: time 



URI: [debrief:slot/time](https://debrief.info/schemas/slot/time)
Alias: time

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SensorContact](../classes/SensorContact.md) | Single sensor measurement record |  no  |
| [TUASolution](../classes/TUASolution.md) | Single Target Uncertainty Area estimate |  no  |
| [TimestampedPosition](../classes/TimestampedPosition.md) | Temporal and kinematic metadata for a single track position |  no  |
| [NarrativeEntryProperties](../classes/NarrativeEntryProperties.md) | Properties for a NarrativeEntry annotation |  no  |
| [MeasuredArrayPosition](../classes/MeasuredArrayPosition.md) | Timestamped geographic position of a towed array centre |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:time |
| native | debrief:time |




## LinkML Source

<details>
```yaml
name: time
alias: time
domain_of:
- TimestampedPosition
- MeasuredArrayPosition
- SensorContact
- TUASolution
- NarrativeEntryProperties
range: string

```
</details>