

# Class: SpatialSlice 


_Geographic view state for the map display_





URI: [debrief:class/SpatialSlice](https://debrief.info/schemas/class/SpatialSlice)






```mermaid
 classDiagram
    class SpatialSlice
    click SpatialSlice href "../../classes/SpatialSlice/"
      SpatialSlice : rotation
        
      SpatialSlice : viewport
        
          
    
        
        
        SpatialSlice --> "0..1" ViewportPolygon : viewport
        click ViewportPolygon href "../../classes/ViewportPolygon/"
    

        
      
```




<!-- no inheritance hierarchy -->


## Slots

| Name | Cardinality and Range | Description | Inheritance |
| ---  | --- | --- | --- |
| [viewport](../slots/viewport.md) | 0..1 <br/> [ViewportPolygon](../classes/ViewportPolygon.md) | Visible map area as 4-corner polygon (FR-012) | direct |
| [rotation](../slots/rotation.md) | 1 <br/> [Float](../types/Float.md) | Map rotation in degrees 0-360 (FR-013) | direct |











## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:SpatialSlice |
| native | debrief:SpatialSlice |






## LinkML Source

<!-- TODO: investigate https://stackoverflow.com/questions/37606292/how-to-create-tabbed-code-blocks-in-mkdocs-or-sphinx -->

### Direct

<details>
```yaml
name: SpatialSlice
description: Geographic view state for the map display
from_schema: https://debrief.info/schemas/debrief
attributes:
  viewport:
    name: viewport
    description: Visible map area as 4-corner polygon (FR-012)
    from_schema: https://debrief.info/schemas/session-state
    domain_of:
    - SystemStateProperties
    - SpatialSlice
    - SceneProperties
    range: ViewportPolygon
  rotation:
    name: rotation
    description: Map rotation in degrees 0-360 (FR-013)
    from_schema: https://debrief.info/schemas/session-state
    domain_of:
    - SystemStateProperties
    - SpatialSlice
    range: float
    required: true
    minimum_value: 0
    maximum_value: 360

```
</details>

### Induced

<details>
```yaml
name: SpatialSlice
description: Geographic view state for the map display
from_schema: https://debrief.info/schemas/debrief
attributes:
  viewport:
    name: viewport
    description: Visible map area as 4-corner polygon (FR-012)
    from_schema: https://debrief.info/schemas/session-state
    alias: viewport
    owner: SpatialSlice
    domain_of:
    - SystemStateProperties
    - SpatialSlice
    - SceneProperties
    range: ViewportPolygon
  rotation:
    name: rotation
    description: Map rotation in degrees 0-360 (FR-013)
    from_schema: https://debrief.info/schemas/session-state
    alias: rotation
    owner: SpatialSlice
    domain_of:
    - SystemStateProperties
    - SpatialSlice
    range: float
    required: true
    minimum_value: 0
    maximum_value: 360

```
</details>