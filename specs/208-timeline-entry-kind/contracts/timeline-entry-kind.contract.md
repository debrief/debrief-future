# Contract: TimelineEntry `kind` Discriminator

**Feature**: 208-timeline-entry-kind
**Contract type**: TypeScript type signatures (not an HTTP/GraphQL/MCP contract)
**Applies to**: `shared/components/src/LogPanel/types.ts`, `apps/vscode/src/views/logPanelView.ts`, `shared/components/src/LogPanel/LogEntry.tsx`

## Why a type contract (not an API contract)

This feature adds a discriminator to a UI projection type that is serialised only across the VS Code host→webview `postMessage` boundary via structured clone. There is no REST endpoint, GraphQL schema, or MCP tool signature to describe. The "contract" is therefore the TypeScript type signatures that every producer and consumer must satisfy. The typechecker is the contract-test.

## Module: `@debrief/components` — LogPanel types

**File**: `shared/components/src/LogPanel/types.ts`

### New exports

```ts
/**
 * Discriminator for the semantic kind of timeline entry.
 *
 * - 'snapshot': a distinguished moment in the session.
 * - 'tool':     an ordinary tool invocation.
 * - 'tune':     reserved for future tune-marker entries; not emitted by any
 *               populator in feature 208. Lands with a future PROV-side signal.
 */
export type TimelineEntryKind = 'snapshot' | 'tool' | 'tune';

/**
 * All values of TimelineEntryKind, for runtime enumeration (tests, fixtures,
 * documentation). Literal-typed via `as const` so callers can rely on element
 * types narrowing to the union.
 */
export const TIMELINE_ENTRY_KINDS: readonly TimelineEntryKind[];

/**
 * Exhaustiveness guard. Call at the default branch of a switch/if-chain that
 * enumerates TimelineEntryKind values. Adding a new kind without handling it
 * surfaces as a type-check failure at this site.
 *
 * @throws Error at runtime if reached (which should be impossible under a
 *   fully-covered discriminator switch).
 */
export function assertNeverKind(value: never): never;
```

### Modified export

```ts
export interface TimelineEntry {
  // ... all fields as they exist today (unchanged) ...

  /**
   * Semantic classification of this entry, independent of its visual category.
   * Populated by the VS Code host on every emitted entry. Optional because
   * test fixtures may bypass the host populator.
   */
  kind?: TimelineEntryKind;
}
```

### Behavioural contract

- **Immutability**: `TimelineEntryKind` values are compile-time literals; they do not mutate.
- **Runtime enumeration**: the length of `TIMELINE_ENTRY_KINDS` equals the arity of the `TimelineEntryKind` union. Adding a value to the union requires adding it to the array.
- **Exhaustiveness**: `assertNeverKind` is a TypeScript `never`-narrowing guard. Its parameter type MUST remain `value: never` — widening to `value: TimelineEntryKind` or `value: string` defeats the guarantee.

## Module: `apps/vscode` — LogPanel view host

**File**: `apps/vscode/src/views/logPanelView.ts`

### Modified function

```ts
/**
 * Convert a LogEntry from the log service to a display-oriented TimelineEntry.
 *
 * Populates `kind` via the interim decision table:
 *   - resolveToolCategory(toolName).category === 'snapshot' → 'snapshot'
 *   - otherwise → 'tool'
 *
 * `'tune'` is not emitted in feature 208. When the PROV-side signal arrives,
 * this decision table is extended here (SC-005: keep it ≤ 10 lines and
 * co-located with the rest of toTimelineEntry).
 */
function toTimelineEntry(entry: LogEntry): TimelineEntry;
```

### Behavioural contract

- For every input `LogEntry`, the returned `TimelineEntry` MUST have a defined `kind` field drawn from `TIMELINE_ENTRY_KINDS`.
- The mapping MUST be stable: the same input (same `toolName`, same `resolveToolCategory` result) MUST produce the same `kind` on every call. No randomness, no time-dependence, no hidden state.
- The host MUST NOT emit `'tune'`. (Verified in a unit test: for a representative input corpus, no output has `kind === 'tune'`.)

### Test expectations

Location: `apps/vscode/src/views/__tests__/logPanelView.test.ts` (new file if absent; otherwise add a `describe('toTimelineEntry kind discriminator')` block).

1. **Snapshot mapping**: given a `LogEntry` whose `was_generated_by.tool` is `'export-png'` (or any id in `toolCategories.ts` mapped to `'snapshot'`), the returned `TimelineEntry.kind === 'snapshot'`.
2. **Tool mapping**: given a `LogEntry` whose `was_generated_by.tool` is a non-snapshot tool id (for example `'bearing-between-tracks'`), the returned `TimelineEntry.kind === 'tool'`.
3. **Tool mapping (no category)**: given a `LogEntry` whose `was_generated_by.tool` is unmapped in `TOOL_ID_TO_CATEGORY` (falls into the neutral-grey fallback), the returned `TimelineEntry.kind === 'tool'`.
4. **`'tune'` is not emitted**: given a fixture `LogEntry` with a non-null `entry.tune` field, the returned `TimelineEntry.kind === 'tool'` (NOT `'tune'`) — confirms that `tuneAnnotation`-carrying entries do not short-circuit to `'tune'` in this feature.
5. **Stability**: calling `toTimelineEntry` twice on the same input yields objects with identical `kind`.

## Module: `@debrief/components` — LogPanel renderer

**File**: `shared/components/src/LogPanel/LogEntry.tsx`

### Modified call site (line 114, per R1)

```ts
// Before (today's code):
const isSnapshot = resolveToolCategory(entry.toolName).category === 'snapshot';

// After:
const isSnapshot =
  entry.kind === 'snapshot' ||
  (entry.kind === undefined &&
    resolveToolCategory(entry.toolName).category === 'snapshot');
```

### Behavioural contract

- **Primary path**: when `entry.kind` is defined, the snapshot decision is derived from `entry.kind === 'snapshot'` alone.
- **Fallback path** (test fixtures, legacy code paths that construct `TimelineEntry` without the host populator): when `entry.kind` is `undefined`, fall back to the legacy category check. This preserves existing tests that construct a `TimelineEntry` by spreading a partial object and never set `kind`.
- **Unknown `kind` handling**: if `entry.kind` is a value outside the declared union (a scenario TypeScript will normally reject, but which may arise if a future populator emits a value before the union is widened), the first disjunct short-circuits to `false` (since `entry.kind !== 'snapshot'`) and the second disjunct also short-circuits to `false` (since `entry.kind !== undefined`). Result: `isSnapshot === false` → tool-row fallback. Consistent with FR-007.

### Test expectations

Location: `shared/components/src/LogPanel/__tests__/LogEntry.test.tsx` (extend existing file).

1. **Snapshot via `kind`**: render a `TimelineEntry` with `kind: 'snapshot'` (and any `toolName`). Assert the snapshot presentation (whatever feature-176 Decision 2A specified as the snapshot-row DOM signature, for example a `data-kind="snapshot"` attribute or the existing snapshot-specific class name on the entry).
2. **Tool via `kind`**: render a `TimelineEntry` with `kind: 'tool'`. Assert ordinary-tool-row presentation; assert absence of snapshot-specific presentation.
3. **`'tune'` via `kind`**: render a `TimelineEntry` with `kind: 'tune'`. Assert ordinary-tool-row presentation (FR-007 fallback); assert no error is thrown.
4. **Legacy fallback, absent `kind`**: render a `TimelineEntry` without `kind` whose `toolName` is `'export-png'`. Assert snapshot presentation (matching today's behaviour).
5. **Legacy fallback, absent `kind`**: render a `TimelineEntry` without `kind` whose `toolName` is `'bearing-between-tracks'`. Assert ordinary-tool-row presentation.
6. **Unknown `kind`**: render a `TimelineEntry` with `kind` cast to `'annotation' as TimelineEntryKind` (test-only cast). Assert ordinary-tool-row presentation; assert no error.

## Module-wide invariants

- **No new `any` / `unknown` types reach production code** (Constitution XV).
- **`ToolCategory === 'snapshot'` comparisons inside LogPanel rendering code are removed** except for the explicit legacy-fallback expression described above (which remains gated by `entry.kind === undefined`). SC-003 is verified by a grep against the post-change `shared/components/src/LogPanel/` tree returning only the one gated occurrence.
- **The host is the sole producer** of `kind` for production `TimelineEntry` flows. No component lower than the host (renderer, hook, store, utility) writes the field.

## Source of truth for the contract

The TypeScript types in `types.ts` ARE the contract. This file exists to record the rationale, test expectations, and behavioural invariants that the typechecker alone cannot express. Any divergence between this file and the types at merge time is resolved by treating the types as authoritative and updating this document.
