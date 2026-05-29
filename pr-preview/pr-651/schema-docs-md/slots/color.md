

# Slot: color 



URI: [debrief:slot/color](https://debrief.info/schemas/slot/color)
Alias: color

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [PointProperties](../classes/PointProperties.md) | Styling schema for Point and MultiPoint geometries |  no  |
| [PolygonProperties](../classes/PolygonProperties.md) | Styling schema for Polygon and MultiPolygon geometries |  no  |
| [SensorData](../classes/SensorData.md) | Named sensor with contact measurements |  no  |
| [SensorContact](../classes/SensorContact.md) | Single sensor measurement record |  no  |
| [LineProperties](../classes/LineProperties.md) | Styling schema for LineString and MultiLineString geometries |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:color |
| native | debrief:color |




## LinkML Source

<details>
```yaml
name: color
alias: color
domain_of:
- PointProperties
- LineProperties
- PolygonProperties
- SensorContact
- SensorData
range: string

```
</details>