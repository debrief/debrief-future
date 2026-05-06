# Phase 1 Data Model: `@debrief/hooks` Workspace Package Extraction

**Feature**: 246-hooks-workspace-package
**Date**: 2026-05-06

This feature does not introduce, modify, or remove any persisted data, schema, or runtime entity. It is a pure code-organisation change: a TypeScript module is moved from one workspace package to another, and import sites are rewired.

The "entities" below are therefore **build-time / source-tree artefacts**, captured here so that `/speckit.tasks` and reviewers have a single source of truth for what the migration touches.

---

## E1. `@debrief/hooks` workspace package

| Attribute | Value |
|-----------|-------|
| Workspace name | `@debrief/hooks` |
| Filesystem path | `shared/hooks/` |
| Picked up by | `pnpm-workspace.yaml` glob `shared/*` (no config change required) |
| Build output | `shared/hooks/dist/` (gitignored, like all other `shared/*` packages) |
| Public entry | `dist/index.js` (`main`), `dist/index.d.ts` (`types`), `exports['.']` |
| Runtime peer deps | `react ^18.2.0` (only) |
| Runtime deps | none |
| Dev deps | `typescript ^5.3.0`, `vitest ^1.0.0`, `jsdom ^24.0.0`, `@testing-library/react ^14.0.0`, `@types/react ^18.2.0`, ESLint + `@typescript-eslint/*` (versions matching root) |
| TypeScript config | extends `../../tsconfig.base.json`; `module: NodeNext`, `moduleResolution: NodeNext`, `lib: ["ES2022", "DOM", "DOM.Iterable"]`, `outDir: "./dist"`, `rootDir: "./src"`, `jsx: "react-jsx"` |
| Test runner | Vitest with `environment: 'jsdom'`, `include: ['tests/**/*.test.{ts,tsx}']` |
| Lint coverage | ESLint applies via root config; no package-local override |
| Visibility | Internal workspace package — not published to npm |

### Source-tree contents

| Path | Status | Notes |
|------|--------|-------|
| `shared/hooks/package.json` | NEW | Mirrors `shared/utils/package.json` shape |
| `shared/hooks/tsconfig.json` | NEW | Mirrors `shared/utils/tsconfig.json`, with `lib` extended to include DOM, `jsx: "react-jsx"` |
| `shared/hooks/vitest.config.ts` | NEW | `environment: 'jsdom'`; otherwise matches `shared/utils/vitest.config.ts` |
| `shared/hooks/README.md` | NEW | Scope, inclusion/exclusion rule, examples (FR-008) |
| `shared/hooks/src/index.ts` | NEW | Barrel: `export { useIsMobile } from './useIsMobile';` |
| `shared/hooks/src/useIsMobile.ts` | NEW | Verbatim port of `shared/components/src/hooks/useIsMobile.ts` |
| `shared/hooks/tests/useIsMobile.test.tsx` | NEW | Five test cases per research R5 |

---

## E2. `useIsMobile` hook (the moved entity)

The hook itself is unchanged. Its public signature, default breakpoint, and return semantics are preserved verbatim.

| Attribute | Value |
|-----------|-------|
| Signature | `useIsMobile(breakpoint?: number): boolean` |
| Default breakpoint | `767` (matches existing) |
| Returns | `true` if `window.matchMedia('(max-width: ${breakpoint}px)').matches`, `false` otherwise (including SSR — `typeof window === 'undefined'`) |
| Side effects | Subscribes to the `MediaQueryList` `change` event on mount; unsubscribes on unmount |
| Re-render trigger | Breakpoint crossover (event-driven; no resize polling) |
| Source location (before) | `shared/components/src/hooks/useIsMobile.ts` |
| Source location (after) | `shared/hooks/src/useIsMobile.ts` |
| Old re-export from `@debrief/components` | `export { useIsMobile } from '@debrief/hooks';` (deprecation shim — one release cycle) |
| Old subpath export `@debrief/components/hooks/useIsMobile` | REMOVED from package.json `exports` map |

---

## E3. Consumer rewires

Three import sites today; each is rewritten to the barrel form `import { useIsMobile } from '@debrief/hooks';`.

| File | Current import | New import |
|------|----------------|------------|
| `apps/web-shell/src/App.tsx` | `import { ..., useIsMobile, ... } from '@debrief/components';` | Remove `useIsMobile` from the `@debrief/components` import list; add `import { useIsMobile } from '@debrief/hooks';` |
| `apps/backlog-navigator/src/App.tsx` | `import { useIsMobile } from '@debrief/components/hooks/useIsMobile';` | `import { useIsMobile } from '@debrief/hooks';` |
| `apps/backlog-navigator/src/editors/EditorOverlayProvider.tsx` | `import { useIsMobile } from '@debrief/components/hooks/useIsMobile';` | `import { useIsMobile } from '@debrief/hooks';` |

### Consumer package.json updates

| File | Change |
|------|--------|
| `apps/web-shell/package.json` | Add `"@debrief/hooks": "workspace:*"` to `dependencies` |
| `apps/backlog-navigator/package.json` | Add `"@debrief/hooks": "workspace:*"` to `dependencies` |

### Other consumer-side touch-ups

| File | Change | Reason |
|------|--------|--------|
| `apps/backlog-navigator/src/test-setup.ts` | Update preamble comment from "`useIsMobile` (from @debrief/components) calls `window.matchMedia`" → "`useIsMobile` (from @debrief/hooks) calls `window.matchMedia`". The matchMedia polyfill itself is unchanged. | Comment-only; keeps the test-setup explanation truthful. |
| `apps/backlog-navigator/src/types.ts` | Update doc-comment reference if it names `@debrief/components`; no-op if it just says `useIsMobile(1023)`. | Spotted at line 293 in spec; verify and fix only if a package name is mentioned. |

---

## E4. `@debrief/components` deprecation shim

| File | Change |
|------|--------|
| `shared/components/src/hooks/useIsMobile.ts` | DELETED |
| `shared/components/src/hooks/__tests__/` | No change — there is no existing test for `useIsMobile` here (verified). |
| `shared/components/src/index.ts` | Replace `export { useIsMobile } from './hooks/useIsMobile';` with `export { useIsMobile } from '@debrief/hooks';` |
| `shared/components/package.json` `exports` | Remove the `./hooks/useIsMobile` subpath export entry (verified absent today; if added, drop it) |
| `shared/components/package.json` `dependencies` | Add `"@debrief/hooks": "workspace:*"` (the components barrel now re-exports from it) |
| Deprecation marker | Add a JSDoc `@deprecated Import from '@debrief/hooks' instead. This re-export will be removed in a future release.` immediately above the re-export line in `index.ts` |

The deprecation shim's removal is **out of scope** for this feature; a follow-up backlog item (one release cycle later) deletes the re-export and the dependency. That follow-up is captured in `BACKLOG.md` at task-generation time, not here.

---

## E5. Documentation artefacts

| File | Change |
|------|--------|
| `shared/hooks/README.md` | NEW — see contracts/package-contract.md §"README contents" for the required section list |
| `docs/project_notes/decisions.md` | APPEND ~10–15 lines: ADR entry "`@debrief/hooks` workspace package boundary" with rationale and a link to this spec |
| `CLAUDE.md` "Active Technologies" | APPEND one line under "Recent Changes" and one line under the per-feature technology entries naming `@debrief/hooks` (handled by `update-agent-context.sh`) |

---

## Counts (sanity check vs. spec estimate)

| Quantity | Count |
|----------|-------|
| New files | 7 (`package.json`, `tsconfig.json`, `vitest.config.ts`, `README.md`, `src/index.ts`, `src/useIsMobile.ts`, `tests/useIsMobile.test.tsx`) |
| Modified files | 7 (3 import-site rewires + 2 consumer `package.json` + 2 components changes — `index.ts` + `package.json`) |
| Deleted files | 1 (`shared/components/src/hooks/useIsMobile.ts`) |
| New runtime deps in monorepo | 0 |
| New devDeps in monorepo | 0 (re-uses versions already used elsewhere) |
| LOC change | net +~150 (new tests + README dominate; the hook itself is ~15 LOC moved verbatim) |

This is comfortably inside the ~1 dev-day estimate captured in BACKLOG #246.
