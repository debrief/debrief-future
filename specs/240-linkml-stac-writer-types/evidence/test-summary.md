---
feature: "240-linkml-stac-writer-types"
captured_at: "2026-05-09T17:15:00Z"
git_sha: "f0e0c65"
tests_passed: 2661
tests_failed: 0
tests_skipped: 1
coverage_pct: null
---

# Test Summary: LinkML-derive `@debrief/stac-writer` Contract Types

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 2661 |
| Passed | 2661 |
| Failed | 0 |
| Skipped | 1 (pre-existing, unrelated) + 1 xfailed (pre-existing, unrelated) |
| Coverage | N/A — type-derivation feature, no coverage delta expected |

## Test Breakdown

### Python — `shared/schemas/tests/test_roundtrip.py` (T011)

| Test | Status |
|------|--------|
| 216 round-trip parametrised tests across all LinkML fixtures (every model class in `debrief_schemas`, including `PropertiesProvenanceEntry`) | Pass |

Run via `cd shared/schemas && uv run pytest tests/test_roundtrip.py -v`. One pre-existing `UserWarning` about `SessionFile.schema` field shadowing — unrelated to spec 240.

### TypeScript — VS Code unit tests (T010)

| Test | Status |
|------|--------|
| `apps/vscode/tests/unit/stacService.provenanceRotation.test.ts` (2 tests) — provenance log rotation + archive | Pass |
| `apps/vscode/tests/unit/stacService.updateItemMetadata.test.ts` (5 tests) — write-side construction of `PropertiesProvenanceEntry`; calls `isValidPropertiesProvenanceEntry` on every entry | Pass |

Both files import the type and validator from `@debrief/components/PropertiesPanel/provenanceTypes` — the path that, after this feature, resolves to the hybrid intersection (`Omit<Generated, 'tool'\|'method'\|'source'> & { tool: typeof SENTINEL; method: \`properties-panel@${string}\`; source: 'user' }`) over the LinkML-generated type. Unchanged test bodies; the migration's behavioural correctness is established by these tests continuing to pass.

### TypeScript — sample-catalog smoke test (T012, new)

| Test | Status |
|------|--------|
| `apps/vscode/tests/unit/sampleCatalog.roundtrip.test.ts` — discovers all 73 sample STAC items under `preview/workspace/samples/local-store/`, parses each one against `StacItem`, validates every `provenance_log` entry against `isValidPropertiesProvenanceEntry`. Result: 1 discovery + 73 parse + 73 provenance-validation = 147 tests | Pass (147/147) |

Lives in `apps/vscode/tests/unit/` rather than `apps/web-shell/`; the web-shell vitest config aliases only the bare `@debrief/components` specifier and barrel-importing pulls in Leaflet (no `window` in Node).

### Workspace typecheck (T009)

| Workspace package | Status |
|---|---|
| `@debrief/schemas` | Pass |
| `@debrief/components` | Pass |
| `@debrief/stac-writer` | Pass |
| `@debrief/utils` | Pass |
| `@debrief/data` | Pass |
| `@debrief/config-ts` | Pass |
| `@debrief/session-state` | Pass |
| `@debrief/web-shell` | Pass |
| `@debrief/spec-navigator` | Pass |
| `@debrief/backlog-navigator` | Pass |
| `@debrief/loader` | Pass |
| `@debrief/nl-demo` | Pass (no-op) |
| `debrief-vscode` (apps/vscode) | Pass — `tsc --noEmit` clean |

`pnpm -r typecheck` covers all packages with a `typecheck` script (12 packages). `apps/vscode` was checked separately via `npx tsc --noEmit` from its directory.

### Repository audit (T008)

| Check | Result |
|---|---|
| Count of `interface PropertiesProvenanceEntry` body declarations across `shared/`, `apps/`, `services/` | 1 — only `shared/schemas/src/generated/typescript/types.ts:1604` (LinkML-generated canonical body) |
| Count of `type PropertiesProvenanceEntry =` aliases | 1 — `shared/components/src/PropertiesPanel/provenanceTypes.ts:22` (hybrid intersection) |
| Count of `export type { PropertiesProvenanceEntry }` re-exports (informational) | 2 — components barrel `src/index.ts:322`, writer `src/interface.ts:48` |

SC-002 cleared (one canonical body); SC-005 cleared (Article II.1 audit reports `PropertiesProvenanceEntry` as resolved).

## Key Scenarios Verified

- **Schema-driven contract for `PropertiesProvenanceEntry`**: any future change to the LinkML class flows into `Generated` (via `@debrief/schemas`), thence into the components-side intersection, thence into all consumers — no hand-edits to writer or components type bodies.
- **Compile-time literal-string narrowing preserved**: the production write sites at `apps/vscode/src/services/stacService.ts:1326` (the `tool: PROPERTIES_PANEL_TOOL_SENTINEL` assignment) and `apps/web-shell/src/services/stacWriterIdb.ts:335` continue to type-check; a typo at either site would still fail tsc.
- **Round-trip on existing items**: every committed STAC item under `preview/workspace/samples/local-store/` parses against the post-migration types and (where applicable) every `provenance_log` entry passes the runtime validator. No on-disk JSON change required (FR-008 / SC-004).
- **Generator determinism**: `python scripts/generate.py` produces byte-identical output across two consecutive runs against the same source. Drift gate (T013) safe to ship without a normalisation pass (SC-007).
- **Drift detection**: a deliberate hand-edit to a generated file, committed on a temp branch, triggers a non-empty `git diff` after fresh regeneration — proving the gate's underlying logic. Live CI walkthrough deferred per implementation-time decision; YAML wiring verified by inspection.
- **Workspace dep edge `@debrief/stac-writer → @debrief/components`**: pnpm-symlinked, type-only via the `./PropertiesPanel/provenanceTypes` subpath, ESLint-policed (`@typescript-eslint/no-restricted-imports` with `allowTypeImports: true`).

## Known Issues

- One pre-existing `UserWarning` in Python round-trip output: `Field name "schema" in "SessionFile" shadows an attribute in parent "ConfiguredBaseModel"`. Unrelated to spec 240; comes from a generated Pydantic class.
- Live CI walkthrough for the drift gate (T016) deferred — see `evidence/drift-gate-evidence.md` for rationale.
- Playwright E2E suites (`apps/web-shell` + `apps/spec-navigator`) **not** run as part of T024. Rationale: this feature has zero UI surface — it touches only TypeScript type declarations, the LinkML build pipeline, a CI workflow YAML, and a `.gitattributes` line. Running the heavy Playwright suites would not exercise any code path this feature changed. The feature PR will inherit the standard CI run on push, which includes Playwright; that's the natural place for those gates. (Cloud-session limitation: `task` itself isn't installed, so `task verify` can't be invoked verbatim; the lint + typecheck + unit-test commands the Taskfile shells out to were run directly.)
- One mechanical follow-on: removed a now-dead runtime check at `apps/vscode/src/services/stacWriterFs.ts:244` (`if (input.provenance.tool !== PROPERTIES_PANEL_TOOL_SENTINEL)`). The hybrid intersection narrows `tool` to the literal at compile time, making the runtime branch provably unreachable; ESLint's `restrict-template-expressions` rule correctly flagged the dead-code template literal. The check was previously a workaround for the writer's old `tool: string` typing — now superseded by the type system. The schema's `^debrief\.propertiesPanel$` pattern continues to guard the on-read path via the runtime validator.

## Environment

- Runner (Python): `uv run pytest` against Python 3.11 + Pydantic v2 + linkml >= 1.7
- Runner (TS): `vitest 1.6.1` (CJS Node API deprecation notice; pre-existing)
- Runner (typecheck): `tsc 5.x` via `pnpm -r typecheck` and `npx tsc --noEmit` for apps/vscode
- Branch: `claude/start-speckit-240-DixZc`
- Date: 2026-05-09
- `task verify` end-to-end: lint (`uv run ruff check .` + `pnpm lint`) green, typecheck (`pnpm -r typecheck` + `npx tsc --noEmit` for vscode) green, unit tests (Python `uv run pytest` 1887 + TS `pnpm -r --filter '!*-shell' --filter '!*-navigator' test` 774) green. Playwright E2E suites skipped as documented under Known Issues.
