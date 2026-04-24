

# Slot: bearing 



URI: [debrief:slot/bearing](https://debrief.info/schemas/slot/bearing)
Alias: bearing

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [Viewport](../classes/Viewport.md) | Camera state sub-record inside a Scene |  no  |
| [SensorContact](../classes/SensorContact.md) | Single sensor measurement record |  no  |
| [VectorAnnotationProperties](../classes/VectorAnnotationProperties.md) | Properties for a VectorAnnotation |  no  |
| [TUASolution](../classes/TUASolution.md) | Single Target Uncertainty Area estimate |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:bearing |
| native | debrief:bearing |




## LinkML Source

<details>
```yaml
name: bearing
alias: bearing
domain_of:
- SensorContact
- TUASolution
- VectorAnnotationProperties
- Viewport
range: string

```
</details>