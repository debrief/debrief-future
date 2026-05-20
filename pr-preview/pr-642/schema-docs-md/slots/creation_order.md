

# Slot: creation_order 


_Per-Storyboard monotonic sequence value assigned by the platform at capture time. Acts as the secondary sort key for Scenes — when two Scenes share a `timestamp` the one with the lower `creation_order` comes first. Unique within a Storyboard; gaps are permitted (left by deletion). The platform — not the client — is the source of truth. Introduced by #259; absent on pre-#259 plots which are rejected at load (no migration shim — Article XIV pre-release freedom)._





URI: [debrief:slot/creation_order](https://debrief.info/schemas/slot/creation_order)
Alias: creation_order

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SceneProperties](../classes/SceneProperties.md) | Properties class for a Scene child Feature |  no  |






## Properties

* Range: [Integer](../types/Integer.md)

* Required: True

* Minimum Value: 0




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:creation_order |
| native | debrief:creation_order |




## LinkML Source

<details>
```yaml
name: creation_order
description: 'Per-Storyboard monotonic sequence value assigned by the platform at
  capture time. Acts as the secondary sort key for Scenes — when two Scenes share
  a `timestamp` the one with the lower `creation_order` comes first. Unique within
  a Storyboard; gaps are permitted (left by deletion). The platform — not the client
  — is the source of truth. Introduced by #259; absent on pre-#259 plots which are
  rejected at load (no migration shim — Article XIV pre-release freedom).'
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: creation_order
owner: SceneProperties
domain_of:
- SceneProperties
range: integer
required: true
minimum_value: 0

```
</details>