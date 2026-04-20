# Quickstart: Spatial Types Consolidation

**Feature**: 203-spatial-types-linkml
**Audience**: Developer implementing or reviewing this feature.

This is a refactor with no new user-facing surface. The "quickstart" is: build the monorepo, verify schema regeneration, and confirm the smoke tests still pass.

---

## 1. Prerequisites

```sh
pnpm install
uv sync
```

Working tree on branch `203-spatial-types-linkml`.

---

## 2. Regenerate schemas

```sh
pnpm --filter @debrief/schemas build
```

Expected output:

- No LinkML parse errors.
- Pydantic models in `shared/schemas/generated/python/` updated — `Coordinate`, `ViewportPolygon` (with optional `zoom`), `TimeFilter` (with optional nullable `start`/`end` as integers).
- TypeScript types in `shared/schemas/generated/typescript/` updated.
- JSON Schema documents in `shared/schemas/generated/jsonschema/` updated.

Run the schema adherence tests:

```sh
uv run pytest shared/schemas/
pnpm --filter @debrief/schemas test
```

All golden-fixture, round-trip, and structural-comparison tests must pass. If fixtures for the three types exist only in tuple form, update them to object form as part of this feature.

---

## 3. Verify converter helpers

```sh
pnpm --filter @debrief/utils test
```

Expected: the new `spatial-converters.test.ts` / `spatial-validators.test.ts` suites pass, including round-trip identity cases.

Spot-check from a Node REPL:

```sh
pnpm --filter @debrief/utils build
node -e "const { toGeoJSONCoord, fromGeoJSONCoord } = require('./shared/utils/dist'); console.log(toGeoJSONCoord({ longitude: -1.5, latitude: 51.5 }));"
# → [ -1.5, 51.5 ]
```

---

## 4. Verify the full monorepo build and tests

```sh
task verify
```

This runs lint, typecheck, and unit tests (the CI gate). It should pass end-to-end with:

- No hand-authored `Coordinate`/`ViewportPolygon`/`TimeFilter` type declarations outside `shared/schemas/generated/`.
- No type errors in downstream consumers (`@debrief/components`, `@debrief/session-state`, `apps/vscode`, `apps/web-shell`).

---

## 5. Run the smoke tests (FR-019)

### 5a. Web-shell

```sh
pnpm --filter @debrief/web-shell build
pnpm --filter @debrief/web-shell start
```

- Open the app in a browser.
- Load a sample plot.
- Confirm tracks render on the map.
- Pan/zoom, then reload the page — viewport state persists correctly.
- Drag the time filter — features respond to the filter on both the map and the timeline.
- Confirm three-view-sync (#132) still selects the same feature across map / list / timeline.

Capture screenshots to `specs/203-spatial-types-linkml/evidence/`.

### 5b. VS Code extension (preview app)

- Open the PR's preview app (Code Server link in the Heroku preview comment).
- Load a sample plot.
- Repeat the viewport / time-filter / three-view-sync checks.
- Capture screenshots to `specs/203-spatial-types-linkml/evidence/`.

### 5c. Persistence migration

- In the web-shell's localStorage (or VS Code workspace state), inject a legacy tuple-form `SpatialSlice` payload (see `contracts/persistence-migration.md` for shape).
- Reload the app.
- Confirm no console errors; confirm the viewport is restored correctly.
- Capture a before/after localStorage screenshot.

---

## 6. Verification checklist for reviewers

```sh
# 1. Zero hand-authored declarations of the three types outside generated code.
rg '^export (type|interface) (Coordinate|ViewportPolygon|TimeFilter)\b' --type ts
# Expected: matches only in shared/schemas/generated/typescript/

# 2. Boundary files use the converter helpers.
rg 'toGeoJSONCoord|fromGeoJSONCoord' --type ts shared/components services apps
# Expected: matches in files that cross the GeoJSON/Leaflet boundary.

# 3. Hand-rolled [coord.longitude, coord.latitude] patterns not re-introduced in new code.
git diff main...HEAD -- '*.ts' | rg '\[\s*[\w.]+\.longitude\s*,\s*[\w.]+\.latitude\s*\]'
# Expected: empty, OR every match is inside a converter helper's implementation.

# 4. The shared/components/src/utils/spatial-types.ts file no longer exists.
ls shared/components/src/utils/spatial-types.ts 2>/dev/null && echo "STILL EXISTS" || echo "DELETED"
# Expected: DELETED
```

---

## 7. Known non-goals

These are explicitly **not** addressed by this feature (see spec Out of Scope):

- Changes to `SpatialSlice`, `TemporalSlice`, `TimeRange`, `TimeInstant`, `TimeStep`, or `DrawingMode`.
- A lint rule preventing hand-rolled tuple conversions.
- Python-side `to_geojson_coord` / `from_geojson_coord` helpers.
- Retroactive cleanup of tuple conversions in files not touched by this change.

Any of these can be taken up as follow-up work via the backlog.
