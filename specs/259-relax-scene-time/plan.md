# Implementation Plan: Relax Scene Timestamp Uniqueness

**Branch**: `259-relax-scene-time` | **Date**: 2026-05-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/259-relax-scene-time/spec.md`

## Summary

Drop the within-Storyboard uniqueness constraint on `SceneProperties.timestamp`. Add a new required integer field `creation_order` to `SceneProperties` that is assigned monotonically per Storyboard at capture time and serves as the secondary sort key when two Scenes share a timestamp. Update the single sort path (`ordering.ts`) to use `(timestamp, creation_order)`. Strip the five `DuplicateTimestampError` throw-sites in `crud.ts` and the matching invariant in `validate.ts`. Add a dedicated reorder operation in CRUD for moving a Scene within a tied-timestamp group. **No legacy backfill** — plots produced before this change are rejected at the validator with an explicit `MissingCreationOrderError`. Article XIV (pre-4.0 freedom) authorises the hard break: no shipped user data exists, so a migration shim would be carrying complexity for a hypothetical. No new dependencies; no new visual components; UI affordance for manual reorder is deferred to a follow-up.

## Technical Context

**Language/Version**: TypeScript 5.x (strict — `shared/components/`, `apps/vscode/`, `apps/web-shell/`); Python 3.11 (LinkML schema authoring + Pydantic generation only — no runtime Python change)
**Primary Dependencies**: LinkML ≥ 1.7.0 (schema source), Pydantic v2 (generated models), `@debrief/schemas` (generated TS types), `@debrief/components` (storyboard CRUD module — touched), VS Code Extension API ^1.85.0 (read-only — `storyboardPanelView`, `storyboardPlayback`)
**Storage**: STAC Items on disk (existing `stac-writer`); no storage-layer change
**Testing**: Vitest (`shared/components/__tests__/`), pytest (schema fixtures), Playwright (`apps/web-shell/playwright/` — one new workflow test)
**Target Platform**: VS Code extension host + web-shell (browser); both via the shared `@debrief/components` storyboard module
**Project Type**: Monorepo workspace — schema-first, thick services (none touched), thin frontends (touched read paths only)
**Performance Goals**: No change to current Storyboard panel render latency (≤ 100 Scenes). Sort key expands from a single ISO-8601 compare to a tuple compare — negligible.
**Constraints**: Article XV (strict types — `creation_order` is `int`, not `Optional[int]` in the schema; the optional handling only exists in the reader's backfill path); Article II (schema-first — the field lives in LinkML, types are regenerated); Article XIV (pre-4.0, breaking schema change permitted without migration ceremony, but FR-010 still requires zero behavioural regression on legacy plots)
**Scale/Scope**: ~6 TypeScript files touched, 1 LinkML cluster, 1 invalid fixture retired + 2 valid fixtures added, ~12 unit tests rewritten/added, 1 Playwright workflow test added. No public-API breakage outside the storyboard module.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Clause | Verdict | Notes |
|---------|--------|---------|-------|
| I. Defence-Grade Reliability | Offline by default; no silent failures | ✅ Pass | Pure in-memory transformation; explicit error on out-of-range `creation_order` (defensive only — should never fire in normal flow) |
| II. Schema Integrity | Single source of truth (LinkML) | ✅ Pass | `creation_order` added to LinkML; Pydantic + TS regenerate. Schema fixtures updated. |
| II.3 | Breaking changes require version bump + migration | ✅ Pass (under XIV) | Article XIV grants pre-4.0 freedom. No migration path is provided — pre-change plots are explicitly rejected (FR-010). No shipped user data exists; the hard break is the cheapest correct choice. |
| III. Data Sovereignty | Provenance, source preservation | ✅ Pass | No provenance change; pre-change plots are not modified by the system at all (load fails fast). |
| IV. Architectural Boundaries | Services never touch UI; frontends never persist | ✅ Pass | Storyboard CRUD is a pure transformation module in `shared/components/`, not a frontend persistence path. Writes still flow through `stac-writer`. |
| V. Extensibility | Schema compliance for extensions | ✅ Pass | No extension surface change. |
| VI. Testing | Tests mandatory | ✅ Pass | Tests updated and added in lockstep. CI gates unchanged. |
| VII. Test-Driven AI Collaboration | Tests define done | ✅ Pass | Test list in `tasks.md` (Phase 2) is the AC; spec FR-001..FR-012 map 1:1 to tests. |
| VIII. Documentation | Specs before code | ✅ Pass | Spec exists. ADR-XXX (this feature) records the equality-tie decision. |
| IX. Dependencies | Minimal, vetted | ✅ Pass | Zero new dependencies. |
| X. Security | No secrets, no network assumptions | ✅ Pass | N/A. |
| XI. Internationalisation | Externalisable strings | ✅ Pass | One new error message (still in en-GB string table; no new visible UI). |
| XII. Community Engagement | Public by default | ✅ Pass | Spec + PR follow standard flow. |
| XIII. Contribution Standards | Atomic commits, PR review, CI green | ✅ Pass | Will commit in three atomic steps (schema; CRUD+ordering; tests+fixtures). |
| XIV. Pre-Release Freedom | Breaking changes permitted pre-4.0 | ✅ Used | Schema change is breaking on the wire; XIV authorises it and the hard-fail on legacy plots. |
| XV. Strict Type Safety | No `any`/`Any`; strict mode | ✅ Pass | `creation_order: int` is required in the LinkML schema. No `Optional[int]` or `\| undefined` exists anywhere in the typed surface. |

**Result**: All articles pass. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/259-relax-scene-time/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature spec (already written)
├── checklists/
│   └── requirements.md  # Spec-quality checklist (already passing)
├── research.md          # Phase 0 output (this command)
├── data-model.md        # Phase 1 output (this command)
├── quickstart.md        # Phase 1 output (this command)
├── contracts/           # Phase 1 output (this command)
│   └── storyboard-crud.md  # CRUD operation contracts (TS interface + acceptance tests)
├── evidence/
│   └── opening-context.md  # Cached blog opener (this command — Phase 2)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
shared/schemas/
├── src/linkml/
│   └── storyboard.yaml            # MODIFY — drop uniqueness comment on SceneProperties.timestamp;
│                                  #   add creation_order: integer (required, minimum 0)
├── src/generated/python/debrief_schemas/  # REGENERATE
├── src/generated/typescript/types.ts      # REGENERATE
└── src/fixtures/
    ├── valid/
    │   ├── storyboard-tied-timestamps.json       # NEW — 3 Scenes at same timestamp, distinct creation_order
    │   └── storyboard-mixed-tied.json            # NEW — mix of unique + tied timestamps
    └── invalid/
        ├── storyboard-scene-duplicate-timestamp.json       # DELETE (no longer invalid)
        ├── storyboard-scene-duplicate-creation-order.json  # NEW — invariant FC-I4 violation
        └── storyboard-scene-missing-creation-order.json    # NEW — pre-#259 shape; invariant FC-I5 violation

shared/components/src/storyboard/
├── crud.ts            # MODIFY — remove all 5 DuplicateTimestamp throw-sites;
│                      #   add nextCreationOrder() helper;
│                      #   add reorderSceneInTiedGroup() operation
├── ordering.ts        # MODIFY — extend sort key from (timestamp) to (timestamp, creation_order);
│                      #   update SC-I1 comment
├── validate.ts        # MODIFY — drop FC-I3 (duplicate-timestamp);
│                      #   add FC-I4 (duplicate creation_order);
│                      #   add FC-I5 (every Scene MUST carry creation_order;
│                      #   throws MissingCreationOrderError on any pre-#259 plot)
├── errors.ts          # MODIFY — delete DuplicateTimestampError;
│                      #   add DuplicateCreationOrderError;
│                      #   add CreationOrderOutOfRangeError (reorder bounds);
│                      #   add MissingCreationOrderError (hard-fail on pre-#259 plots)
├── index.ts           # MODIFY — update exports (drop DuplicateTimestamp; add three new errors + reorder op)
└── __tests__/
    ├── crud.test.ts             # MODIFY — invert duplicate-timestamp tests into acceptance tests
    ├── ordering.test.ts         # MODIFY — add tied-group ordering cases
    ├── validate.test.ts         # MODIFY — replace duplicate-timestamp test with duplicate-creation-order;
    │                            #   add missing-creation-order test (loads a pre-#259 fixture → throws)
    └── reorder.test.ts          # NEW — reorder operation + delete + edit do not reshuffle

apps/vscode/src/
├── views/storyboardPanelView.ts        # MODIFY — replace `.sort(by timestamp)` with `listScenesOrdered()`
└── services/storyboardPlayback.ts      # MODIFY — replace `.sort(by timestamp)` with `listScenesOrdered()`

apps/web-shell/playwright/tests/
└── storyboard-tied-timestamps.spec.ts  # NEW — capture three Scenes at same timestamp, verify all three appear in panel in capture order
```

**Structure Decision**: Schema-first monorepo workspace. Change ripples outward from `shared/schemas/src/linkml/storyboard.yaml` → regenerated Python + TS types → `shared/components/src/storyboard/` (the only consumer of the changed semantics) → two `apps/vscode/` read sites that should already be using the canonical `listScenesOrdered()` helper (and after this change MUST be). No service-side change; no `services/*` directory touched.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|

None — this is a data-model + CRUD-semantics change. No new visual component is introduced. The user-visible behaviour (multiple Scenes at the same timestamp now accepted) surfaces through the existing Storyboard panel and the existing thumbnail strip, both unchanged structurally. The eventual blog post will use a short before/after capture flow rather than a Storybook demo.

**Inclusion Criteria Applied**:
- [ ] New visual component
- [ ] Significant visual change
- [ ] Interactive demo adds narrative value

**Bundleability Verified**: N/A.

## Storybook E2E Testing

None — no interactive UI components added or changed.

## Web-Shell E2E Testing

| Workflow | Panels/Components Involved | Key Selectors | Interactions |
|----------|---------------------------|---------------|--------------|
| Capture three Scenes at the same timestamp | MapView, StoryboardPanel | `.leaflet-container`, `[data-testid="storyboard-panel"]`, `[data-testid="scene-row"]` | open plot → freeze time controller → capture Scene → pan viewport → capture Scene → pan again → capture Scene → assert three rows in capture order |

**Testing Strategy**:
- [x] Workflow runs end-to-end in the web-shell
- [x] Page objects in `apps/web-shell/playwright/pages/` extended (`StoryboardPanelPage` — new helper for scene-row enumeration)
- [x] Screenshot of final panel state captured into `specs/259-relax-scene-time/evidence/screenshots/tied-timestamps.png` (PR-ready evidence)

**Test File Location**: `apps/web-shell/playwright/tests/storyboard-tied-timestamps.spec.ts`

**Run Commands**:
- Cloud: `cd apps/web-shell && node run-playwright.mjs storyboard-tied-timestamps`
- Local: `pnpm --filter @debrief/web-shell test storyboard-tied-timestamps`

## Complexity Tracking

> No Constitution Check violations. Section intentionally empty.
