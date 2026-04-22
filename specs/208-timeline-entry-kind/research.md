# Phase 0 Research: Kind discriminator for TimelineEntry

**Feature**: 208-timeline-entry-kind
**Date**: 2026-04-22
**Status**: Complete — all NEEDS CLARIFICATION resolved.

## R1 — PROV-side signal: where does `kind` come from?

**Decision**: Add a new **optional** `activity_type` field to the LinkML `LogEntry` class at `shared/schemas/src/linkml/log-entry.yaml`, with a closed enum of values matching the TimelineEntry union: `snapshot`, `tool`, `tune`. Default/unset → the projection layer maps to `'tool'` at runtime.

**Rationale**:
- An explicit schema field is the only source-of-truth that satisfies Article II (schema integrity) and the spec's FR-005 ("MUST derive from an explicit signal, not hard-coded tool-name matching").
- Optional ensures backward compatibility with existing PROV records. Pre-release freedom (Article XIV) allows additive schema evolution without a version bump.
- The enum must be closed so LinkML adherence tests can catch unknown values at ingest, and so TypeScript exhaustiveness checks bite at every consumer switch (SC-004).

**Alternatives considered**:

| Alternative | Why rejected |
|-------------|-------------|
| **Derive from tool-ID match** (e.g. `tool === 'manual-checkpoint'` → kind = 'snapshot') | Recreates the same conflation at a different layer; fails FR-005; requires host updates every time a snapshot-producing tool is added or renamed. |
| **Infer from combinations of existing fields** (e.g. presence of `tune` annotation → kind = 'tune') | Ambiguous and fragile: `tune` annotations are additive on top of existing tool entries (see A3 in spec), so they cannot reliably disambiguate entry kind. Also conflicts with A2 — `'tune'` is reserved; no current entry should emit it. |
| **Add `kind` directly to TimelineEntry without a PROV signal** (populate via heuristic) | Punts the PROV-side problem; re-entrenches the visual-category-as-semantic-proxy pattern the feature is trying to remove. Short-term relief only. |
| **Merge `FileProvEntry` (system-record file-level provenance with `type: 'snapshot' \| 'branch'`) into the timeline** | Broader scope: requires changing `assembleTimeline` to merge two heterogeneous streams, deduplication semantics, ordering against LogEntry timestamps, and UI handling of non-LogEntry-shaped records. Out of scope for a discriminator refactor — would balloon into a "make timeline show file-level events too" feature. Worth doing later, but orthogonal. |

**Resolved risks**:
- **Schema generator breakage** — all three generators (`gen-pydantic`, `gen-typescript`, `gen-json-schema`) handle optional LinkML `enum` slots today; verified in recent LinkML-based features (#205, #215). No new generator features required.
- **Runtime validation at PROV ingestion** — Pydantic generated from the schema will accept `activity_type` absent (optional) and reject unknown values (closed enum). Matches the desired fallback + exhaustiveness contract.

## R2 — Should current export-tool entries flip from `isSnapshot=true` to `isSnapshot=false` after the migration?

**Decision**: **Yes** — this is the correct behaviour, and the migration fixes a latent visual-vs-semantic bug.

**Rationale**:
- Today, export tools (`export-png`, `export-csv`, `export-geojson`) are categorised visually as `'snapshot'` in `TOOL_ID_TO_CATEGORY` (`shared/components/src/LogPanel/toolCategories.ts`). This causes the `LogEntry.tsx` render path (lines 200–212) to hide `execution_duration` and replace the parameter-chip row with the *"manual checkpoint"* placeholder text for export entries.
- Export entries are not manual checkpoints. Substituting "manual checkpoint" placeholder text on an export-PNG card is a genuine (if subtle) misrepresentation — a visible artifact of the conflation the spec calls out.
- After the migration, export-PNG entries have `kind: 'tool'` (schema `activity_type` is absent → fallback `'tool'` per FR-006), so `isSnapshot` becomes `false`: duration is shown and the correct chip/placeholder path runs.
- SC-003 says "no visible regressions" in **Storybook stories and web-shell flows**. The Storybook stories were written against the current buggy behaviour. Plan verifies each affected story individually; if a story is *asserting* the buggy placeholder, that assertion is updated (and the story's fixture data is updated to use `kind: 'snapshot'` if it is meant to exercise manual-checkpoint rendering).

**Alternatives considered**:

| Alternative | Why rejected |
|-------------|-------------|
| **Migrate the `ToolCategory === 'snapshot'` check but keep exports flagged as `kind: 'snapshot'`** (e.g. project `kind = 'snapshot'` for entries whose tool is in an export allowlist) | Re-adds tool-name matching in the projection layer, which FR-005 forbids. Also would be semantically wrong — exports are tool invocations, not checkpoints. |
| **Keep the check as visual-category-based and narrow `kind` to only future entries** | Leaves the existing conflation in place and defeats P1. The feature would be cosmetic. |

**Resolved risks**:
- **Storybook regression false positives** — Plan's task list includes a pre-migration snapshot-compare of the three affected stories (`Snapshot` example story if present, plus any export-tool story) against current baseline, followed by a deliberate rebaseline during the migration commit. This makes the intentional behaviour change visible in review rather than silent.

## R3 — Scope of `kind` values today: does the feature emit `'snapshot'` or `'tune'`?

**Decision**: **Neither is emitted today.** Every LogEntry the existing PROV pipeline produces has `activity_type` absent → projection maps to `kind: 'tool'`. `'snapshot'` and `'tune'` are declared in the union (for future features to slot into without another migration) but no code path sets them.

**Rationale**:
- Today's snapshot creation path (`services/session-state/src/log/snapshotService.ts`) does **not** append to feature-level `properties.provenance`; it only writes a `FileProvEntry` onto the system record. That flow produces no LogEntry, so no LogEntry needs `activity_type: 'snapshot'`.
- Tune annotations are attached to existing tool entries via the `tune` field; they do not produce a separate LogEntry record (see spec A3).
- Future features that add standalone snapshot/tune entries will set `activity_type` at the point of emission. Feature 208 is groundwork for them, not an implementation of them.

**Consequence for testing**:
- Current sample-catalogue fixtures will all yield `kind: 'tool'`. That is the assertion covered by SC-002 (100% of projected TimelineEntries carry a non-null kind).
- To exercise `kind: 'snapshot'` end-to-end, the unit test for `toTimelineEntry` synthesises a LogEntry with `activity_type: 'snapshot'` set. This pattern is used today in other projection tests.

## R4 — Migration scope: which call sites are "semantic gates" vs "rendering"?

**Decision**: The only *semantic* gate in the current codebase is `LogEntry.tsx:114`:

```ts
const isSnapshot = resolveToolCategory(entry.toolName).category === 'snapshot';
```

Its two consumers (lines 200 and 209) select between:
- showing vs hiding `execution_duration` (line 200), and
- showing the "manual checkpoint" placeholder vs the parameter-chip row (line 209).

Both decisions are tied to "is this entry a manual checkpoint?" — semantic, not rendering. Migrated to `entry.kind === 'snapshot'`.

**All other uses of the string `'snapshot'` fall into one of**:
- **Rendering** — `TOOL_CATEGORY_CONFIGS['snapshot']` (colour/glyph), `resolveToolCategory` lookup from within `ToolCategoryIcon` — left unchanged (per FR-008).
- **Unrelated domains** — STAC asset roles (`apps/vscode/src/services/stacService.ts`), `FileProvEntry.type` field (`services/session-state/src/log/types.ts`), branch-service `'snapshot-boundary'` location type (`branchService.ts`). These are separate concerns and are not in scope.
- **Test fixtures and historical spec artefacts** (`specs/176-log-panel-ux/contracts/log-panel-types.ts`, `specs/074-snapshots/contracts/snapshot-types.ts`) — frozen historical artefacts, not touched.

**Evidence** (from grep across the tree):
- 21 files mention `'snapshot'`. Of those, exactly 1 file (`shared/components/src/LogPanel/LogEntry.tsx`) uses the visual-category comparison as a semantic gate.
- SC-005 ("host projection does not reference any tool-ID string literal as part of kind classification") is trivially satisfied because the projection reads `entry.activity_type` directly, not any tool name.

## R5 — Test strategy

**Decision**: Three layers, no new harnesses.

1. **LinkML schema adherence** — existing adherence tests (golden fixtures, round-trip, structural comparison under `shared/schemas/`) regenerate and run. New test fixtures added for LogEntry with/without `activity_type`.
2. **TypeScript unit tests** (vitest) —
   - `apps/vscode/src/views/__tests__/logPanelView.test.ts` (new or extended) asserts that `toTimelineEntry` returns `kind: 'tool'` when `activity_type` is absent and `kind: 'snapshot'` when present.
   - `shared/components/src/LogPanel/__tests__/LogEntry.test.tsx` extended with one test asserting the rendered output switches on `entry.kind`, not on `toolName` category.
   - A deliberate-regression unit test (SC-004) introduces a hypothetical fourth kind value and asserts TypeScript exhaustiveness errors. Implementation: a `// @ts-expect-error` on an intentionally non-exhaustive switch proves the compiler flags it.
3. **Storybook + web-shell + code-server E2E** — existing suites re-run. Any visible behaviour change (per R2) is either expected (export entries no longer show the "manual checkpoint" placeholder) and baseline is updated with review attention, or a real regression and the migration is adjusted.

**Alternatives considered**: Adding dedicated Playwright E2E coverage — rejected because the change is internal; existing Storybook coverage is sufficient for regression and keeps the test matrix lean.

## R6 — Ordering of commits for atomic review (Article XIII)

**Decision**: Three commits, in this order, each independently buildable:

1. **Schema + regeneration** — `log-entry.yaml` edit + generated Pydantic + TypeScript + JSON Schema regen + LinkML adherence fixtures. Builds & adherence tests pass after this commit even though no consumer reads the new field yet.
2. **TimelineEntry type + projection + projection tests** — `types.ts` adds `TimelineEntryKind` and the `kind?` field; `logPanelView.ts` populates it with fallback; new unit tests. Builds & tests pass; `LogEntry.tsx` still uses the old visual-category check so rendered output is unchanged.
3. **Consumer migration + updated Storybook baselines** — `LogEntry.tsx` switches to `entry.kind === 'snapshot'`; affected Storybook stories rebaselined with review note; existing LogPanel tests updated. Builds & tests pass; rendered output changes for export-tool entries (per R2).

**Rationale**: Each commit is independently reviewable. If commit 3 needs to be reverted, commits 1 and 2 remain valid and useful (the field exists and is populated but not yet consumed). This keeps blast radius small per Article XIII.

## Summary of resolved unknowns

| NEEDS CLARIFICATION | Resolution |
|---------------------|-----------|
| PROV-side signal source | New optional `activity_type` enum field on LogEntry LinkML schema (R1). |
| Fallback when signal absent | Projection maps to `kind: 'tool'` (R1). |
| Visible behaviour change for export entries | Intentional, covered by rebaselined Storybook (R2). |
| Migration scope | One semantic-gate call site in `LogEntry.tsx`; all other `'snapshot'` occurrences are rendering or unrelated domains (R4). |
| Exhaustiveness enforcement | Closed TS union + `@ts-expect-error` regression test (R5). |
| Commit ordering for review | Three atomic commits: schema → projection → consumer (R6). |

All clarifications resolved. Ready for Phase 1.
