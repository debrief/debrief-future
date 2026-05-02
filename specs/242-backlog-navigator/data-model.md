# Data Model — Backlog Navigator

This document defines the typed entities the navigator works with, their relationships, and validation rules. Implementation lives in `apps/backlog-navigator/src/types.ts` (branded types + enums) and `apps/backlog-navigator/src/parser/parseBacklog.ts` (boundary narrowing).

---

## Branded primitive types

```ts
type ItemId = number & { readonly __brand: 'ItemId' };       // 1..9999
type EpicId = string & { readonly __brand: 'EpicId' };       // "E##"
type IsoDate = string & { readonly __brand: 'IsoDate' };     // "YYYY-MM-DD"
type GitRef = string & { readonly __brand: 'GitRef' };       // branch or sha
type Sha = string & { readonly __brand: 'Sha' };             // 40-char hex
```

Branding ensures (a) function signatures cannot accidentally swap an `ItemId` for an `EpicId`, and (b) string parsing is forced through narrowing helpers (`asItemId`, `asEpicId`, `asIsoDate`) that throw on malformed input. Per Article XV, these helpers are the type boundaries — every place a string crosses into the application becomes a typed branded value.

---

## Enumerations

```ts
const STATUS_VALUES = [
  'needs-interview',
  'proposed',
  'approved',
  'specified',
  'clarified',
  'planned',
  'tasked',
  'implementing',
  'complete',
  'blocked',
  'parked',
  'rejected',
] as const;
type Status = typeof STATUS_VALUES[number];

const COMPLEXITY_VALUES = ['Low', 'Medium', 'High'] as const;
type Complexity = typeof COMPLEXITY_VALUES[number];

const SCORE_VALUES = [1, 3, 5] as const;
type Score = typeof SCORE_VALUES[number];

const ABSENT_SCORE = '-' as const;
type ScoreCell = Score | typeof ABSENT_SCORE;

const COLUMNS = [
  'id', 'category', 'description',
  'value', 'media', 'autonomy', 'total',
  'complexity', 'status',
  'epic', 'created', 'updated',
] as const;
type Column = typeof COLUMNS[number];
```

`Status` is read from the project's existing Workflow table in `BACKLOG.md`. The navigator's Status dropdown emits exactly these values. `parked` and `rejected` are special — the existing convention removes such rows from the table entirely (they live in STRATEGY.md). The navigator does not edit those statuses; it filters them out of the edit dropdown to prevent accidentally putting the row into a "ghost" state.

`ScoreCell` admits the literal `'-'` for the Research-Spike rows that today carry `| - | - | - | - |`. The navigator preserves this sentinel and surfaces it as "(not scored)" in the picker.

---

## Backlog Item

The core entity — one row in the `## Items` table.

```ts
interface BacklogItem {
  id: ItemId;
  category: string;                    // free-text, but the navigator surfaces existing values as a combobox
  description: string;                  // opaque Markdown (see research.md §8)
  value: ScoreCell;
  media: ScoreCell;
  autonomy: ScoreCell;
  total: number | typeof ABSENT_SCORE;  // computed by humans; navigator validates that total === V+M+A when all three are scored
  complexity: Complexity;
  status: Status;
  epic: EpicId | null;                  // null for unaffiliated items
  created: IsoDate;                     // sentinel "2025-01-01" for backfill misses
  updated: IsoDate;                     // last navigator-or-agent stamp
  strikethrough: boolean;               // true iff the row's leading `|` is preceded by `~~` in the source — derived from `status === 'complete'` post-refactor, but parsed defensively
}
```

**Validation rules**:
- `id` is unique within a `BacklogDocument` (FR-017 collision rule). Validated at parse time; mutations by the navigator re-check before allowing a push.
- `total === ABSENT_SCORE || (value + media + autonomy === total)` — the navigator does NOT auto-compute `total` (humans curate it); it surfaces a warning if the invariant breaks but does not block.
- `epic === null || epic ∈ epicsTable.map(e => e.id)` — every non-null epic reference is resolvable. Items whose `epic` doesn't resolve are flagged in the navigator UI but not blocked from push (legitimate during epic add/remove transitions).
- `status === 'complete'` ↔ `strikethrough === true` post-serialisation. The navigator enforces this on serialise (FR-018).
- `created <= updated` — sanity check; warns if violated.

**State transitions** (Status flow):
The navigator does NOT enforce the workflow's state-machine transitions (e.g. `proposed → approved → specified → …`). It surfaces today's status, lets the reviewer pick any other workflow value, and trusts the reviewer's judgement. Rationale: collision-repair and corrections sometimes require regressing status; enforcing transitions here would block legitimate edits. (The `the-ideas-guy` workflow review is the appropriate gate, not the editor.)

---

## Epic

One row in the `## Epics` table.

```ts
interface Epic {
  id: EpicId;                          // post-refactor, always matches /^E\d{2}$/
  title: string;                        // may include a Markdown link to a docs/ideas/* page
  description: string;                  // opaque Markdown
  status: Status;                       // explicit, not derived from strikethrough (per FR-005)
}
```

**Derived (not persisted)**:
```ts
interface EpicProgress {
  epic: Epic;
  totalItems: number;
  completeItems: number;
  fraction: number;                    // completeItems / totalItems, 0 if totalItems === 0
}
```

`EpicProgress` is computed at render time by joining `BacklogDocument.items` on `epic === Epic.id` and counting `status === 'complete'`. The result drives the `done / total` rendering and the progress bar in group-by view (FR-011).

**Validation rules**:
- `id` matches `/^E\d{2}$/` post-refactor. The navigator's parser flags any non-conforming row as a parse warning; the refactor's `/speckit.tasks` step renames the legacy `024` row to its `E##` form before the navigator ships.
- `id` is unique within a `BacklogDocument`.

---

## BacklogDocument

The whole-file model produced by the parser and consumed by the serialiser.

```ts
interface BacklogDocument {
  preamble: string;                    // everything before "## Items" (heading, scoring criteria, workflow, etc.) — opaque pass-through
  items: BacklogItem[];
  midamble: string;                    // everything between the last item row and "## Epics" — opaque pass-through
  epics: Epic[];
  postamble: string;                    // everything after the last epic row (Categories, Notes) — opaque pass-through
  parseWarnings: ParseWarning[];        // unparsed rows, format violations, etc. — surfaced in UI but not committed
}

interface ParseWarning {
  kind: 'unparsed-row' | 'malformed-cell' | 'unknown-status' | 'epic-id-mismatch';
  rawLine: string;
  lineNumber: number;
  reason: string;
}
```

**Round-trip invariant**: For every `BacklogDocument` produced by `parseBacklog(text)`, `serializeBacklog(parsed) === text` byte-for-byte (modulo a final `\n`). This is tested in CI against the live `BACKLOG.md` as a golden fixture.

---

## Pending Edit

A staged change to a single cell, held in `localStorage` and React state.

```ts
type PendingEdit =
  | { kind: 'item-cell'; itemId: ItemId; column: Exclude<Column, never>; before: CellValue; after: CellValue; stagedAt: IsoDate }
  | { kind: 'item-id-rename'; oldId: ItemId; newId: ItemId; stagedAt: IsoDate }
  | { kind: 'epic-cell'; epicId: EpicId; column: 'title' | 'description' | 'status'; before: string; after: string; stagedAt: IsoDate };

type CellValue = string | number | typeof ABSENT_SCORE | null;
```

**Notes**:
- `item-id-rename` is modelled as its own variant (not as `item-cell` with `column: 'id'`) because renames affect referential integrity: the staging store rewrites every other pending edit's `itemId` field and re-checks the collision invariant before persisting.
- `before` is captured at edit time so per-edit undo restores the exact prior value, even if the row has been edited multiple times.
- `stagedAt` lets the navigator order edits chronologically when synthesising the structured summary.

**Application semantics**:
- The navigator never mutates `BacklogDocument` in place. Instead, the rendered table is a *projection*: `applyPendingEdits(baseline, pending) → BacklogDocument`. This makes per-edit undo trivial (drop the edit from the list) and ensures the baseline is always the SHA-pinned upstream version.

**Invariants** (enforced before allowing push):
- `pending.every(e => /* no resulting collision */)` — derived from the projection's `items` having unique IDs.
- `pending.every(e => /* row still exists in baseline */)` — guards against editing a row that's been deleted upstream (rare; would surface as "stale base").

---

## Push Session

The transient object that converts pending edits into a commit + (optionally) a PR.

```ts
interface PushSession {
  mode: 'live' | 'pr' | 'dry-run';
  targetRef: GitRef;                   // "main" in live mode; PR head branch in pr mode
  baselineSha: Sha;                    // the file SHA the staging baseline was loaded from
  prTitle: string;                     // user-editable, with auto-generated default
  prBody: string;                      // user-editable
  edits: PendingEdit[];                // snapshot of staging at confirm time
  summary: EditSummary;                // structured tally
  unifiedDiff: string;                 // jsdiff output for the raw-diff toggle
}

interface EditSummary {
  byKind: { statusChanges: number; idRenames: number; epicReassignments: number; scoreAdjustments: number; descriptionEdits: number; other: number };
  byEpic?: Record<EpicId, number>;     // when reviewing edits scoped to specific epics
  totalEditedRows: number;
}
```

**Lifecycle**:
1. Reviewer clicks **Push Changes** → `PushSession` materialised from the current pending edits and `prTitle`/`prBody` defaults.
2. Reviewer reviews the summary and (optionally) the unified diff in the dialog; may cancel (closes dialog, leaves staging intact).
3. Reviewer confirms.
   - `mode === 'dry-run'`: navigator shows a confirmation banner ("Preview submission acknowledged — no PR opened") and leaves staging intact (FR-031).
   - `mode === 'live'`: navigator creates a branch from `main`, commits, opens a PR. On success, clears staging.
   - `mode === 'pr'`: navigator commits onto `targetRef` directly. On success, clears staging.
4. Failures (network, auth, stale-base) preserve staging and surface an actionable error (FR-024, FR-025).

---

## GitHub-API boundary types

These are NOT domain types — they are the typed shapes returned by the GitHub REST API, validated at the boundary by Zod schemas in `src/github/schemas.ts`. They do not appear in application code; they are immediately narrowed to the branded domain types above.

```ts
const ContentsResponseSchema = z.object({
  type: z.literal('file'),
  encoding: z.literal('base64'),
  content: z.string(),
  sha: z.string(),
  path: z.string(),
});

const PullResponseSchema = z.object({
  number: z.number(),
  state: z.union([z.literal('open'), z.literal('closed')]),
  title: z.string(),
  head: z.object({ ref: z.string(), sha: z.string() }),
  html_url: z.string(),
});

const RefResponseSchema = z.object({
  ref: z.string(),
  object: z.object({ sha: z.string() }),
});
```

(See `contracts/github-api.md` for the full set.)

---

## Persistence shape

The localStorage payload — see `contracts/localstorage-schema.md` for the full JSON contract.

```ts
interface PendingEditsEnvelopeV1 {
  schemaVersion: 1;
  baselineSha: Sha;                    // SHA of BACKLOG.md when the baseline was loaded
  targetRef: GitRef;                   // "main" or PR head branch
  mode: 'live' | 'pr';                 // never "dry-run" — that's a deployment property, not a stored property
  prNumber?: number;
  edits: PendingEdit[];
  lastModified: IsoDate;
}

interface CredentialEnvelope {        // identical shape to spec-navigator's
  pat: string;                         // never logged, never thrown
  scopes: string[];                    // observed when the PAT was last used
  login?: string;                      // observed via /user
}
```

---

## Relationships

```text
BacklogDocument 1..1
  ├── items: BacklogItem[]      (each item.epic ⟶ Epic.id, optional)
  └── epics: Epic[]              (computed EpicProgress from items)

PendingEdit (n)
  └── targets a (BacklogItem.id, Column) tuple
  └── projected over BacklogDocument to render the modified view

PushSession 1..1 (transient)
  └── snapshot of: BacklogDocument baseline + PendingEdit[] at confirm time
  └── produces: a unified diff + a summary + (mode-dependent) GitHub side-effect
```

All entities are immutable in the sense that React holds them by reference; edits produce new objects rather than mutating in place.
