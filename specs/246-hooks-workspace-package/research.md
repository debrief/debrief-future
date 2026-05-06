# Phase 0 Research: `@debrief/hooks` Workspace Package Extraction

**Feature**: 246-hooks-workspace-package
**Date**: 2026-05-06

This document resolves the open questions identified by the spec and plan, and records the decisions that drive the Phase 1 design. Every "NEEDS CLARIFICATION" surfaced during Technical Context filling is closed below.

---

## R1. Package model: which existing `shared/*` package do we mirror?

**Decision**: Mirror `@debrief/utils` (`shared/utils/`).

**Rationale**:
- `@debrief/utils` is the simplest, leanest workspace package in the monorepo: pure-`tsc` build (no Vite), Vitest tests with no DOM-environment, single barrel export, no Storybook, no Playwright. That is exactly the shape `@debrief/hooks` should have — minimum surface, minimum dev-dep cost.
- Inspected `shared/utils/package.json`: declares `main`, `types`, `exports` (single entry), `build: tsc`, `test: vitest run`, `typecheck: tsc --noEmit`, `lint: eslint src --ext .ts`. No runtime deps beyond `@debrief/schemas`.
- Inspected `shared/utils/tsconfig.json`: extends `../../tsconfig.base.json`, sets `module: NodeNext`, `outDir: ./dist`, `rootDir: ./src`, includes `src/**/*`, excludes `tests`. We extend the base (which sets `strict: true` and `noUncheckedIndexedAccess: true`) — Article XV compliance comes for free.
- `shared/utils/vitest.config.ts` runs `environment: 'node'`. `@debrief/hooks` differs only in needing `environment: 'jsdom'` (because `useIsMobile` reads `window.matchMedia`). That is a one-line deviation.

**Alternatives considered**:
- *Mirror `@debrief/components`*: rejected — pulls Vite, Storybook, Playwright, jsdom polyfills, dozens of devDeps, and the very runtime UI deps we are trying to escape. Defeats the purpose.
- *Mirror `@debrief/stac-writer`*: rejected — slightly more complex than utils with no advantage for a hooks package.
- *Inline into an existing package (e.g. extend `@debrief/utils`)*: rejected — `@debrief/utils` is intentionally framework-agnostic (no React peer dep). Mixing React hooks into it would either add React as a direct peer for *every* consumer of utils, or require a sub-export with its own surface — at which point it is cleaner to have a standalone package with a clear scope statement.

---

## R2. Package public API and entry-point shape

**Decision**: Single barrel export.
- `package.json` `main` → `./dist/index.js`, `types` → `./dist/index.d.ts`, `exports['.']` → `{ types, import }`.
- `src/index.ts` re-exports the named hook(s): initially just `export { useIsMobile } from './useIsMobile';`.
- **No subpath export** (e.g. `@debrief/hooks/useIsMobile`). One barrel keeps the API simple; tree-shaking handles dead-code elimination for consumers using ES imports. Today's per-subpath import in `apps/backlog-navigator` (`@debrief/components/hooks/useIsMobile`) was a workaround for the components barrel's heavy footprint — once `@debrief/hooks` exists, that workaround is unnecessary.

**Rationale**:
- All consumers in this PR (`apps/web-shell`, `apps/backlog-navigator`) become barrel importers: `import { useIsMobile } from '@debrief/hooks';`. Uniform, easy to grep, easy to mock in tests.
- `@debrief/utils` uses the same single-barrel pattern. Consistent with monorepo norms.

**Alternatives considered**:
- *Per-hook subpath exports* (`@debrief/hooks/useIsMobile`): rejected — premature; adds export-map maintenance for no current consumer benefit. Can be added later under XIV (pre-release freedom) without a deprecation cycle if a consumer ever needs it.

---

## R3. React peer dependency range

**Decision**: `peerDependencies: { "react": "^18.2.0" }`. **No `react-dom` peer.**

**Rationale**:
- `useIsMobile` uses `useState` + `useEffect` only — both from `react`, neither needing `react-dom`. Asking for `react-dom` would be a lie about the dependency surface.
- `^18.2.0` matches the exact range used in `shared/components/package.json` `peerDependencies`. Keeping the ranges aligned avoids the "hooks accept React 19, components don't" version-skew trap when the monorepo eventually upgrades.
- `peerDependencies`, not `dependencies`: ensures consumers' single React copy is reused (otherwise React's "invalid hook call" runtime check fires).

**Alternatives considered**:
- *Bundling React*: rejected — React must be a singleton in the host app; bundling violates that.
- *Wider range (`>=18`)*: rejected — Article IX ("pinned versions") and consistency with `@debrief/components` pin to 18.x.

---

## R4. Test environment and matchMedia stub strategy

**Decision**: Vitest with `environment: 'jsdom'`. Each test file that exercises `useIsMobile` defines its own `matchMedia` stub on `globalThis.window` and tears it down in `afterEach`. **No shared global setup file** is added to the new package — keeping dev-dep surface tighter and tests self-contained.

**Rationale**:
- jsdom does not implement `window.matchMedia`. Without a stub, `useIsMobile` throws on first render in a test.
- The canonical stub already exists in `apps/backlog-navigator/src/test-setup.ts` (lines 9–24). Replicating that stub *inside the test file* (rather than as a `setupFiles`) keeps `@debrief/hooks` self-contained and makes the stub visible at the point of the test, which helps future contributors writing additional hooks.
- `@testing-library/react` (`renderHook`, `act`) is used for breakpoint-cross simulation: dispatch a synthetic `MediaQueryListEvent` against the stubbed `MediaQueryList`'s `change` listener.
- The `apps/backlog-navigator/src/test-setup.ts` stub continues to exist (and continues to mention the hook in its preamble comment) because that app *also* uses `useIsMobile` directly — the stub is for the consumer's tests, not the hook's tests. The migration updates the comment to reference `@debrief/hooks` instead of `@debrief/components`.

**Alternatives considered**:
- *Shared `setupFiles` in `vitest.config.ts`*: rejected — adds indirection for a five-line stub used in one test file today.
- *`happy-dom` instead of `jsdom`*: rejected — the rest of the monorepo uses `jsdom`; consistency wins, and `useIsMobile` doesn't need happy-dom's perf advantages for a single test file.
- *Mock `window.matchMedia` via `vi.stubGlobal`*: equivalent to the manual stub but adds a Vitest-API dependency for no readability gain. Manual stub keeps the test legible without consulting Vitest docs.

---

## R5. Test coverage shape

**Decision**: Five test cases for `useIsMobile`, all in `tests/useIsMobile.test.tsx`:

1. **SSR fallback**: when `typeof window === 'undefined'`, the hook returns `false` (verified by importing the module under a `vi.stubGlobal('window', undefined)` stand-in *or* by asserting the `useState` initialiser branch).
2. **Initial-match read**: when `matchMedia(...).matches === true` at mount, the hook's first render returns `true`.
3. **Breakpoint-crossing event**: dispatching a `change` event on the stubbed `MediaQueryList` with `matches: true` flips the hook's return to `true` (and back).
4. **Custom breakpoint**: passing `useIsMobile(1023)` forwards the value into the `(max-width: ${bp}px)` query string passed to `matchMedia`.
5. **Listener cleanup on unmount**: after `unmount()`, no further `setState` calls occur when the underlying `MediaQueryList` fires `change` (asserted by spying on `removeEventListener` calls).

**Rationale**:
- These are the five behaviours encoded in the current `useIsMobile.ts` source. Coverage of each prevents silent regression during the move and catches future regressions if a contributor refactors the hook.
- The current `shared/components/src/hooks/__tests__/` directory has tests for `useSelection` but **none for `useIsMobile`** (verified). The migration is therefore a strict net-positive on test coverage — the new package is born with the tests the old location never had.

**Alternatives considered**:
- *Skip the SSR test* (case 1): rejected — the SSR guard is the very behaviour that lets `@debrief/hooks` be advertised as "works in SSR / jsdom" (FR-008). Untested guard = unprovable claim.
- *Add a test for the `mql.matches` stale-sync path* (the `setIsMobile(mql.matches)` line inside `useEffect`): folded into case 2 — that line is exercised on every mount.

---

## R6. `@debrief/components` deprecation shim — keep or drop?

**Decision**: **Keep** a one-release-cycle re-export shim. `shared/components/src/index.ts` keeps the line `export { useIsMobile } from '@debrief/hooks';`. The hook's source file at `shared/components/src/hooks/useIsMobile.ts` is **deleted** (the export is now a pure re-export from the new package).

**Rationale**:
- Article XIV permits breaking changes pre-v4.0.0, so the shim is a courtesy, not a constitutional requirement. We take that courtesy because:
  - There is no inventory of out-of-monorepo consumers; a one-cycle shim is cheap insurance.
  - It enables a two-PR migration if the trigger consumer ships first: PR-A introduces `@debrief/hooks`, leaves the shim, doesn't change consumers; PR-B (later) flips the consumers and deletes the shim. We do not plan to split the work that way today, but the shim preserves the option.
- The shim is a single re-export line — its maintenance cost is negligible.
- The shim is removed in a follow-up issue (logged in `BACKLOG.md`) once the trigger consumer has landed and CI has been green for one release cycle. That follow-up is outside the scope of this feature.

**Alternatives considered**:
- *Drop the export immediately*: rejected for the reason above (no inventory of external consumers).
- *Keep the source file in `@debrief/components` and the new package both export from the same file via tsconfig path*: rejected — defeats the dependency-isolation goal; `@debrief/hooks` consumers would still resolve through the components tree.

---

## R7. Subpath import in `apps/backlog-navigator` — what happens?

**Context**: Today, `apps/backlog-navigator/src/App.tsx` and `apps/backlog-navigator/src/editors/EditorOverlayProvider.tsx` import `useIsMobile` via `@debrief/components/hooks/useIsMobile` — the subpath export form, which was the workaround that motivated this feature.

**Decision**: Replace both imports with `import { useIsMobile } from '@debrief/hooks';` (barrel form). The `@debrief/components/hooks/useIsMobile` subpath export is **removed** from `shared/components/package.json` `exports` map at the same time the source file is deleted.

**Rationale**:
- The subpath only ever existed to dodge the components barrel's bundle weight. With the hook moved to its own package, the subpath has no remaining purpose.
- Removing the subpath simplifies the deprecation surface: the *only* component-side compatibility path is the barrel re-export (R6). Consumers who imported from the subpath get an immediate compile error, which is the right outcome — they need to update either way.
- This is consistent with Article XIV (pre-release freedom): no deprecation period required for the subpath itself.

**Alternatives considered**:
- *Keep the subpath as a deprecation shim too*: rejected — two shim shapes is over-engineering for the same goal. The barrel re-export is sufficient and easier to reason about.

---

## R8. Trigger gate enforcement — how do we know the third consumer exists?

**Decision**: `/speckit.tasks` is the gate. Before generating the task list, the planner verifies one of the two trigger conditions:
- (T1) An open spec / branch / PR exists for a third in-monorepo consumer adopting `useIsMobile` (e.g. a `spec-navigator-mobile` feature, or a hook adoption inside `apps/loader`).
- (T2) An open spec / branch / PR exists adding a second framework-agnostic hook to `@debrief/components` that the spec's inclusion criteria say belongs in `@debrief/hooks`.

If neither holds, `/speckit.tasks` records "Trigger not fired — defer per FR-012 / A-001" in `tasks.md` and stops. Implementation must not proceed.

**Rationale**:
- The backlog item is explicit that this work is premature without the trigger; tree-shaking already solves the bundle question for the two existing consumers.
- The check is a one-question audit done at task-generation time, so it doesn't add ceremony to spec/plan.
- Documenting the gate in research.md (rather than only in spec.md) means a future re-plan / re-tasks of the same feature also sees the gate.

**Alternatives considered**:
- *Implement now regardless*: rejected — the backlog item explicitly trigger-gates the work, and the spec elevated that gate to FR-012.
- *Dissolve the gate into a CLAUDE.md memory*: rejected — the gate is feature-specific, not project-wide.

---

## R9. ADR — do we need one?

**Decision**: Yes — append a short ADR entry (~10–15 lines) to `docs/project_notes/decisions.md` capturing the package-boundary decision: *"UI-agnostic React hooks live in `@debrief/hooks`; component-coupled hooks (those reading a Debrief context, theme, or selection store) live in `@debrief/components`."*

**Rationale**:
- Article VIII.3 ("Architecture decisions recorded — significant technical choices documented with rationale in ARCHITECTURE.md or ADRs"). Splitting a workspace package is a structural choice that future contributors will need to understand.
- Discoverability: the README in `@debrief/hooks` codifies the rule; the ADR records *why* and links to the PR / spec, so the decision is searchable from `decisions.md`.

**Alternatives considered**:
- *README only, no ADR*: rejected — the README answers "what belongs here", the ADR answers "why does this package exist at all".
- *Full ADR document under `docs/adrs/`*: project convention is `decisions.md` entries, not separate files. Follow the convention.

---

## R10. Should we move other hooks (`useTheme`, `useSelection`) too?

**Decision**: **No.** Both stay in `@debrief/components`.

**Rationale**:
- `useTheme` reads from `ThemeProvider` context defined in `@debrief/components`. Moving it would either drag the ThemeProvider into `@debrief/hooks` (defeats the purpose) or break the import graph.
- `useSelection` reads from `@debrief/session-state` (Zustand store) and is tightly bound to Debrief domain types. It is a domain-coupled hook by definition, not a UI-agnostic primitive.
- Inclusion criterion from FR-008 is "no Debrief-component imports, no non-React runtime deps, works in SSR / jsdom". Both fail.

**Alternatives considered**:
- *Move them anyway*: rejected — would either inflate `@debrief/hooks` to include ThemeProvider and the session-state Zustand store (the very bloat we are escaping), or fail at compile time.

---

## Summary of decisions

| Question | Decision |
|----------|----------|
| Package model | Mirror `@debrief/utils` (pure-tsc, Vitest, no Vite/Storybook/Playwright) |
| Public API shape | Single barrel `import { useIsMobile } from '@debrief/hooks'` |
| React peer | `^18.2.0`, no `react-dom` peer |
| Test env | Vitest + jsdom; per-file matchMedia stub; `@testing-library/react` |
| Test coverage | Five cases: SSR, initial match, breakpoint cross, custom bp, cleanup |
| `@debrief/components` shim | One-cycle barrel re-export from `@debrief/hooks`; subpath dropped |
| Subpath imports today | Rewrite to barrel form; delete subpath export |
| Trigger gate | Enforced at `/speckit.tasks`; record "defer" if not fired |
| ADR | Yes — short entry in `docs/project_notes/decisions.md` |
| Other hooks (`useTheme`, `useSelection`) | Stay in `@debrief/components` (component-coupled) |

All NEEDS CLARIFICATION items resolved. Ready for Phase 1.
