# Feature Specification: `@debrief/hooks` Workspace Package Extraction

**Feature Branch**: `246-hooks-workspace-package`
**Created**: 2026-05-06
**Status**: Draft
**Input**: User description: "Tech Debt — `@debrief/hooks` workspace package extraction. Once a third app needs `useIsMobile` (or any other UI-agnostic hook currently exported from `@debrief/components`), lift the hook(s) into a small dependency-free `shared/hooks/` workspace package so consumers don't pay the full `@debrief/components` cost (Leaflet, Vega, MapView, FilterBar, FeatureList) just to read a `matchMedia` value. Today (2026-05-02) only `apps/web-shell` and `apps/backlog-navigator` (#244) consume the hook; tree-shake handles the bundle question for those two. Trigger: third consumer (e.g. spec-navigator going mobile, or `apps/loader`) adopting the hook, or any future framework-agnostic hook (Reduce-Motion / online-status / focus-visible) needing the same home. Estimate ~1 dev-day. (follow-up to #244 review §Issue 2 Option B)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - New consumer adopts a UI-agnostic hook without paying for the components bundle (Priority: P1)

A developer building a third application (or library) needs a small, framework-agnostic React hook — for example `useIsMobile` to drive a mobile layout, or a future `useReducedMotion` / `useOnlineStatus` / `useFocusVisible`. They want to import that hook from a workspace package whose dependency footprint is "React only", not from `@debrief/components`, which transitively pulls Leaflet, Vega/vega-embed, the MapView/FilterBar/FeatureList component trees, and their CSS.

**Why this priority**: This is the trigger condition for the whole feature. Without this, the work is premature: today's two consumers (`apps/web-shell`, `apps/backlog-navigator`) are already handled fine by tree-shaking, so the extraction only earns its cost the moment a third consumer arrives. P1 because it is the load-bearing user journey — every other story exists to support it.

**Independent Test**: Wire a fresh sample app or library entry that imports the hook from `@debrief/hooks` only (no other Debrief workspace packages). Verify (a) the import type-checks, (b) the hook works in a browser/Storybook, and (c) the resolved module graph for that entry contains zero references to Leaflet, Vega, MapView, FilterBar, FeatureList, or any other heavy `@debrief/components` subpath.

**Acceptance Scenarios**:

1. **Given** a third workspace app that does not currently depend on `@debrief/components`, **When** a developer adds `@debrief/hooks` as a dependency and imports a hook (e.g. `useIsMobile`), **Then** the app compiles, type-checks, and bundles without resolving Leaflet, Vega, or any `@debrief/components` component module.
2. **Given** the new package, **When** a developer inspects `package.json` for `@debrief/hooks`, **Then** the only runtime peer dependency is React (matching the version range used elsewhere in the monorepo) and there are no transitive runtime deps on map, chart, or component libraries.
3. **Given** a future contributor adds a new framework-agnostic hook (e.g. `useReducedMotion`), **When** they choose where to place it, **Then** the package's README/scope statement makes it clear that `@debrief/hooks` is the canonical home for such hooks (and `@debrief/components` is reserved for component-coupled hooks such as `useTheme`, `useSelection`).

---

### User Story 2 - Existing consumers migrate from `@debrief/components` to `@debrief/hooks` without behavioural change (Priority: P1)

The two existing consumers — `apps/web-shell` and `apps/backlog-navigator` — currently import `useIsMobile` from `@debrief/components` (one via the barrel, one via the `hooks/useIsMobile` subpath). After extraction, both must import from `@debrief/hooks` instead, with no behavioural difference for end users and no test regressions.

**Why this priority**: P1 because if the migration breaks either consumer, the extraction has caused a regression in shipped product. The feature must leave the monorepo in a strictly improved state.

**Independent Test**: Run the full CI verify pipeline (lint + typecheck + unit + Playwright E2E) on a branch where both consumers have been switched to import from `@debrief/hooks`. All steps pass and the rendered behaviour at the mobile breakpoint is unchanged in both apps.

**Acceptance Scenarios**:

1. **Given** the migration is complete, **When** CI runs `task verify`, **Then** lint, typecheck, unit tests, and Playwright E2E all pass on both `apps/web-shell` and `apps/backlog-navigator`.
2. **Given** a manual viewport-resize check at the documented mobile breakpoint, **When** the user crosses the breakpoint in either app, **Then** the layout responds identically to the pre-migration behaviour.
3. **Given** the migration is complete, **When** a developer greps the monorepo for `useIsMobile` imports, **Then** zero imports come from `@debrief/components` (or its `hooks/useIsMobile` subpath) — every consumer points to `@debrief/hooks`.

---

### User Story 3 - Hook home is unambiguous for future contributors (Priority: P2)

A future contributor writing a new hook needs a clear, written rule for whether it belongs in `@debrief/hooks` or `@debrief/components`. Without that rule, the package boundary will erode and the extraction's value will dissipate.

**Why this priority**: P2 because the engineering value (preserving the boundary) accrues over time, not on day one. The tactical migration is what unblocks the trigger consumer; the documentation prevents regression.

**Independent Test**: A reviewer reading `shared/hooks/README.md` (and the relevant section of `CLAUDE.md` / `ARCHITECTURE.md`) can decide, for each existing hook in the monorepo and for a list of plausible future hooks, whether it belongs in `@debrief/hooks` or `@debrief/components`, with consistent answers.

**Acceptance Scenarios**:

1. **Given** the new package's README, **When** a contributor reads the "What belongs here / what doesn't" section, **Then** they can correctly classify `useIsMobile`, `useTheme`, `useSelection`, and a hypothetical `useReducedMotion` without further guidance.
2. **Given** the contributor docs, **When** a reviewer evaluates a PR that adds a hook to the wrong package, **Then** there is a written rule they can cite to request the move.

---

### Edge Cases

- **No third consumer yet**: The backlog item is explicitly trigger-gated. If, at planning time, there is still no third consumer in flight (and no second framework-agnostic hook needing a home), the feature should be deferred — not implemented speculatively. The plan must confirm the trigger has fired before work begins.
- **Hook with subtle component coupling**: A hook that *looks* framework-agnostic but actually pulls in a context, theme, or selection store from `@debrief/components` must stay in `@debrief/components`. The boundary is "zero non-React runtime deps and no Debrief-component imports", not "doesn't render JSX".
- **Server-side rendering / non-DOM environments**: `useIsMobile` already guards `typeof window === 'undefined'`. Any hook moved into `@debrief/hooks` must keep working in SSR / Node test environments (jsdom / happy-dom), since some consumers may run in environments without a DOM.
- **Backwards-compatible re-export**: `@debrief/components` may continue to re-export the hook for one release cycle so external (out-of-monorepo) consumers, if any, do not break on upgrade. The deprecation must be documented; in-monorepo consumers must migrate fully.
- **Pinned React version drift**: `@debrief/hooks` declares React as a peer dependency. If the monorepo later upgrades React, the peer range in `@debrief/hooks` must be updated in the same change so the package does not silently accept an unsupported React version.
- **Test infrastructure**: `apps/backlog-navigator/src/test-setup.ts` mocks `useIsMobile`. After migration, the mock target must be updated to point to `@debrief/hooks` (or to a module path that both packages resolve to during tests).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The monorepo MUST contain a new workspace package named `@debrief/hooks`, located under `shared/hooks/`, that follows the same packaging conventions as the other `shared/*` workspace packages (TypeScript source, build pipeline, type definitions, exports map).
- **FR-002**: The package MUST declare React as its only runtime peer dependency, with no runtime dependency on Leaflet, Vega, vega-embed, react-leaflet, `@debrief/components`, or any other Debrief workspace package that itself transitively pulls heavy UI dependencies.
- **FR-003**: The package MUST export `useIsMobile` with byte-for-byte equivalent behaviour and the same public signature it has today in `@debrief/components`.
- **FR-004**: All in-monorepo consumers of `useIsMobile` (today: `apps/web-shell`, `apps/backlog-navigator`, including their test-setup mocks) MUST be migrated to import the hook from `@debrief/hooks`, with zero remaining imports of `useIsMobile` from `@debrief/components` or its subpaths after migration.
- **FR-005**: The full CI verify pipeline (`task verify`: lint, typecheck, unit tests, Playwright E2E for `web-shell` and `spec-navigator`) MUST pass on the migration branch with no new exclusions, ignored rules, or skipped tests.
- **FR-006**: The system MUST keep the user-facing behaviour of both existing consumers unchanged at the mobile breakpoint — same layout, same breakpoint value, same crossover behaviour as before extraction.
- **FR-007**: `@debrief/components` MUST NOT regress: it may either (a) drop the `useIsMobile` export entirely, or (b) re-export it from `@debrief/hooks` for one release cycle as a deprecation shim. Either choice MUST be documented in the package's changelog/notes; option (b) MUST include a deprecation notice that names `@debrief/hooks` as the canonical source.
- **FR-008**: The new package MUST ship with a README that states (a) the package's scope ("UI-agnostic, dependency-light React hooks"), (b) explicit inclusion criteria ("no Debrief-component imports, no non-React runtime deps, works in SSR / jsdom"), and (c) explicit exclusion criteria ("hooks coupled to a Debrief context, theme, or component tree belong in `@debrief/components`").
- **FR-009**: The new package MUST be wired into the monorepo's tooling to the same standard as peer workspace packages: tsconfig path resolution / project references, ESLint coverage, ruff/pyright not applicable, Vitest test runner, and inclusion in the relevant pnpm workspace globs.
- **FR-010**: The new package MUST include unit tests for `useIsMobile` covering: SSR fallback (no `window`), initial-match read, breakpoint-crossing event, custom breakpoint argument, and listener cleanup on unmount. (Equivalent or superior to whatever coverage exists in `@debrief/components` today.)
- **FR-011**: The agent context file (`CLAUDE.md` "Active Technologies" section) and any constitution/architecture references to hook ownership MUST be updated so that future automated planning is aware of `@debrief/hooks` and its scope.
- **FR-012**: Implementation MUST be gated on confirmation that the trigger condition has fired — i.e. a third consumer (or a second framework-agnostic hook) is in flight or imminent. If at planning time the trigger has not fired, the plan MUST recommend deferring the feature rather than executing speculatively.
- **FR-013**: The migration MUST NOT introduce any new runtime dependency anywhere in the monorepo; it is purely a relocation plus consumer rewires.

### Key Entities

- **`@debrief/hooks` workspace package**: A new, dependency-light pnpm workspace package under `shared/hooks/`. Houses framework-agnostic React hooks. Has React as its only runtime peer dependency. Owns a clear inclusion/exclusion rule for what hooks live here.
- **Hook (UI-agnostic)**: A React hook whose implementation reads only from React itself plus browser stdlib (`window`, `matchMedia`, `navigator`, `document` event listeners, etc.) and has no imports from `@debrief/components`, `@debrief/session-state`, or any Debrief domain package. Examples: `useIsMobile` (today), `useReducedMotion`, `useOnlineStatus`, `useFocusVisible` (plausible future).
- **Hook (component-coupled)**: A React hook that reads from a Debrief context, theme, selection store, or component tree. Stays in `@debrief/components`. Examples: `useTheme`, `useSelection`.
- **Trigger condition**: The external precondition that justifies the extraction — either (a) a third in-monorepo consumer adopting `useIsMobile`, or (b) a second framework-agnostic hook needing a home. The feature is explicitly gated on this condition having fired.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After migration, a new consumer can depend on `@debrief/hooks` alone (without depending on `@debrief/components`) and import a UI-agnostic hook successfully — verified by inspecting that consumer's resolved module graph and confirming zero references to Leaflet, Vega, MapView, FilterBar, or FeatureList.
- **SC-002**: After migration, zero in-monorepo source files import `useIsMobile` (or any future UI-agnostic hook covered by the move) from `@debrief/components` or its `hooks/*` subpaths — verified by a repo-wide search.
- **SC-003**: The full `task verify` pipeline (lint, typecheck, unit tests, Playwright E2E for `web-shell` and `spec-navigator`) passes on the migration branch with zero new failures, skipped tests, or suppressed lint rules introduced by the change.
- **SC-004**: Manual interaction checks at the documented mobile breakpoint show identical layout behaviour in `apps/web-shell` and `apps/backlog-navigator` before and after migration (no visual or interaction regression).
- **SC-005**: A reviewer can read the `@debrief/hooks` README and correctly classify each existing hook in the monorepo (`useIsMobile`, `useTheme`, `useSelection`, plus any others present) into "lives in `@debrief/hooks`" or "lives in `@debrief/components`" with the same answer the implementer reached.
- **SC-006**: Total work to land the feature stays within the ~1 dev-day estimate captured in the backlog item; if planning surfaces work materially beyond that envelope, the plan flags the divergence rather than silently absorbing it.

## Assumptions

- **A-001**: At planning time, the trigger condition has fired (a third consumer or a second framework-agnostic hook is in flight). If this is not yet true, `/speckit.plan` should recommend deferring the feature rather than executing speculatively (FR-012).
- **A-002**: Only `useIsMobile` is in scope for the initial extraction. Other hooks currently exported from `@debrief/components` (`useTheme`, `useSelection`) are component-coupled and stay where they are. If a second UI-agnostic hook is the trigger, it is moved as part of the same change.
- **A-003**: The two current consumers identified in the description (`apps/web-shell`, `apps/backlog-navigator`) are the complete set of in-monorepo consumers at migration time; the implementer will re-verify with a repo-wide search before declaring migration done.
- **A-004**: External (out-of-monorepo) consumers, if any, can tolerate a one-release-cycle deprecation shim (FR-007). If no external consumers are known, the shim can be skipped and `@debrief/components` can drop the export immediately.
- **A-005**: React version, build tooling (TypeScript, Vitest), and pnpm workspace conventions are the same as the other `shared/*` packages and require no new tooling decisions.
- **A-006**: The third-consumer trigger spec (e.g. spec-navigator going mobile, or `apps/loader`) is tracked under its own backlog item; this feature delivers only the package boundary, not the third consumer's adoption work.
