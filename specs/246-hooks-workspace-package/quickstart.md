# Quickstart: `@debrief/hooks` Workspace Package Extraction

**Feature**: 246-hooks-workspace-package
**Date**: 2026-05-06
**Audience**: Reviewer or implementer who wants to verify the migration end-to-end on the branch.

This is the runbook for the feature. Every command below is copy-pasteable from a Linux/macOS shell at the repo root. All paths are relative to the repo root. Estimated total time: 5–10 minutes (mostly waiting on `task verify`).

---

## 0. Trigger gate (before you start)

Before doing anything else, confirm one of the two trigger conditions has fired:

- **T1**: A third in-monorepo consumer of `useIsMobile` has a spec, branch, or PR open (e.g. `spec-navigator` going mobile, `apps/loader`).
- **T2**: A second framework-agnostic hook needs a home (e.g. an open spec adding `useReducedMotion` or `useOnlineStatus` to `@debrief/components`).

If neither holds, **stop**. The work is premature per FR-012. The default action is to record "trigger not fired — defer" in `tasks.md` and not generate further tasks.

```sh
# Quick audit:
grep -rln "useIsMobile" apps/ | sort -u
# If only apps/web-shell and apps/backlog-navigator appear AND there's no open
# branch/PR for a third consumer, the trigger has not fired.
```

---

## 1. Build & test the new package

```sh
# Install (no-op if already installed)
pnpm install

# Build the new package
pnpm --filter @debrief/hooks build

# Run its unit tests (should be 5 cases, all green)
pnpm --filter @debrief/hooks test

# Typecheck
pnpm --filter @debrief/hooks typecheck
```

**Expected**: `dist/index.js`, `dist/index.d.ts` produced; 5/5 tests pass; tsc clean.

---

## 2. Verify the dependency-shape contract (C2)

```sh
node -e '
  const pkg = require("./shared/hooks/package.json");
  const banned = ["@debrief/components", "@debrief/session-state", "leaflet", "react-leaflet", "vega", "vega-lite", "vega-embed"];
  const deps = { ...(pkg.dependencies||{}), ...(pkg.peerDependencies||{}) };
  for (const b of banned) if (deps[b]) { console.error("FAIL: banned dep", b); process.exit(1); }
  if (deps["react-dom"]) { console.error("FAIL: react-dom peer not allowed"); process.exit(1); }
  if (!pkg.peerDependencies || pkg.peerDependencies.react !== "^18.2.0") { console.error("FAIL: react peer must be ^18.2.0"); process.exit(1); }
  if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) { console.error("FAIL: no runtime deps allowed, found:", Object.keys(pkg.dependencies)); process.exit(1); }
  console.log("OK");
'
```

**Expected**: prints `OK`.

---

## 3. Verify the no-leak invariant (C7)

```sh
# Requires step 1 to have built the package.
node -e '
  const fs = require("fs");
  const dist = fs.readFileSync("./shared/hooks/dist/index.js", "utf8");
  const banned = ["@debrief/components", "@debrief/session-state", "leaflet", "react-leaflet", "vega"];
  for (const b of banned) if (dist.includes(b)) { console.error("FAIL: leaked import:", b); process.exit(1); }
  console.log("OK");
'
```

**Expected**: prints `OK`.

---

## 4. Verify the consumer rewires (M1, M2)

```sh
# No subpath imports remain anywhere
grep -rn "from '@debrief/components/hooks/useIsMobile'" apps/ shared/ services/ 2>/dev/null && echo "FAIL" || echo "OK"

# No barrel imports of useIsMobile from @debrief/components remain
grep -rn "useIsMobile" apps/ | grep "'@debrief/components'" && echo "FAIL" || echo "OK"

# All four expected import sites point to @debrief/hooks
grep -rn "from '@debrief/hooks'" apps/web-shell/src/App.tsx apps/backlog-navigator/src/App.tsx apps/backlog-navigator/src/editors/EditorOverlayProvider.tsx
# Expected: three matches, one per file.

# Both consumer manifests declare the new dep
node -e "console.log(require('./apps/web-shell/package.json').dependencies['@debrief/hooks'])"
node -e "console.log(require('./apps/backlog-navigator/package.json').dependencies['@debrief/hooks'])"
# Expected: each prints workspace:*
```

**Expected**: every command prints `OK` or `workspace:*` as noted; no `FAIL`.

---

## 5. Verify the deprecation shim (M3)

```sh
# The old source is gone
test ! -e shared/components/src/hooks/useIsMobile.ts && echo "OK" || echo "FAIL"

# The barrel re-export points to @debrief/hooks
grep -n "useIsMobile" shared/components/src/index.ts
# Expected: exactly one match, importing from '@debrief/hooks', preceded by a @deprecated JSDoc.

# components has the workspace dep
node -e "console.log(require('./shared/components/package.json').dependencies['@debrief/hooks'])"
# Expected: workspace:*
```

---

## 6. Run the full CI verify (FR-005, SC-003)

```sh
task verify
```

If `task` is not installed, the four-step fallback from `CLAUDE.md` "Before Pushing" is the equivalent.

**Expected**: lint, typecheck, unit, Playwright E2E (web-shell + spec-navigator) all green. No new exclusions, ignored rules, or skipped tests.

---

## 7. Behavioural smoke test (FR-006, SC-004)

Manual, ~5 minutes.

1. **`apps/web-shell`**:
   ```sh
   pnpm --filter @debrief/web-shell dev
   ```
   Open the served URL, resize the viewport across the documented mobile breakpoint, confirm the layout transitions match the pre-migration baseline.

2. **`apps/backlog-navigator`**:
   ```sh
   pnpm --filter @debrief/backlog-navigator dev
   ```
   Same drill — resize across `MOBILE_BREAKPOINT_MAX` (1023), confirm overlay/inline editor behaviour from `EditorOverlayProvider` matches pre-migration.

If you have access to pre-migration screenshots/recordings (saved before the rewires), diff them; otherwise eyeball-confirm.

---

## 8. Sanity-check the package boundary documentation

```sh
# README exists with the scope sections
grep -n "^##" shared/hooks/README.md
# Expected: at least four ## headings — scope, what belongs here, what does NOT belong, current hooks (and ideally adding a new hook).

# ADR appended
tail -30 docs/project_notes/decisions.md
# Expected: a recent entry naming @debrief/hooks and linking specs/246-hooks-workspace-package/.

# CLAUDE.md updated
grep -n "@debrief/hooks" CLAUDE.md
# Expected: at least one match (the entry inserted by update-agent-context.sh).
```

---

## Done conditions

The migration is complete when:

- [ ] Steps 1–6 all green (`OK` / `workspace:*` / no `FAIL` / `task verify` green).
- [ ] Step 7 manual smoke test shows no behavioural change in either app.
- [ ] Step 8 confirms README, ADR, and agent context are present.
- [ ] No file outside the inventory in `data-model.md` E1–E5 is modified.
- [ ] `BACKLOG.md` has a follow-up item logged for "remove `@debrief/components` `useIsMobile` deprecation re-export — one release cycle after #246 lands".

If all of the above hold, the spec's Success Criteria (SC-001 … SC-006) are satisfied.
