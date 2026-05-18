

# Class: MultiPointFeature 


_GeoJSON Feature for multi-point tool results_





URI: [debrief:class/MultiPointFeature](https://debrief.info/schemas/class/MultiPointFeature)






```mermaid
 classDiagram
    class MultiPointFeature
    click MultiPointFeature href "../../classes/MultiPointFeature/"
      MultiPointFeature : bbox
        
      MultiPointFeature : geometry
        
          
    
        
        
        MultiPointFeature --> "1" GeoJSONMultiPoint : geometry
        click GeoJSONMultiPoint href "../../classes/GeoJSONMultiPoint/"
    

        
      MultiPointFeature : id
        
      MultiPointFeature : properties
        
          
    
        
        
        MultiPointFeature --> "1" MultiPointFeatureProperties : properties
        click MultiPointFeatureProperties href "../../classes/MultiPointFeatureProperties/"
    

        
      MultiPointFeature : type
        
      
```




<!-- no inheritance hierarchy -->


## Slots

| Name | Cardinality and Range | Description | Inheritance |
| ---  | --- | --- | --- |
| [type](../slots/type.md) | 1 <br/> [String](../types/String.md) | GeoJSON type discriminator | direct |
| [id](../slots/id.md) | 1 <br/> [String](../types/String.md) | Unique identifier (UUID recommended) | direct |
| [geometry](../slots/geometry.md) | 1 <br/> [GeoJSONMultiPoint](../classes/GeoJSONMultiPoint.md) | MultiPoint geometry | direct |
| [properties](../slots/properties.md) | 1 <br/> [MultiPointFeatureProperties](../classes/MultiPointFeatureProperties.md) | Feature properties and styling | direct |
| [bbox](../slots/bbox.md) | 4..* <br/> [Float](../types/Float.md) | Bounding box [minLon, minLat, maxLon, maxLat] | direct |











## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:MultiPointFeature |
| native | debrief:MultiPointFeature |






## LinkML Source

<!-- TODO: investigate https://stackoverflow.com/questions/37606292/how-to-create-tabbed-code-blocks-in-mkdocs-or-sphinx -->

### Direct

<details>
```yaml
name: MultiPointFeature
description: GeoJSON Feature for multi-point tool results
from_schema: https://debrief.info/schemas/debrief
attributes:
  type:
    name: type
    description: GeoJSON type discriminator
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
    equals_string: Feature
  id:
    name: id
    description: Unique identifier (UUID recommended)
    from_schema: https://debrief.info/schemas/geojson
    domain_of:
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
    - Tool
    - PlatformRecord
    - PlotSummary
    - StacItemSummary
    - RawGeoJSONFeature
    - StoryboardProperties
    - SceneProperties
    - StoryboardFeature
    - SceneFeature
    - ToolDefinition
    required: true
  geometry:
    name: geometry
    description: MultiPoint geometry
    from_schema: https://debrief.info/schemas/geojson
    domain_of:
    - TrackFeature
    - ReferenceLocation
    - SystemState
    - MultiPointFeature
    - MultiPolygonFeature
    - InputFeatureState
    - NarrativeEntry
    - CircleAnnotation
    - RectangleAnnotation
    - LineAnnotation
    - TextAnnotation
    - VectorAnnotation
    - PolyAnnotation
    - RawGeoJSONFeature
    - StoryboardFeature
    - SceneFeature
    range: GeoJSONMultiPoint
    required: true
  properties:
    name: properties
    description: Feature properties and styling
    from_schema: https://debrief.info/schemas/geojson
    domain_of:
    - TrackFeature
    - ReferenceLocation
    - SystemState
    - MultiPointFeature
    - MultiPolygonFeature
    - InputFeatureState
    - NarrativeEntry
    - CircleAnnotation
    - RectangleAnnotation
    - LineAnnotation
    - TextAnnotation
    - VectorAnnotation
    - PolyAnnotation
    - RawGeoJSONFeature
    - StoryboardFeature
    - SceneFeature
    range: MultiPointFeatureProperties
    required: true
  bbox:
    name: bbox
    description: Bounding box [minLon, minLat, maxLon, maxLat]
    from_schema: https://debrief.info/schemas/geojson
    domain_of:
    - TrackFeature
    - SystemStateProperties
    - MultiPointFeature
    - MultiPolygonFeature
    - PlotSummary
    - StacItemSummary
    - RawGeoJSONFeature
    - RawGeoJSONFeatureCollection
    range: float
    multivalued: true
    minimum_cardinality: 4
    maximum_cardinality: 4

```
</details>

### Induced

<details>
```yaml
name: MultiPointFeature
description: GeoJSON Feature for multi-point tool results
from_schema: https://debrief.info/schemas/debrief
attributes:
  type:
    name: type
    description: GeoJSON type discriminator
    from_schema: https://debrief.info/schemas/geojson
    alias: type
    owner: MultiPointFeature
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
    equals_string: Feature
  id:
    name: id
    description: Unique identifier (UUID recommended)
    from_schema: https://debrief.info/schemas/geojson
    alias: id
    owner: MultiPointFeature
    domain_of:
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
    - Tool
    - PlatformRecord
    - PlotSummary
    - StacItemSummary
    - RawGeoJSONFeature
    - StoryboardProperties
    - SceneProperties
    - StoryboardFeature
    - SceneFeature
    - ToolDefinition
    range: string
    required: true
  geometry:
    name: geometry
    description: MultiPoint geometry
    from_schema: https://debrief.info/schemas/geojson
    alias: geometry
    owner: MultiPointFeature
    domain_of:
    - TrackFeature
    - ReferenceLocation
    - SystemState
    - MultiPointFeature
    - MultiPolygonFeature
    - InputFeatureState
    - NarrativeEntry
    - CircleAnnotation
    - RectangleAnnotation
    - LineAnnotation
    - TextAnnotation
    - VectorAnnotation
    - PolyAnnotation
    - RawGeoJSONFeature
    - StoryboardFeature
    - SceneFeature
    range: GeoJSONMultiPoint
    required: true
  properties:
    name: properties
    description: Feature properties and styling
    from_schema: https://debrief.info/schemas/geojson
    alias: properties
    owner: MultiPointFeature
    domain_of:
    - TrackFeature
    - ReferenceLocation
    - SystemState
    - MultiPointFeature
    - MultiPolygonFeature
    - InputFeatureState
    - NarrativeEntry
    - CircleAnnotation
    - RectangleAnnotation
    - LineAnnotation
    - TextAnnotation
    - VectorAnnotation
    - PolyAnnotation
    - RawGeoJSONFeature
    - StoryboardFeature
    - SceneFeature
    range: MultiPointFeatureProperties
    required: true
  bbox:
    name: bbox
    description: Bounding box [minLon, minLat, maxLon, maxLat]
    from_schema: https://debrief.info/schemas/geojson
    alias: bbox
    owner: MultiPointFeature
    domain_of:
    - TrackFeature
    - SystemStateProperties
    - MultiPointFeature
    - MultiPolygonFeature
    - PlotSummary
    - StacItemSummary
    - RawGeoJSONFeature
    - RawGeoJSONFeatureCollection
    range: float
    multivalued: true
    minimum_cardinality: 4
    maximum_cardinality: 4

```
</details>