

# Slot: color 



URI: [debrief:slot/color](https://debrief.info/schemas/slot/color)
Alias: color

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [LineProperties](../classes/LineProperties.md) | Styling schema for LineString and MultiLineString geometries |  no  |
| [SensorContact](../classes/SensorContact.md) | Single sensor measurement record |  no  |
| [SensorData](../classes/SensorData.md) | Named sensor with contact measurements |  no  |
| [PointProperties](../classes/PointProperties.md) | Styling schema for Point and MultiPoint geometries |  no  |
| [PolygonProperties](../classes/PolygonProperties.md) | Styling schema for Polygon and MultiPolygon geometries |  no  |






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