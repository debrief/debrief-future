

# Class: LineProperties 


_Styling schema for LineString and MultiLineString geometries. Follows Leaflet Polyline options naming conventions._





URI: [debrief:class/LineProperties](https://debrief.info/schemas/class/LineProperties)






```mermaid
 classDiagram
    class LineProperties
    click LineProperties href "../../classes/LineProperties/"
      LineProperties : color
        
      LineProperties : dash_array
        
      LineProperties : line_cap
        
          
    
        
        
        LineProperties --> "0..1" LineCapEnum : line_cap
        click LineCapEnum href "../../enums/LineCapEnum/"
    

        
      LineProperties : line_join
        
          
    
        
        
        LineProperties --> "0..1" LineJoinEnum : line_join
        click LineJoinEnum href "../../enums/LineJoinEnum/"
    

        
      LineProperties : opacity
        
      LineProperties : stroke
        
      LineProperties : weight
        
      
```




<!-- no inheritance hierarchy -->


## Slots

| Name | Cardinality and Range | Description | Inheritance |
| ---  | --- | --- | --- |
| [stroke](../slots/stroke.md) | 0..1 <br/> [Boolean](../types/Boolean.md) | Whether to draw the line | direct |
| [color](../slots/color.md) | 1 <br/> [CSSColor](../types/CSSColor.md) | Line color (CSS color string) | direct |
| [weight](../slots/weight.md) | 0..1 <br/> [Float](../types/Float.md) | Line width in pixels | direct |
| [opacity](../slots/opacity.md) | 0..1 <br/> [Float](../types/Float.md) | Line transparency (0-1) | direct |
| [line_cap](../slots/line_cap.md) | 0..1 <br/> [LineCapEnum](../enums/LineCapEnum.md) | Line endpoint style | direct |
| [line_join](../slots/line_join.md) | 0..1 <br/> [LineJoinEnum](../enums/LineJoinEnum.md) | Line join style | direct |
| [dash_array](../slots/dash_array.md) | 0..1 <br/> [String](../types/String.md) | Dash pattern (SVG format, e | direct |





## Usages

| used by | used in | type | used |
| ---  | --- | --- | --- |
| [TrackStyle](../classes/TrackStyle.md) | [line](../slots/line.md) | range | [LineProperties](../classes/LineProperties.md) |
| [SegmentMetadata](../classes/SegmentMetadata.md) | [style](../slots/style.md) | range | [LineProperties](../classes/LineProperties.md) |
| [LineAnnotationProperties](../classes/LineAnnotationProperties.md) | [style](../slots/style.md) | range | [LineProperties](../classes/LineProperties.md) |
| [VectorAnnotationProperties](../classes/VectorAnnotationProperties.md) | [style](../slots/style.md) | range | [LineProperties](../classes/LineProperties.md) |








## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:LineProperties |
| native | debrief:LineProperties |






## LinkML Source

<!-- TODO: investigate https://stackoverflow.com/questions/37606292/how-to-create-tabbed-code-blocks-in-mkdocs-or-sphinx -->

### Direct

<details>
```yaml
name: LineProperties
description: Styling schema for LineString and MultiLineString geometries. Follows
  Leaflet Polyline options naming conventions.
from_schema: https://debrief.info/schemas/debrief
attributes:
  stroke:
    name: stroke
    description: Whether to draw the line
    from_schema: https://debrief.info/schemas/styling
    domain_of:
    - PointProperties
    - LineProperties
    - PolygonProperties
    range: boolean
  color:
    name: color
    description: Line color (CSS color string)
    from_schema: https://debrief.info/schemas/styling
    domain_of:
    - PointProperties
    - LineProperties
    - PolygonProperties
    - SensorContact
    - SensorData
    range: CSSColor
    required: true
  weight:
    name: weight
    description: Line width in pixels
    from_schema: https://debrief.info/schemas/styling
    domain_of:
    - PointProperties
    - LineProperties
    - PolygonProperties
    range: float
    minimum_value: 0
  opacity:
    name: opacity
    description: Line transparency (0-1)
    from_schema: https://debrief.info/schemas/styling
    domain_of:
    - PointProperties
    - LineProperties
    - PolygonProperties
    range: float
    minimum_value: 0
    maximum_value: 1
  line_cap:
    name: line_cap
    description: Line endpoint style
    from_schema: https://debrief.info/schemas/styling
    rank: 1000
    domain_of:
    - LineProperties
    - PolygonProperties
    range: LineCapEnum
  line_join:
    name: line_join
    description: Line join style
    from_schema: https://debrief.info/schemas/styling
    rank: 1000
    domain_of:
    - LineProperties
    - PolygonProperties
    range: LineJoinEnum
  dash_array:
    name: dash_array
    description: Dash pattern (SVG format, e.g., "5, 10")
    from_schema: https://debrief.info/schemas/styling
    rank: 1000
    domain_of:
    - LineProperties
    - PolygonProperties
    range: string

```
</details>

### Induced

<details>
```yaml
name: LineProperties
description: Styling schema for LineString and MultiLineString geometries. Follows
  Leaflet Polyline options naming conventions.
from_schema: https://debrief.info/schemas/debrief
attributes:
  stroke:
    name: stroke
    description: Whether to draw the line
    from_schema: https://debrief.info/schemas/styling
    alias: stroke
    owner: LineProperties
    domain_of:
    - PointProperties
    - LineProperties
    - PolygonProperties
    range: boolean
  color:
    name: color
    description: Line color (CSS color string)
    from_schema: https://debrief.info/schemas/styling
    alias: color
    owner: LineProperties
    domain_of:
    - PointProperties
    - LineProperties
    - PolygonProperties
    - SensorContact
    - SensorData
    range: CSSColor
    required: true
  weight:
    name: weight
    description: Line width in pixels
    from_schema: https://debrief.info/schemas/styling
    alias: weight
    owner: LineProperties
    domain_of:
    - PointProperties
    - LineProperties
    - PolygonProperties
    range: float
    minimum_value: 0
  opacity:
    name: opacity
    description: Line transparency (0-1)
    from_schema: https://debrief.info/schemas/styling
    alias: opacity
    owner: LineProperties
    domain_of:
    - PointProperties
    - LineProperties
    - PolygonProperties
    range: float
    minimum_value: 0
    maximum_value: 1
  line_cap:
    name: line_cap
    description: Line endpoint style
    from_schema: https://debrief.info/schemas/styling
    rank: 1000
    alias: line_cap
    owner: LineProperties
    domain_of:
    - LineProperties
    - PolygonProperties
    range: LineCapEnum
  line_join:
    name: line_join
    description: Line join style
    from_schema: https://debrief.info/schemas/styling
    rank: 1000
    alias: line_join
    owner: LineProperties
    domain_of:
    - LineProperties
    - PolygonProperties
    range: LineJoinEnum
  dash_array:
    name: dash_array
    description: Dash pattern (SVG format, e.g., "5, 10")
    from_schema: https://debrief.info/schemas/styling
    rank: 1000
    alias: dash_array
    owner: LineProperties
    domain_of:
    - LineProperties
    - PolygonProperties
    range: string

```
</details>