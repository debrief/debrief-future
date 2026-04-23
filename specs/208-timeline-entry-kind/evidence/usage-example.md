---
feature: 208-timeline-entry-kind
captured_at: 2026-04-22T20:45:00Z
---

# Usage example — `activity_type` (schema) ↔ `kind` (UI projection)

Feature 208 introduces a schema-level semantic discriminator (`LogEntry.activity_type`) and a mirroring UI-side discriminator (`TimelineEntry.kind`). This note shows how to use each at the boundaries producers / consumers touch.

## Producer — Python (service emitting a LogEntry)

Set `activity_type` when the record is semantically a snapshot. Most ordinary tool invocations omit the field (or set it to `'tool'`) — the default consumer behaviour will render them as tool rows.

```python
from datetime import UTC, datetime
from debrief_schemas import (
    ActivityType,
    LogEntry,
    ParameterValue,
    WasGeneratedBy,
)

# An ordinary tool invocation — no activity_type needed.
tool_run = LogEntry(
    activity_id="7a3b9f2c-...",
    timestamp=datetime.now(UTC),
    was_generated_by=WasGeneratedBy(
        tool="bearing-between-tracks",
        tool_version="1.2.0",
        parameters=[ParameterValue(value="60", default=True, tunable=True)],
    ),
    used=["track-alpha", "track-bravo"],
    generated=["range-result-001"],
    execution_duration="PT0.3S",
    # activity_type omitted → consumers treat it as kind: 'tool'
)

# A manual checkpoint — explicit semantic.
checkpoint = LogEntry(
    activity_id="9d21ee4b-...",
    timestamp=datetime.now(UTC),
    was_generated_by=WasGeneratedBy(
        tool="manual-checkpoint",
        tool_version="1.0.0",
        parameters=[],
    ),
    used=[],
    generated=[],
    execution_duration="PT0S",
    activity_type=ActivityType.snapshot,   # ← semantic discriminator
)

# An export that also happens to stamp a snapshot — explicit is fine.
export_plus_checkpoint = LogEntry(
    activity_id="11f4ac8e-...",
    timestamp=datetime.now(UTC),
    was_generated_by=WasGeneratedBy(
        tool="export-png",                 # tool identity stays correct
        tool_version="1.0.0",
        parameters=[],
    ),
    used=["track-alpha"],
    generated=["./exports/checkpoint.png"],
    execution_duration="PT0.4S",
    activity_type=ActivityType.snapshot,   # kind is PROV-driven, not tool-name-inferred
)
```

`activity_type` is optional on the schema and serialises as `activity_type: "snapshot"` in snake_case JSON (ADR-010). The enum is closed: a value outside `{snapshot, tool, tune}` fails Pydantic validation.

## Wire format (JSON) — same record, three representations

```json
// Python model_dump(mode="json") or TypeScript JSON.stringify
{
  "activity_id": "9d21ee4b-...",
  "timestamp": "2026-04-22T07:00:00Z",
  "was_generated_by": { "tool": "manual-checkpoint", "tool_version": "1.0.0", "parameters": [] },
  "used": [],
  "generated": [],
  "execution_duration": "PT0S",
  "activity_type": "snapshot"
}
```

All keys are snake_case per ADR-010. The `activity_type` value is the lowercase enum member, matching the LinkML permissible value.

## Host populator — TypeScript (VS Code extension)

`apps/vscode/src/views/logPanelView.ts::toTimelineEntry` projects the schema `LogEntry` onto the UI-side `TimelineEntry`. The projection uses the closed-union helper `kindFromActivityType`:

```ts
import { ActivityType } from '@debrief/schemas';
import type { TimelineEntry, TimelineEntryKind } from '@debrief/components';

export function kindFromActivityType(
  activityType: ActivityType | undefined | null
): TimelineEntryKind {
  switch (activityType) {
    case ActivityType.snapshot:
      return 'snapshot';
    case ActivityType.tune:
      return 'tune';
    case ActivityType.tool:
      return 'tool';
    case undefined:
    case null:
      return 'tool';
    default:
      return 'tool';
  }
}

export function toTimelineEntry(entry: LogEntry): TimelineEntry {
  return {
    /* ... other fields ... */
    kind: kindFromActivityType(entry.activity_type),
  };
}
```

- **Total.** Every input produces a defined kind. No throw.
- **PROV-derived.** Reads `entry.activity_type` only — no `toolName` reference, no tool-ID literal, no `resolveToolCategory`.
- **Locked.** The projection-purity drift test (`apps/vscode/tests/unit/projection-purity.test.ts`) parses the function body and asserts the forbidden literals remain absent.

## Consumer — TypeScript (LogPanel renderer)

`shared/components/src/LogPanel/LogEntry.tsx` gates on `entry.kind`:

```ts
// shared/components/src/LogPanel/LogEntry.tsx, line 118
const isSnapshot = entry.kind === 'snapshot';
```

This is the entirety of the snapshot-rendering gate. No fallback. No secondary check. Absent `kind` resolves to `false` (entry renders as a tool row).

### Exhaustive enumeration — future consumers

For a consumer that needs to branch on every possible kind, use the closed union with the `assertNeverKind` sink to pick up new union members at compile time:

```ts
import type { TimelineEntryKind } from '@debrief/components';
import { assertNeverKind } from '@debrief/components';

function renderKindBadge(kind: TimelineEntryKind | undefined): React.ReactNode {
  switch (kind) {
    case 'snapshot':
      return <ManualCheckpointBadge />;
    case 'tool':
      return <ToolRowBadge />;
    case 'tune':
      return <TuneMarkerBadge />;
    case undefined:
      return <ToolRowBadge />;       // treat absent as tool, per contract
    default:
      return assertNeverKind(kind);  // compile error if the union grows
  }
}
```

Adding a fourth value to `TimelineEntryKind` causes every such switch in the codebase to fail `tsc --noEmit` at the `default` branch, surfacing the sites that need update.

## Counter-example — the anti-pattern this feature removes

**Do not write this in new consumer code:**

```ts
// ❌ Feature-176 Decision-2A pattern. Forbidden by FR-005 / SC-001.
const isSnapshot = resolveToolCategory(entry.toolName).category === 'snapshot';
```

`resolveToolCategory` remains exported from `./toolCategories` for icon / colour rendering (`ToolCategoryIcon`). It is correctly scoped to *visual* decisions. Using its result as a *semantic* gate conflates the two domains and is what feature 208 undoes.

The `semantic-gate-drift.test.ts` suite asserts this pattern is absent from `LogEntry.tsx` as a CI-level regression guard.

## Fixture pattern — tests and Storybook

Test fixtures that want snapshot rendering MUST set `kind: 'snapshot'` explicitly; the projection no longer infers from `toolName`:

```ts
// Good: explicit about intent, stable against future ToolCategory changes.
const snapshotEntry: TimelineEntry = {
  activity_id: 'a1',
  toolName: 'manual-checkpoint',  // or any tool — toolName doesn't drive the gate
  /* ... */
  kind: 'snapshot',
};

// Bad (pre-feature-208 pattern): relied on ToolCategory('export-png') === 'snapshot'
// to present as a checkpoint. Post-migration, this renders as a tool row.
const legacySnapshotEntry = {
  activity_id: 'a2',
  toolName: 'export-png',
  /* ... */
  // no kind: will resolve to 'tool' at the projection and render without the placeholder
};
```
