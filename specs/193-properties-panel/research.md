# Phase 0 Research: Properties Panel (#191)

**Feature branch**: `193-properties-panel`
**Spec**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)

Initial research dispatched in parallel across ActivityPanel/session-state, ParameterEditor/schema-driven forms, StacBrowser/provenance/#135 status. The `/speckit.review` pass then surfaced several corrections to the initial decisions — this document reflects the **final** set (post-review, 13 decisions). Superseded drafts are marked explicitly.

---

## Decision 1: Where Properties lives inside ActivityPanel

**Decision**: Add Properties as a 4th `<PaneSection>` inside `shared/components/src/ActivityPanel/ActivityPanel.tsx` (after the Layers section). Extend `ActivityPanelCollapseState` with `propertiesCollapsed: boolean`. Unlike the other three sections, the Properties section does NOT post a `properties:update` message up to the extension — each field commit goes through `stacService.updateItemMetadata` via a single message (see Decision 2).

**Rationale**: `ActivityPanel.tsx` (lines 449–543) already exposes a `PaneSection` helper that wraps each section in an error boundary + collapse toggle. Adding a fourth section is a structural mirror. Per the post-review architecture (Decision 2), the plot-open surface has no staging layer — each committed edit flows directly through the same service path the StacBrowser uses.

**Alternatives considered**:

- **A separate Properties webview panel** — rejected. Violates the spec's explicit 4th-section requirement and would duplicate VS Code command/panel wiring.
- **Put it inside the existing Tools section as a "meta" tool** — rejected. Metadata editing is not tool execution; provenance semantics differ; collapse state would be coupled to an unrelated feature.

---

## Decision 2: How plot-open edits commit (REVISED BY /speckit.review, was "session-state staging slice")

**Decision**: Drop the `PropertiesSlice` / Zustand-staging approach. Each committed field flows through a single service method on the extension side:

```
PropertiesForm.onCommit(field, value)
  → vscode.postMessage { type: 'properties:commit', storePath, itemPath, patch: { [field]: value } }
  → extension invokes stacService.updateItemMetadata(storePath, itemPath, patch, provenance)
  → updateItemMetadata writes item.json atomically, appends provenance, updates overrides
```

Both surfaces (ActivityPanel and StacBrowser) use the same message type and the same service method. There is no session-state slice, no dirty-trigger registration for properties, no flush-on-save coupling.

**Rationale**: `services/session-state/src/store/index.ts:30` and `store/middleware/dirty.ts:12` are explicit — "Only UI-state fields — data changes are tracked by the Log Service." Feature edits today go through `stacService` directly; the save-on-commit pattern matches that precedent exactly. Staging in Zustand would have introduced a data-in-UI-state pattern this codebase has deliberately avoided, dragging undo/redo, partialize, and persistence into special cases. Direct-write also simplifies the write-safety story: one codepath to make atomic + conflict-checked (Decision 9) rather than two.

**Alternatives considered**:

- **Zustand `PropertiesSlice` + flush on plot save** (the original Decision 2) — rejected by `/speckit.review` as an architectural mismatch. The constitution check in the original plan missed this.
- **Local React state per surface, commit on explicit Save button** — rejected. Adds a per-surface save concept that neither ActivityPanel nor StacBrowser has today, and multiplies UX surfaces.

---

## Decision 3: How the StacBrowser surface writes (CONFIRMED)

**Decision**: Same service method as Decision 2. The StacBrowser surface routes `properties:commit` through the same extension handler; the patch ends up in `stacService.updateItemMetadata` exactly as the ActivityPanel path does.

**Rationale**: Unified service path. No "StacBrowser-only" write logic. FR-005 (no session-state staging) is satisfied trivially because the session-state slice doesn't exist (Decision 2).

---

## Decision 4: Where the Properties side panel lives in StacBrowser

**Decision**: Add Properties as a **new stacked area under the existing `ThumbnailPreview`** inside the list panel's `ResizableSplitPane` (right side). A vertical drag handle separates thumbnail and properties.

**Rationale**: `StacBrowser` today has no dedicated side-detail slot — the existing `ResizableSplitPane` (lines 281–330) splits list-left from thumbnail-right. Stacking properties under the thumbnail reuses the existing split pane with one additional vertical split, rather than introducing a 4th GoldenLayout panel (which would require user-facing layout configuration + persisted layout state).

**Alternatives considered**:

- **Add a 4th GoldenLayout panel** — rejected. Higher friction for the P2 story; analysts would have to drag the panel into view on first use.
- **Tab the ThumbnailPreview with a Properties tab** — rejected. Thumbnail and Properties are not alternatives — analysts want to see both during triage.
- **Modal dialog triggered from context-menu** — rejected. Breaks the flow; spec explicitly asks for an inline side panel.

---

## Decision 4a: How StacBrowser exposes "currently selected item" to sibling panels (ADDED BY /speckit.review)

**Decision**: Introduce a surface-local React context `BrowserSelectionContext` in `shared/components/src/StacBrowser/` holding `{ selectedItemPath: string | null, setSelectedItemPath }`. Both `ThumbnailPreview` and the new `PropertiesSidePanel` consume it via `useContext`. The context lives inside the StacBrowser component tree — NOT in the global session-state store.

**Rationale**: Review Step 3 found `StacBrowser`'s selection today is a one-way `onItemSelect(itemPath)` callback — no shared selection state exists. The plan as drafted assumed such a state. A surface-local context is the minimum needed: it honours the spec's FR-007 intent ("no new global selection store") while being a concrete place for siblings to subscribe.

**Alternatives considered**:

- **Add a `browserSelection` slice to the Zustand store** — rejected. Contradicts the UI-only-state rule and pulls catalog concerns into the document-level store.
- **Prop-drill selection through every intermediate component** — rejected. Ugly and doesn't scale if more siblings (inspectors, metadata details, etc.) want the same signal.

---

## Decision 5: How Properties renders a schema-driven form

**Decision**: Build a new `<PropertiesForm>` component in `shared/components/src/PropertiesPanel/` that:

1. Imports the LinkML-generated JSON Schema via `import schema from '@debrief/schemas/json-schema/debrief.schema.json'` (eager bundle — see Decision 13).
2. Resolves the `StacExtensionProperties` `$def` plus standard STAC fields the analyst should edit (title, description, datetime, start_datetime, end_datetime, bbox).
3. Maps each schema property to either an existing `ParameterEditor` widget (string/number/enum/boolean) or a new widget in the same folder: `ArrayWidget` (chip list for `debrief:tags`/`debrief:feature_tags`), `DateTimeWidget`, `BboxWidget`, `PlatformArrayWidget`.
4. Commits per field on blur or Enter (scalar) or on explicit add/remove for arrays (Decision 6).

**Rationale**: FR-011 mandates the `ParameterEditor` pattern but research confirmed `ParameterEditor` is single-value today (no array, no object, no datetime). "Follow the pattern" here means the same props shape, the same `onCommit(name, value) / onCancel()` lifecycle, and the same styling — not shoehorning new widget types into the existing component. Sibling widgets keep each widget simple and preserve SC-003 (new LinkML field renders with zero panel-component work).

**Alternatives considered**:

- **Hand-author a fixed form** — rejected. Violates FR-003 and SC-003.
- **`react-jsonschema-form` or similar** — rejected. FR-011 forbids new form libraries; Article IX forbids unnecessary dependencies.
- **Cram array/datetime/object into `ParameterEditor`** — rejected. Type discriminator already crowded; sibling widgets keep each widget focused.

---

## Decision 6: Commit boundary for widgets (ADDED BY /speckit.review)

**Decision**: Follow the existing `ParameterEditor` commit discipline.

- Scalar text / number / duration inputs: commit on **blur** or **Enter**; Escape cancels and restores the baseline value.
- Enum / boolean inputs: commit on **change**.
- Array widgets (`ArrayWidget`, `PlatformArrayWidget`): commit on explicit add (click + Enter on the "add" affordance) and explicit remove (click on the chip delete).
- Datetime widget: commit on blur/Enter after the picker finishes.

**Rationale**: Matches the existing `ParameterEditor.onCommit/onCancel` pattern (no new UX model to teach). Makes commit events explicit and testable — the per-commit provenance entry (Decision 7) maps 1:1 to a user action. A debounced auto-commit alternative would race with blur and cause surprising mid-typing writes.

---

## Decision 7: Provenance entry shape (REVISED BY /speckit.review, was "reuse LogService.recordToolResult")

**Decision**: Write provenance directly to a new `debrief:provenance_log` array on `item.properties`. Entry shape:

```typescript
interface PropertiesProvenanceEntry {
  activity_id: string;                    // ULID, unique per commit
  timestamp: string;                      // ISO-8601 UTC, set by the writer
  tool: 'debrief.propertiesPanel';        // sentinel
  method: `properties-panel@${string}`;   // package version
  fields: string[];                       // non-empty list of field names touched
  source: 'user';
}
```

`stacService.updateItemMetadata` is the single writer. No `LogService.recordToolResult` involvement — that method's `used[]` field is interpreted as feature IDs (`logService.ts:163-177`) and would misroute an item-level entry.

**Rationale**: Review found that `LogService.recordToolResult` builds a `FeatureProvenance[]` from `entry.used` and attaches each entry to a matching feature — putting field names in `used[]` would silently misroute. Item-level edits need an item-level log. A new `debrief:provenance_log` array on `item.properties` keeps the entry co-located with the data it describes (single source of truth) and survives catalog copies. Per the constitution's Article III.3 (audit trail immutable), entries MUST NOT be mutated or deleted in place — rotation into an archive file (Decision 12) is the bounded-growth mechanism.

**Alternatives considered**:

- **Reuse `LogService.recordToolResult` verbatim** (original Decision 6) — rejected. Misroutes to features.
- **Anchor-feature pattern mirroring `recordFileSaved`** — rejected. Semantics are misleading: item-level edits attached to a feature imply the feature was modified.
- **Sidecar file per item** — rejected. Breaks single-source-of-truth on `item.json`; survives catalog copies poorly.

---

## Decision 8: Auto-derived vs override semantics (CONFIRMED, SCOPE CLARIFIED)

**Decision**:

1. Introduce `debrief:overrides` array on `item.properties` listing field names the analyst has explicitly overridden.
2. Today's auto-derived set (scoped to what actually runs): `start_datetime`, `end_datetime`, `datetime` — all computed by `stacService.updateTemporalMetadata` (`stacService.ts:1050-1104`).
3. `updateTemporalMetadata` MUST be edited to read `debrief:overrides` and skip listed fields (FR-012). It MUST also become idempotent (no-op when derived equals current) to avoid spurious dirty-marks.
4. Future #135 routines (when they land) MUST consult the same `debrief:overrides` list.
5. "Revert override to auto-derived" is out of scope for v1.

**Rationale**: Review found #135 is not yet live; original Decision 7 overstated the auto-derived set (spatial, platforms) that do not exist today. Scoping the initial override set to what `updateTemporalMetadata` already computes keeps the commitment small and precise. The migration note (`TODO(#137): Delegate to Python MCP tool update_temporal_metadata`) at `stacService.ts:1049` means the override check must survive the Python migration — we implement it TS-side now and port it when #137 ships.

---

## Decision 9: Atomic write + concurrent-edit detection (ADDED BY /speckit.review)

**Decision**: `stacService.updateItemMetadata` MUST:

1. Read `item.json` and record its mtime (or inode + mtime fingerprint) before merging.
2. Merge the patch, update `debrief:overrides` and `debrief:provenance_log` (with archive rotation if needed).
3. Re-stat the file immediately before write; if mtime differs from the initial read, throw a `StaleItemJsonError` — the UI surfaces this as a write-error-state banner and reloads the form from disk.
4. Write to a sibling temp file (`item.json.<pid>.<random>.tmp`) then `fs.renameSync` onto `item.json` (atomic on POSIX + Windows NTFS).
5. Invalidate the item cache.

**Rationale**: Plain `fs.writeFileSync` is non-atomic and last-write-wins — violates FR-014 and Article I.3 (no silent failures). Tmp-file + rename is the standard POSIX atomic-write recipe; mtime check is the lightest concurrency guard that satisfies FR-014 without introducing a locking scheme (out of scope for a single-user desktop app).

**Alternatives considered**:

- **Atomic write only, no concurrency detection** — rejected. Silent last-write-wins.
- **Byte-level content hash** — rejected as overkill for a JSON file that changes on every write anyway.
- **File locking (flock / equivalent)** — rejected. No precedent in the codebase; platform-specific complexity.

---

## Decision 10: Offline-only enforcement in CI (ADDED BY /speckit.review)

**Decision**: Add a vitest test harness setup that patches `globalThis.fetch` and `globalThis.XMLHttpRequest` to throw `OfflineInvariantError("Properties Panel made a network request")` for the duration of PropertiesForm + widget + stacService tests. Harness lives in `shared/components/src/PropertiesPanel/__test__/offlineHarness.ts` and is registered via vitest's `setupFiles`.

**Rationale**: SC-005 (offline-only) is constitutional (Article I.1). A manual quickstart step is the weakest possible guarantee — anyone adding a library with a network call could regress it silently. A fetch-mock harness is a ~30-line file that catches the regression at test-authoring time.

---

## Decision 11: Schema-evolution smoke test in CI (ADDED BY /speckit.review)

**Decision**: Add `tests/fixtures/properties-panel/evolving-schema.yaml` — a toy LinkML schema with an extra field `debrief:test_note`. A dedicated vitest test generates TypeScript + JSON Schema from this fixture via the LinkML generator, mounts `PropertiesForm` with the generated schema, and asserts the new input renders. Gate this as a CI step named `properties-panel-schema-evolution`.

**Rationale**: SC-003 (schema-driven extensibility) is the central architectural guarantee — the whole point of using LinkML. A manual quickstart step to verify it means regressions ship silently. Automating it as a CI gate codifies SC-003.

---

## Decision 12: Provenance log growth bound (ADDED BY /speckit.review)

**Decision**: Cap `item.properties["debrief:provenance_log"]` at **500 entries**. When a commit would exceed the cap, rotate the oldest entries into a sibling file `<item_directory>/provenance_log_archive.jsonl` (newline-delimited JSON, append-only). The active array stays bounded; the archive preserves the full audit trail (Article III.3). Archive-file write uses the same atomic temp+rename recipe as Decision 9.

**Rationale**: Monotonic growth of `debrief:provenance_log` would bloat `item.json` over a long-lived plot; read-rewrite-on-every-commit is O(N) in log size. A ring-buffer would violate Article III.3 (audit trail immutable). Rotate-to-archive preserves immutability while keeping the hot-path O(cap). 500 is a soft upper bound picked to cover "a day of heavy editing" (hundreds of small tweaks) without rotating prematurely; tune later if needed.

**Alternatives considered**:

- **No cap** — rejected. Read-rewrite slows monotonically; eventually user-visible.
- **Ring buffer of last-N** — rejected. Violates Article III.3.
- **Rotate at catalog level (cross-item)** — rejected. Material scope creep; captured as a backlog item for follow-up.

---

## Decision 13: LinkML JSON Schema bundling (ADDED BY /speckit.review)

**Decision**: Bundle `@debrief/schemas/json-schema/debrief.schema.json` eagerly into the webview bundles that mount `PropertiesForm`. No dynamic import.

**Rationale**: The schema is a few thousand lines of JSON — KBs, not MBs. Eager bundling is the simplest path and carries no meaningful bundle-size cost at the scale the application runs at. A lazy-import alternative optimises a non-problem.

---

## Decision 14: Storybook + E2E coverage strategy (CONFIRMED, EXTENDED)

**Decision**: Storybook stories for `<PropertiesForm>` and each new widget in `shared/components/src/PropertiesPanel/`. Playwright component E2E tests under `shared/components/e2e/` covering form render + validation + dirty-commit lifecycle in light/dark/vscode themes. Webview E2E under `tests/e2e/` covering:

1. ActivityPanel round-trip (open plot → edit tag → commit → reload plot → tag persisted → provenance entry present).
2. StacBrowser round-trip (no plot → select item → edit title → commit → reload browser → title updated).
3. Override survival (edit `start_datetime` → trigger `updateTemporalMetadata` → override survives).
4. Stale-edit detection (edit `item.json` out-of-band → commit → stale-edit error surfaces).
5. Offline-invariant (network mock → all scenarios still pass).

**Rationale**: Article VI (testing) + `docs/e2e-testing-guide.md`. Covers each new codepath identified in the test-review diagram with either unit, integration, component-E2E, or webview-E2E. Offline + schema-evolution gates (Decisions 10, 11) are CI-level invariants that complement the per-scenario tests.

---

## Open questions intentionally left for `/speckit.clarify` (optional)

None. All `NEEDS CLARIFICATION` candidates and `/speckit.review` findings resolved. `/speckit.tasks` is next.
