# Contract: `LogService.recordStoryboardEdit` extension

**Files**:
- `services/session-state/src/log/types.ts` (interface + types)
- `services/session-state/src/log/logService.ts` (implementation)
- `services/session-state/src/log/entryBuilder.ts` (entry shape)

## Why extend, not piggyback

See research.md R3. Summary: storyboard edits are not tool runs;
piggybacking on `recordToolResult` would distort the log semantic
model and force #176's card renderer to heuristically detect the
op kind. A dedicated recorder with a stable sentinel keeps the
branch clean.

## Additions to `types.ts`

```ts
// ── NEW: op discriminator (revised per review 6A) ─────────────
// Imports the canonical op union exported from #215's module
// (re-exported by this slice's diff of @debrief/components/storyboard).
import type { StoryboardOp } from "@debrief/components/storyboard";

export type StoryboardEditOp =
  | StoryboardOp                    // create, insert-middle, rename, describe, delete, update-to-current, duplicate, copy-in, storyboard.rename, storyboard.describe, storyboard.delete-cascade
  | "restore"                       // #218-only — undoDeleteScene
  | "copy-out"                      // #218-only — source-side of copy-to-other pair
  | "refresh-thumbnail"             // #218-only — per-Scene refresh
  | "refresh-all-stale";            // #218-only — bulk rollup (FR-EDIT-025)

// ── NEW: sentinel constant (consumed by #176 card renderer) ───
export const STORYBOARD_EDIT_TOOL_SENTINEL = 'debrief.storyboardEdit';

// ── NEW: recorder input (revised per review 3A) ──────────────
export interface RecordStoryboardEditInput {
  readonly storePath: string;
  readonly itemPath: string;
  readonly op: StoryboardEditOp;
  readonly storyboardId: string;
  /** null for Storyboard-level ops. */
  readonly sceneId: string | null;
  /** null for delete / storyboard.delete-cascade (asset unreferenced). */
  readonly thumbnailAssetRef: string | null;
  readonly actor: string;
  /** One-line ≤ 120 char summary rendered on the LogPanel card. */
  readonly summary: string;
  /** ISO-8601 of the edit. */
  readonly timestamp: string;
  /** activity_id of the underlying #215 LogEntry (cross-link for #176). */
  readonly underlyingActivityId: string;
  /** Non-null for paired ops (currently copy-out + copy-in only).
      Both halves carry the SAME pairActivityId so #176 can render
      them as visually linked cards. Review decision 3A. */
  readonly pairActivityId: string | null;
}

// ── EXTENDED: LogService interface ────────────────────────────
export interface LogService {
  recordToolResult(...): Promise<RecordResult>;   // existing
  recordFileSaved(...): Promise<{ activity_id: string }>;  // existing (#178)
  recordStoryboardEdit(  // NEW
    input: RecordStoryboardEditInput,
  ): Promise<{ activity_id: string }>;
  getTimeline(...): Promise<LogEntry[]>;          // existing
  // …phase-6 methods unchanged…
}
```

## Wire format of the produced `LogEntry`

```jsonc
{
  "activity_id": "<new UUID>",
  "used": [
    { "feature_id": "<storyboardId>" },
    // for Scene-level ops: also { "feature_id": "<sceneId>" }
  ],
  "generated": [
    // copy-in: both source and destination Scene ids
    // everyone else: just the affected Scene id (or Storyboard id)
  ],
  "was_generated_by": {
    "tool": "debrief.storyboardEdit",
    "tool_args": {
      "op": "<StoryboardEditOp>",
      "sceneId": "<string | null>",
      "storyboardId": "<string>",
      "thumbnailAssetRef": "<string | null>",
      "underlyingActivityId": "<string>",
      "pairActivityId": "<string | null>"
    },
    "actor": "<actor>",
    "timestamp": "<ISO-8601>",
    "duration_ms": 0,
    "rationale": "<summary>"
  }
}
```

Notes:

- `duration_ms = 0` — edit ops are not tool runs; the field is kept
  for shape-compatibility with the existing `LogEntry` schema.
- `rationale` carries the one-line summary so #176's Compact view
  can render it without parsing `tool_args`.
- `tool_args.underlyingActivityId` lets #176 cross-link to the #215
  LogEntry inside the Feature's `provenance[]` (useful for the
  Detailed view that expands the full provenance chain).

## Implementation sketch

```ts
// services/session-state/src/log/logService.ts (additive method)
async recordStoryboardEdit(
  input: RecordStoryboardEditInput,
): Promise<{ activity_id: string }> {
  // Graceful no-op when not initialised for this plot
  if (!this.isInitialisedFor(input.storePath, input.itemPath)) {
    return { activity_id: "" };  // treat as skipped
  }
  const entry = buildStoryboardEditLogEntry(input);  // pure
  await this.appendEntry(input.storePath, input.itemPath, entry);
  return { activity_id: entry.activity_id };
}
```

The helper `buildStoryboardEditLogEntry` lives in
`entryBuilder.ts` next to the existing `buildLogEntry` helper.

## Degraded-path contract (FR-EDIT-021)

- If the LogService is not initialised for the active plot
  (`storePath` / `itemPath` unknown, or the underlying
  STAC-backed append-only store is unreachable), the recorder
  returns `{ activity_id: "" }` and does not throw. The
  `StoryboardEditService` treats an empty activity_id as "skipped"
  and proceeds — the edit itself is already persisted via #215.
- Any unexpected error inside `appendEntry` is caught at the
  `StoryboardEditService` level (`.catch(logToChannel)`) — the user
  never sees a LogService failure surface as an edit failure.

## Test gates

- **Unit**: `recordStoryboardEdit` produces a `LogEntry` whose
  `was_generated_by.tool === STORYBOARD_EDIT_TOOL_SENTINEL`.
- **Unit**: every value of `StoryboardEditOp` round-trips through
  the recorder (parametrised test).
- **Unit (review 10E)**: the produced `LogEntry` validates against
  the JSON Schema generated from the LinkML `LogEntry` definition
  (`@debrief/schemas`'s `log-entry.schema.json`) — Article II.2
  gate. Fails the build if the schema drifts.
- **Unit**: an uninitialised LogService returns `{ activity_id: ""
  }` without throwing (FR-EDIT-021).
- **Unit**: a thrown error inside `appendEntry` propagates to the
  caller (so the `StoryboardEditService` can `.catch` it) — does
  not crash the recorder.
- **Unit (review 3A)**: when the two copy-to-other calls are made
  with the same `pairActivityId`, `getTimeline` returns them with
  matching `tool_args.pairActivityId`.
- **Integration**: `getTimeline` returns the storyboard-edit
  entries interleaved with tool-run + file-save entries in
  timestamp order (verified with a fixture covering all three
  sentinels).
