# Phase 0 — Research: Storyboarding — Edit Suite + Housekeeping

**Feature**: 218-storyboarding-edit
**Date**: 2026-04-23
**Input**: Technical Context in `plan.md`

The Technical Context in `plan.md` has **zero `NEEDS CLARIFICATION`
markers** — every decision bar the six below was inherited from
#215 / #216 / #217 or is mechanical (re-use existing patterns). This
document records the six non-trivial decisions specific to this slice.

---

## R1. Undo buffer — where does it live, how deep is it, and when does it drop?

### Decision

**Session-scoped in-memory Deque per plot, capped at 50 entries,
keyed by `documentUri`, dropped on `SessionManager.onPlotClose` and
on extension deactivation.** The `StoryboardEditService` holds a
`Map<string, Deque<DeletedScene>>` where the string key is the same
`documentUri` that `SessionManager` and `StoryboardPlaybackService`
already use. Each `DeletedScene` record preserves the original
`SceneFeature` (including `id` and pre-delete `provenance`) plus the
`LogEntry` `activity_id` that #215 produced for the delete — so the
restore path can append a `restore` entry that correctly references
the prior `delete`.

Oldest-first eviction on overflow: the 51st delete evicts index 0
and is finalised (the Scene row disappears from the panel; the
delete LogEntry stays in provenance; no further undo possible for
that row). The toast remains clickable until the evicted row's
toast fades or a new delete pushes the record out.

### Rationale

- Session-scoped is what the spec asks for (FR-EDIT-003, "Undo
  window scope" assumption): MVP should not persist across sessions
  nor to disk.
- Per-plot keying avoids undos leaking across tabs; matches the
  `StoryboardPlaybackService` pattern established in #217.
- Cap of 50 matches the `#215` scale bound (≤ 50 Scenes per
  Storyboard × ≤ 5 Storyboards = 250 Scenes per plot). An analyst
  who deletes more than 50 Scenes in a single session is in a
  qualitatively different workflow (bulk teardown rather than
  polish); finalising the oldest silently is acceptable — the
  delete LogEntry is still on the audit trail.
- Discarding on plot close aligns with the rest of the ephemeral
  extension state (active Storyboard, current Scene, in-flight
  transition id). Makes plot reload behave like "re-open from disk"
  — no hidden per-session state.

### Alternatives considered

- **Persisted per-user undo history** (via `context.globalState`) —
  rejected. Crosses the session boundary the spec explicitly forbids.
  Also raises disclosure questions on classified plots (Article X).
- **Single-slot undo** (most recent delete only) — rejected. Common
  workflow: "delete four bad captures in a row, decide to keep the
  third." A cap of 1 makes that impossible without also making the
  `restore` path stateful across the toast.
- **Unbounded buffer** — rejected. Undo records carry full Scene
  Features including provenance; an unbounded buffer leaks memory
  on long-lived VS Code windows. 50 × ~2 KB = ~100 KB per plot is
  the bound.
- **Node `Deque` library** — rejected. A 50-cap ring can be a simple
  `SceneFeature[]` plus a `push`/`unshift`-with-overflow pattern in
  ~15 lines. No dependency.

---

## R2. Inline markdown editor — native `vscode.TextDocument` or in-webview React?

### Decision

**In-webview React textarea + `react-markdown` live preview, editing
only — no syntax highlighting, no toolbar.** The `SceneEditForm`
sub-component renders a split view (textarea above, rendered preview
below) inside the expanded Scene row. Submission goes back through
the existing panel `postMessage` channel; the extension calls
`updateScene({ patch: { description } })`.

`react-markdown` is already a transitive dependency of
`shared/components` (used by #176 LogPanel's rationale cards and
#178's tabular-results notes). CommonMark only — no GFM extensions,
no remark plugins beyond the bundled defaults.

### Rationale

- Keeping editing in the webview avoids context-switching the
  analyst to a separate VS Code tab. The polish workflow is per-
  Scene and iterative; opening a `.md` document per Scene is
  needless ceremony.
- Reusing `react-markdown` keeps zero new runtime deps (Article
  IX) and matches the rendering already used elsewhere — the
  descriptions will look identical in the Scene row read mode, the
  edit preview, and the #176 log card.
- CommonMark only matches the spec's assumption: "standard
  CommonMark; no custom extensions are introduced by this spec."
- Length validation: per spec Assumption "No hard cap is introduced
  here; the panel scrolls if the description grows long." Textarea
  is `rows={6}` with `resize: vertical`; no max-length enforced.

### Alternatives considered

- **Open a `.md` `vscode.TextDocument` per Scene** — rejected.
  Would require a custom URI scheme, tab-lifecycle management, and
  a save hook that maps back to `updateScene`. Heavy for a one-
  liner description editor.
- **Full rich-text editor (ProseMirror / Tiptap / Lexical)** —
  rejected. Huge dependency for MVP. The spec asks for markdown,
  not a WYSIWYG.
- **In-place contentEditable** — rejected. No preview, no clear
  "save / cancel" affordance, poor screen-reader behaviour.

---

## R3. #176 integration — extend `LogService` or piggyback on `recordToolResult`?

### Decision

**Extend `LogService` with a new first-class `recordStoryboardEdit`
recorder; sentinel `'debrief.storyboardEdit'` distinguishes edit
cards from tool-result cards in #176.** Same shape as #178's
`recordFileSaved` extension:

- New sentinel `STORYBOARD_EDIT_TOOL_SENTINEL =
  'debrief.storyboardEdit'` in `services/session-state/src/log/types.ts`.
- New method on the `LogService` interface:

  ```ts
  recordStoryboardEdit(input: {
    storePath: string;
    itemPath: string;
    op: StoryboardEditOp;            // 12-member string-literal union
    storyboardId: string;
    sceneId: string | null;          // null for Storyboard-level ops
    thumbnailAssetRef: string | null;// null if scene deleted
    actor: string;
    summary: string;                 // one-line ≤ 120 chars
    timestamp: string;               // ISO-8601
  }): Promise<{ activity_id: string }>;
  ```

- Degraded no-op when `storePath`/`itemPath` are unset or the
  plot-scoped LogService is unavailable — the edit op itself still
  succeeds (FR-EDIT-021).

### Rationale

- Piggybacking on `recordToolResult` would require fabricating a
  `ToolResultForLog` with fake `duration_ms` and
  `features`/`result_type` fields, which distorts the log semantic
  model (a storyboard edit is *not* a tool run).
- A dedicated recorder keeps the #176 rendering code free to
  branch cleanly on sentinel: `debrief.fileSave` → file-saved card,
  `debrief.storyboardEdit` → storyboard-edit card. No heuristic
  "is this a tool or an edit" logic needed.
- Shipping the sentinel constant from `@debrief/session-state`
  means #176 can import it without duplicating a string literal.

### Alternatives considered

- **Write only to Feature `provenance[]`; let #176 aggregate** —
  rejected. #176 already renders from the per-item timeline (via
  `getTimeline`), not by walking feature provenance. Changing that
  is out of scope here.
- **Extend `recordToolResult` with an optional `op` discriminator**
  — rejected. Same semantic-distortion problem; also leaks
  storyboard concerns into the tool-result type (Article II:
  single-source-of-truth, each recorder owns its own payload).
- **New sibling service `recordStoryboardEditService`** — rejected.
  Same lifecycle as `LogService` (per-plot, same store+item paths);
  splitting into a separate singleton doubles wiring for no
  isolation benefit.

---

## R4. Stale-thumbnail detection — on plot open, lazy on panel render, or both?

### Decision

**Single pass on plot open, composed from #215's already-shipped
`readSceneWithStaleness` + `computeFeatureSetHash`; cached in the
`StoryboardEditService` as a `Map<sceneId, { stale: boolean;
unresolvedFeatureIds: string[] }>`; re-run on every successful
`updateScene`/`deleteScene`/`createScene` touching the affected
Scene.** The pass runs in the extension (Node runtime) and pushes
results to the webview via the existing typed-props channel. Panel
render is a pure consumer — no per-row hash recomputation in the
webview.

**Composition, not reimplementation.** #215 already exports
`readSceneWithStaleness(plot, sceneId)` (from
`shared/components/src/storyboard/queries.ts:65-79`) which returns
`{ scene, storedHash, canonicalVisibleIds }`. The stale pass is a
one-liner per Scene:

```ts
const staleRead = readSceneWithStaleness(plot, sceneId);
if (!staleRead) continue;
const recomputed = await computeFeatureSetHash(staleRead.canonicalVisibleIds);
const isStale = recomputed !== staleRead.storedHash;
```

`unresolvedFeatureIds` is then computed independently by intersecting
`staleRead.canonicalVisibleIds` against the plot's non-Scene feature
set. Hash mismatch without missing IDs can happen when
canonicalisation changes semantics — flagged as `stale: true,
unresolvedFeatureIds: []`.

**Performance.** The pass is bounded by `Promise.all` over all
Scenes' hash recomputations; at the spec bound (≤ 5 × ≤ 50 = 250
Scenes per plot), each SHA-256 takes single-digit ms. **Review gate
4A: CI asserts ≤ 50 ms at spec bound on the reference runner; a
perf test fails the build on regression.** Early-return when the
plot has zero Storyboards (11A) keeps non-storyboard plots
zero-cost.

### Rationale

- One pass at open is sufficient per the spec: "On plot open, System
  MUST recompute `feature_set_hash` … and compare against the stored
  hash" (FR-EDIT-016). The panel render is stateless against the
  underlying hash, so lazy render-time recomputation would be wasted
  work.
- Re-running on `updateScene` is necessary because Scenes that go
  through `update-to-current` come out with a fresh `feature_set_hash`
  — the cache must reflect that. `deleteScene` and `createScene`
  (including the `restore` path) trigger the same invalidation.
- Centralising the cache in the edit service keeps the webview free
  of domain logic (Article IV.1) and avoids racing the panel against
  an update-in-flight.

### Alternatives considered

- **Lazy: recompute per row on panel render** — rejected. Moves the
  SHA-256 work into the webview's paint path, which is exactly what
  "completes within one paint frame" needs to avoid. Also leaks
  domain code into the presentational panel.
- **On-demand only when the analyst hovers a row** — rejected.
  Means the stale badge doesn't render until hover, which fails
  FR-EDIT-017 ("persistent per-row visual marker").
- **Recompute on every FeatureCollection mutation (every typing
  event in the description editor)** — rejected. Description edits
  don't change `visible_feature_ids`, so the cache is invariant
  across them. Only hash-affecting writes (`update-to-current`,
  `delete`, `restore`) trigger a recompute.

---

## R5. `update-to-current` failure — how do we guarantee atomic rollback when two side effects are involved?

### Decision (revised per Review 2026-04-23, 1A)

**Pre-flight the collision check before invoking #174, so the only
side-effect path runs inside a pre-validated window.** Concretely:

```ts
// inside StoryboardEditService.updateSceneToCurrent(sceneId, viewState)

// 1. Pre-flight collision check (NEW — uses #215's exported
//    checkSceneTimestamp; added to #215's module in this slice)
const conflict = checkSceneTimestamp(
  currentPlot,
  existingScene.properties.storyboard_id,
  viewState.timestamp,
  sceneId,                 // exclude the scene being updated
);
if (conflict !== null) {
  return {
    kind: "duplicate-timestamp-collision",
    existingSceneId: conflict.properties.id,
    suggestedOffsetTimestamp: plusOneSecond(viewState.timestamp),
  };
}

// 2. Only now do we invoke #174 — we know the #215 write will not
//    reject on timestamp collision.
const newAssetRef = await sceneThumbnailService.captureThumbnail({
  storyboardId, sceneId, viewport: viewState.viewport, ...
});                                                     // may throw

// 3. Single #215 write with the full patch.
const { plot, scene } = await updateScene(currentPlot, {
  sceneId,
  patch: {
    viewport: viewState.viewport,
    timestamp: viewState.timestamp,
    visibleFeatureIds: viewState.visibleFeatureIds,
    thumbnailAssetRef: newAssetRef,
  },
  actor,
});
```

**Why the pre-flight matters.** `sceneThumbnailService.captureThumbnail`
is documented to write the PNG to disk **and** register it in
`item.json` before returning (see header comment in
`apps/vscode/src/services/sceneThumbnailService.ts:17-18` — orphan
PNGs have no `item.json` entry *only* in the capture-then-throw
path). If `updateScene` subsequently rejected on
`DuplicateTimestampError`, the PNG + `item.json` entry would both
be alive with no Scene referring to them. That is **not**
byte-identical rollback and leaks asset registrations over time
(Article I.4). The pre-flight eliminates this window by gating the
only side-effect (the capture) behind #215's deterministic collision
check.

**Test gate (9B).** A unit test spies on `captureThumbnail` and
asserts it is never invoked when `checkSceneTimestamp` reports a
collision.

**Residual orphan protection.** Any future write path that captures
before writing without a pre-flight is still at risk. **FR-EDIT-024**
(per review fold-in) adds `sceneThumbnailService.gcOrphanAssets(plot)`
invoked on plot close, which sweeps any orphan entries regardless of
how they arose. Defence in depth.

### Rationale

- #215's CRUD module is the only mutation boundary; pre-flighting
  against its internal collision logic keeps behavioural consistency
  without duplicating the detection logic (`checkSceneTimestamp` is
  a thin wrapper over the existing `findConflictingSceneTimestamp`).
- On #174 failure, the plot is still byte-identical (the capture
  threw; no #215 write happened; no `item.json` entry written).
- On `checkSceneTimestamp` pass + #174 success + #215 `UnknownSceneError`
  (extremely rare — Scene deleted externally between collision check
  and write): the captured PNG + item.json entry IS orphaned.
  `gcOrphanAssets` reclaims it on plot close.

### Alternatives considered

- **Two-phase commit with explicit rollback** (`releaseAsset`
  callback on #174) — rejected. Heavier than necessary; pre-flight
  eliminates the common failure case, gc handles the residual.
- **Write placeholder, capture in background, patch on success** —
  rejected. Leaves a visible intermediate state in the plot (a Scene
  with a placeholder thumbnail), which fails FR-EDIT-005 ("Partial
  updates MUST NOT be visible to any observer").
- **Capture inside an immer draft** — rejected. #215's CRUD module
  is async and returns a fresh `Plot`; drafts don't cross the
  async boundary without careful `produce` threading.
- **Original plan (capture-then-detect-collision-via-error)** —
  **rejected on review**. Orphaned thumbnail on collision, with
  no gc pass in #174 at the time of design. Review Issue 1 1A fixes
  this.

---

## R6. Edit-from-hard-block — new command vs. replacing #217's stub?

### Decision

**Replace #217's `storyboardEditStub.ts` command registration with
the real handler in `storyboardEdit.ts`; keep the command id
(`debrief.storyboard.editScene`) so #217's hard-block modal
continues to fire it.** The real handler:

1. Reads the Scene's current `detectMissingDataForScene` state.
2. Opens the Scene's edit form expanded, with the missing-data
   details panel pre-populated and the focus on `Update to current`.
3. No modal, no quick-pick — just an in-panel transition to the
   edit form.

The replacement is done in `extension.ts`: the stub's
`registerCommand` call moves into `StoryboardEditService.activate`,
and the stub module is deleted.

### Rationale

- #217 introduced `storyboardEditStub.ts` precisely as a seam for
  this slice to fill. Keeping the command id stable avoids churning
  the hard-block modal's action registration.
- In-panel landing matches FR-EDIT-015 ("the Open for editing action
  … MUST land on this spec's edit form") and FR-EDIT-023 ("this
  spec's UI surface MUST live inside the panel established by
  #217").
- Replacing the stub (rather than shadowing it) is cleaner in the
  VS Code command registry — no ambiguity about which handler wins.

### Alternatives considered

- **Leave the stub, register a second `debrief.storyboard.editScene`
  command, pick based on feature flag** — rejected. VS Code's
  command registry is last-writer-wins; a feature flag would have to
  be evaluated at `activate` time, adding complexity for no benefit.
- **New command id** (`debrief.storyboard.openSceneEdit`) — rejected.
  Forces #217's hard-block modal to be re-wired; adds a breaking
  change to the command contribution list for no user-visible
  benefit.
- **Open a new webview tab for the edit form** — rejected. Fails
  FR-EDIT-023 (no separate window).

---

## R7. Log-card aggregation — where does consolidation happen?

### Decision (added per Review 2026-04-23, scope fold-in)

**Consolidation lives in the LogPanel renderer, not in the recorder
or in the timeline store.** The recorder writes 1:1 per edit op
(preserving the audit trail); the LogPanel component's renderer
collapses ≥ 3 consecutive `debrief.storyboardEdit` entries with
identical `op` + `actor` within a 120-second window into a single
card showing the count + expand action. The behaviour is gated on a
new setting `debrief.logPanel.collapseConsecutiveSameOp`, default
**on**.

### Rationale

- **Audit integrity trumps UX noise.** Every edit op still produces
  exactly one `LogEntry` and exactly one `recordStoryboardEdit`
  call; `getTimeline` returns the full sequence; nothing downstream
  needs to guess what happened. Collapse is cosmetic-only.
- **Recorder-level debouncing was considered and rejected.**
  Batching `recordStoryboardEdit` calls before they hit the timeline
  store would make the provenance at #215 (1 entry/op) disagree with
  the LogService timeline (1 entry/batch). That cross-layer skew is
  exactly the kind of audit-trail tension Article III.3 forbids.
- **120 s rolling window, count ≥ 3 threshold**: **rolling** means
  each candidate entry checks the 120 s immediately preceding its
  own timestamp for same-op + same-actor matches; an entry 119 s
  after the first in a run joins the run, an entry 121 s after
  breaks it. Large enough to collapse obvious rapid-fire polish
  (deleting three bad captures in a row; renaming five Scenes in
  sequence); small enough that a 5-minute pause re-opens the
  timeline to individual cards. Threshold of 3 prevents collapse
  of incidental pairs.
- **Setting default on, opt-out available** — a power user who
  wants a full audit view in the panel can toggle off; default
  matches the polish-loop UX.

### Alternatives considered

- **Recorder-level debouncing** — rejected (above).
- **Timeline-store aggregation** — rejected. Same skew problem at a
  different layer; also couples `getTimeline` to a rendering choice.
- **Client-side virtualisation only** (no collapse) — rejected.
  A 40-edit polish session would produce 40 cards; the analyst has
  no fast way to skip over batches of rename ops to find the
  substantive update-to-current entry.
- **Threshold of 2** — rejected. Would collapse any
  rename-then-describe pair, which is useful enough to keep
  individually visible.

### Test gate

`shared/components/src/LogPanel/__tests__/collapse.test.tsx`
asserts:
- 3+ consecutive same-op entries within 120 s render as a single
  card when setting is on;
- same entries render individually when setting is off;
- an intervening different-op entry breaks the run (no collapse
  across it);
- expanding a collapsed card reveals all individual entries.

---

## Cross-cutting: LogService ergonomics and graceful degradation

`LogService.recordStoryboardEdit` returns a `Promise<{ activity_id }>`
so callers can thread activity-id references if needed — but the
edit service **does not await it for user-observable flow**. The
pattern:

```ts
// inside StoryboardEditService after a successful #215 write
void this.logService?.recordStoryboardEdit({ ... }).catch((err) => {
  // log to channel; never surface to user (FR-EDIT-021)
  this.outputChannel.appendLine(`[storyboardEdit] log skipped: ${err}`);
});
```

This keeps the user flow fast (`await #215` is the hot path), and
`LogService` failures are non-blocking. The `HistoryEntry` inside
`provenance[]` (appended synchronously by #215) is the authoritative
audit trail; the #176 card is a UX convenience layer on top.
