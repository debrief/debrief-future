

# Slot: _polygon_source 


_Provenance of the scene's stored polygon geometry (Spec #258). 'bounds' = computed from real Leaflet map bounds at capture time; 'placeholder' = pre-#258 ~100m square; 'manual' = reserved for future user-drawn rectangles. Render-side consumers recompute the polygon from (viewport, map dimensions) when this value is anything other than 'bounds' (including absent, for legacy scenes). The stored geometry is NEVER rewritten on read (Article III.2 source preservation)._





URI: [debrief:slot/_polygon_source](https://debrief.info/schemas/slot/_polygon_source)
Alias: _polygon_source

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SceneProperties](../classes/SceneProperties.md) | Properties class for a Scene child Feature |  no  |






## Properties

* Range: [PolygonSourceEnum](../enums/PolygonSourceEnum.md)




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:_polygon_source |
| native | debrief:_polygon_source |




## LinkML Source

<details>
```yaml
name: _polygon_source
description: 'Provenance of the scene''s stored polygon geometry (Spec #258). ''bounds''
  = computed from real Leaflet map bounds at capture time; ''placeholder'' = pre-#258
  ~100m square; ''manual'' = reserved for future user-drawn rectangles. Render-side
  consumers recompute the polygon from (viewport, map dimensions) when this value
  is anything other than ''bounds'' (including absent, for legacy scenes). The stored
  geometry is NEVER rewritten on read (Article III.2 source preservation).'
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: _polygon_source
owner: SceneProperties
domain_of:
- SceneProperties
range: PolygonSourceEnum
required: false

```
</details>