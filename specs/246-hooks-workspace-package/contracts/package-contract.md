# Contract: `@debrief/hooks` Package

**Feature**: 246-hooks-workspace-package
**Date**: 2026-05-06
**Type**: Workspace package contract — defines the public surface and dependency-shape invariants of the new `@debrief/hooks` package.

This document is testable. Each invariant below maps to either a CI step (typecheck, lint, unit test) or a one-shot verification command that a reviewer can run.

---

## C1. Package identity

**Invariant**: `shared/hooks/package.json` declares the package name and entry points.

```json
{
  "name": "@debrief/hooks",
  "version": "0.1.0",
  "description": "UI-agnostic, dependency-light React hooks for Debrief v4.x",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "license": "SEE LICENSE IN ../../LICENSE"
}
```

**Verification**: `node -e "console.log(require('./shared/hooks/package.json').name)"` prints `@debrief/hooks`.

---

## C2. Dependency-shape invariant

**Invariant**: `@debrief/hooks` has zero runtime dependencies and exactly one peer dependency: `react ^18.2.0`.

```json
{
  "peerDependencies": {
    "react": "^18.2.0"
  }
}
```

The package MUST NOT declare:
- `dependencies` (the field is absent or `{}`)
- `peerDependencies.react-dom`
- any dependency on `@debrief/components`, `@debrief/session-state`, `@debrief/schemas`, `leaflet`, `react-leaflet`, `vega`, `vega-lite`, `vega-embed`, `@geoman-io/*`, `@dnd-kit/*`, `@tanstack/react-virtual`, `cql2-filters-parser`, `vscrui`, `golden-layout`, `modern-screenshot`, `immer`, `ulid`.

**Verification (CI step, runnable locally)**:

```sh
node -e '
  const pkg = require("./shared/hooks/package.json");
  const banned = ["@debrief/components", "@debrief/session-state", "leaflet", "react-leaflet", "vega", "vega-lite", "vega-embed"];
  const deps = { ...(pkg.dependencies||{}), ...(pkg.peerDependencies||{}) };
  for (const b of banned) if (deps[b]) { console.error("FAIL: banned dep", b); process.exit(1); }
  if (deps["react-dom"]) { console.error("FAIL: react-dom peer not allowed"); process.exit(1); }
  if (!pkg.peerDependencies || pkg.peerDependencies.react !== "^18.2.0") { console.error("FAIL: react peer must be ^18.2.0"); process.exit(1); }
  console.log("OK");
'
```

This command is captured in `quickstart.md` so a reviewer can run it on any branch.

---

## C3. Public API

**Invariant**: `@debrief/hooks` exposes exactly one named export from its barrel: `useIsMobile`.

```ts
// shared/hooks/src/index.ts
export { useIsMobile } from './useIsMobile';
```

**Hook signature** (must match byte-for-byte the current `useIsMobile` in `@debrief/components`):

```ts
export function useIsMobile(breakpoint?: number): boolean;
```

- Default `breakpoint`: `767`.
- Returns `false` when `typeof window === 'undefined'` (SSR / Node test environment without jsdom).
- Returns `window.matchMedia('(max-width: ${breakpoint}px)').matches` on client.
- Subscribes to the `MediaQueryList` `change` event on mount; unsubscribes on unmount.
- The first effect tick re-syncs `setIsMobile(mql.matches)` to handle SSR-hydration staleness.

**Verification**:
- TypeScript typecheck (`pnpm --filter @debrief/hooks typecheck`) — must pass.
- Five unit tests in `tests/useIsMobile.test.tsx` (see C4).

---

## C4. Test coverage

**Invariant**: `tests/useIsMobile.test.tsx` MUST contain at least the five test cases enumerated in research.md §R5:

1. `returns false in SSR (no window)`.
2. `returns true on initial render when matchMedia matches`.
3. `flips to true when MediaQueryList fires change with matches: true, and back to false`.
4. `passes the supplied breakpoint into the (max-width: ...) query string`.
5. `removes its change listener on unmount` (verified via spy on `removeEventListener`).

**Verification**: `pnpm --filter @debrief/hooks test` — all five must pass; `task test` (CI gate) MUST include this suite.

---

## C5. README contents

**Invariant**: `shared/hooks/README.md` MUST contain the following sections in this order:

1. **Title + one-line scope statement**: "`@debrief/hooks` — UI-agnostic, dependency-light React hooks for Debrief v4.x."
2. **What belongs here**: bulleted inclusion criteria — "no Debrief-component imports", "no non-React runtime deps", "works in SSR / jsdom", "framework-agnostic primitives (matchMedia, navigator, document events, IntersectionObserver, etc.)".
3. **What does NOT belong here**: bulleted exclusion criteria — "hooks coupled to a Debrief context, theme, or selection store live in `@debrief/components`", "hooks bound to domain types live with their domain package".
4. **Current hooks**: a table or list of the hooks the package exports (today: `useIsMobile`), each with a one-line description.
5. **Adding a new hook**: 3–5 step recipe — "verify it meets the inclusion criteria", "add the source under `src/`", "add tests under `tests/`", "re-export from `src/index.ts`", "add a row to the Current hooks table".

**Verification**: present-or-absent grep at PR review time. Not CI-enforced (the contract is the existence of the document and its sections, not the prose).

---

## C6. `@debrief/components` deprecation shim

**Invariant**: `shared/components/src/index.ts` re-exports `useIsMobile` from `@debrief/hooks`, with a JSDoc `@deprecated` marker.

```ts
/** @deprecated Import from '@debrief/hooks' instead. This re-export will be removed in a future release. */
export { useIsMobile } from '@debrief/hooks';
```

**Invariant**: `shared/components/package.json` declares `@debrief/hooks` as a workspace dependency (so the re-export resolves).

**Invariant**: `shared/components/src/hooks/useIsMobile.ts` is deleted; no test file in `shared/components/src/hooks/__tests__/` references the moved hook.

**Verification**:
- `grep -r "from './hooks/useIsMobile'" shared/components/src/` returns no matches.
- `node -e "require('./shared/components/package.json').dependencies['@debrief/hooks']"` prints `workspace:*`.

---

## C7. No-leak invariant for the new package

**Invariant**: A consumer that imports only from `@debrief/hooks` MUST NOT resolve any module from `@debrief/components`, `@debrief/session-state`, Leaflet, Vega, react-leaflet, MapView, FilterBar, or FeatureList.

**Verification (one-shot, post-build)**:

```sh
# from repo root, after `pnpm --filter @debrief/hooks build`
node -e '
  const fs = require("fs");
  const dist = fs.readFileSync("./shared/hooks/dist/index.js", "utf8");
  const banned = ["@debrief/components", "@debrief/session-state", "leaflet", "react-leaflet", "vega"];
  for (const b of banned) if (dist.includes(b)) { console.error("FAIL: leaked import:", b); process.exit(1); }
  console.log("OK");
'
```

The check is captured in `quickstart.md` and is one of the SC-001 verification steps.
