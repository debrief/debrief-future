---
feature: 208-timeline-entry-kind
captured_at: 2026-04-22T07:12:00Z
git_sha: d1453634
---

# Usage Example: Consuming `TimelineEntry.kind`

This example shows a downstream consumer reading the new `kind` discriminator, dispatching on it with an exhaustive switch, and falling back through the `assertNeverKind` guard.

## Setup

Import the new symbols from `@debrief/components`:

```ts
import {
  TIMELINE_ENTRY_KINDS,
  assertNeverKind,
  type TimelineEntry,
  type TimelineEntryKind,
} from '@debrief/components';
```

## Example: classifying an entry

```ts
function describeEntry(entry: TimelineEntry): string {
  // Derive the kind once, with a legacy fallback for entries constructed
  // outside the host populator (test fixtures, partial mocks).
  const kind: TimelineEntryKind = entry.kind ?? 'tool';

  switch (kind) {
    case 'snapshot':
      return `Snapshot entry at ${entry.timestamp} (tool: ${entry.toolName})`;
    case 'tool':
      return `Tool invocation: ${entry.toolName}`;
    case 'tune':
      return `Tune marker: ${entry.toolName}`;
    default:
      // If TimelineEntryKind gains a new value in the future (e.g.,
      // 'annotation'), this line fails to compile until the switch is
      // updated, because `kind` no longer narrows to `never` here.
      return assertNeverKind(kind);
  }
}
```

## Expected output (representative)

| Input `entry` | Emitted `kind` | `describeEntry` output |
|---------------|----------------|------------------------|
| `{ toolName: 'export-png', ...host-populated }` | `'snapshot'` | `"Snapshot entry at 2026-04-22T10:00:00Z (tool: export-png)"` |
| `{ toolName: 'bearing-between-tracks', ...host-populated }` | `'tool'` | `"Tool invocation: bearing-between-tracks"` |
| `{ toolName: 'export-png' }` (no `kind`, bypass populator) | `undefined` → fallback `'tool'` | `"Tool invocation: export-png"` (consumer's choice of fallback, shown here as `'tool'`) |
| Future PROV-emitted entry with `kind: 'tune'` | `'tune'` | `"Tune marker: adjust-speed"` (once PROV-side signal ships) |

## Runtime enumeration

For test fixtures, documentation, or dynamic validation:

```ts
// Generate a test case per kind without re-declaring the union.
for (const kind of TIMELINE_ENTRY_KINDS) {
  it(`handles kind: ${kind}`, () => {
    const entry: TimelineEntry = {
      activity_id: 'a1',
      timestamp: '2026-04-22T10:00:00Z',
      toolName: 'example-tool',
      tool_version: '1.0.0',
      parameters: {},
      usedFeatureIds: [],
      generatedFeatureIds: [],
      execution_duration: 'PT0S',
      generated_result_id: null,
      operationCategory: 'calculation',
      kind,
    };
    expect(describeEntry(entry)).toContain(entry.toolName);
  });
}
```

## What the host populator does

In `apps/vscode/src/views/logPanelView.ts`, `toTimelineEntry` computes `kind` via a two-row decision table:

```ts
function classifyKind(toolName: string): TimelineEntryKind {
  return resolveToolCategory(toolName).category === 'snapshot' ? 'snapshot' : 'tool';
}
```

Every `TimelineEntry` reaching the LogPanel webview carries `kind`, so consumers can (and should) read it directly without the legacy-fallback branch — that branch exists only for test fixtures that bypass the populator.

## Key behaviours to note

- **`kind` is the authoritative classifier.** Do not re-derive it via `resolveToolCategory` outside of the gated legacy-fallback expression in `LogEntry.tsx`.
- **`'tune'` is reserved.** Today, no populator emits it. A consumer that handles `'tune'` now (e.g., the switch above) is future-compatible and will render sensibly when the PROV-side signal ships.
- **Exhaustiveness is enforced.** The `assertNeverKind(kind)` call in the default branch is a TypeScript narrowing guard: if a future value is added to `TimelineEntryKind` and this switch is not updated, `kind` no longer narrows to `never` and the call fails to type-check.
