# Phase 0 Research: Timeline Entry `kind` Discriminator

**Feature**: 208-timeline-entry-kind
**Date**: 2026-04-22

## Purpose

Resolve any remaining unknowns from Technical Context, lock the interim-populator decision, and confirm that no existing code paths conflict with the discriminator's introduction.

## Unknowns at start of Phase 0

None declared as `NEEDS CLARIFICATION` in the plan. The open decisions inherited from spec phase were:

1. Exact call-site to replace for snapshot detection.
2. Whether `TimelineEntry` is a schema-derived type (would require LinkML edit) or a UI-only projection (type-file edit suffices).
3. Where in `toTimelineEntry` the discriminator should be computed.
4. How to express exhaustiveness so new `kind` values force a type-check failure at every enumerating site (FR-009).
5. Whether `'tune'` has any existing producer that would need updating now.
6. Whether the coexistence with #207 (tool manifest lookup) creates any real conflict.

Each is resolved below.

## R1: Snapshot-detection call site

### Decision

The single call site to replace is `shared/components/src/LogPanel/LogEntry.tsx:114`:

```ts
const isSnapshot = resolveToolCategory(entry.toolName).category === 'snapshot';
```

After the change, this becomes:

```ts
const isSnapshot = entry.kind === 'snapshot'
  ?? resolveToolCategory(entry.toolName).category === 'snapshot';
// The `??` fallback guards test fixtures that construct a TimelineEntry
// without the host populator (where `kind` is absent by design).
```

(Exact syntax chosen at implementation time — `??` requires a boolean on the left; the logically equivalent expanded form is `entry.kind === 'snapshot' || (entry.kind === undefined && resolveToolCategory(entry.toolName).category === 'snapshot')`.)

### Rationale

- A repository-wide grep (`grep -rn "ToolCategory.*snapshot\|'snapshot'"`) surfaces four classes of match:
  1. `LogEntry.tsx:114` — the semantic snapshot detection (the target).
  2. `LogActionBar.tsx:20` — the action-bar *button* labelled "Snapshot". This concerns user-initiated snapshot actions, not entry semantics. Out of scope.
  3. `toolCategories.ts:20,54-56` — the `TOOL_ID_TO_CATEGORY` map entries (`export-png`, `export-csv`, `export-geojson` → `'snapshot'`). These remain the source of truth for the interim populator. Out of scope.
  4. `logPanelView.ts:375,598,606,616,626` — all references to the `actionType === 'snapshot'` string used in webview↔host message passing for the action-bar button. Out of scope (same reason as #2).
- Only the `LogEntry.tsx:114` occurrence converts a `TimelineEntry` into a semantic decision. It is the one to swap.

### Alternatives considered

- **Replace every `'snapshot'` reference** — rejected. The action-bar button and the message-passing `actionType` legitimately use the string; they are not the semantics-vs-category conflation the spec is fixing.
- **Leave `LogEntry.tsx` alone and only add the field** — rejected. SC-003 explicitly requires zero remaining references to `ToolCategory === 'snapshot'` in LogPanel rendering code for entry-semantics purposes. Leaving the existing check in place violates that.

## R2: Is `TimelineEntry` a schema type?

### Decision

**`TimelineEntry` is a UI-only projection.** No LinkML edit, no schema regeneration, no `@debrief/schemas` release.

### Rationale

- `types.ts:66-71` carries an explicit comment: `"T023: TimelineEntry is a UI projection, not a schema type. It carries display-oriented fields (operationCategory, deleted, tuneAnnotation) that are not present in the schema LogEntry. Kept as a local UI type."`
- The existing fields `operationCategory`, `rationale`, and `tuneAnnotation` are not present on the schema `LogEntry` input; they are computed by `toTimelineEntry` in the host. The same latitude applies to `kind`.
- Article II (Schema Integrity) applies to data that crosses schema boundaries — `TimelineEntry` is a UI projection internal to the LogPanel component and its host. The host emits it; the webview consumes it; it is never persisted.

### Alternatives considered

- **Define `kind` in LinkML and regenerate** — rejected. Over-engineered for a UI-only discriminator with no persistence footprint. Would also force `ToolCategory`-to-`kind` mapping at schema level, which is a future-PROV-signal concern, not an immediate one.

## R3: Where to compute `kind` in `toTimelineEntry`

### Decision

Compute `kind` inside `toTimelineEntry` at `apps/vscode/src/views/logPanelView.ts:73-92`, at the end of the returned object literal. Import `resolveToolCategory` from `@debrief/components` (re-exported from the LogPanel entry point) — or, if that import path is not already open to the host, duplicate the interim mapping via a local decision table that reads `TOOL_ID_TO_CATEGORY` directly.

Preferred form:

```ts
import { resolveToolCategory } from '@debrief/components';

function toTimelineEntry(entry: LogEntry): TimelineEntry {
  const toolName = entry.was_generated_by.tool;
  const category = resolveToolCategory(toolName).category;
  const kind: TimelineEntryKind = category === 'snapshot' ? 'snapshot' : 'tool';

  return {
    activity_id: entry.activity_id,
    // ... existing fields ...
    kind,
  };
}
```

### Rationale

- Colocates the populator decision with the projection — the single, obvious point of extension when the PROV-side signal arrives (SC-005, ≤ 10 lines).
- Reuses the same `resolveToolCategory` function that today drives the UI-side check, so "before" and "after" behaviour is provably identical by construction (no risk of drift).
- Honours the #207 coexistence (R6): whatever `resolveToolCategory` returns — whether sourced from today's static map or tomorrow's manifest lookup — feeds unchanged into the `kind` decision.

### Alternatives considered

- **Computed inside `LogEntry.tsx` at render time** — rejected. That keeps the computation in the renderer and defeats the purpose of the discriminator (renderer stays a pure consumer of semantics, not a producer). Also violates the host-computes / webview-renders boundary (Article IV).
- **Computed at the LogService boundary** — rejected. `LogService` lives in `@debrief/session-state` and currently deals in schema `LogEntry`, not UI projections. Mixing UI-projection concerns into the service layer is an Article IV violation.

## R4: Exhaustiveness helper

### Decision

Add two small artefacts in `types.ts`, adjacent to the `TimelineEntry` interface:

```ts
/** Discriminator for the semantic kind of timeline entry. */
export type TimelineEntryKind = 'snapshot' | 'tool' | 'tune';

/** All values of TimelineEntryKind, for runtime enumeration and test fixtures. */
export const TIMELINE_ENTRY_KINDS: readonly TimelineEntryKind[] = [
  'snapshot',
  'tool',
  'tune',
] as const;

/**
 * Exhaustiveness guard. Call at the default branch of a switch/if-chain that
 * enumerates TimelineEntryKind values. Adding a new kind without handling it
 * surfaces as a type-check failure here.
 */
export function assertNeverKind(value: never): never {
  throw new Error(`Unhandled TimelineEntryKind: ${String(value)}`);
}
```

Then add `kind?: TimelineEntryKind` to the `TimelineEntry` interface.

### Rationale

- `TIMELINE_ENTRY_KINDS` gives test code and documentation a single source of valid values without re-typing the union.
- `assertNeverKind` is the canonical TypeScript pattern for exhaustiveness checking (Anders Hejlsberg recommended; ubiquitous across large TS codebases). It does not execute at production call sites today (no switch enumerates `kind` yet) but is pre-provided so every future consumer has a zero-friction way to satisfy FR-009.
- The `as const` on the array preserves literal typing so downstream `for-of` or `.includes` calls remain fully typed.

### Alternatives considered

- **TypeScript `enum`** — rejected. Constitution XV and project convention prefer string-literal unions; enums produce runtime artefacts that string-literals do not, and the reverse-mapping quirks of numeric enums can leak `any`.
- **Branded types / nominal typing** — rejected. Overkill for a three-value discriminator.
- **Skip the helper** — rejected. FR-009 is explicit that new `kind` values must force type-check failures at every enumerating site; providing the helper upfront is cheap insurance.

## R5: Any existing producer of `'tune'`?

### Decision

**No existing producer.** `'tune'` is reserved in this feature and emitted by no populator.

### Rationale

- Repo-wide search for candidate tune producers:
  - `grep -rn "tuneAnnotation" apps/ shared/ services/` — `tuneAnnotation` is populated in `toTimelineEntry` at line 88 (from `entry.tune`), but it is a *payload* field carrying parameter-change metadata, not a *classification* that would imply `kind: 'tune'`. A tool invocation that happened to be a tune *adjustment* would still be an ordinary tool entry in today's semantics. Until the PROV-side signal explicitly flags an entry as "this is a tune marker in its own right" (a future feature), no entry should be classified `kind: 'tune'`.
- Conclusion: the interim populator's two-line decision table (`category === 'snapshot'` → `'snapshot'`, otherwise → `'tool'`) is complete and correct.

### Alternatives considered

- **Set `kind: 'tune'` when `tuneAnnotation` is non-null** — rejected. Conflates "this tool invocation adjusted a parameter" (today's tuneAnnotation semantics) with "this entry IS a tune marker" (a future-PROV-signal concept, likely a distinct entry shape entirely). Would pre-empt the PROV team's design.

## R6: Coexistence with #207 (tool manifest lookup)

### Decision

**No conflict.** `#208` consumes whatever `resolveToolCategory` produces. `#207` changes *how* that function resolves categories (from today's static `TOOL_ID_TO_CATEGORY` map to a manifest lookup) but preserves its signature and semantics. The interim `category === 'snapshot'` → `kind: 'snapshot'` mapping holds under either resolution source.

### Rationale

- `#207`'s scope (from BACKLOG.md): "replace the static `TOOL_ID_TO_CATEGORY` map in `shared/components/src/LogPanel/toolCategories.ts` with a lookup against a tool manifest." The function signature of `resolveToolCategory` does not change; only its internal data source does.
- If both features are in flight in parallel worktrees, expected merge footprint in the overlap file (`logPanelView.ts`) is minimal: #208 adds a `kind` computation to `toTimelineEntry`; #207 may add a manifest-loading hook in or near the same function. The merge is a trivial ordering of two independent statements.
- If sequenced, #207 before #208 is marginally cleaner (fewer churned lines in `toolCategories.ts`, since #207 may add new entries that #208 then implicitly covers via its one-line mapping), but neither order blocks the other.

### Alternatives considered

- **Block #208 on #207** — rejected. Neither feature depends on the other. Gating on a moving target delays cleanup of feature-176 decision 2A unnecessarily.
- **Absorb #207 into #208** — rejected. #207 is a Medium-complexity feature with its own manifest-schema questions; #208 is a Low-complexity discriminator introduction. Conflating them harms both scopes.

## Summary of resolved decisions

| ID | Decision | Impact on implementation |
|----|----------|--------------------------|
| R1 | Single call site: `LogEntry.tsx:114` | One-line swap + fallback expression |
| R2 | `TimelineEntry` is a UI projection | No schema edit, no regeneration |
| R3 | `kind` computed in `toTimelineEntry` | Populator owns the decision |
| R4 | String-literal union + `TIMELINE_ENTRY_KINDS` + `assertNeverKind` | Three additions to `types.ts` |
| R5 | No producer of `'tune'` in this feature | Decision table is two rows |
| R6 | #207 coexistence is merge-only | No sequencing lock |

All Technical Context unknowns are resolved. No `NEEDS CLARIFICATION` markers introduced.
