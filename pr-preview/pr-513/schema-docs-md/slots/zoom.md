

# Slot: zoom 



URI: [debrief:slot/zoom](https://debrief.info/schemas/slot/zoom)
Alias: zoom

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [Viewport](../classes/Viewport.md) | Camera state sub-record inside a Scene |  no  |
| [SystemStateProperties](../classes/SystemStateProperties.md) | Properties for SYSTEM features storing application state |  no  |
| [ViewportPolygon](../classes/ViewportPolygon.md) | Geographic area as a 4-corner polygon supporting rotated views (FR-012, FR-01... |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:zoom |
| native | debrief:zoom |




## LinkML Source

<details>
```yaml
name: zoom
alias: zoom
domain_of:
- SystemStateProperties
- ViewportPolygon
- Viewport
range: string

```
</details>