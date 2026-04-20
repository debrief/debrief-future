# Quickstart: Implementing and verifying the boundary-feature migration

**Feature**: 212-linkml-feature-types
**Audience**: The developer (human or AI) executing the implementation phase.
**Outcome**: By the end of this document you will have (1) a regenerated LinkML schema, (2) deleted hand-written types, (3) swept consumer imports, and (4) verified green CI — all with reviewable, atomic commits.

---

## Pre-flight checks (one-time, before starting)

```bash
# Confirm you're on the right branch
git branch --show-current
# Expected: 212-linkml-feature-types (or the harness-designated branch)

# Confirm the hand-written types exist where expected
grep -n "interface SafeFeature\b\|interface SafeFeatureCollection\b\|interface SafeGeometry\b\|interface GeoJSONFeature\b\|interface GeoJSONFeatureCollection\b" shared/utils/src/types.ts
# Expected: 5 hits (the 5 symbols to be deleted)

# Confirm the drifted copy exists
grep -n "interface GeoJSONFeature\b" services/session-state/src/types/results.ts
# Expected: 1 hit

# Snapshot the pre-change CI baseline — open a terminal tab and run:
task verify 2>&1 | tee /tmp/pre-change-verify.log
# Record the exit status and any warnings so you can diff against the post-change run
```

---

## Phase A: Edit LinkML source

### A.1 — Add new classes to `geojson.yaml`

Open `shared/schemas/src/linkml/geojson.yaml`. After the last GeoJSON geometry class (currently `GeoJSONMultiPolygon`, around line 126) but before the `# Compound Track Embedded Types` section header, insert the three classes from `contracts/boundary-feature-schema.md` (`GeoJSONBoundaryGeometry`, `GeoJSONFeature`, `GeoJSONFeatureCollection`).

### A.2 — Delete the drifted class from `session-state.yaml`

Open `shared/schemas/src/linkml/session-state.yaml`. Delete the `GeoJSONFeature:` class and its body (lines ~270-286). Verify the `imports:` list at the top of `session-state.yaml` already includes `geojson`:

```bash
head -20 shared/schemas/src/linkml/session-state.yaml | grep -A5 "^imports:"
```

If `geojson` is not in the imports list, add it.

### A.3 — Commit the LinkML edits

```bash
git add shared/schemas/src/linkml/geojson.yaml shared/schemas/src/linkml/session-state.yaml
git commit -m "feat(212): add boundary GeoJSONFeature/Geometry/Collection to LinkML

Widens the existing strict GeoJSONFeature class (relocated from
session-state.yaml to geojson.yaml) and adds supporting boundary
geometry + collection classes. Schema source only — derived
outputs regenerate in the next commit."
```

---

## Phase B: Regenerate derived schemas

### B.1 — Run the schema generators

```bash
make -C shared/schemas generate
```

Expected output:

```
[OK] Pydantic models generated
[OK] JSON Schema generated
[OK] TypeScript interfaces generated
[OK] All schemas generated
```

### B.2 — Verify the generated TypeScript matches the contract

```bash
grep -A4 "^export interface GeoJSONFeature " shared/schemas/src/generated/typescript/types.ts
```

Expected (from `contracts/boundary-feature-schema.md`):

```typescript
export interface GeoJSONFeature {
    type: "Feature";
    id?: string | number;
    geometry?: GeoJSONBoundaryGeometry;
    properties?: unknown;
}
```

If the generated shape differs from the contract (e.g. the generator emits `string | null` instead of an optional), iterate on the LinkML source until the contract matches. Do **not** hand-edit the generated file.

### B.3 — Commit the regenerated files

```bash
git add shared/schemas/src/generated/
git commit -m "feat(212): regenerate schema outputs for boundary feature classes

Regenerated from geojson.yaml + session-state.yaml edits in the
previous commit. Derived artefacts; do not hand-edit."
```

---

## Phase C: Add schema-adherence tests

### C.1 — Create golden fixtures

```bash
mkdir -p shared/schemas/fixtures/geojson-feature/valid
mkdir -p shared/schemas/fixtures/geojson-feature/invalid
```

Populate each file per the list in `data-model.md`:

- `valid/minimal.json`
- `valid/with-nullable-geometry.json`
- `valid/with-numeric-id.json`
- `valid/with-string-id.json`
- `invalid/wrong-type.json`
- `invalid/missing-type.json`

### C.2 — Extend round-trip and adherence tests

Open `shared/schemas/tests/test_roundtrip.py` and `shared/schemas/tests/test_adherence.py`. Add test cases for the new `GeoJSONFeature` / `GeoJSONBoundaryGeometry` / `GeoJSONFeatureCollection` classes following the existing pattern for the sibling classes in the same file.

### C.3 — Verify tests pass

```bash
cd shared/schemas && uv run pytest tests/ -v -k "geojson_feature or roundtrip"
```

Expected: all new tests pass. The `uv run pytest` invocation picks up the `geojson-feature/` fixtures automatically if `test_roundtrip.py` discovers them the same way the existing fixtures are discovered.

### C.4 — Commit

```bash
git add shared/schemas/fixtures/geojson-feature shared/schemas/tests/
git commit -m "test(212): golden fixtures + round-trip for boundary feature

Fixtures cover minimal, nullable-geometry, numeric-id, string-id
valid cases plus wrong-type and missing-type invalid cases.
Adherence test verifies LinkML/Pydantic JSON Schema parity."
```

---

## Phase D: Delete hand-written types

### D.1 — Delete from `shared/utils/src/types.ts`

Remove the five interface blocks (`GeoJSONFeature`, `GeoJSONFeatureCollection`, `SafeGeometry`, `SafeFeature`, `SafeFeatureCollection`) from `shared/utils/src/types.ts`. Leave the other unrelated types (`Bounds`, `ResolvedPositionStyle`, `AxisDefinition`, `DatasetMetadata`, `DataSeries`, `DatasetEnvelope`, `PointShape`, and the re-exported `PositionStyle` / `PositionStyleOverride`) in place — they are **out of scope** for this feature.

Also update `shared/utils/src/index.ts` to remove any re-exports of the deleted symbols.

### D.2 — Delete from `services/session-state/src/types/results.ts`

Remove the `interface GeoJSONFeature` block (lines 6-20) from `services/session-state/src/types/results.ts`. Add a new import at the top of the file:

```typescript
import type { GeoJSONFeature } from '@debrief/schemas';
```

Leave `LastToolExecution` and `ResultsSlice` interfaces alone — they are out of scope (camelCase vs snake_case drift is a separate issue).

### D.3 — Type-check expecting failures

```bash
pnpm -r typecheck 2>&1 | tee /tmp/phase-d-typecheck.log | tail -40
```

This run is **expected to fail** — every consumer that imported the deleted symbols from `@debrief/utils` will now have unresolved imports. That failure set is exactly the file list you need to sweep in Phase E.

Extract the failing file list:

```bash
grep "error TS" /tmp/phase-d-typecheck.log | cut -d'(' -f1 | sort -u
```

Expected: ~30 distinct files (per `plan.md`'s "Source Code" section).

---

## Phase E: Sweep consumer imports

### E.1 — Find every consumer

```bash
grep -rln "from '@debrief/utils'" apps/ services/ shared/ \
  --include='*.ts' --include='*.tsx' \
  | xargs grep -l "SafeFeature\|SafeFeatureCollection\|SafeGeometry" 2>/dev/null \
  | sort -u
```

And separately:

```bash
grep -rln "^import type .*GeoJSONFeature.* from '@debrief/utils'" apps/ services/ shared/ \
  --include='*.ts' --include='*.tsx' | sort -u
```

### E.2 — Rewrite imports

For each file in E.1, change:

```typescript
// Before:
import type { SafeFeature, SafeFeatureCollection, SafeGeometry } from '@debrief/utils';
```

To:

```typescript
// After:
import type {
  GeoJSONFeature as SafeFeature,                // temporary alias, removed in E.3
  GeoJSONFeatureCollection as SafeFeatureCollection,
  GeoJSONBoundaryGeometry as SafeGeometry,
} from '@debrief/schemas';
```

**Then** in a follow-up pass (still within Phase E, separate commit), rename the aliased uses to the canonical names at each call site. The intermediate aliased commit keeps the diff reviewable one step at a time and keeps `task verify` green between steps.

### E.3 — Run the verify gate after each sub-commit

```bash
task verify 2>&1 | tail -20
```

Exit status must be 0 before the next sub-commit lands. If a file surfaces a real type-reconciliation need (a call site needs the untyped-coordinates narrowing), add the narrowing explicitly — **do not** add an `as`-cast (FR-009). Use the existing `coerceCoordinates` helper in `shared/utils/src/bounds.ts` as the pattern.

### E.4 — Commit in logical groups

Suggested commit boundary structure:

```
feat(212): migrate apps/vscode consumers to @debrief/schemas
feat(212): migrate apps/loader consumers to @debrief/schemas
feat(212): migrate apps/web-shell consumers to @debrief/schemas
feat(212): migrate shared/components consumers to @debrief/schemas
feat(212): migrate services/session-state consumers to @debrief/schemas
feat(212): rename temporary SafeFeature aliases to canonical names
```

Each commit leaves `task verify` green.

---

## Phase F: Final verification

### F.1 — Grep confirms zero hand-written types remain

```bash
# SC-001 check — grep-verifiable
grep -rn "interface SafeFeature\b\|interface SafeFeatureCollection\b\|interface SafeGeometry\b\|interface GeoJSONFeature\b\|interface GeoJSONFeatureCollection\b" \
  apps/ services/ shared/ \
  --include='*.ts' --include='*.tsx' \
  | grep -v "shared/schemas/src/generated/" \
  | grep -v "shared/schemas/src/linkml/"
# Expected: zero lines of output
```

### F.2 — Grep confirms zero stale imports from `@debrief/utils`

```bash
# SC-002 check
grep -rn "SafeFeature\|SafeFeatureCollection\|SafeGeometry" apps/ services/ shared/ \
  --include='*.ts' --include='*.tsx' \
  | grep "from '@debrief/utils'"
# Expected: zero lines of output
```

### F.3 — Full CI gate

```bash
task verify 2>&1 | tee /tmp/post-change-verify.log
```

Exit status must be 0. Diff against `/tmp/pre-change-verify.log` — the only expected diffs are (a) type-check pass counts may differ by a few (reflecting the schema regen), (b) test-count may increase by a small number (reflecting the added golden-fixture tests). No new errors, no new warnings.

### F.4 — `as`-cast diff audit (SC-007)

```bash
git diff main...HEAD -- 'apps/**/*.ts' 'apps/**/*.tsx' 'services/**/*.ts' 'shared/**/*.ts' 'shared/**/*.tsx' \
  | grep -E "^\+.* as [A-Z]" \
  | grep -v "^\+\+\+ "
# Expected: zero lines, OR every line is at a data-entry boundary documented in the PR description.
```

### F.5 — Manual smoke test (SC-008)

Start the preview / web-shell app:

```bash
pnpm --filter @debrief/web-shell dev
# Open the preview URL in a browser
```

Verify:

1. **Open sample plot** — map auto-zooms to feature extent.
2. **Import REP file** — features appear on the map; layer count matches a pre-change snapshot.
3. **Run a calc tool** (e.g. range_bearing) on a selection — result layer renders; values match expected output.

Capture screenshots into `specs/212-linkml-feature-types/evidence/` for the eventual PR.

---

## Phase G: Update BACKLOG.md for subsumption (SC-010)

At this point, backlog item #204 has been effectively implemented. Update `BACKLOG.md`:

1. Strike through item #204 and change its status to `complete`.
2. Add a note: "Subsumed by #212 (see specs/212-linkml-feature-types/spec.md)."

```bash
# (Manual edit to BACKLOG.md)
git add BACKLOG.md
git commit -m "chore(backlog): mark #204 complete (subsumed by #212)"
```

---

## Rollback (if something surfaces unexpectedly mid-migration)

If Phase E uncovers a consumer that cannot cleanly migrate without introducing `as`-casts or behaviour changes:

1. **Stop**. Do not force the migration.
2. Document the blocker in the PR description.
3. Revert the in-progress commits via `git reset --soft HEAD~N` (where N is the number of commits since Phase A).
4. Iterate on the LinkML shape (Phase A) to accommodate the blocked consumer — likely by further widening the boundary class, or by adding a second typed field.
5. Re-run Phases B-F.

The atomic-commit structure makes rollback safe at any phase boundary.

---

## Summary — one-line verifiers

These commands, run from the repo root, collectively verify the feature is complete:

| Check | Command | Expected |
|-------|---------|----------|
| SC-001 | `grep -rn 'interface SafeFeature\b\|interface GeoJSONFeature\b' apps/ services/ shared/ --include='*.ts' \| grep -v generated/ \| grep -v linkml/` | empty |
| SC-002 | `grep -rn "from '@debrief/utils'" apps/ services/ shared/ --include='*.ts' \| grep 'SafeFeature\|GeoJSONFeature'` | empty |
| SC-003 | `grep -c 'GeoJSONFeature:' shared/schemas/src/linkml/*.yaml` | `1` total (in `geojson.yaml`; `session-state.yaml` must report 0) |
| SC-004 | `task verify` | exit 0 |
| SC-005 | `cd shared/schemas && uv run pytest tests/ -k geojson_feature` | all pass |
| SC-006 | `git diff main...HEAD --stat shared/utils/src/types.ts services/session-state/src/types/results.ts` | ~60 lines removed, 0-2 added |
| SC-007 | `git diff main...HEAD -- '**/*.ts' '**/*.tsx' \| grep -E '^\+.* as [A-Z]' \| wc -l` | `0` |
| SC-008 | Manual smoke — open plot, import REP, run tool | no visible regression |
| SC-009 | `grep -B2 'export interface GeoJSONFeature' shared/schemas/src/generated/typescript/types.ts` | JSDoc describes "parse-boundary only" rule |
| SC-010 | `grep '~~#\?204~~\|~~| 204 |~~\|subsumed by #212' BACKLOG.md` | match found |
