# LinkedIn Summary: POLY FeatureKind Planning

Shape drawing is coming to Debrief.

We're starting Epic E05 (Shape Drawing Tools) with the foundation: adding POLY to our schema's FeatureKindEnum. This lets analysts create arbitrary polygons on the map — patrol zones, exclusion areas, search grids — with full schema validation.

The interesting bit: our IO service already parses POLY shapes from REP files, but the schema didn't include them yet. We're aligning the contract to match reality, then building interactive drawing on top.

Key decisions: follow the established annotation pattern (consistency over cleverness), confirm LINE handles polylines without a new kind, and keep it additive-only — zero regressions.

This unlocks five downstream items in E05: Geoman integration, drawing toolbar, point/rectangle/polygon/polyline tools, and STAC persistence for drawn shapes.

Schema-first, test-first, ship-first.

#Debrief #MaritimeAnalysis #OpenSource #GeoJSON #SchemaDesign
