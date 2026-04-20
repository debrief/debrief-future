# Enum: VesselDomainEnum 




_Top-level vessel domain classification_



URI: [debrief:enum/VesselDomainEnum](https://debrief.info/schemas/enum/VesselDomainEnum)

## Permissible Values

| Value | Meaning | Description |
| --- | --- | --- |
| surface | None | Surface vessels (warships, auxiliaries, merchant) |
| subsurface | None | Subsurface vessels (submarines) |
| unknown | None | Vessel domain not determined or not applicable |




## Slots

| Name | Description |
| ---  | --- |
| [domain](../slots/domain.md) | Vessel domain override |





## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief






## LinkML Source

<details>
```yaml
name: VesselDomainEnum
description: Top-level vessel domain classification
from_schema: https://debrief.info/schemas/debrief
rank: 1000
permissible_values:
  surface:
    text: surface
    description: Surface vessels (warships, auxiliaries, merchant)
  subsurface:
    text: subsurface
    description: Subsurface vessels (submarines)
  unknown:
    text: unknown
    description: Vessel domain not determined or not applicable

```
</details>