

# Class: GeoJSONPolygon 


_GeoJSON Polygon geometry_





URI: [debrief:class/GeoJSONPolygon](https://debrief.info/schemas/class/GeoJSONPolygon)






```mermaid
 classDiagram
    class GeoJSONPolygon
    click GeoJSONPolygon href "../../classes/GeoJSONPolygon/"
      GeoJSONPolygon : coordinates
        
      GeoJSONPolygon : type
        
      
```




<!-- no inheritance hierarchy -->


## Slots

| Name | Cardinality and Range | Description | Inheritance |
| ---  | --- | --- | --- |
| [type](../slots/type.md) | 1 <br/> [String](../types/String.md) | Geometry type discriminator | direct |
| [coordinates](../slots/coordinates.md) | 1..* <br/> [Float](../types/Float.md) | Array of linear rings (arrays of [lon, lat] pairs) | direct |





## Usages

| used by | used in | type | used |
| ---  | --- | --- | --- |
| [CircleAnnotation](../classes/CircleAnnotation.md) | [geometry](../slots/geometry.md) | range | [GeoJSONPolygon](../classes/GeoJSONPolygon.md) |
| [RectangleAnnotation](../classes/RectangleAnnotation.md) | [geometry](../slots/geometry.md) | range | [GeoJSONPolygon](../classes/GeoJSONPolygon.md) |
| [PolyAnnotation](../classes/PolyAnnotation.md) | [geometry](../slots/geometry.md) | range | [GeoJSONPolygon](../classes/GeoJSONPolygon.md) |
| [RawGeoJSONFeature](../classes/RawGeoJSONFeature.md) | [geometry](../slots/geometry.md) | any_of[range] | [GeoJSONPolygon](../classes/GeoJSONPolygon.md) |
| [StoryboardFeature](../classes/StoryboardFeature.md) | [geometry](../slots/geometry.md) | range | [GeoJSONPolygon](../classes/GeoJSONPolygon.md) |
| [SceneFeature](../classes/SceneFeature.md) | [geometry](../slots/geometry.md) | range | [GeoJSONPolygon](../classes/GeoJSONPolygon.md) |








## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:GeoJSONPolygon |
| native | debrief:GeoJSONPolygon |






## LinkML Source

<!-- TODO: investigate https://stackoverflow.com/questions/37606292/how-to-create-tabbed-code-blocks-in-mkdocs-or-sphinx -->

### Direct

<details>
```yaml
name: GeoJSONPolygon
description: GeoJSON Polygon geometry
from_schema: https://debrief.info/schemas/debrief
attributes:
  type:
    name: type
    description: Geometry type discriminator
    from_schema: https://debrief.info/schemas/geojson
    domain_of:
    - GeoJSONPoint
    - GeoJSONEmptyPoint
    - GeoJSONLineString
    - GeoJSONPolygon
    - GeoJSONMultiPoint
    - GeoJSONMultiLineString
    - GeoJSONMultiPolygon
    - TrackFeature
    - ReferenceLocation
    - SystemState
    - MultiPointFeature
    - MultiPolygonFeature
    - NarrativeEntry
    - CircleAnnotation
    - RectangleAnnotation
    - LineAnnotation
    - TextAnnotation
    - VectorAnnotation
    - PolyAnnotation
    - ToolParameter
    - FileProvEntry
    - RawGeoJSONFeature
    - RawGeoJSONFeatureCollection
    - DatasetAxisMetadata
    - DatasetEntry
    - StoryboardFeature
    - SceneFeature
    - SceneThumbnailAssetEntry
    - MCPContentItem
    - MCPParamSchema
    - ToolsUpdateMessage
    range: string
    required: true
    equals_string: Polygon
  coordinates:
    name: coordinates
    description: Array of linear rings (arrays of [lon, lat] pairs)
    from_schema: https://debrief.info/schemas/geojson
    domain_of:
    - GeoJSONPoint
    - GeoJSONEmptyPoint
    - GeoJSONLineString
    - GeoJSONPolygon
    - GeoJSONMultiPoint
    - GeoJSONMultiLineString
    - GeoJSONMultiPolygon
    - ViewportPolygon
    range: float
    required: true
    multivalued: true

```
</details>

### Induced

<details>
```yaml
name: GeoJSONPolygon
description: GeoJSON Polygon geometry
from_schema: https://debrief.info/schemas/debrief
attributes:
  type:
    name: type
    description: Geometry type discriminator
    from_schema: https://debrief.info/schemas/geojson
    alias: type
    owner: GeoJSONPolygon
    domain_of:
    - GeoJSONPoint
    - GeoJSONEmptyPoint
    - GeoJSONLineString
    - GeoJSONPolygon
    - GeoJSONMultiPoint
    - GeoJSONMultiLineString
    - GeoJSONMultiPolygon
    - TrackFeature
    - ReferenceLocation
    - SystemState
    - MultiPointFeature
    - MultiPolygonFeature
    - NarrativeEntry
    - CircleAnnotation
    - RectangleAnnotation
    - LineAnnotation
    - TextAnnotation
    - VectorAnnotation
    - PolyAnnotation
    - ToolParameter
    - FileProvEntry
    - RawGeoJSONFeature
    - RawGeoJSONFeatureCollection
    - DatasetAxisMetadata
    - DatasetEntry
    - StoryboardFeature
    - SceneFeature
    - SceneThumbnailAssetEntry
    - MCPContentItem
    - MCPParamSchema
    - ToolsUpdateMessage
    range: string
    required: true
    equals_string: Polygon
  coordinates:
    name: coordinates
    description: Array of linear rings (arrays of [lon, lat] pairs)
    from_schema: https://debrief.info/schemas/geojson
    alias: coordinates
    owner: GeoJSONPolygon
    domain_of:
    - GeoJSONPoint
    - GeoJSONEmptyPoint
    - GeoJSONLineString
    - GeoJSONPolygon
    - GeoJSONMultiPoint
    - GeoJSONMultiLineString
    - GeoJSONMultiPolygon
    - ViewportPolygon
    range: float
    required: true
    multivalued: true

```
</details>