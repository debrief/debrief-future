

# Slot: bbox 



URI: [debrief:slot/bbox](https://debrief.info/schemas/slot/bbox)
Alias: bbox

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [StacSpatialExtent](../classes/StacSpatialExtent.md) | Spatial extent on a Collection |  no  |
| [StacItem](../classes/StacItem.md) | A STAC 1 |  no  |
| [RawGeoJSONFeature](../classes/RawGeoJSONFeature.md) | Parse-boundary GeoJSON Feature (RFC 7946 §3 |  no  |
| [RawGeoJSONFeatureCollection](../classes/RawGeoJSONFeatureCollection.md) | Parse-boundary GeoJSON FeatureCollection (RFC 7946 §3 |  no  |
| [StacItemSummary](../classes/StacItemSummary.md) | Minimal STAC Item projection for browser tree display and metadata filtering |  no  |
| [PlotSummary](../classes/PlotSummary.md) | Projection of a STAC Item for UI consumption (e |  no  |
| [MultiPolygonFeature](../classes/MultiPolygonFeature.md) | GeoJSON Feature for multi-polygon tool results |  no  |
| [MultiPointFeature](../classes/MultiPointFeature.md) | GeoJSON Feature for multi-point tool results |  no  |
| [TrackFeature](../classes/TrackFeature.md) | GeoJSON Feature representing a vessel track |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:bbox |
| native | debrief:bbox |




## LinkML Source

<details>
```yaml
name: bbox
alias: bbox
domain_of:
- TrackFeature
- MultiPointFeature
- MultiPolygonFeature
- PlotSummary
- StacItemSummary
- StacItem
- StacSpatialExtent
- RawGeoJSONFeature
- RawGeoJSONFeatureCollection
range: string

```
</details>