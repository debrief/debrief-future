# Implementation Plan: Storyboarding — Edit Suite + Housekeeping

**Branch**: `218-storyboarding-edit` | **Date**: 2026-04-23 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/218-storyboarding-edit/spec.md`

## Summary

Ship the **polish suite** for the Storyboarding epic (#024) as a VS Code
extension slice that layers edit operations and data-integrity
guardrails onto the panel shipped by #217. Four new pieces of surface
+ three existing modules carry the load:

1. **Edit affordances in the Storyboard panel**
   (`shared/components/src/panels/StoryboardPanel/`) — inline rename for
   Scene + Storyboard `title` / `name`, an expandable **edit form**
   per Scene row (markdown `description`, timestamp display, missing-
   data details with one-click remediation), a persistent **stale-
   thumbnail indicator** on affected rows, and a small **undo toast**
   surface reused from the VS Code host's native notification API.
   All edit affordances are added inside #217's panel shell — no new
   view or window.

2. **Edit orchestration service**
   (`apps/vscode/src/services/storyboardEdit.ts`) — a new extension-
   side singleton that owns:
   - every write path (delegates to #215's CRUD module; never mutates
     directly);
   - the **session-scoped undo buffer** (one `DeletedScene` record
     per soft-delete, keyed by `documentUri`, capped at 50 entries
     per plot, dropped on plot close; `deleteActivityId` is derived
     from `original.properties.provenance[last]` — not carried as a
     field);
   - the **refresh-thumbnail** flow (calls #174's
     `sceneThumbnailService.captureThumbnail` and patches via
     `updateScene`), plus a new **bulk refresh-all-stale** action
     that walks every stale-flagged Scene on the active Storyboard
     and refreshes each via #174 in sequence (per-Scene success/
     failure toasts; one log card per refresh; rollup on the
     overflow menu) — per FR-EDIT-025;
   - the **stale-thumbnail detection pass** on plot open — composes
     #215's already-shipped `readSceneWithStaleness` (from
     `storyboard/queries.ts`) with `computeFeatureSetHash` (from
     `storyboard/hash.ts`) rather than re-reading `scene.properties`
     directly; tags each Scene `ok | stale` with
     `unresolvedFeatureIds`; no persisted state; early-returns when
     the plot has zero Storyboards (no wasted work on non-storyboard
     plots);
   - the **duplicate / copy-to-other-storyboard** deep-copy callback
     (wraps `sceneThumbnailService.deepCopyAsset`, required by
     #215's `CopySceneToOtherStoryboardInput.deepCopyThumbnail`);
   - the **update-to-current** compound op. **Pre-flight**: call a
     newly-exported `checkSceneTimestamp(plot, storyboardId,
     newTimestamp, excludingSceneId)` helper from #215 to detect
     duplicate-timestamp collisions *before* invoking #174; surface
     the Replace / Offset / Cancel prompt on collision. Only on
     pre-check pass do we capture the thumbnail via #174, then call
     `updateScene`. This eliminates the orphan-thumbnail-on-collision
     failure mode documented in research.md R5. On #174 failure
     after pre-check: plot is byte-identical, no asset written;
   - the **edit-from-hard-block** handler that **replaces #217's
     `storyboardEditStub.ts`** (FR-PLAY-019 from #217). Opening the
     edit form from the hard-block modal lands on the missing-data
     edit form with unresolved IDs pre-filled.

5. **Additive extensions to #215 and #174** shipped inside this
   slice's diff (per-user scope fold-in during review):
   - `shared/components/src/storyboard/crud.ts` — add
     `restoreScene(plot, { …, preservedProvenance })`; the only
     write path that accepts a pre-built `provenance[]` (strict
     superset of `createScene`). Used exclusively by
     `undoDeleteScene` to produce byte-identical restoration
     (FR-EDIT-004, SC-003).
   - `shared/components/src/storyboard/crud.ts` — export
     `checkSceneTimestamp(plot, storyboardId, newTimestamp,
     excludingSceneId): SceneFeature | null` as a thin wrapper
     around the internal `findConflictingSceneTimestamp` helper.
     Enables the update-to-current pre-flight check (1A).
   - `shared/components/src/storyboard/index.ts` — export the
     existing internal op union as `StoryboardOp`; #218's
     `StoryboardEditOp = StoryboardOp | 'refresh-thumbnail' |
     'restore' | 'copy-out'` extends rather than duplicates.
   - `apps/vscode/src/services/sceneThumbnailService.ts` — add
     `gcOrphanAssets(plot): Promise<{ reclaimed: string[] }>` that
     scans `item.json` asset entries against live Scene
     `thumbnail_asset_ref` values and unlinks unreferenced PNGs.
     Invoked on plot close (by the `StoryboardEditService` via
     `SessionManager.onPlotClosed`). Satisfies new FR-EDIT-024.
   - `shared/components/src/LogPanel/LogPanel.tsx` — add an optional
     **consecutive-same-op collapse** renderer gated on a new
     setting `debrief.logPanel.collapseConsecutiveSameOp` (default
     on). When the timeline surfaces ≥ 3 consecutive
     `debrief.storyboardEdit` entries with identical `op` + `actor`
     within a 120-second window, render them as a single collapsed
     card showing the count + expand action. Satisfies new
     FR-EDIT-026 (log-card aggregation).

3. **Storyboard edit-log recorder**
   (`services/session-state/src/log/logService.ts`) — extend the
   existing `LogService` interface with a new `recordStoryboardEdit`
   method whose output is a `ToolRunEvent`-shaped `LogEntry` tagged
   with a dedicated sentinel (`debrief.storyboardEdit`). Every
   successful edit op emits exactly one entry carrying: the op name
   (`rename` | `describe` | `delete` | `restore` | `update-to-current`
   | `duplicate` | `copy-in` | `copy-out` | `refresh-thumbnail` |
   `storyboard.rename` | `storyboard.describe` | `storyboard.delete-
   cascade`), the affected Scene + Storyboard `id`s, the current
   `thumbnail_asset_ref` (so #176 can render the card thumbnail),
   the `actor`, and a short summary. If the Log Panel (#176) is
   unavailable, the recorder no-ops silently (Article I.3 gracefully-
   degraded path) — the `HistoryEntry` inside the Feature's
   `provenance[]` (appended by #215) is still authoritative.

4. **Edit commands + scoped contributions**
   (`apps/vscode/src/commands/storyboardEdit.ts`,
   `apps/vscode/src/package.json`) — seven new VS Code commands
   backing the overflow-menu actions
   (`debrief.storyboard.renameScene`,
   `.describeScene`, `.deleteScene`, `.updateSceneToCurrent`,
   `.duplicateScene`, `.copySceneToOtherStoryboard`,
   `.refreshSceneThumbnail`), plus two Storyboard-level commands
   (`debrief.storyboard.renameStoryboard`,
   `.describeStoryboard`). Every command delegates to the edit
   service and is enabled by the same `debrief.storyboardActive`
   context key introduced by #217.

After this slice merges, the full MVP scope of epic #024 is in place:
capture (#216), brief (#217), polish (#218). The edit suite is
reachable end-to-end from inside the Storyboard panel; every op lands
a correct `HistoryEntry` via #215 and a matching card in the Analysis
Log Panel (#176) with the Scene thumbnail attached; stale thumbnails
are flagged and individually refreshable; accidental deletes can be
undone for the rest of the session.

Out of scope (per spec): dedicated distraction-free briefing renderer,
animated time-range Scenes, cross-Storyboard drag-reorder, cross-
session undo, undo-stack depth > 1, video export, Storyboard sharing.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) for the VS Code
extension path, the webview (React 18.x), and the
`shared/components` library additions. No Python additions in this
slice — all Pydantic / LinkML work landed in #215 and the thumbnail
pipeline (#174) stays untouched.

**Primary Dependencies** (all already in the monorepo — **no new
runtime dependencies**):

- `@debrief/components/storyboard` — `updateScene`, `deleteScene`,
  `duplicateScene`, `copySceneToOtherStoryboard`, `renameStoryboard`,
  `detectMissingDataForScene`, `computeFeatureSetHash`,
  `canonicaliseVisibleFeatureIds`, `listScenesOrdered`,
  `formatDtg`, `validatePlot`, `readSceneWithStaleness` (all shipped
  by #215). **Four additive extensions** shipped inside #218's
  diff (three per review fold-in + one per analyze patch I1):
  `restoreScene` (byte-identical undo), `checkSceneTimestamp`
  (pre-flight collision detection for `update-to-current` — 1A),
  the internal `op` union re-exported as `StoryboardOp` (6A — lets
  #218's `StoryboardEditOp` extend rather than duplicate), and
  `describeStoryboard` (analyze patch I1 — keeps the
  Storyboard-description edit path inside #215's module; preserves
  FR-EDIT-022 + SC-009).
- `@debrief/components` — the `StoryboardPanel` (extended by #217),
  `MapView` (read-only here — this slice doesn't touch the map
  overlay), `ThemeProvider` tokens, `vscrui` icons, and **new**
  sub-components `SceneEditForm`, `UndoToast`, `StaleBadge`.
- `@debrief/session-state` — `LogService` (extended with a new
  `recordStoryboardEdit` recorder in this slice), plus unchanged
  `SessionStoreApi.getState()` / `onActiveSessionChange`. **No**
  schema additions in `services/session-state/src/log/types.ts`
  beyond the interface extension.
- `@debrief/schemas` — generated `StoryboardFeature`, `SceneFeature`,
  `Viewport` types (unchanged).
- `@sceneThumbnailService` (from #216) — `captureThumbnail`,
  `deepCopyAsset` (used as the `deepCopyThumbnail` callback for
  #215's `copySceneToOtherStoryboard`). **One additive extension**:
  `gcOrphanAssets(plot)` invoked on plot close to unlink PNG assets
  registered in `item.json` whose Scene was subsequently removed
  (FR-EDIT-024).
- VS Code Extension API ^1.85.0 — `commands.registerCommand`,
  `window.showInputBox` (timestamp-picker and rename prompts),
  `window.showQuickPick` (destination-Storyboard picker),
  `window.showInformationMessage` (undo toast),
  `window.showErrorMessage` (refresh-thumbnail failure,
  deep-copy failure).

**Storage**: No new persisted surfaces. Every edit op round-trips
through the plot FeatureCollection via #215's CRUD module. The
**undo queue is ephemeral** — held in extension memory (keyed by
`documentUri`, the same key `SessionManager` + `StoryboardPlayback-
Service` use) and discarded on plot close or VS Code shutdown. The
**stale flag is derived** — recomputed on plot open from
`feature_set_hash` vs. recomputed hash over currently-resolvable
`visible_feature_ids`; never persisted.

**Testing**:

- `shared/components/src/panels/StoryboardPanel/__tests__/*.test.tsx`
  — extend existing suite with `SceneEditForm` (markdown editor,
  timestamp picker, missing-data remediation buttons), `StaleBadge`
  (tooltip names unresolved IDs, refresh button surfaced), inline
  rename (commit on Enter, cancel on Escape, empty-name rejection
  for Storyboards, titles accepted for Scenes). vitest +
  @testing-library/react. Every Acceptance Scenario from spec.md
  maps 1:1 to a named test case.
- `shared/components/src/panels/StoryboardPanel/*.stories.tsx` —
  extend with `WithEditForm`, `WithUndoToast`, `WithStaleBadge`,
  `WithMissingDataRemediation` stories for Storybook + Playwright
  theme-variant coverage.
- `apps/vscode/src/services/__tests__/storyboardEdit.test.ts` —
  **NEW**; unit tests for the edit service. Each test names exactly
  which FR / Acceptance Scenario it backs:
  - rename / describe / delete success + error paths
    (FR-EDIT-001/002/003, AS-1);
  - soft-delete + undo byte-identical restoration (FR-EDIT-004,
    SC-003, AS-2);
  - undo-queue cap (50 per plot, FIFO, plot-close purge — research.md
    R1);
  - `update-to-current` atomicity on #174 success and #174 failure
    (FR-EDIT-005, SC-002, AS-3);
  - `update-to-current` duplicate-timestamp collision prompt
    (FR-EDIT-006);
  - `duplicate` with default offset + collision prompt (FR-EDIT-007,
    AS-4);
  - `copy-to-other-storyboard` deep-copy success + failure
    (FR-EDIT-008/009, AS-5);
  - stale-detection pass on plot open — `feature_set_hash` match /
    mismatch / partial-resolve cases (FR-EDIT-016/017, SC-004,
    Story-2 AS-1);
  - refresh-thumbnail success + #174 failure byte-identical roll-back
    (FR-EDIT-018/019, SC-005, Story-2 AS-2);
  - LogService `recordStoryboardEdit` emission on every op
    (FR-EDIT-020, SC-006, AS-6);
  - LogService degraded no-op when #176 unavailable (FR-EDIT-021);
  - missing-data routing from hard-block prompt (FR-EDIT-014/015,
    SC-008, AS-7) — verifies this service **replaces** #217's
    `storyboardEditStub.ts` registration.
- `apps/vscode/src/commands/__tests__/storyboardEditCommands.test.ts`
  — **NEW**; unit tests for the nine new command handlers (argument
  validation, quick-pick/input-box flow, error toasts, delegation to
  the service).
- `services/session-state/tests/unit/log/logService.test.ts` — **EDIT**
  to add `recordStoryboardEdit` cases: sentinel value, required fields
  (op, sceneId, storyboardId, thumbnail ref, summary, actor),
  timeline ingestion (the new entry appears in `getTimeline` with the
  right shape), graceful no-op when store path not initialised
  (FR-EDIT-021).
- `tests/e2e/test-storyboard-edit.spec.ts` — **NEW**; Playwright E2E
  driving the preview app through the full polish loop (open plot →
  open panel → rename Scene inline → edit description → delete +
  undo → update-to-current → duplicate → copy-to-other-storyboard →
  refresh stale thumbnail → bulk refresh-all-stale → confirm each op
  lands a card in the Analysis Log Panel, and that consecutive
  same-op cards collapse per FR-EDIT-026). Follows the existing
  webview-E2E patterns (`docs/e2e-testing-guide.md`).
- `apps/web-shell/playwright/tests/storyboard-edit.spec.ts` —
  **NEW**; web-shell E2E capturing workflow-level screenshots +
  interaction GIF for evidence/blog (per plan.md §Web-Shell E2E
  Testing; this is the evidence source per CLAUDE.md web-shell-first
  guidance).

### Test additions from Review (accepted 2026-04-23)

The following tests land alongside the enumerated unit/E2E suites
above. Each traces to a specific review decision.

- **Restore integration (9A)** — `storyboardEdit.test.ts` asserts
  `undoDeleteScene` produces a Scene whose `provenance[]` equals
  `[...preDelete, deleteEntry, restoreEntry]` byte-identically,
  including ordering and every `activity_id`/`used[]`/`generated[]`
  field (FR-EDIT-004, SC-003).
- **Pre-collision check (9B)** — `storyboardEdit.test.ts` injects a
  spy on `sceneThumbnailService.captureThumbnail` and verifies it is
  **not called** when `checkSceneTimestamp` reports a collision for
  `updateSceneToCurrent` (1A regression guard).
- **Two-log-card emission for copy-to-other (9C)** —
  `storyboardEdit.test.ts` asserts `copySceneToOtherStoryboard`
  invokes `logService.recordStoryboardEdit` exactly twice with the
  same `pairActivityId`: once with `op: 'copy-out'` referencing the
  source, once with `op: 'copy-in'` referencing the destination
  (3A).
- **Undo byte-identical hash comparison (9G)** —
  `storyboardEdit.test.ts` asserts `SC-003` via
  `JSON.stringify(plotBeforeDelete) === JSON.stringify(
  plotAfterUndo)` (not field-by-field equality).
- **Stale-pass perf budget (10D)** — new
  `apps/vscode/src/services/__tests__/storyboardEdit.perf.test.ts`
  running on the reference CI runner asserts
  `onPlotOpened(plotWith5x50Scenes)` resolves in ≤ 50 ms; failing
  CI on regression (4A commitment).
- **LinkML validation of the new LogEntry sentinel (10E)** —
  `services/session-state/tests/unit/log/logService.test.ts`
  validates that the output of `recordStoryboardEdit` for every
  value of `StoryboardEditOp` passes the LogEntry JSON Schema
  generated from LinkML (Article II.2 gate).
- **Panel dispatcher tests (10F)** — new
  `apps/vscode/src/views/__tests__/storyboardPanelView.test.ts`
  asserts each of the 9 new outbound message variants (§
  `storyboard-panel-messages.md`) dispatches to the correct
  `StoryboardEditService` method, and each of the 3 new inbound
  variants updates the panel props correctly.
- **External-delete race on undo (10H)** — `storyboardEdit.test.ts`
  asserts that calling `undoDeleteScene` after the Storyboard has
  been externally deleted returns
  `{ kind: "unrecoverable-scene", reason: "storyboard-gone" }` and
  surfaces a specific red toast via the command handler (never
  silent — Article I.3).
- **Orphan-asset gc (FR-EDIT-024)** — new
  `apps/vscode/src/services/__tests__/sceneThumbnailService.gc.test.ts`
  asserts `gcOrphanAssets(plot)` unlinks PNGs whose `item.json`
  entries have no referring Scene; does not touch referenced PNGs;
  returns the list of reclaimed asset hrefs.
- **Bulk refresh-all-stale (FR-EDIT-025)** —
  `storyboardEdit.test.ts` asserts `refreshAllStaleThumbnails`
  iterates every stale Scene, invokes #174 per Scene, emits one log
  card per Scene, and returns an aggregate
  `{ succeeded, failed }` tally.
- **Log-card collapse rendering (FR-EDIT-026)** — new
  `shared/components/src/LogPanel/__tests__/collapse.test.tsx`
  asserts that ≥ 3 consecutive `debrief.storyboardEdit` entries with
  identical `op` + `actor` within 120 s render as a single card
  when the setting is on; render individually when off.

**Target Platform**: VS Code extension host (Node 20+) for the edit
service + command handlers; evergreen Chromium (the VS Code webview
runtime) for the Storyboard panel React components. Code-server and
the web-shell are first-class hosts for E2E verification.
**Offline** — Article I applies; refresh-thumbnail calls #174's
local pipeline, no network path.

**Project Type**: Single-project monorepo extension. Code lands in
existing workspaces — `apps/vscode/` (new service + commands),
`shared/components/` (edit-form + undo-toast + stale-badge sub-
components and panel wiring), plus a targeted extension of
`services/session-state/` to add the `recordStoryboardEdit` recorder.

**Performance Goals**:

- **SC-002 / SC-005 / SC-003** — atomicity under failure AND
  byte-identical undo: hash-based equality check. Test harness
  asserts `JSON.stringify(plotBefore) === JSON.stringify(plotAfter)`
  across every induced-failure run **and** across every
  soft-delete + undo cycle (9G).
- **Stale-detection pass on plot open** completes within **50 ms at
  the spec's performance bound** (≤ 5 Storyboards × ≤ 50 Scenes per
  plot) on the reference CI runner. **CI gates on this bound** — a
  regression fails the build (4A). Pass early-returns when the plot
  has zero Storyboards (11A) — a non-storyboard plot pays zero
  Scene-iteration cost.
- **Undo restoration** completes within one paint frame (no re-
  network, no thumbnail regeneration — the soft-delete keeps the
  asset intact and only reinserts the Feature via `restoreScene`
  with the preserved `idOverride` + `preservedProvenance`).
- **Panel refresh after every edit** is O(active-Storyboard Scenes)
  at spec bound. Invariant documented as an inline comment on
  `storyboardPanelView.refresh()` — expensive work added there will
  break the polish-loop UX (13A sentinel against future drift).

**Constraints**:

- **Offline** — every path (stale detection, refresh thumbnail, undo,
  deep-copy, compound update-to-current) uses Node / browser built-
  ins, #215's module, and #174's local pipeline. No network calls
  introduced (Article I).
- **No silent failures** — refresh-thumbnail failure surfaces a red
  toast and the stale flag persists (FR-EDIT-019); deep-copy failure
  on `copy-to-other-storyboard` surfaces a red toast and no
  destination Scene is persisted (per #215's
  `ThumbnailDeepCopyFailedError`); duplicate-timestamp collisions
  on `duplicate` / `copy-to-other-storyboard` surface the Replace /
  Offset / Cancel prompt; `update-to-current` failures roll back
  atomically with a specific "Scene not changed" toast (Article I.3).
- **No bypass of #215** — every Storyboard / Scene write goes through
  `@debrief/components/storyboard`'s CRUD module; there is no
  direct `plot.features` mutation in this slice. Enforced by an ESLint
  `no-restricted-imports` rule already in place from #217, extended
  with the new edit service path (SC-009).
- **Session-scoped undo** — the undo queue is dropped on
  `SessionManager`'s `onPlotClose` event, not retained across
  sessions, not persisted to disk (FR-EDIT-003, Assumption:
  "Undo window scope"). Article III.1 is preserved: the delete
  op still writes a `delete` `LogEntry` via #215, and the restore
  op adds a `restore` entry — the provenance chain records both.
- **Undo-queue cap** — 50 entries per plot (research.md R1); when
  full, the oldest deleted Scene is **finalised** (the delete log
  entry stays; the Scene is no longer recoverable). Cap is
  documented in the quickstart and tested.
- **All LogService calls are optional-delegate** — the edit service
  holds a `LogService | null` reference (same pattern as
  `MapPanel.setLogService` from #094). If unset, all edit ops still
  succeed (FR-EDIT-021); only the #176 card emission is skipped.
- **Scoped command contributions** — each new command has a
  `when: "debrief.storyboardActive"` contribution clause (context
  set by #217's `StoryboardPlaybackService`). Storyboard CRUD ops
  inherit the same single-flight / in-flight-transition guard
  pattern from #217.
- **Strict types** — `any` / `unknown` prohibited on every new
  public API (Article XV). The webview `postMessage` contract is
  extended via a discriminated union in
  `apps/vscode/src/types/storyboardPanelMessages.ts` (already
  established by #216 / #217). `LogService.recordStoryboardEdit`
  narrows its `op` parameter to a string-literal union of the 12
  edit-op names.
- **No UI imports on the headless core** — `@debrief/components/
  storyboard` is not extended in this slice; all UI wiring lives in
  `shared/components/src/panels/StoryboardPanel/`.

**Scale/Scope**:

- Working plot: ≤ 5 Storyboards × ≤ 50 Scenes (per #215's bound).
- Undo queue: ≤ 50 `DeletedScene` records per plot (research.md R1);
  each record holds the original `SceneFeature` (roughly 2 KB
  including provenance and the asset ref string), so the cap bounds
  memory at ~100 KB per plot.
- Stale-detection pass: ≤ 250 hash recomputations per plot on open
  (5 × 50). Each recomputation is a canonicalise + SHA-256 over the
  joined `visible_feature_ids` — single-digit ms at 50 ids.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Decision | Status |
|---------|----------|--------|
| **I.1 Offline by default** | Every edit path uses Node / browser built-ins + #215's module + #174's local pipeline. No network call introduced. | ✅ Pass |
| **I.3 No silent failures** | Every failure mode has an explicit user surface: refresh-thumbnail fail → red toast + persistent stale flag; deep-copy fail → red toast + no destination Scene; update-to-current fail → atomic rollback + "Scene not changed" toast; duplicate-timestamp collision → Replace / Offset / Cancel prompt (not auto-resolved). | ✅ Pass |
| **I.4 Reproducibility** | Given the same plot state + actor + timestamp, every edit op produces identical `HistoryEntry` contents (op name, used/generated ULIDs). The `now` + `activityId` are injected at the service boundary so test harnesses can stabilise them. | ✅ Pass |
| **II. Schema integrity** | Zero schema edits. All mutations flow through #215's CRUD module; the `LogEntry` shape extended for the new `storyboardEdit` recorder reuses the existing LinkML-derived `LogEntry` type verbatim — only the `was_generated_by.tool` sentinel value is new. | ✅ Pass |
| **III.1 Provenance always** | Every edit op appends exactly one `HistoryEntry` to the affected Feature's `provenance[]` via #215 (guarantee checked by SC-006). The `restore` path explicitly appends a `restore` entry on top of the preserved pre-delete `history`. | ✅ Pass |
| **III.2 Source preservation** | No source files touched. Thumbnail assets are duplicated (not moved) on `copy-to-other-storyboard`; source Scene is untouched on every op. Undo restores the Scene Feature byte-identically (same `id`, same `visible_feature_ids`, same `feature_set_hash`, same pre-delete `provenance`). | ✅ Pass |
| **III.3 Audit trail immutable** | The edit service never reaches into existing `LogEntry` records; it only calls #215's append-only CRUD module and #176's `recordStoryboardEdit` (which goes through the existing LogService `appendEntry` path). | ✅ Pass |
| **IV. Architectural boundaries** | Edit orchestration lives in the VS Code extension (Node runtime + VS Code APIs) — it reads session state, calls #215's CRUD module, calls #174's thumbnail service, and pushes to the webview via typed `postMessage`. Domain logic (hash recomputation, duplicate-timestamp detection, viewport polygon, compound op invariants) stays inside `@debrief/components/storyboard`. Headless panel sub-components (`SceneEditForm`, `UndoToast`, `StaleBadge`) carry zero VS Code imports. | ✅ Pass |
| **V. Extensibility** | The edit service is a first-party singleton; contrib extensions could later register their own storyboard-edit command set without touching core code (same pattern as #217). The `StoryboardPanel` remains presentational; all edit affordances are driven by props. | ✅ Pass |
| **VI. Testing** | Positive + negative test for every Acceptance Scenario enumerated in spec (rename, describe, delete+undo, update-to-current success + fail, duplicate at default + collision, copy-to-other at default + collision + deep-copy fail, refresh stale, missing-data routing, log emission, LogService degraded no-op). E2E covers the polish end-to-end loop (SC-001). **Induced-failure** runs assert byte-identical plot state for SC-002 / SC-005. | ✅ Pass |
| **VII. Test-driven AI collaboration** | Acceptance Scenarios from spec.md map 1:1 to the edit-service unit test names; the spec-quality checklist at `checklists/requirements.md` captures "what good looks like" per user story. | ✅ Pass |
| **VIII. Documentation** | spec.md (shipped), research.md (Phase 0 below), data-model.md (Phase 1 below — view-model-only, no schema), contracts/ (Phase 1 below — edit service, new VS Code commands, panel postMessage delta, LogService extension), quickstart.md (Phase 1 below). All precede implementation. | ✅ Pass |
| **IX. Dependencies** | Zero new runtime dependencies. One zero-impact edit to `apps/vscode/package.json` adding ten new command contributions + one setting contribution. | ✅ Pass |
| **X. Security** | No secrets. No network. Scene thumbnails are re-captured / deep-copied against already-loaded plot data; no classified-data exfiltration vector. | ✅ Pass |
| **XI. Internationalisation** | All user-visible strings (edit-form labels, toast bodies, collision-prompt buttons, stale-badge tooltip, destination-Storyboard quick-pick placeholder) route through the extension's `messages.ts` pattern, keeping them externalisable. | ✅ Pass |
| **XII. Community engagement** | Planning post (Phase 2 below) announces the slice; preview-app screenshot + interaction GIF of the rename → describe → delete → undo → refresh-stale flow will ship with the shipped post after implementation. | ✅ Pass |
| **XIII. Contribution standards** | Atomic commits per section. PR review required. CI gates: lint + typecheck + unit + Storybook-E2E + web-shell-E2E + code-server webview-E2E all green. | ✅ Pass |
| **XIV. Pre-release freedom** | No backwards-compatibility shims. Undo buffer is session-scoped (v1 only). No deprecation periods. | ✅ Pass |
| **XV. Strict type safety** | `any` / `unknown` prohibited on every new API — edit-service public methods, command handler return types, new webview `postMessage` variants, `SceneEditForm` props, `UndoToast` props, `LogService.recordStoryboardEdit` signature. VS Code API modal return values are narrowed to string-literal unions at the boundary. | ✅ Pass |

**Result**: All 15 articles pass. **No Complexity Tracking entries
required.**

## Project Structure

### Documentation (this feature)

```text
specs/218-storyboarding-edit/
├── plan.md              # This file
├── spec.md              # Feature spec (already complete)
├── research.md          # Phase 0 — six research questions resolved
├── data-model.md        # Phase 1 — view-model + undo-buffer types (no schema deltas)
├── quickstart.md        # Phase 1 — end-to-end walk-through of the polish loop
├── contracts/
│   ├── edit-service.md              # StoryboardEditService public API
│   ├── vscode-commands.md           # Ten new command contributions + one setting contribution
│   ├── storyboard-panel-messages.md # Extended postMessage discriminated union delta
│   ├── scene-edit-form.md           # SceneEditForm React props + rendering rules
│   └── log-service-extension.md     # recordStoryboardEdit signature + entry shape
├── checklists/
│   └── requirements.md  # Spec-quality checklist (already complete)
├── media/
│   ├── planning-post.md    # Phase 2 output
│   └── linkedin-planning.md
├── evidence/              # populated during implementation
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/vscode/
├── package.json                                ← EDIT: +10 command contributions (scene rename/describe/delete/update-to-current/duplicate/copy-to-other/refresh-thumbnail + storyboard rename/describe + bulk refresh-all-stale), all with `when: "debrief.storyboardActive"`; +1 setting contribution (`debrief.logPanel.collapseConsecutiveSameOp`, default true)
└── src/
    ├── extension.ts                            ← EDIT: instantiate StoryboardEditService; register edit commands; wire service.onEditCommitted → logService.recordStoryboardEdit; replace #217's `storyboardEditStub` registration with service.onHardBlockEditRequested handler (FR-EDIT-015)
    ├── services/
    │   ├── storyboardEdit.ts                   ← NEW: edit orchestration — undo buffer (Deque<DeletedScene>, cap 50, keyed by documentUri), refresh-thumbnail flow, stale-detection pass on plot open, update-to-current compound op, copy deep-copy callback wire-up
    │   └── __tests__/
    │       └── storyboardEdit.test.ts          ← NEW
    ├── commands/
    │   ├── storyboardEdit.ts                   ← NEW: nine command handlers (delegate to the edit service; handle input-box / quick-pick prompts; surface error toasts)
    │   └── __tests__/
    │       └── storyboardEditCommands.test.ts  ← NEW
    ├── views/
    │   └── storyboardPanelView.ts              ← EDIT: extend postMessage handling for edit-form-opened, edit-form-submitted, rename-committed, undo-clicked, refresh-thumbnail-clicked; pass edit service callbacks into the rendered panel via the existing typed-props channel
    └── types/
        └── storyboardPanelMessages.ts          ← EDIT: extend discriminated union with the above edit-side messages

services/session-state/
└── src/
    └── log/
        ├── types.ts                            ← EDIT: extend `LogService` interface with `recordStoryboardEdit(input): Promise<{ activity_id: string }>`; add `StoryboardEditOp` string-literal union **extending** the re-exported `StoryboardOp` from `@debrief/components/storyboard` (6A); add `STORYBOARD_EDIT_TOOL_SENTINEL = 'debrief.storyboardEdit'` constant; add `pairActivityId` field for copy-to-other paired entries (3A)
        ├── logService.ts                       ← EDIT: implement `recordStoryboardEdit` using the existing `buildLogEntry` + append path; graceful no-op when store path / item path unavailable
        └── entryBuilder.ts                     ← EDIT: helper for the storyboard-edit LogEntry shape (thumbnail ref + pairActivityId carried in the payload; op encoded in `was_generated_by.tool_args.op`)

shared/components/
└── src/
    ├── storyboard/
    │   ├── crud.ts                             ← EDIT (additive): +restoreScene(plot, { …, preservedProvenance }) — strict superset of createScene; only function permitted to accept a pre-built provenance[]. +export checkSceneTimestamp for 1A pre-flight. +describeStoryboard (analyze patch I1) — mirrors renameStoryboard; preserves FR-EDIT-022/SC-009. ~90 LOC total.
    │   ├── index.ts                            ← EDIT: re-export the internal StoryboardOp union (6A); re-export restoreScene + checkSceneTimestamp.
    │   └── __tests__/
    │       └── crud.test.ts                    ← EDIT: +tests for restoreScene (byte-identical provenance preservation, restore-after-cascade error, idOverride enforced); +tests for checkSceneTimestamp.
    └── LogPanel/
        ├── LogPanel.tsx                        ← EDIT: +consecutive-same-op collapse renderer (FR-EDIT-026) — group ≥ 3 consecutive `debrief.storyboardEdit` entries with identical op+actor within 120s window; render as a single collapsed card with count + expand action; gated on `debrief.logPanel.collapseConsecutiveSameOp` setting (default on).
        └── __tests__/
            └── collapse.test.tsx               ← NEW

apps/vscode/
└── src/
    ├── services/
    │   └── sceneThumbnailService.ts            ← EDIT (additive): +gcOrphanAssets(plot): Promise<{ reclaimed: string[] }> — scans item.json asset entries vs live Scene thumbnail_asset_ref; unlinks unreferenced PNGs (FR-EDIT-024). Invoked on plot close by StoryboardEditService.onPlotClosed.
    └── services/__tests__/
        └── sceneThumbnailService.gc.test.ts    ← NEW

shared/components/
├── src/
│   └── panels/
│       └── StoryboardPanel/
│           ├── StoryboardPanel.tsx             ← EDIT: thread edit-related props (onRename, onDescribe, onDelete, onUndo, onUpdateToCurrent, onDuplicate, onCopyToOther, onRefreshThumbnail); render per-row SceneEditForm (expanded-state) + StaleBadge; render UndoToast when a delete is pending; keep presentational (no VS Code imports)
│           ├── SceneEditForm.tsx               ← NEW: markdown editor (textarea + CommonMark preview), timestamp display, missing-data details panel with `Update to current` + `Delete` buttons
│           ├── UndoToast.tsx                   ← NEW: inline transient toast (presentational analogue of the VS Code native notification; renders in Storybook / web-shell where no VS Code host is available)
│           ├── StaleBadge.tsx                  ← NEW: per-row stale indicator + tooltip naming unresolved feature IDs + Refresh thumbnail button
│           ├── StoryboardPanel.stories.tsx     ← EDIT: add WithEditForm, WithUndoToast, WithStaleBadge, WithMissingDataRemediation stories
│           ├── types.ts                        ← EDIT: extend StoryboardPanelProps with **optional+defaulted** edit callbacks + per-Scene `isStale`, `unresolvedFeatureIds`, `editFormOpen` view-model fields (keeps #216 / #217 tests compiling unchanged)
│           └── __tests__/
│               └── StoryboardPanel.test.tsx    ← EDIT: add rename, edit-form submit, undo, stale-badge, missing-data routing cases

tests/e2e/
└── test-storyboard-edit.spec.ts                ← NEW: Playwright E2E through code-server (polish loop)

apps/web-shell/playwright/
└── tests/
    └── storyboard-edit.spec.ts                 ← NEW: web-shell E2E — evidence + blog workflow screenshots and interaction GIF

services/session-state/
└── tests/unit/log/
    └── logService.test.ts                      ← EDIT: +recordStoryboardEdit cases (sentinel, required fields, timeline ingestion, degraded no-op)

.specify/ / CLAUDE.md
└── <no agent-context delta — shared/components + VS Code extension + session-state stack already listed>
```

**Structure Decision**: Single-project monorepo extension. The slice
follows the established `WebviewViewProvider` + shared-React-component
pattern (#176 LogPanel / #216 / #217). New code splits cleanly into:

- **Extension-only** (Node runtime, VS Code API): the
  `StoryboardEditService`, the command handlers, the
  `LogService.recordStoryboardEdit` recorder. These own all
  orchestration, undo-buffer state, VS Code command registration,
  and the thumbnail-service integration.
- **Shared / reusable** (browser runtime, zero VS Code imports): the
  panel sub-components (`SceneEditForm`, `UndoToast`, `StaleBadge`).
  These render identically in Storybook, the web-shell, and the VS
  Code host — no VS Code context required.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| `StoryboardPanel` — edit form open on a Scene row | `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx` (`WithEditForm`) | `storyboard-panel-edit-form.js` | Shows the markdown editor + timestamp display + missing-data details surface — the core polish affordance of the slice. |
| `StoryboardPanel` — undo toast | same file (`WithUndoToast`) | `storyboard-panel-undo-toast.js` | Demonstrates the session-scoped Undo toast after a soft-delete (safety-net narrative). |
| `StoryboardPanel` — stale-thumbnail badge + refresh button | same file (`WithStaleBadge`) | `storyboard-panel-stale-badge.js` | Demonstrates the stale indicator + tooltip + per-Scene refresh action (data-integrity narrative). |
| `StoryboardPanel` — missing-data remediation | same file (`WithMissingDataRemediation`) | `storyboard-panel-missing-data.js` | Demonstrates the edit form landing from #217's hard-block with unresolved IDs pre-filled + `Update to current` / `Delete` routing. |

**Inclusion Criteria Applied**:
- [x] New visual component — `SceneEditForm`, `UndoToast`, `StaleBadge`
      are new sub-components.
- [x] Significant visual change — the Storyboard panel gains inline
      markdown editing, an undo toast, and per-row stale badges.
- [x] Interactive demo adds narrative value — the edit form,
      undo-toast lifecycle, and stale refresh all tell the polish
      story better in Storybook than in prose.

**Bundleability Verified**:
- [x] Stories will exist in Storybook — written alongside the
      sub-component additions.
- [x] Components render standalone — each sub-component receives its
      data via props; no VS Code postMessage or session-state
      context required.
- [x] Reasonable bundle size expected — panel depends only on
      vscrui icons + inline styles + a tiny markdown renderer
      (reuses the `marked` / `react-markdown` dependency already
      present in `shared/components`); estimated total bundle across
      the four stories < 160 KB.

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/panels-storyboardpanel--with-edit-form` (published after PR merge).

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `StoryboardPanel.stories.tsx — WithEditForm` | Rendering, markdown-preview live update, timestamp display, accessibility (`aria-label` on textarea, `role="form"`) | light, dark, vscode | type into textarea, verify preview updates, click `Save description`, click `Cancel` |
| `StoryboardPanel.stories.tsx — WithUndoToast` | Rendering, dismiss on `Escape`, click `Undo` fires `onUndo`, auto-dismiss after long session (simulated), accessibility (`role="status"`, `aria-live="polite"`) | light, dark, vscode | click `Undo`, press `Escape`, verify `onUndo` / `onDismiss` callbacks |
| `StoryboardPanel.stories.tsx — WithStaleBadge` | Rendering, tooltip names unresolved IDs, click `Refresh thumbnail` fires callback, accessibility (`aria-describedby` on the badge) | light, dark, vscode | hover badge (tooltip visible), click `Refresh thumbnail` |
| `StoryboardPanel.stories.tsx — WithMissingDataRemediation` | Rendering, unresolved-ID list visible, two actions (`Update to current`, `Delete`) present, focus-ordering correct | light, dark, vscode | click `Update to current`, click `Delete`, press `Tab` to verify focus order |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input (edit-form save,
      undo, refresh, remediation buttons)
- [x] Accessibility attributes present (`data-testid` +
      `aria-label` / `aria-live` / `role` / `aria-describedby`)
- [x] Screenshots captured for evidence (lives under
      `specs/218-storyboarding-edit/evidence/storybook/`)

**Test File Location**: `shared/components/e2e/StoryboardPanel.spec.ts` (extends existing file from #216 / #217).

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=panels-storyboardpanel--with-edit-form&globals=theme:light
/iframe.html?id=panels-storyboardpanel--with-edit-form&globals=theme:dark
/iframe.html?id=panels-storyboardpanel--with-edit-form&globals=theme:vscode
/iframe.html?id=panels-storyboardpanel--with-undo-toast&globals=theme:light
/iframe.html?id=panels-storyboardpanel--with-undo-toast&globals=theme:dark
/iframe.html?id=panels-storyboardpanel--with-undo-toast&globals=theme:vscode
/iframe.html?id=panels-storyboardpanel--with-stale-badge&globals=theme:light
/iframe.html?id=panels-storyboardpanel--with-stale-badge&globals=theme:dark
/iframe.html?id=panels-storyboardpanel--with-stale-badge&globals=theme:vscode
/iframe.html?id=panels-storyboardpanel--with-missing-data-remediation&globals=theme:light
/iframe.html?id=panels-storyboardpanel--with-missing-data-remediation&globals=theme:dark
/iframe.html?id=panels-storyboardpanel--with-missing-data-remediation&globals=theme:vscode
```

## Web-Shell E2E Testing

*Web-shell is the source of record for workflow-level screenshots
and GIFs destined for evidence/blog (per CLAUDE.md and
`docs/e2e-testing-guide.md` §3).*

| Workflow | Panels/Components Involved | Key Selectors | Interactions |
|----------|---------------------------|---------------|--------------|
| **Rename + describe a Scene** | StoryboardPanel, LogPanel | `[data-testid="scene-row-title"]`, `[data-testid="scene-edit-form"]`, `[data-testid="save-description"]`, `[data-testid="log-panel-card"]` | click Scene title, type new name, press Enter; open edit form, type markdown, click Save; verify two cards in LogPanel |
| **Delete + undo** | StoryboardPanel, UndoToast | `[data-testid="scene-row"][data-scene-id]`, `[data-testid="overflow-delete"]`, `[data-testid="undo-toast"]`, `[data-testid="undo-button"]` | click overflow → Delete; verify toast; click Undo; verify row returns byte-identically |
| **Update to current** | StoryboardPanel, MapView | `[data-testid="overflow-update-to-current"]`, `[data-testid="scene-row"][data-active="true"]` | pan/zoom map; click overflow → Update to current; verify thumbnail + timestamp + viewport refreshed + LogPanel card lands |
| **Duplicate + copy-to-other** | StoryboardPanel | `[data-testid="overflow-duplicate"]`, `[data-testid="overflow-copy-to-other"]`, `[data-testid="storyboard-quickpick"]` | duplicate with default offset; copy to a sibling Storyboard; verify both rows appear, both provenance chains correct, deep-copied thumbnails are distinct files |
| **Refresh stale thumbnail** | StoryboardPanel, StaleBadge | `[data-testid="stale-badge"]`, `[data-testid="refresh-thumbnail"]` | simulate stale state (via fixture hook that mutates `feature_set_hash`); click Refresh thumbnail; verify badge clears + card lands |
| **Missing-data routing from #217 hard-block** | StoryboardPanel (edit form landing) | `[data-testid="missing-data-details"]`, `[data-testid="missing-update-to-current"]`, `[data-testid="missing-delete"]` | land on edit form with unresolved IDs pre-filled; click `Update to current`; verify remediation completes |
| **Analysis Log Panel coverage** | LogPanel | `[data-testid="log-panel-card"][data-op]` | iterate op list (rename, describe, delete, restore, update-to-current, duplicate, copy-in, copy-out, refresh-thumbnail, storyboard.rename, storyboard.describe); verify each card renders thumbnail + summary + actor |

**Testing Strategy**:
- [x] Workflow runs end-to-end in the web-shell
- [x] Page objects in `apps/web-shell/playwright/pages/` extended
      for new selectors (reuse `AnalysisPage` / `CatalogPage` rather
      than duplicating)
- [x] Screenshots + interaction GIF written **directly** into
      `specs/218-storyboarding-edit/evidence/screenshots/` from the
      spec file (follow the path-resolution pattern in
      `apps/web-shell/playwright/tests/properties-screenshots.spec.ts`)

**Test File Location**: `apps/web-shell/playwright/tests/storyboard-edit.spec.ts`

**Run Commands**:
- Cloud: `cd apps/web-shell && node run-playwright.mjs storyboard-edit`
- Local: `pnpm --filter @debrief/web-shell test storyboard-edit`

**Optional — chrome-level VS Code Webview tests**:
`tests/e2e/test-storyboard-edit.spec.ts` runs the same polish loop
through code-server to cover the real VS Code chrome (command
palette, input-box modal, native notifications). Not the source of
record for evidence/blog screenshots.

## Complexity Tracking

**Nothing to justify.** Constitution Check passes all 15 articles with
zero narrow departures. No new runtime dependencies. No new schema
modules. No Python additions. The slice is orchestration +
presentation only, reusing the #215 CRUD module, the #217 panel +
playback surface, the #174 thumbnail pipeline, the existing
`LogService` (extended with one new recorder), and the
`WebviewViewProvider` pattern.
