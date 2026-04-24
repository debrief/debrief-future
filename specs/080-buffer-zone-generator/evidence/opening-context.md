## What We're Building

The Buffer Zone Generator creates three nested detection-likelihood polygons around a vessel track. Given a track (a series of timestamped positions), it produces zones at 3nm (75% detection probability), 6nm (50%), and 12nm (25%). The zones are concentric polygons, not annular rings — each encompasses the previous one.

This tool doesn't try to simulate real sensor physics. Instead it uses a stub sensor model with a clean protocol-based interface. The stub returns fixed detection ranges for now, but the architecture means we can swap in sophisticated sensor models later without changing the tool's internals. That separation matters — domain logic stays in the tool, sensor complexity lives elsewhere.

## How It Fits

This is the third tool in Epic E03's five-tool reactive cascade. The sequence: generate random points → move track → buffer zones → classify points (inside/outside zones) → histogram. Moving the track automatically propagates updates through every downstream tool via PROV annotations. The cascade demonstrates that our architecture can handle multi-step analytical workflows where changes ripple through dependencies.

## Key Decisions

- **Great-circle geometry**: Vincenty destination formula for nautical-mile offsets (reusing math from the move-shape tool)
- **Convex hull construction**: Standard library math only, no external geo libraries
- **Nautical miles**: User-facing unit matches maritime domain conventions
- **Protocol-based sensor injection**: Clean dependency inversion — tools depend on abstractions, not concrete sensor implementations
- **Addition/feature result**: Polygon output stored as GeoJSON features with full provenance lineage
