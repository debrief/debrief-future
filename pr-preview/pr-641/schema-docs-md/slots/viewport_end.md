

# Slot: viewport_end 


_Map viewport camera state at the end of a time-range Scene (#263). MUST be present if and only if `time_range` is present. Reuses the Viewport sub-record (`bearing` MUST be 0). For instant Scenes this slot MUST be absent._





URI: [debrief:slot/viewport_end](https://debrief.info/schemas/slot/viewport_end)
Alias: viewport_end

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SceneProperties](../classes/SceneProperties.md) | Properties class for a Scene child Feature |  no  |






## Properties

* Range: [Viewport](../classes/Viewport.md)




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:viewport_end |
| native | debrief:viewport_end |




## LinkML Source

<details>
```yaml
name: viewport_end
description: Map viewport camera state at the end of a time-range Scene (#263). MUST
  be present if and only if `time_range` is present. Reuses the Viewport sub-record
  (`bearing` MUST be 0). For instant Scenes this slot MUST be absent.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: viewport_end
owner: SceneProperties
domain_of:
- SceneProperties
range: Viewport
required: false

```
</details>