# Enum: ActivityType 




_Semantic discriminator for provenance records. Consumers use this field to choose rendering or handling behaviour independently of visual tool-category grouping. Introduced by feature 208 so future entry types (manual checkpoint, standalone tune, manual rationale) can be distinguished without overloading tool-category._



URI: [debrief:enum/ActivityType](https://debrief.info/schemas/enum/ActivityType)

## Permissible Values

| Value | Meaning | Description |
| --- | --- | --- |
| snapshot | None | Manual checkpoint entry |
| tool | None | Regular tool invocation |
| tune | None | Reserved for future standalone tune-action entries |




## Slots

| Name | Description |
| ---  | --- |
| [activity_type](../slots/activity_type.md) | Semantic kind of this provenance record |





## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief






## LinkML Source

<details>
```yaml
name: ActivityType
description: Semantic discriminator for provenance records. Consumers use this field
  to choose rendering or handling behaviour independently of visual tool-category
  grouping. Introduced by feature 208 so future entry types (manual checkpoint, standalone
  tune, manual rationale) can be distinguished without overloading tool-category.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
permissible_values:
  snapshot:
    text: snapshot
    description: Manual checkpoint entry.
  tool:
    text: tool
    description: Regular tool invocation. Default for records without an explicit
      activity_type.
  tune:
    text: tune
    description: Reserved for future standalone tune-action entries.

```
</details>