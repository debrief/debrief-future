# Quickstart: Consumer Migration Recipe

**Feature**: 204-rawgeojsonfeature-linkml
**Audience**: implementers migrating consumer files from the old hand-typed
`GeoJSONFeature`/`GeoJSONFeatureCollection` to the new schema-rooted
`RawGeoJSONFeature`/`RawGeoJSONFeatureCollection`.

This is not a tutorial — it is the recipe the tasks.md checklist refers to.

---

## 0. Prerequisites

1. You are on branch `claude/start-speckit-204-fdXfS` (or feature branch
   `204-rawgeojsonfeature-linkml` if checked out separately).
2. Schema source + generated artefacts are up to date:
   ```sh
   cd shared/schemas && make generate && cd ../..
   ```
3. `task verify` was green before you started. If not, halt and fix the
   pre-existing failure first.

## 1. TypeScript consumer migration

The old import in `shared/utils`:
```ts
import type { GeoJSONFeature, GeoJSONFeatureCollection } from '@debrief/utils';
```

becomes:
```ts
import type { RawGeoJSONFeature, RawGeoJSONFeatureCollection } from '@debrief/schemas';
```

and every in-file reference is renamed. There are no structural field
changes beyond:
- `id?: string` → `id?: string | number` — a *widening*; existing string-only
  callers remain valid.
- `properties: {...}` → `properties?: Record<string, unknown> | null` — a
  *widening* with optionality. Callers that assumed `properties` is always
  defined must add a null-guard or narrow via `feature.properties &&
  'kind' in feature.properties`.

### 1a. `shared/utils/src/types.ts`

Delete the `GeoJSONFeature` and `GeoJSONFeatureCollection` interface
blocks entirely. Do **not** delete `SafeFeature`/`SafeGeometry`/`SafeFeatureCollection`
— those stay (out of scope, tracked under #212).

### 1b. `shared/utils/src/index.ts`

Remove the two re-exports:
```diff
- export type { GeoJSONFeature, GeoJSONFeatureCollection } from './types';
```

### 1c. Remaining 20 TypeScript files (listed in `research.md §3`)

Apply the import-source swap. No other changes. Example — `services/session-state/src/types/results.ts`:

```diff
-// Not migrated: generated GeoJSONFeature uses type: string and id?: string
-// with a GeoJSONGeometry sub-object (type: string, no coordinates)
-export interface GeoJSONFeature {
-  type: 'Feature';
-  id?: string | number;
-  geometry: {
-    type: string;
-    coordinates: unknown;
-  };
-  properties: Record<string, unknown> | null;
-}
+export type { RawGeoJSONFeature as GeoJSONFeature } from '@debrief/schemas';
```

**Note on the re-export alias**: services/session-state uses the name
`GeoJSONFeature` on its *external* API. If removing the alias ripples into
another large migration, keep the re-export with the new underlying name
(`RawGeoJSONFeature`) for this PR and file a follow-up to rename at the
API boundary. The *spec is satisfied* as long as the hand-typed interface
is deleted.

### 1d. `apps/vscode/src/types/import.ts`

Replace the aliased export with a direct one:
```diff
-export type { SafeFeature as GeoJSONFeature } from '@debrief/utils';
+export type { RawGeoJSONFeature } from '@debrief/schemas';
```
…and update every reference site within `apps/vscode/` to import
`RawGeoJSONFeature` directly. The existing local
`GeoJSONFeatureCollection` interface is deleted — import
`RawGeoJSONFeatureCollection` from `@debrief/schemas` instead.

## 2. Python consumer migration

### 2a. `services/stac/src/debrief_stac/types.py`

```diff
-from typing import Any, TypeAlias
-
-GeoJSONFeature: TypeAlias = dict[str, Any]
-GeoJSONFeatureCollection: TypeAlias = dict[str, Any]
+from debrief_schemas import RawGeoJSONFeature, RawGeoJSONFeatureCollection
+
+# Backwards-compatible aliases for the in-package API.
+# Call sites are migrated in the same PR.
+GeoJSONFeature = RawGeoJSONFeature
+GeoJSONFeatureCollection = RawGeoJSONFeatureCollection
```

**Preferred** — remove the aliases entirely and update the 2 call sites
(`features.py`, `tests/fixtures.py`) directly. Keep the aliases only if
they would cause the diff to blow up beyond a reviewable size.

### 2b. `services/stac/src/debrief_stac/features.py` + `tests/fixtures.py`

Update imports to source from `debrief_schemas` directly (or keep the
package-internal alias — see 2a).

## 3. Regenerate + verify

```sh
# Regenerate all derived artefacts
cd shared/schemas && make generate && cd ../..

# Verify schemas (extended fixtures must go green)
cd shared/schemas && uv run pytest && cd ../..

# Full CI parity locally
task verify
```

If any of the following fail, the migration is incomplete:
- `uv run pyright` — TypeScript-style strict checking on Python
- `pnpm -r typecheck` — strict mode on TS
- `pnpm lint` — ESLint
- `uv run ruff check .` — Python lint
- `uv run pytest` + `pnpm … test` + Playwright

## 4. Add the ADR entry

Append to `docs/project_notes/decisions.md`:

```markdown
## ADR-XXX: `RawGeoJSONFeature` as schema-rooted parse boundary (2026-04-20)

**Status**: Accepted
**Context**: Two hand-typed `GeoJSONFeature` interfaces (plus one `dict[str, Any]`
alias in services/stac) had drifted. This violates Constitution Articles II
(Schema Integrity) and XV (Strict Type Safety).

**Decision**: Introduce `RawGeoJSONGeometry`, `RawGeoJSONFeature`, and
`RawGeoJSONFeatureCollection` in a new LinkML submodule
`raw-geojson.yaml`. Regenerate Pydantic / TypeScript / JSON Schema and
migrate all consumers to the generated types. Remove the three hand-typed
duplicates.

**Consequences**:
- Single source of truth restored for GeoJSON boundary types.
- `services/stac` Any-alias eliminated.
- Breaking rename pre-v4.0.0 (permitted under Article XIV).
- `SafeFeature`/`SafeGeometry` remain out of scope; tracked under backlog
  #212.

**Evidence**: `specs/204-rawgeojsonfeature-linkml/` (spec, plan, research,
data-model, contracts, quickstart).
```

Number the ADR by finding the next free number in `decisions.md`.

## 5. Acceptance checks (from spec.md)

Before opening the PR, verify each success criterion:

- [ ] **SC-001** — `rg -nw "interface GeoJSONFeature" shared/ services/ apps/` returns no hits.
- [ ] **SC-002** — `rg -nw "GeoJSONFeature: TypeAlias" services/` returns no hits.
- [ ] **SC-003** — `git diff main -- shared/ services/ apps/ | grep -E "^\+.*\b(any|Any)\b"` shows no new hits.
- [ ] **SC-004** — `rg -n "RawGeoJSONFeature|RawGeoJSONGeometry|RawGeoJSONFeatureCollection" shared/schemas/src/generated/` returns matches in Pydantic, TypeScript, JSON Schema.
- [ ] **SC-005** — `task verify` green.
- [ ] **SC-006** — fixture files in `shared/schemas/fixtures/raw-geojson/{valid,invalid}/` exist and are exercised.
- [ ] **SC-007** — single PR contains schema + regen + consumer migration.
- [ ] **SC-008** — round-trip test passes on 3 canonical fixtures.
- [ ] **SC-009** — reviewers confirm atomic PR (no partial merges).
- [ ] **SC-010** — ADR entry present in `docs/project_notes/decisions.md`.

## 6. Common pitfalls

- **Do NOT hand-edit `shared/schemas/src/generated/`.** Regenerate.
- **Do NOT add `as any` or `as unknown as X` at migration sites.** If a cast
  seems necessary, the new type is either too narrow (file a fix to
  `raw-geojson.yaml`) or the call-site narrowing is missing (fix the
  call-site logic).
- **Do NOT import from `shared/utils` anywhere the migration completes.**
  After step 1b the symbol no longer exists in `@debrief/utils`.
- **Do NOT widen `SafeFeature`/`SafeGeometry`.** Out of scope.
