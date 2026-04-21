# Enum: PlaybackStateEnum 




_Current state of time playback. Component consumers treat `stopped` as equivalent to `paused`. See ADR-022 in docs/project_notes/decisions.md._



URI: [debrief:enum/PlaybackStateEnum](https://debrief.info/schemas/enum/PlaybackStateEnum)

## Permissible Values

| Value | Meaning | Description |
| --- | --- | --- |
| stopped | None | Playback is stopped |
| playing | None | Playback is running |
| paused | None | Playback is paused |




## Slots

| Name | Description |
| ---  | --- |
| [playbackState](../slots/playbackState.md) | Current playback state - ephemeral (FR-010) |





## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief






## LinkML Source

<details>
```yaml
name: PlaybackStateEnum
description: Current state of time playback. Component consumers treat `stopped` as
  equivalent to `paused`. See ADR-022 in docs/project_notes/decisions.md.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
permissible_values:
  stopped:
    text: stopped
    description: Playback is stopped
  playing:
    text: playing
    description: Playback is running
  paused:
    text: paused
    description: Playback is paused

```
</details>