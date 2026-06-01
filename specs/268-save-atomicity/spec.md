# Feature Specification: Atomic (Transactional) Plot Save

**Feature Branch**: `268-save-atomicity`
**Created**: 2026-06-01
**Status**: Draft
**Input**: Backlog item #268 — "VS Code save atomicity (broader)". Make a plot save all‑or‑nothing: the writes that make up one save (the feature collection, the STAC item metadata, and the thumbnail assets) must commit as a single unit, so a failure or interruption partway through can never leave the analyst with a half‑updated, corrupt, or internally‑inconsistent plot.

## Context *(why this exists)*

A "Save" of a plot is not one write — it is several. The current save flow performs them independently and reports success too early:

- The feature collection (`features.geojson`) is written with a direct, non‑atomic file write that **bypasses the shared persistence boundary** — a reader can observe a half‑written file, and the write benefits from none of the boundary's guarantees.
- The thumbnail/overview images and the STAC item metadata are written separately, through the persistence boundary, **after** the analyst has already been shown "Plot saved" and the unsaved‑changes indicator has already been cleared.

Because these writes are independently committable, a real‑world failure between them (disk full, permission denied, browser storage quota, or an outright process kill / power loss) can leave any subset updated: a new feature collection paired with stale thumbnails, a torn `features.geojson`, or a plot the analyst believes is saved when it is not. A single‑file atomic‑write primitive already exists, but there is no way to commit *multiple* writes as one unit, and the feature‑collection write does not even use the single‑file primitive.

This was a deliberately parked tech‑debt item; this specification is authored on explicit request to address it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A failed save never corrupts my plot (Priority: P1)

As an analyst, when I save a plot and something goes wrong partway through the save, I am left with a *coherent* plot — either the complete new version or the complete previous version — never a mixture of the two.

**Why this priority**: This is the core of the ticket. A partially‑applied save is silent data corruption: the analyst's plot of record becomes internally inconsistent (e.g. new tracks but old thumbnail, or an unreadable feature file). Preventing that is the whole point.

**Independent Test**: Drive a save while injecting a failure at each distinct write step (feature collection, STAC item, each thumbnail asset). After every injected failure, open the plot and assert it loads cleanly as exactly one coherent version, with features and metadata/thumbnails agreeing.

**Acceptance Scenarios**:

1. **Given** a previously‑saved plot, **When** the analyst saves changes and the thumbnail write fails, **Then** opening the plot shows either the complete new state (with new thumbnails) or the complete previous state — not new features with stale thumbnails.
2. **Given** a previously‑saved plot, **When** the analyst saves changes and the feature‑collection write fails, **Then** the previously‑persisted plot is still openable and unchanged.
3. **Given** any save attempt, **When** the save completes successfully, **Then** every artefact of the save (features, metadata, thumbnails) reflects the same new state.

---

### User Story 2 - Honest reporting and a safe retry (Priority: P2)

As an analyst, if a save cannot fully complete, I am clearly told the save failed, my in‑editor changes are preserved so I can retry, and my previously‑saved version is left intact.

**Why this priority**: Today the success message and the cleared unsaved‑changes indicator can appear *before* all writes have committed, so the analyst can be told "saved" when the on‑disk plot is partial — and may then close the editor and lose work. Trustworthy success/failure reporting is required for the atomicity guarantee to be useful.

**Independent Test**: Inject a failure during a save and assert that (a) a failure is surfaced to the analyst, (b) the unsaved‑changes indicator remains set, and (c) the previously‑persisted plot still opens. Then assert that no success message is shown for the failed attempt.

**Acceptance Scenarios**:

1. **Given** a save that fails partway, **When** the failure occurs, **Then** the analyst sees a clear failure message (not a success message).
2. **Given** a save that fails partway, **When** the failure occurs, **Then** the plot remains marked as having unsaved changes and the analyst can immediately retry.
3. **Given** a save that fully succeeds, **When** all writes have durably committed, **Then** — and only then — the success indication is shown and the unsaved‑changes indicator is cleared.

---

### User Story 3 - Coherent plot after an interrupted save (Priority: P3)

As an analyst, if a save is interrupted by something I cannot catch — a crash, an out‑of‑memory kill, or a power loss — the next time I open the plot it is coherent (the last good state, or the new state if it had committed), and if a partial save had to be cleaned up, I am told.

**Why this priority**: Catchable errors (US1/US2) cover most failures, but an uncatchable interruption mid‑write is exactly when a non‑transactional save does the most damage. Resilience here is valuable but rarer than the catchable‑error path, hence P3.

**Independent Test**: Simulate an interruption by leaving the on‑disk state in each possible mid‑save condition (staging present but not committed; some writes applied, others not), then open the plot and assert it resolves to a single coherent state and that a recovery, if performed, is reported non‑blockingly.

**Acceptance Scenarios**:

1. **Given** a save interrupted before it committed, **When** the analyst reopens the plot, **Then** the last fully‑committed version opens without error.
2. **Given** an interruption that left partial leftovers, **When** the analyst reopens the plot, **Then** the leftovers are reconciled to one coherent state and a non‑blocking notice informs the analyst that a partial save was recovered.
3. **Given** a save that had fully committed just before interruption, **When** the analyst reopens the plot, **Then** the new state opens (no spurious rollback).

---

### Edge Cases

- **Failure on the first write vs a later write**: a failure before anything commits must leave the previous version untouched; a failure after some writes commit must still resolve to a single coherent version (no observable partial).
- **Storage exhaustion mid‑save** (disk full / browser quota exceeded): the save aborts, the previous version is intact, and the analyst is told the save did not complete.
- **Permission / availability denied** (read‑only location, private‑mode browser storage): the save reports failure cleanly without damaging the existing plot.
- **Uncatchable interruption** (process kill, power loss) at any point during the write sequence — covered by US3.
- **Empty or first‑ever save** (no previous version to preserve): a failed first save must not leave a half‑created plot that later reads as corrupt.
- **Concurrent saves of the same plot** from two editor windows: out of scope (see Out of Scope); a save is treated as the sole writer.
- **Thumbnail capture itself fails** (as opposed to the thumbnail *write*): capture is best‑effort and may legitimately be skipped; skipping it must not be treated as a save failure, but a *write* that begins and then fails must obey the atomicity guarantee.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A plot save MUST be atomic from the analyst's perspective — after any save attempt, the persisted plot MUST be observable as **either** the complete new state **or** the complete previous state, never a partial mixture.
- **FR-002**: All writes that constitute a single save (feature collection, STAC item metadata, and thumbnail/overview assets) MUST be committed as one unit; a failure in any one of them MUST prevent the others from becoming observable to a subsequent reader.
- **FR-003**: The feature collection MUST be persisted such that a reader can never observe a partially‑written or torn file, in both the desktop and browser hosts.
- **FR-004**: The feature‑collection write MUST go through the shared persistence boundary rather than a direct storage call, so it is subject to the same atomicity (and provenance/guard) guarantees as the other writes in the save.
- **FR-005**: The system MUST NOT indicate a save as successful — i.e. MUST NOT clear the unsaved‑changes indicator or show a success message — unless every write that makes up the save has durably committed.
- **FR-006**: When a save cannot complete, the system MUST surface a clear failure to the analyst, MUST retain the in‑editor changes so the analyst can retry, and MUST leave the previously‑persisted version intact and openable.
- **FR-007**: If a save is interrupted by an uncatchable process termination, the next time the plot is opened the system MUST present a single coherent plot (the last committed version, or the new version if it had committed) and MUST NOT present a torn feature file or a plot whose features and metadata/thumbnails disagree.
- **FR-008**: If an interruption left recoverable partial state, opening the plot MUST reconcile to a single coherent state and MUST inform the analyst, non‑blockingly, that a partial save was recovered.
- **FR-009**: The atomicity guarantee MUST be enforced at the shared persistence boundary so that it holds for whichever writes each host performs (desktop filesystem and browser storage) and so neither host can silently regress it.
- **FR-010**: A rejected or invalid new state (failing validation, quota, or permission *before* any commit) MUST NOT modify, truncate, or delete the existing persisted plot.
- **FR-011**: A normal, non‑failing save MUST remain functionally unchanged for the analyst — same artefacts produced, no new mandatory steps, and no perceptible regression in save responsiveness for typical plots.

### Key Entities

- **Save unit**: the complete set of artefacts produced by a single save of one plot — the feature collection, the STAC item metadata, and the plot thumbnail/overview assets. The unit is the granularity at which atomicity is guaranteed.
- **Persisted plot**: the on‑store representation a reader loads. It must always be readable as exactly one coherent save unit.
- **Last‑good reference**: an abstract notion of the most recent fully‑committed save unit, used to preserve or restore the plot when a save does not complete. (Whether this is a staging area, a recovery marker, or implicit in the commit mechanism is a design decision, not a requirement.)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Under fault injection at every distinct write step, 100% of failed save attempts leave the plot openable as exactly one coherent version (complete previous or complete new) — zero partial/corrupt outcomes across all injected failure points.
- **SC-002**: After a simulated uncatchable interruption at any point in the save sequence, 100% of reopened plots load without error and show features and metadata/thumbnails that agree (no "features updated, thumbnail stale" mismatch).
- **SC-003**: Across the fault‑injection suite, the success indication (cleared unsaved‑changes + success message) appears for 0% of saves that did not fully commit.
- **SC-004**: A normal save of a typical plot completes within 10% of the current save duration — the transactional model adds negligible overhead.
- **SC-005**: The same fault‑injection acceptance suite passes for both persistence backends (desktop filesystem and browser storage), demonstrating the guarantee is enforced at the shared boundary rather than per‑host.

## Assumptions

- Scope is the existing single‑plot "Save" flow. The analyst‑facing behaviour of a successful save is unchanged; only its failure/interruption behaviour and its commit boundary change.
- "Atomic from the analyst's perspective" means no externally‑observable partial state. It does **not** require an OS‑level transactional filesystem — a stage‑then‑commit sequence or a recovery‑on‑open mechanism are both acceptable ways to meet the requirements.
- The guarantee applies to whichever writes each host actually performs. The browser host currently performs a subset (it does not write plot thumbnails); the guarantee still applies to the writes it does perform.
- Single‑file atomicity and per‑transaction storage atomicity primitives already exist at the persistence boundary and can be built upon; this feature adds *multi‑write* (cross‑artefact) atomicity, not a new low‑level write primitive.
- A plot is saved by a single writer at a time; simultaneous saves of the same plot from two editors are not a supported scenario.

## Dependencies

- The shared persistence boundary (the host‑agnostic STAC writer) and its desktop‑filesystem and browser‑storage adaptors.
- The existing single‑file atomic‑write primitive (temp‑then‑rename) and the browser store's per‑transaction atomicity.
- The plot open/load path, which must perform any reconciliation or recovery described in FR‑007/FR‑008.
- Constitution Article IV (services/persistence boundary; the feature‑collection write moving onto the boundary is an Article IV.1/IV.4 alignment) — this feature may extend the boundary contract with a multi‑write commit concept.

## Out of Scope

- Choosing the specific commit mechanism (e.g. staging area + atomic move vs. last‑good recovery file) — that is a planning/design decision evaluated in `/speckit.plan`.
- Version history, save snapshots, or undo beyond restoring the single last‑good state.
- Multi‑plot or batch transactional save (committing several plots as one unit).
- Adding browser‑host plot‑thumbnail writing where it is currently unsupported.
- Concurrency control for simultaneous saves of the same plot from multiple editors.
