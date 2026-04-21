One type, one source of truth. `Coordinate`, `ViewportPolygon`, and `TimeFilter` are now defined in exactly one place in the Future Debrief codebase — the LinkML schema. The two hand-authored TypeScript duplicates are gone.

The refactor also surfaced a `setViewport(spatial.viewport as never)` blind cast that had been quietly holding a shape mismatch together at persistence load time. Replacing it with a typed `coerceViewport` helper let us delete the cast outright and migrate legacy tuple-shaped viewports silently on rehydration.

Two small converter helpers (`toGeoJSONCoord` / `fromGeoJSONCoord`) landed in `@debrief/utils` to confine tuple-form handling to the GeoJSON and Leaflet boundary. Object form `{ longitude, latitude }` is canonical everywhere else.

One decision worth flagging: `TimeFilter` converged toward the runtime's nullable epoch-millis shape, not the other way round. Hot-path time-slider performance beat schema purity. Schema-first doesn't mean schema-unilateral.

2660 tests green, 230 schema adherence tests passing, ~96 lines of duplication deleted.

→ [Read the full post](https://debrief.github.io/future/[TBD])

#FutureDebrief #MaritimeAnalysis #OpenSource
