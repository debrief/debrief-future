# Contracts

This feature is a **type refactor**, not an API addition. There are no HTTP endpoints, MCP tool signatures, or CLI commands to specify.

The "contracts" of this feature are:

1. **Schema contracts** — the canonical LinkML definitions of `Coordinate`, `ViewportPolygon`, and `TimeFilter`. See `../data-model.md` for the authoritative shapes, and `linkml-diff.md` for the exact source-of-truth patch to `shared/schemas/src/linkml/session-state.yaml`.
2. **Converter contracts** — the function signatures and semantics of `toGeoJSONCoord` / `fromGeoJSONCoord`. See `converter-contracts.md`.
3. **Validator contracts** — the function signatures of `validateCoordinate` / `validateViewportPolygon` after they move to `@debrief/utils`. See `validator-contracts.md`.
4. **Persistence migration contract** — the detection + conversion behaviour for legacy tuple-form coordinates in rehydrated session state. See `persistence-migration.md`.

Schema adherence tests (golden fixtures, round-trip, structural comparison) validate #1. Unit tests validate #2 and #3. A targeted migration test validates #4.
