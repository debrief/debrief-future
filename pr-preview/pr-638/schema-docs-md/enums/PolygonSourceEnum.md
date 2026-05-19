# Enum: PolygonSourceEnum 




_Provenance of a Scene's stored polygon geometry. Render-side consumers use this to decide whether to trust the on-disk polygon ('bounds') or recompute it from (viewport, map dimensions) when the stored polygon pre-dates Spec #258 ('placeholder') or was hand-drawn ('manual')._



URI: [debrief:enum/PolygonSourceEnum](https://debrief.info/schemas/enum/PolygonSourceEnum)

## Permissible Values

| Value | Meaning | Description |
| --- | --- | --- |
| bounds | None | Polygon was computed from real Leaflet map bounds at capture time (post-#258 ... |
| placeholder | None | Pre-#258 ~100m placeholder square or otherwise non-bounds-derived |
| manual | None | Reserved for future user-drawn rectangles |




## Slots

| Name | Description |
| ---  | --- |
| [_polygon_source](../slots/_polygon_source.md) | Provenance of the scene's stored polygon geometry (Spec #258) |





## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief






## LinkML Source

<details>
```yaml
name: PolygonSourceEnum
description: 'Provenance of a Scene''s stored polygon geometry. Render-side consumers
  use this to decide whether to trust the on-disk polygon (''bounds'') or recompute
  it from (viewport, map dimensions) when the stored polygon pre-dates Spec #258 (''placeholder'')
  or was hand-drawn (''manual'').'
from_schema: https://debrief.info/schemas/debrief
rank: 1000
permissible_values:
  bounds:
    text: bounds
    description: Polygon was computed from real Leaflet map bounds at capture time
      (post-#258 norm). Renderers trust the on-disk geometry.
  placeholder:
    text: placeholder
    description: Pre-#258 ~100m placeholder square or otherwise non-bounds-derived.
      Renderers recompute from (viewport, map dimensions); the on-disk value is preserved
      (Article III.2 source preservation).
  manual:
    text: manual
    description: Reserved for future user-drawn rectangles. Renderers recompute (current
      behaviour) until manual editing of scene geometry ships.

```
</details>