# Feature Specification: Kind discriminator for TimelineEntry

**Feature Branch**: `208-timeline-entry-kind`
**Created**: 2026-04-22
**Status**: Draft
**Input**: User description: "Add `kind` discriminator to `TimelineEntry` — extend the UI projection in `shared/components/src/LogPanel/types.ts` with `kind?: 'snapshot' | 'tool' | 'tune'`, populated by the VS Code host in `apps/vscode/src/views/logPanelView.ts`. Feature 176 decision 2A detects snapshot entries via `ToolCategory === 'snapshot'` — works short-term but conflates *visual category* with *entry semantics*. Future features (snapshot button, tune marker, manual rationale entries) need a proper discriminator. (follow-up to #176, depends on PROV-side signal)"

## Context

This is a **tech-debt refactor** follow-up to feature 176 (log-panel UX). Today, the LogPanel's timeline distinguishes "snapshot" entries from regular tool entries by inspecting the entry's **visual category** (`resolveToolCategory(toolName).category === 'snapshot'` in `LogEntry.tsx:114`). That works as a short-term signal because only the manual-checkpoint tool is assigned the snapshot category today, but it conflates two orthogonal concerns:

- **Visual category** — how an entry is *drawn* (icon, colour chip).
- **Entry semantics** — what an entry *is* (tool invocation, manual checkpoint, tune step).

As new entry types land — snapshot button affordances, tune markers rendered inline rather than as annotations, manually-authored rationale-only entries — the "detect by visual category" shortcut will either silently misclassify or force category assignments purely to trigger behaviour. We need a semantic discriminator that is independent of rendering choices.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Replace the visual-category snapshot check with a semantic discriminator (Priority: P1)

A developer working on the LogPanel needs to know "is this entry a snapshot?" to decide whether to render a boundary separator, expose a snapshot-only affordance, or exclude the entry from replay in specific ways. Today they must ask the rendering layer ("what colour chip does this tool get?") to answer a semantic question. After this feature, the TimelineEntry carries a `kind` field that answers the semantic question directly, and every existing snapshot-detection call site has been migrated to use it.

**Why this priority**: This is the core deliverable. Without it, future features either continue to misuse visual category as a semantic signal (increasing tech debt) or invent parallel ad-hoc discriminators (multiplying tech debt). Migration of existing call sites is part of P1 so the refactor actually discharges the debt rather than adding an unused field.

**Independent Test**: Grep for existing uses of `ToolCategory === 'snapshot'` (and equivalent category-based semantic checks); confirm each has been replaced with `entry.kind === 'snapshot'`; run the existing LogPanel unit and Storybook tests to confirm the visible behaviour (boundary separator, action-bar state) is unchanged.

**Acceptance Scenarios**:

1. **Given** an entry representing a manual checkpoint, **When** the timeline is rendered, **Then** the entry's `kind` is `'snapshot'` and the snapshot boundary separator is shown — using the discriminator, not the tool-category lookup.
2. **Given** an entry representing a regular tool invocation (e.g. calculate-range), **When** the timeline is rendered, **Then** the entry's `kind` is `'tool'` and no snapshot-specific UI is applied.
3. **Given** the codebase as it exists after this feature ships, **When** a developer searches for snapshot detection logic, **Then** the only code path gating snapshot-specific behaviour reads `entry.kind`; the `ToolCategory === 'snapshot'` pattern no longer appears as a semantic gate (it may still legitimately appear for rendering decisions).

---

### User Story 2 — Future-proof the discriminator for tune and other entry kinds (Priority: P2)

The discriminator's value type is a closed union (`'snapshot' | 'tool' | 'tune'`). A developer adding a future feature (tune marker, manual rationale entry, etc.) should be able to extend the union in one place and get a compile error at every switch/branch that has not been updated.

**Why this priority**: Separated from P1 because it is about the *shape* of the contract rather than the immediate migration. Without this, the discriminator could still be written as a stringly-typed field and future additions would silently pass through unrecognised values.

**Independent Test**: Introduce a hypothetical new kind value in a test branch (e.g. `'rationale'`); confirm the TypeScript compiler flags every switch/branch that does not yet handle it. No runtime change required.

**Acceptance Scenarios**:

1. **Given** a switch/branch on `entry.kind`, **When** a new value is added to the union, **Then** the TypeScript compiler reports a non-exhaustive switch at that call site.
2. **Given** the VS Code host's projection function, **When** the LogEntry it projects does not clearly map to a known kind, **Then** the projection returns a documented fallback value (`'tool'`) rather than `undefined` or a thrown error.

---

### User Story 3 — Source the kind from an explicit PROV signal rather than tool-name heuristics (Priority: P3)

The backlog entry notes the feature "depends on PROV-side signal." The host-side projection (`toTimelineEntry` in `apps/vscode/src/views/logPanelView.ts`) must derive `kind` from an explicit field in the LogEntry schema (or a documented combination of existing schema fields), not from hard-coded tool-name matching such as `tool === 'manual-checkpoint'`.

**Why this priority**: P3 because if a temporary heuristic is the only way to unblock P1 and P2, the refactor still delivers most of its value and a follow-up can replace the heuristic. But shipping the feature without any explicit signal source would reintroduce the same conflation at a new layer.

**Independent Test**: Inspect the projection function — the path that sets `kind` must reference either (a) a semantic field on `LogEntry`, or (b) a single documented helper whose definition is based on semantic fields. No tool-name string literals for kind classification.

**Acceptance Scenarios**:

1. **Given** a LogEntry ingested from a PROV record, **When** the host projects it to a TimelineEntry, **Then** `kind` is set from an explicit semantic signal on the record (see Assumptions for signal choice).
2. **Given** the snapshot-entry path, **When** the manual-checkpoint tool is later renamed or a second snapshot-producing tool is added, **Then** no code change is required in the host projection for the new tool to be correctly classified as `kind: 'snapshot'`.

### Edge Cases

- **Entry with a `tune` annotation attached to a tool invocation** — today, tune is an *annotation* on an existing tool entry, not a separate timeline entry. The kind of such an entry remains `'tool'`; the presence of a tune annotation does not flip it to `'tune'`. The `'tune'` kind value is reserved for a future entry type representing a standalone tune action.
- **Legacy LogEntry records missing the PROV-side signal** — the projection must fall back to `'tool'` (documented default) and must not throw. The field is declared optional on TimelineEntry precisely to admit this case during the transition.
- **An entry matching multiple kind hints (e.g. manual-checkpoint tool + tune annotation)** — the PROV-side signal is authoritative; the projection must not try to reconcile competing hints by voting.
- **A `resolveToolCategory` call still returning `'snapshot'` after this feature ships** — allowed, but must only influence *rendering* (icon, colour chip). Any code that uses the category to gate *behaviour* (separator, action-bar entries, replay semantics) is a regression.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `TimelineEntry` UI projection MUST carry an optional `kind` field whose value, when present, is one of `'snapshot'`, `'tool'`, or `'tune'`. The set MUST be a closed union so the TypeScript compiler can enforce exhaustiveness at switches.
- **FR-002**: The VS Code host's LogEntry-to-TimelineEntry projection MUST populate `kind` for every entry it emits, using the PROV-side signal described in FR-005.
- **FR-003**: Every call site that today uses the visual tool-category (`ToolCategory === 'snapshot'` or equivalent) as a *semantic* gate for snapshot-specific behaviour MUST be migrated to read `entry.kind === 'snapshot'` instead. Call sites that use tool category for *rendering* decisions (icon, colour) are out of scope and MUST be left unchanged.
- **FR-004**: The observable behaviour of the LogPanel — which entries show a snapshot boundary separator, which entries expose snapshot-only action-bar items, etc. — MUST be unchanged for the sample data sets in use at the time of this feature. No visible regressions in existing Storybook stories or web-shell flows.
- **FR-005**: The kind classification MUST derive from an explicit signal on the LogEntry schema (see Assumptions for the chosen signal), not from hard-coded tool-name matching in the projection layer.
- **FR-006**: When the PROV-side signal is absent (e.g. legacy records), the projection MUST fall back to `kind: 'tool'` and MUST NOT throw. The fallback path MUST be covered by a unit test.
- **FR-007**: The feature MUST NOT introduce any new runtime dependency, schema generator, or build step. It is a type-surface change plus a small host projection edit plus call-site migrations.
- **FR-008**: The feature MUST NOT modify the rendering semantics of the visual tool-category system (`ToolCategory`, `ToolCategoryConfig`, `ToolCategoryIcon`). Those continue to drive icon and colour chip; only the semantic-gate usages of `'snapshot'` migrate.

### Key Entities

- **TimelineEntry (UI projection)**: Display-oriented record derived per feature from a PROV LogEntry. After this feature, it exposes a semantic `kind` field alongside the existing `operationCategory` (which is about the *operation* the tool performs, e.g. `calculation`, not about the *entry kind*).
- **LogEntry (PROV schema)**: Append-only provenance record persisted on features. The PROV-side signal that drives `kind` lives here (see Assumptions).
- **Entry kind values**:
  - `'snapshot'` — a manual checkpoint entry, rendered with a boundary separator and exposing snapshot-specific affordances.
  - `'tool'` — a regular tool invocation. Default.
  - `'tune'` — reserved for a future standalone tune entry type; not emitted by this feature but included in the union so consumers are forced to consider it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero occurrences of tool-visual-category (`ToolCategory === 'snapshot'` and equivalents) remain as *semantic gates* in the codebase after the feature ships. Verified by a grep in the reviewer checklist and covered by a lightweight drift test.
- **SC-002**: 100% of TimelineEntry records emitted by the VS Code host's LogEntry projection carry a non-null `kind` value for the sample data sets in use (verified by a unit test over the full sample catalogue).
- **SC-003**: All existing LogPanel Storybook stories, LogPanel unit tests, and web-shell E2E snapshot-aware flows pass unchanged — i.e. the refactor produces zero visible regressions.
- **SC-004**: A developer adding a fourth `kind` value receives a TypeScript compile error at every consumer switch/branch that does not yet handle it. Verified by a deliberate-regression unit test that adds a new literal and asserts non-exhaustiveness.
- **SC-005**: The host projection does not reference any tool-ID string literal as part of kind classification. Verified by reviewer grep against the final diff.

## Assumptions

- **A1 — PROV-side signal is a new optional `activity_type` field on `LogEntry`**: The backlog item states the feature "depends on PROV-side signal." The most defensible and extensible source is an explicit optional `activity_type` field on `LogEntry` in `shared/schemas/src/linkml/log-entry.yaml`, with enumerated values mirroring the TimelineEntry kind union (`snapshot`, `tool`, `tune`). The field is optional for backward compatibility with existing records. If a reviewer finds a suitable existing signal already present in the schema, the feature should prefer that and skip the schema change — but no such field exists today (verified against the schema at spec time).
- **A2 — `'tune'` is reserved, not emitted**: No existing entry type maps to `'tune'` today. This feature declares the value in the union so future features can extend the discriminator without another migration, but the projection will not emit `'tune'` for any record. This keeps scope bounded.
- **A3 — Tune annotations do not change entry kind**: An entry whose `tune` annotation field is non-null remains `kind: 'tool'`. Tune annotations are a property of tool entries, not a separate kind.
- **A4 — Default fallback is `'tool'`**: When the PROV-side signal is absent or unrecognised, the projection falls back to `'tool'`. This matches today's implicit assumption that every LogEntry is a tool invocation.
- **A5 — No visual changes to `ToolCategory`**: The visual category `'snapshot'` stays in `ToolCategory`. The refactor migrates *semantic-gate* usages only.

## Dependencies

- **D1 — Feature 176 (log-panel UX)**: This feature is a direct follow-up; it replaces the decision-2A detection path introduced there.
- **D2 — LinkML schema regeneration**: If A1 holds (new `activity_type` field), the feature requires regenerating `debrief-schemas` TypeScript + Pydantic outputs. This is an existing workflow; no new tooling.
- **D3 — No dependency on #176 T007/T008 or #209 (a11y audit)**: This feature is orthogonal to accessibility and roving-tabindex work.

## Out of Scope

- Emitting `kind: 'tune'` for any entry — reserved for a future feature.
- Introducing a `'rationale'` or other new kind value — future extension; the union stays at three values.
- Changing the visual appearance of any entry type.
- Migrating `operationCategory` (which is a separate concern: *operation kind*, not *entry kind*).
- Refactoring or renaming `ToolCategory`.
- Adding snapshot-button, tune-marker, or manual-rationale-entry UI — those are the *future features* this refactor unblocks, not part of it.
