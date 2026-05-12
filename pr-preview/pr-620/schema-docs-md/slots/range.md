

# Slot: range 



URI: [debrief:slot/range](https://debrief.info/schemas/slot/range)
Alias: range

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [TUASolution](../classes/TUASolution.md) | Single Target Uncertainty Area estimate |  no  |
| [SensorContact](../classes/SensorContact.md) | Single sensor measurement record |  no  |
| [VectorAnnotationProperties](../classes/VectorAnnotationProperties.md) | Properties for a VectorAnnotation |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:range |
| native | debrief:range |




## LinkML Source

<details>
```yaml
name: range
alias: range
domain_of:
- SensorContact
- TUASolution
- VectorAnnotationProperties
range: string

```
</details>