

# Slot: viewport 



URI: [debrief:slot/viewport](https://debrief.info/schemas/slot/viewport)
Alias: viewport

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SpatialSlice](../classes/SpatialSlice.md) | Geographic view state for the map display |  no  |
| [SceneProperties](../classes/SceneProperties.md) | Properties class for a Scene child Feature |  no  |
| [SystemStateProperties](../classes/SystemStateProperties.md) | Properties for SYSTEM features storing application state |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:viewport |
| native | debrief:viewport |




## LinkML Source

<details>
```yaml
name: viewport
alias: viewport
domain_of:
- SystemStateProperties
- SpatialSlice
- SceneProperties
range: string

```
</details>