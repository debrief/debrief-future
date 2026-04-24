## What We're Building

Every track, waypoint, and annotation in Debrief needs to be rendered on a map. Currently, our GeoJSON features have a single `color` property and frontends have to make up the rest — line thickness, opacity, marker shapes, dash patterns. This creates inconsistency and makes it hard for users to express tactical meaning through visual styling.

We're adding standardized styling schemas to all GeoJSON features. Three core schemas — `PointProperties`, `LineProperties`, and `PolygonProperties` — will define how each geometry type can be styled. Tracks get special treatment with `TrackStyle`, a composite that styles both the track line and position markers.

## How It Fits

This builds directly on our schema-first architecture. Like our existing feature schemas, styling schemas are defined in LinkML and generate Pydantic models (Python) and JSON Schema (TypeScript) automatically. The styling vocabulary follows Leaflet Path options — the same names frontends already use — so rendering becomes a direct mapping rather than a translation exercise.

```
LinkML Schema → Pydantic Model → GeoJSON Feature → Leaflet Renderer
                → JSON Schema → TypeScript Validation
```

## Key Decisions

- **Leaflet naming conventions**: Properties like `stroke`, `weight`, `opacity`, `dashArray` match Leaflet exactly. No translation layer needed.

- **Required styling**: Every feature must have a `style` property. No defaults, no optional styling. If you're storing a feature, you're explicitly storing how it should look.

- **Track composite styling**: Tracks are unique — they're lines with position markers. `TrackStyle` contains both `line` (LineProperties) and `point` (PointProperties) so users can style the track path and markers independently.

- **Three point shapes**: We're starting with `circle`, `square`, and `triangle`. Icons and military symbology (MIL-STD-2525) are explicitly deferred.
