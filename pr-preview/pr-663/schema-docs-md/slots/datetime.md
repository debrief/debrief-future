

# Slot: datetime 



URI: [debrief:slot/datetime](https://debrief.info/schemas/slot/datetime)
Alias: datetime

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [PlotSummary](../classes/PlotSummary.md) | Projection of a STAC Item for UI consumption (e |  no  |
| [StacItemSummary](../classes/StacItemSummary.md) | Minimal STAC Item projection for browser tree display and metadata filtering |  no  |
| [StacItemProperties](../classes/StacItemProperties.md) | STAC Item `properties` block |  no  |






## Properties

* Range: [String](../types/String.md)

## Usages

| used by | used in | type | used |
| ---  | --- | --- | --- |
| [TimestampedPosition](../classes/TimestampedPosition.md) | [time](../slots/time.md) | range | [datetime](../slots/datetime.md) |
| [SegmentMetadata](../classes/SegmentMetadata.md) | [start_time](../slots/start_time.md) | range | [datetime](../slots/datetime.md) |
| [SegmentMetadata](../classes/SegmentMetadata.md) | [end_time](../slots/end_time.md) | range | [datetime](../slots/datetime.md) |
| [MeasuredArrayPosition](../classes/MeasuredArrayPosition.md) | [time](../slots/time.md) | range | [datetime](../slots/datetime.md) |
| [SensorContact](../classes/SensorContact.md) | [time](../slots/time.md) | range | [datetime](../slots/datetime.md) |
| [TUASolution](../classes/TUASolution.md) | [time](../slots/time.md) | range | [datetime](../slots/datetime.md) |
| [TrackProperties](../classes/TrackProperties.md) | [start_time](../slots/start_time.md) | range | [datetime](../slots/datetime.md) |
| [TrackProperties](../classes/TrackProperties.md) | [end_time](../slots/end_time.md) | range | [datetime](../slots/datetime.md) |
| [ReferenceLocationProperties](../classes/ReferenceLocationProperties.md) | [valid_from](../slots/valid_from.md) | range | [datetime](../slots/datetime.md) |
| [ReferenceLocationProperties](../classes/ReferenceLocationProperties.md) | [valid_until](../slots/valid_until.md) | range | [datetime](../slots/datetime.md) |
| [SystemStateProperties](../classes/SystemStateProperties.md) | [start_time](../slots/start_time.md) | range | [datetime](../slots/datetime.md) |
| [SystemStateProperties](../classes/SystemStateProperties.md) | [end_time](../slots/end_time.md) | range | [datetime](../slots/datetime.md) |
| [SystemStateProperties](../classes/SystemStateProperties.md) | [current_time](../slots/current_time.md) | range | [datetime](../slots/datetime.md) |
| [SystemStateProperties](../classes/SystemStateProperties.md) | [filter_start_time](../slots/filter_start_time.md) | range | [datetime](../slots/datetime.md) |
| [SystemStateProperties](../classes/SystemStateProperties.md) | [filter_end_time](../slots/filter_end_time.md) | range | [datetime](../slots/datetime.md) |
| [LogEntry](../classes/LogEntry.md) | [timestamp](../slots/timestamp.md) | range | [datetime](../slots/datetime.md) |
| [TuneAnnotation](../classes/TuneAnnotation.md) | [timestamp](../slots/timestamp.md) | range | [datetime](../slots/datetime.md) |
| [NarrativeEntryProperties](../classes/NarrativeEntryProperties.md) | [time](../slots/time.md) | range | [datetime](../slots/datetime.md) |
| [BranchRecord](../classes/BranchRecord.md) | [branched_at](../slots/branched_at.md) | range | [datetime](../slots/datetime.md) |
| [BranchOrigin](../classes/BranchOrigin.md) | [branched_at](../slots/branched_at.md) | range | [datetime](../slots/datetime.md) |
| [FileProvEntry](../classes/FileProvEntry.md) | [timestamp](../slots/timestamp.md) | range | [datetime](../slots/datetime.md) |
| [SceneProperties](../classes/SceneProperties.md) | [timestamp](../slots/timestamp.md) | range | [datetime](../slots/datetime.md) |





## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:datetime |
| native | debrief:datetime |




## LinkML Source

<details>
```yaml
name: datetime
alias: datetime
domain_of:
- PlotSummary
- StacItemSummary
- StacItemProperties
range: string

```
</details>