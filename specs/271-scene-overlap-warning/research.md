# Research: Overlap Warning for Time-Range Scenes (#271)

The spec carried no `[NEEDS CLARIFICATION]` markers — the open judgement calls were resolved as documented Assumptions. This file records the technical decisions behind the plan.

## D1 — Where does detection live?

**Decision**: A new pure, synchronous helper `detectSceneOverlaps()` in `shared/components/src/storyboard/overlap.ts`, alongside `ordering.ts` and `missing-data.ts`.

**Rationale**: The Storyboard `storyboard/` module is the established home for sync, side-effect-free Scene logic (`listScenesOrdered`, `detectMissingDataForScene`). Both hosts already import from it. A pure function is trivially unit-testable (Article VII — tests define done) and shared verbatim across VS Code + web-shell, satisfying FR-011 (consistent across surfaces) without duplicated logic.

**Alternatives considered**:
- *Compute in each host independently* — rejected: duplicates the overlap rule, risks the two surfaces drifting (the exact failure FR-011 guards against).
- *Compute in a Python service* — rejected: this is read-only display derivation over data already in the frontend's hands; routing it through a service would violate the "thick services" intent for no benefit, add a network/IPC round-trip, and break offline-by-default ergonomics. Constitution IV.1 says services return data — it does not require display-only derivations to be services.

## D2 — How is "overlap" defined numerically?

**Decision**: Parse `time_range.start`/`end` (ISO-8601 strings) to epoch milliseconds via `Date.parse`, then **strict interior overlap**: `aStart < bEnd && bStart < aEnd`. Touching endpoints (`aEnd === bStart`) do **not** overlap.

**Rationale**: `Date.parse` normalises differing zone offsets/formats before comparison — `ordering.ts` compares the raw strings lexicographically (safe for its anchor-sort use), but overlap maths must compare true instants, so numeric parsing is correct. Strict (`<`, not `<=`) makes a contiguous handoff (`A.end == B.start`, the normal sequential-Scene case) produce no warning — exactly the behaviour the spec mandates (FR-002, Edge Cases). #263 guarantees `end > start` for well-formed time-range Scenes, so windows are non-degenerate except the explicitly-permitted zero-length range, which the strict rule also handles (a zero-length window strictly inside another overlaps; one merely touching does not).

**Alternatives considered**:
- *Inclusive overlap (`<=`)* — rejected: would flag every sequential pair that shares a handoff instant, drowning the signal in false positives (violates SC-002).
- *Lexicographic string compare* — rejected: unsafe across mixed zone offsets; two equal instants written with different offsets would miscompare.

## D3 — Which Scenes participate?

**Decision**: Only time-range Scenes (`isTimeRangeScene(scene)` — i.e. `time_range != null`). Instant Scenes are excluded entirely; an instant Scene's `timestamp` landing inside a range raises no warning.

**Rationale**: The backlog scopes the feature to "two or more time-range Scenes" with overlapping `[t_start, t_end]` windows (FR-006). Instant-Scene timestamp collisions are already handled by the separate #235 duplicate-timestamp collision flow; conflating the two would muddy both. `isTimeRangeScene` is the existing, schema-backed discriminator (the flavour XOR rule from #263).

## D4 — How is the warning surfaced in the UI?

**Decision**: A new presentational `OverlapBadge` component mirroring `StaleBadge`, rendered by `SceneList` in the same per-row slot, driven by a new optional `SceneEditViewModel.overlapsWith` field.

**Rationale**: `StaleBadge` is the proven precedent for a passive, accessible, per-row advisory that coexists with the edit form and other affordances (FR-013). Reusing its render slot and `role="status"`/tooltip pattern gives consistent theming (light/dark/vscode tokens), keyboard/AT behaviour, and zero new layout risk. Extending the existing `SceneEditViewModel` (rather than inventing a parallel channel) keeps the panel's single per-row view-model contract intact; the field is optional + defaulted so every existing fixture and host keeps compiling (the additive-optional convention used by #217–#235).

**Alternatives considered**:
- *Inline text inside `SceneRow`* — rejected: the row is already dense (chevron, thumbnail, DTG, title, overflow); a separate badge below the row matches `StaleBadge` and keeps the row layout stable.
- *A single Storyboard-level banner listing all overlaps* — rejected: the spec requires the warning **on the offending rows** naming the specific partner (FR-003/FR-004); a global banner loses the per-row locality analysts use to judge each overlap.

## D5 — Dismissal model

**Decision**: Session-scoped, host-local `Set<string>` of dismissed **pair keys** (`overlapPairKey(a,b)` = sorted `${lo}|${hi}`). Dismissing a row's badge dismisses every pair it names. On each recompute the host prunes dismissed keys whose pair no longer overlaps.

**Rationale**: Keying by unordered pair makes "dismiss from either row clears both rows" fall out naturally and handles the 3-or-more case correctly (a Scene's badge hides only once *all* its pairs are dismissed; partners with another live overlap keep their badge). Pruning-on-resolution means a *new* overlap — including re-creating a previously-dismissed pair after pulling the windows apart — warns afresh (FR-009). Keeping it in-memory and un-persisted honours the spec Assumption (lightweight aid, 1–2 dev-days, no new persisted plot state) and keeps Constitution IV.2 trivially satisfied (frontends never persist — we simply don't write).

**Alternatives considered**:
- *Persist dismissals in the plot / SystemState* — rejected for MVP: introduces new persisted state, schema/round-trip surface, and provenance questions for a passive hint. Flagged as a possible follow-up in the spec if analyst feedback warrants it.
- *Dismiss per single badge instance without pair keys* — rejected: cannot coherently express "both rows clear" or the multi-overlap partial-dismiss case.

## D6 — Re-evaluation / liveness

**Decision**: No dedicated invalidation. Detection runs inside each host's existing view-model refresh (VS Code `storyboardPanelView.refresh()`, web-shell `useMemo` over `featureCollection`/`activeStoryboardId`), which already re-fires on every Scene add/edit/delete and on panel (re)open.

**Rationale**: Both hosts already recompute the full active-Storyboard view-model set on any plot change; folding overlap detection into that path gives live accuracy (US3) for free, with no new subscription or cache-invalidation machinery to get wrong. The O(n²) cost over tens of Scenes is negligible (< 16 ms; D2 maths is a couple of comparisons per pair).

## D7 — Testing strategy

**Decision**: (1) Vitest unit tests for `detectSceneOverlaps` covering every Edge Case in the spec (touching endpoints, strict overlap, instant exclusion, multi-overlap, chain A-B-C, identical windows, zero-length, cross-Storyboard isolation, empty/single-Scene). (2) Vitest + Testing-Library component test for `OverlapBadge`/`SceneList` (badge appears/hides, names partners, dismiss callback fires with correct partner ids). (3) Storybook E2E (Playwright via `@sparticuz/chromium`) on a new `WithOverlapWarnings` story in light/dark/vscode, capturing evidence screenshots and exercising the dismiss interaction.

**Rationale**: The pure helper is where correctness lives, so it gets exhaustive table-driven unit coverage first (TDD — Article VII). The badge test guards the wiring/accessibility. The Storybook E2E is the project's standard evidence path (works in cloud per CLAUDE.md) and produces the blog/PR screenshots.
</content>
