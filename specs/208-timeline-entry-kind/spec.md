# Feature Specification: Timeline Entry `kind` Discriminator

**Feature Branch**: `208-timeline-entry-kind`
**Created**: 2026-04-22
**Status**: Draft
**Input**: User description: "Add `kind` discriminator to `TimelineEntry` — extend the UI projection in `shared/components/src/LogPanel/types.ts` with `kind?: 'snapshot' | 'tool' | 'tune'`, populated by the VS Code host in `apps/vscode/src/views/logPanelView.ts`. Feature 176 decision 2A detects snapshot entries via `ToolCategory === 'snapshot'` — works short-term but conflates *visual category* with *entry semantics*. Future features (snapshot button, tune marker, manual rationale entries) need a proper discriminator. (follow-up to #176, depends on PROV-side signal)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Clean discriminator replaces the category-as-semantics shortcut (Priority: P1)

A developer working on the LogPanel renderer (or any downstream consumer of `TimelineEntry`) needs to know "what kind of entry is this?" without inspecting the entry's visual category. Today, a snapshot entry is detected by `ToolCategory === 'snapshot'` — a string match that couples *how the entry is categorised for display* with *what the entry represents semantically*. When a future feature (for example, a manual snapshot captured via a button rather than a tool invocation) needs to be flagged as a snapshot, it has no natural place to declare that without either faking a `ToolCategory` value or adding ad-hoc flags.

This story delivers a dedicated `kind` field on the UI projection of `TimelineEntry` — populated by the VS Code host — that expresses entry semantics independently of category. Consumers read `entry.kind` rather than `entry.toolCategory === 'snapshot'`.

**Why this priority**: Without the discriminator, every future timeline-entry kind (snapshot button, tune marker, manual rationale) repeats the category-conflation workaround. The discriminator is the foundation that subsequent features depend on.

**Independent Test**: Confirm that a `TimelineEntry` reaching the LogPanel carries a `kind` value drawn from the declared union, that the LogPanel's snapshot-specific rendering path keys off `kind === 'snapshot'`, and that no code path inside the LogPanel reads `ToolCategory` to infer entry semantics.

**Acceptance Scenarios**:

1. **Given** a tool-invocation entry that today renders as an ordinary timeline row, **When** the VS Code host emits the entry, **Then** the entry carries `kind: 'tool'` and the LogPanel renders it exactly as it does today.
2. **Given** an entry that today is classified by `ToolCategory === 'snapshot'`, **When** the VS Code host emits the entry, **Then** the entry carries `kind: 'snapshot'` and the LogPanel renders it with the snapshot presentation inherited from feature 176 decision 2A.
3. **Given** any `TimelineEntry` reaching the LogPanel, **When** a snapshot-specific rendering decision is made, **Then** that decision is derived from `kind`, not from `ToolCategory`.

---

### User Story 2 - Contract admits future `'tune'` without changing call sites (Priority: P2)

A developer planning the upcoming tune-marker feature (and a richer manual-snapshot flow) needs a contract that can carry the new entry kinds when a PROV-side signal makes them available. The discriminator union (`'snapshot' | 'tool' | 'tune'`) reserves the `'tune'` value now, so that when the PROV signal lands the only change is at the populator — no downstream consumer has to revise its type contract.

**Why this priority**: Reserves the shape; avoids a second contract-revision churn when `'tune'` lands. Lower priority than Story 1 because no consumer emits or renders `'tune'` in this feature.

**Independent Test**: Confirm that the declared union includes `'tune'`, that a test-only fixture producing a `kind: 'tune'` entry type-checks against every consumer's signature without modification, and that the LogPanel does not crash when it encounters such an entry (graceful fallback to tool-row rendering is acceptable until tune-specific rendering arrives).

**Acceptance Scenarios**:

1. **Given** the `TimelineEntry` contract, **When** a consumer declares a handler for `kind`, **Then** `'tune'` appears as an admissible value.
2. **Given** an entry with `kind: 'tune'` constructed in a test fixture, **When** the LogPanel renders it, **Then** the panel renders without error (visually equivalent to a tool row is acceptable).

---

### User Story 3 - No visible regression for users of today's LogPanel (Priority: P3)

A user watching the LogPanel in VS Code must see no difference in behaviour from this change alone. Every entry that renders as a snapshot today continues to render as a snapshot; every entry that renders as an ordinary tool row today continues to render as an ordinary tool row.

**Why this priority**: This is a refactor, not a feature redesign. User-visible stability is a constraint, not a new value delivery — hence P3.

**Independent Test**: Compare LogPanel rendering against a representative session (mix of tool entries and snapshot entries) before and after the change; confirm identical visible output.

**Acceptance Scenarios**:

1. **Given** a pre-change and post-change LogPanel rendering the same session log, **When** the two are compared side by side, **Then** every row renders identically (row type, label, iconography, ordering).

---

### Edge Cases

- **Entry with no category information**: An entry whose upstream source does not expose a `ToolCategory` value MUST still be assigned a `kind` by the VS Code host. The default is `'tool'`.
- **Entry emitted before the host populator runs**: The UI projection field is declared optional (`kind?`), so a test fixture or partial mock lacking `kind` does not fail type-checking. The LogPanel MUST fall back to today's behaviour (treat as an ordinary tool row) when `kind` is absent, to prevent crashes in edge cases where the populator is bypassed.
- **Unknown `kind` value reaches the panel** (for example, a future populator writes a value outside the current union): The LogPanel MUST render a tool-row fallback rather than error — future discriminator extensions remain additive.
- **`'tune'` entries emitted during this feature**: None are expected — no populator path in this feature produces `'tune'`. If one appears in a test, it is treated under the fallback rule above.
- **Interaction with #207** (tool manifest lookup): If #207 changes how `ToolCategory` is resolved (from legacy heuristics to manifest lookup) while #208 is in flight, the interim populator MUST continue to map whichever source #207 provides: `ToolCategory === 'snapshot'` → `kind: 'snapshot'`, otherwise `kind: 'tool'`. No semantic conflict; light ordering coordination only.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `TimelineEntry` UI projection MUST declare an optional `kind` field whose value is drawn from the union `'snapshot' | 'tool' | 'tune'`.
- **FR-002**: The VS Code host MUST populate `kind` on every `TimelineEntry` it forwards to the LogPanel.
- **FR-003**: For the interim populator, entries that today are detected by `ToolCategory === 'snapshot'` MUST be populated with `kind: 'snapshot'`; all other entries MUST be populated with `kind: 'tool'`.
- **FR-004**: The LogPanel renderer MUST derive snapshot-specific rendering decisions from `kind === 'snapshot'`, not from `ToolCategory === 'snapshot'`.
- **FR-005**: The contract MUST admit `'tune'` as a valid value of `kind`, even though no populator in this feature emits it. Populators for `'tune'` (and for richer `'snapshot'` semantics such as manual snapshot entries and tune markers) are explicitly out of scope and land with a future PROV-side signal.
- **FR-006**: The LogPanel's pre-change visible behaviour MUST be preserved — every row that rendered as a snapshot before this change MUST render as a snapshot after it, and every row that rendered as a tool row before MUST render as a tool row after.
- **FR-007**: When a `TimelineEntry` reaches the LogPanel with `kind` absent, or with a value outside the current union, the renderer MUST fall back to the tool-row rendering path rather than error.
- **FR-008**: Snapshot-specific code paths in the LogPanel MUST NOT reference `ToolCategory` for entry-semantics purposes after this change. (`ToolCategory` may still be consulted for its intended visual-category purpose, for example icon selection.)
- **FR-009**: The change MUST be implemented such that adding a new `kind` value in the future forces an explicit decision at every call site that enumerates `kind` values — no silent fallthrough should mask an unhandled kind during development.

### Key Entities

- **TimelineEntry** (UI projection): The per-row payload the LogPanel receives. Gains an optional `kind` field. Continues to carry its existing fields (including the visual category it uses for icon/colour choice); `kind` does not replace those fields.
- **`kind` discriminator**: A string drawn from the union `'snapshot' | 'tool' | 'tune'`.
  - `'snapshot'` — a distinguished moment in the session (today sourced from the `ToolCategory === 'snapshot'` signal; in the future also from a manual snapshot button and other PROV-side signals).
  - `'tool'` — an ordinary tool invocation.
  - `'tune'` — a reserved value for future analytical-adjustment / tune-marker entries; no populator emits it in this feature.
- **Interim populator** (in the VS Code host): The code path that reads the underlying log source and decides a `kind` value. In this feature, its decision table is deliberately simple: `ToolCategory === 'snapshot'` → `'snapshot'`, otherwise → `'tool'`. When the PROV-side signal arrives, this table is extended in a subsequent feature without changing the `TimelineEntry` contract.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero user-visible regressions in the LogPanel — a row-by-row comparison of a representative session log rendered before and after the change shows 100% visual parity (row type, label, iconography, ordering).
- **SC-002**: 100% of `TimelineEntry` items reaching the LogPanel in a representative session carry a defined `kind` value drawn from the declared union. No entry reaches the LogPanel with an undeclared or out-of-union `kind`.
- **SC-003**: No remaining references to `ToolCategory === 'snapshot'` (or string-equivalent comparisons against `ToolCategory` for entry-semantics purposes) in LogPanel rendering code. A code search returns zero hits in the LogPanel sources.
- **SC-004**: A future feature that introduces a new `kind` value — for example, adding `'annotation'` to the union — can do so by extending the union in one place; every downstream exhaustiveness site surfaces a type-check failure until it is updated. Verified by a thought-experiment diff (no new value added in this feature, but the contract shape demonstrably supports the pattern).
- **SC-005**: The interim populator's decision table fits on a single screen (≤ 10 lines of mapping code) and is colocated with the host-to-projection conversion step in `apps/vscode/src/views/logPanelView.ts`, making it a single, obvious point of extension when the PROV-side signal lands.

## Assumptions

- **No new user-facing UI in this feature.** The discriminator is a data-contract addition. The LogPanel gains no new visible states, no new user interactions, no new screens. The "User Interface Flow" section is intentionally omitted from this specification because the feature preserves today's visible behaviour exactly; any new visible behaviour (snapshot button, tune marker, manual rationale entries) lands in subsequent features that consume the discriminator.
- **`'tune'` is reserved, not delivered.** The contract admits `'tune'`; no populator emits it in this feature. The populator that emits `'tune'` is a future feature and depends on a PROV-side signal that is out of scope here. This spec defines the contract shape so that future feature is a populator change, not a type-contract revision.
- **Today's snapshot-detection heuristic is preserved, not audited.** This feature does not re-evaluate whether every entry currently classified as `ToolCategory === 'snapshot'` is *semantically* a snapshot. It takes today's classification as the interim ground truth and maps it one-to-one onto `kind: 'snapshot'`. Re-classification — if ever needed — lands with the PROV-side signal.
- **`ToolCategory` is retained for its visual-category role.** The discriminator does not replace `ToolCategory`; it augments it. `ToolCategory` continues to drive visual concerns such as icon and colour selection; `kind` drives entry-semantics concerns such as "is this a snapshot?". The two fields co-exist and may legitimately disagree (for example, a future manual snapshot entry with `kind: 'snapshot'` but a non-snapshot `ToolCategory`).

## Dependencies and Sequencing

- **Follow-up to #176** (decision 2A): This feature replaces the short-term `ToolCategory === 'snapshot'` detection introduced in feature 176 with a proper discriminator. Feature 176 must be merged; it is.
- **Soft ordering with #207** (tool manifest lookup for category resolution): #207 changes how `ToolCategory` is computed (manifest lookup vs. legacy heuristics) and touches the same host file (`apps/vscode/src/views/logPanelView.ts`) as this feature. The two features do not conflict semantically — #208's interim populator maps whatever `ToolCategory` value #207 produces. If both are in flight in parallel worktrees, expect a light merge in the host file; if sequenced, #207 before #208 is marginally cleaner (fewer churned lines) but neither order blocks the other.
- **Future dependency**: A PROV-side signal that carries richer entry-semantics information. When that signal arrives, the interim populator is extended to read it and to emit `kind: 'tune'` (and richer `'snapshot'` classifications). That extension is a future feature; this feature's contract is shaped to absorb it without a second revision.
