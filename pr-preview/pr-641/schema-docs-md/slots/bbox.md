

# Slot: bbox 



URI: [debrief:slot/bbox](https://debrief.info/schemas/slot/bbox)
Alias: bbox

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [StacItemSummary](../classes/StacItemSummary.md) | Minimal STAC Item projection for browser tree display and metadata filtering |  no  |
| [MultiPointFeature](../classes/MultiPointFeature.md) | GeoJSON Feature for multi-point tool results |  no  |
| [RawGeoJSONFeatureCollection](../classes/RawGeoJSONFeatureCollection.md) | Parse-boundary GeoJSON FeatureCollection (RFC 7946 §3 |  no  |
| [TrackFeature](../classes/TrackFeature.md) | GeoJSON Feature representing a vessel track |  no  |
| [RawGeoJSONFeature](../classes/RawGeoJSONFeature.md) | Parse-boundary GeoJSON Feature (RFC 7946 §3 |  no  |
| [SystemStateProperties](../classes/SystemStateProperties.md) | Properties for SYSTEM features storing application state |  no  |
| [MultiPolygonFeature](../classes/MultiPolygonFeature.md) | GeoJSON Feature for multi-polygon tool results |  no  |
| [PlotSummary](../classes/PlotSummary.md) | Projection of a STAC Item for UI consumption (e |  no  |






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
- SystemStateProperties
- MultiPointFeature
- MultiPolygonFeature
- PlotSummary
- StacItemSummary
- RawGeoJSONFeature
- RawGeoJSONFeatureCollection
range: string

```
</details>