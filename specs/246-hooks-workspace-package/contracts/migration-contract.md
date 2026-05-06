# Contract: Consumer Migration

**Feature**: 246-hooks-workspace-package
**Date**: 2026-05-06
**Type**: Migration contract — defines the per-file rewires required to move all in-monorepo consumers off the `@debrief/components` import path for `useIsMobile` and onto `@debrief/hooks`.

This contract is satisfied when, on the migration branch, every assertion below passes. The set of consumers below is the **complete inventory** as of 2026-05-06 (verified by `grep -rn "useIsMobile" --include="*.ts" --include="*.tsx"`).

---

## M1. `apps/web-shell` rewire

### M1.1 Source-file change

**File**: `apps/web-shell/src/App.tsx`

**Before** (line 38, inside a multi-line import from `@debrief/components`):

```ts
import {
  // ...
  useIsMobile,
  // ...
} from '@debrief/components';
```

**After**:

```ts
// useIsMobile removed from the @debrief/components import list above.
import { useIsMobile } from '@debrief/hooks';
```

**Assertion**: `grep -n "useIsMobile" apps/web-shell/src/App.tsx` returns exactly one match, and that line imports from `'@debrief/hooks'`.

### M1.2 Manifest change

**File**: `apps/web-shell/package.json`

**Diff**: add `"@debrief/hooks": "workspace:*"` to the `dependencies` object, alphabetically ordered alongside the other `@debrief/*` workspace deps.

**Assertion**: `node -e "console.log(require('./apps/web-shell/package.json').dependencies['@debrief/hooks'])"` prints `workspace:*`.

---

## M2. `apps/backlog-navigator` rewire

### M2.1 `src/App.tsx`

**File**: `apps/backlog-navigator/src/App.tsx`

**Before** (line 2):

```ts
import { useIsMobile } from '@debrief/components/hooks/useIsMobile';
```

**After**:

```ts
import { useIsMobile } from '@debrief/hooks';
```

**Assertion**: `grep -n "from '@debrief/components/hooks" apps/backlog-navigator/src/App.tsx` returns no matches.

### M2.2 `src/editors/EditorOverlayProvider.tsx`

**File**: `apps/backlog-navigator/src/editors/EditorOverlayProvider.tsx`

**Before** (line 2):

```ts
import { useIsMobile } from '@debrief/components/hooks/useIsMobile';
```

**After**:

```ts
import { useIsMobile } from '@debrief/hooks';
```

**Assertion**: `grep -n "from '@debrief/components/hooks" apps/backlog-navigator/src/editors/EditorOverlayProvider.tsx` returns no matches.

### M2.3 `src/test-setup.ts` (comment-only update)

**File**: `apps/backlog-navigator/src/test-setup.ts`

**Change**: update the preamble comment text from "`useIsMobile` (from @debrief/components) calls `window.matchMedia`" to "`useIsMobile` (from @debrief/hooks) calls `window.matchMedia`". The matchMedia polyfill body is unchanged.

**Assertion**: `grep -n "@debrief/components" apps/backlog-navigator/src/test-setup.ts` returns no matches; `grep -n "@debrief/hooks" apps/backlog-navigator/src/test-setup.ts` returns at least one match (the comment).

### M2.4 `src/types.ts` (comment-only verification)

**File**: `apps/backlog-navigator/src/types.ts`

**Change**: line 293 currently references `useIsMobile(1023)` in a doc-comment. If a package name (`@debrief/components`) is also mentioned in that comment, update it to `@debrief/hooks`. If the comment only names the function call, no change is required.

**Assertion**: `grep -n "@debrief/components.*useIsMobile\|useIsMobile.*@debrief/components" apps/backlog-navigator/src/types.ts` returns no matches.

### M2.5 Manifest change

**File**: `apps/backlog-navigator/package.json`

**Diff**: add `"@debrief/hooks": "workspace:*"` to `dependencies`.

**Assertion**: `node -e "console.log(require('./apps/backlog-navigator/package.json').dependencies['@debrief/hooks'])"` prints `workspace:*`.

---

## M3. `@debrief/components` deprecation shim

### M3.1 Delete the moved source

**File**: `shared/components/src/hooks/useIsMobile.ts` — DELETED.

**Assertion**: `test ! -e shared/components/src/hooks/useIsMobile.ts && echo OK || echo FAIL` prints `OK`.

### M3.2 Replace the barrel export with a re-export

**File**: `shared/components/src/index.ts` (line 102 today reads `export { useIsMobile } from './hooks/useIsMobile';`)

**Before**:

```ts
export { useIsMobile } from './hooks/useIsMobile';
```

**After**:

```ts
/** @deprecated Import from '@debrief/hooks' instead. This re-export will be removed in a future release. */
export { useIsMobile } from '@debrief/hooks';
```

**Assertion**: `grep -n "useIsMobile" shared/components/src/index.ts` returns exactly one match, and that line is the re-export from `'@debrief/hooks'`.

### M3.3 Add `@debrief/hooks` to components' deps

**File**: `shared/components/package.json`

**Diff**: add `"@debrief/hooks": "workspace:*"` to `dependencies` (alongside `@debrief/schemas`, `@debrief/utils`).

**Assertion**: `node -e "console.log(require('./shared/components/package.json').dependencies['@debrief/hooks'])"` prints `workspace:*`.

### M3.4 Subpath export removal (if present)

**File**: `shared/components/package.json`

**Diff**: if `exports['./hooks/useIsMobile']` is present in the exports map, remove it. (Verified absent today; this assertion is defensive.)

**Assertion**: `node -e "console.log(JSON.stringify(require('./shared/components/package.json').exports['./hooks/useIsMobile'] || null))"` prints `null`.

---

## M4. Repo-wide post-conditions (the "completeness" check)

After all of the above, the following whole-repo greps MUST hold:

| Assertion | Expected |
|-----------|----------|
| `grep -rn "from '@debrief/components/hooks/useIsMobile'" apps/ shared/ services/` | zero matches |
| `grep -rn "useIsMobile" apps/ \| grep "@debrief/components"` | zero matches |
| `grep -rln "useIsMobile" apps/ shared/` | matches all of: `apps/web-shell/src/App.tsx`, `apps/backlog-navigator/src/App.tsx`, `apps/backlog-navigator/src/editors/EditorOverlayProvider.tsx`, `apps/backlog-navigator/src/test-setup.ts` (comment), `apps/backlog-navigator/src/types.ts` (comment), `shared/components/src/index.ts` (deprecation shim), `shared/hooks/src/useIsMobile.ts`, `shared/hooks/src/index.ts`, `shared/hooks/tests/useIsMobile.test.tsx` |

These greps are codified in `quickstart.md` so a reviewer can run them in one step.

---

## M5. Behavioural-equivalence post-conditions

| Check | How |
|-------|-----|
| `apps/web-shell` mobile-breakpoint behaviour unchanged | Manual viewport-resize check at the documented breakpoint; layout swap matches pre-migration capture. |
| `apps/backlog-navigator` mobile-breakpoint behaviour unchanged | Same — manual viewport-resize check; the `EditorOverlayProvider` mobile-vs-desktop overlay choice is identical. |
| Existing Vitest suites for both apps | All green: `pnpm --filter @debrief/web-shell test`, `pnpm --filter @debrief/backlog-navigator test`. |
| Existing Playwright suites | All green: `cd apps/web-shell && node run-playwright.mjs`, `pnpm --filter @debrief/spec-navigator build && cd apps/spec-navigator && node run-playwright.mjs`. |
| Full CI verify | `task verify` green. |

---

## M6. Out-of-scope (explicitly NOT in this contract)

- The third-consumer adoption work (e.g. spec-navigator going mobile, `apps/loader` consuming the hook). That is a separate spec; this contract delivers the package boundary only.
- Removal of the `@debrief/components` deprecation shim. Tracked as a follow-up backlog item, removed one release cycle after this lands.
- Movement of any other hook (`useTheme`, `useSelection`). Out of scope per research.md §R10.
- Addition of further hooks (`useReducedMotion`, `useOnlineStatus`, `useFocusVisible`). The package's README states these are plausible future homes, but adding them is out of scope for this feature.
