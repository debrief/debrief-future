# Quickstart: Drift-Prevention Rules for `@debrief/*` Re-duplication

**Feature**: 214-utils-drift-guard
**Phase**: 1
**Date**: 2026-04-20
**Updated**: 2026-04-20 during `/speckit.review` — walks expanded to cover the four additional `@debrief/*` packages, the wiring-forgotten meta-check, and the wired-in `check-no-geojson-feature.sh`.

This document shows how a contributor can — in about ten minutes — run every guard component, trigger violations, observe the failures, and fix them. It doubles as a verification recipe for SC-001, SC-002, SC-003, SC-004, SC-005, SC-007, SC-008, SC-009, SC-010, SC-011.

---

## Prerequisites

- You are on the `214-utils-drift-guard` branch (or a branch that has merged the implementation).
- `pnpm install` has been run from the repo root.
- Node.js 20.x is active.

---

## Walk 1 — Verify the baseline is clean (SC-007)

From the repo root:

```sh
pnpm lint
```

**Expected**: exits with status 0. No line in the output matches the pattern `'.*' is exported by '@debrief/utils'`.

**If this fails**: the baseline assumption from `spec.md` (FR-012) has been violated. Before proceeding with any other task, reconcile `main` with `@debrief/utils`'s consolidated export surface — do not suppress the rule.

---

## Walk 2 — Trigger a violation, observe the message (SC-001, SC-005)

Create a file that redeclares a canonical `@debrief/utils` name:

```sh
cat > apps/vscode/src/utils/bounds.ts <<'EOF'
export function calculateBounds(features: unknown[]): [number, number, number, number] {
  return [0, 0, 0, 0];
}
EOF
```

Run the lint step:

```sh
pnpm lint
```

**Expected**: exits with a non-zero status code. Output contains a line of approximately this shape:

```text
apps/vscode/src/utils/bounds.ts
  1:1  error  'calculateBounds' is exported by '@debrief/utils'. Do not redeclare it under apps/*. Replace this declaration with: import { calculateBounds } from '@debrief/utils';  no-restricted-syntax
```

**What to notice**:
- File path is `apps/vscode/src/utils/bounds.ts` (relative to repo root).
- Symbol name is `calculateBounds` in single quotes.
- Remediation hint contains a copy-pasteable `import { calculateBounds } from '@debrief/utils';`.
- Severity is `error` (not `warning`).

Clean up:

```sh
rm apps/vscode/src/utils/bounds.ts
pnpm lint   # should pass again
```

---

## Walk 3 — Verify the general rule (SC-002)

Pick any `@debrief/utils` export other than `calculateBounds` — say `formatDuration`, which is a *function* export, and `SafeFeature`, which is a *type* export. Confirm the guard catches both.

### 3a — Function

```sh
cat > apps/web-shell/src/lib/helper.ts <<'EOF'
export function formatDuration(ms: number): string {
  return `${ms}ms`;
}
EOF

pnpm lint          # MUST fail with 'formatDuration' message
rm apps/web-shell/src/lib/helper.ts
```

### 3b — Type

```sh
cat > apps/loader/src/types-helper.ts <<'EOF'
export type SafeFeature = { id: string };
EOF

pnpm lint          # MUST fail with 'SafeFeature' message
rm apps/loader/src/types-helper.ts
```

**Expected**: both runs fail with messages naming the correct symbol. The filename in each case is arbitrary — the guard keys on the *symbol name*, not the file name (that's the whole point of US1's generalisation).

---

## Walk 4 — Verify re-exports are allowed (SC-003)

Barrel re-exports are a legitimate pattern and MUST pass without suppression.

```sh
cat > apps/web-shell/src/utils-barrel.ts <<'EOF'
export { calculateBounds, mergeBounds } from '@debrief/utils';
export * from '@debrief/utils';
EOF

pnpm lint          # MUST pass (no violations from this rule)
rm apps/web-shell/src/utils-barrel.ts
```

**Expected**: `pnpm lint` passes. No `eslint-disable` comment was needed; no manual suppression was needed.

---

## Walk 5 — Verify auto-extension (SC-004)

This walk proves the guard extends to new `@debrief/utils` exports without any edit to the rule itself.

### 5a — Add a throwaway export to `@debrief/utils`

Append to `shared/utils/src/index.ts`:

```ts
// TEMPORARY — remove after SC-004 verification
export const __sc004Probe = Symbol('sc004');
```

### 5b — Add a colliding redeclaration under `apps/*`

```sh
cat > apps/vscode/src/probe.ts <<'EOF'
export const __sc004Probe = 42;
EOF
```

### 5c — Run lint

```sh
pnpm lint
```

**Expected**: fails with a message naming `__sc004Probe`. **Zero edits to `shared/eslint-rules/no-redeclare-utils-exports.cjs` were made between steps 5a and 5c.**

### 5d — Revert

```sh
rm apps/vscode/src/probe.ts
# Remove the __sc004Probe lines from shared/utils/src/index.ts (git checkout or manual)
pnpm lint          # MUST pass again
```

---

## Walk 6 — Verify non-exported locals are allowed

A non-exported internal `calculateBounds` (e.g., in a closure or as a file-local helper) MUST NOT trigger the guard. The guard is about the *export surface*, not internal identifiers.

```sh
cat > apps/vscode/src/internal-helper.ts <<'EOF'
function calculateBounds(n: number): number {
  return n * 2;
}

export function doSomething(n: number): number {
  return calculateBounds(n) + 1;
}
EOF

pnpm lint          # MUST pass
rm apps/vscode/src/internal-helper.ts
```

**Expected**: `pnpm lint` passes. The internal `calculateBounds` is not exported, so the guard's selectors (see `research.md` Decision 3) do not match.

---

## Walk 7 — Verify IDE integration

With the ESLint VS Code extension installed:

1. Open any `apps/*/src/**/*.ts` file.
2. Add `export function calculateBounds() { return []; }` on a new line.
3. **Expected**: Within ~1 second (ESLint-extension debounce), a red squiggle appears under `calculateBounds`, and hovering reveals the remediation hint message. No save / no terminal run required.

This walk verifies that SC-005's "under 5 minutes" is easily achievable in the common path — the guard surfaces *while typing*, not only at CI time.

---

## Walk 9 — Verify generalised coverage across `@debrief/*` packages (SC-009)

Verify each of the four non-utils packages is covered. Each sub-walk: add a colliding export, run lint, observe the package-specific failure message, clean up.

### 9a — `@debrief/schemas`

Pick any name exported by `shared/schemas/src/generated/typescript/index.ts` — for example, `PlatformRecord`.

```sh
cat > apps/vscode/src/bad-schemas.ts <<'EOF'
export type PlatformRecord = { id: string };
EOF

pnpm lint   # MUST fail; message MUST name '@debrief/schemas' (NOT '@debrief/utils')
rm apps/vscode/src/bad-schemas.ts
```

### 9b — `@debrief/components`

Pick any name exported by `shared/components/src/index.ts` — for example, `StacBrowser`.

```sh
cat > apps/web-shell/src/bad-components.ts <<'EOF'
export const StacBrowser = () => null;
EOF

pnpm lint   # MUST fail; message MUST name '@debrief/components'
rm apps/web-shell/src/bad-components.ts
```

### 9c — `@debrief/session-state` (exercises the transitive `export *` walk)

Pick any name reached through `export *` forwards in `services/session-state/src/index.ts`. For example, a name exported from `./types/index.js` (which is reached via `export * from './types/index.js'` at the top of the barrel).

```sh
cat > apps/loader/src/bad-session-state.ts <<'EOF'
export function getSessionStore(): never { throw new Error(); }
EOF

pnpm lint   # MUST fail; message MUST name '@debrief/session-state'
rm apps/loader/src/bad-session-state.ts
```

**What this proves**: if the transitive `export *` walker is regressing, this walk would pass silently (wrong outcome). Its failure confirms the walker is contributing forwarded names to the forbidden set.

### 9d — `@debrief/data`

Pick a name from `shared/data/src/ts/index.ts` — for example, `loadRegistry`.

```sh
cat > apps/vscode/src/bad-data.ts <<'EOF'
export function loadRegistry() { return null; }
EOF

pnpm lint   # MUST fail; message MUST name '@debrief/data'
rm apps/vscode/src/bad-data.ts
```

**Expected (all four)**: each `pnpm lint` invocation fails with a message whose package-name substring matches the correct package (not `@debrief/utils`). If any sub-walk fails with the wrong package name, the caller module's `packageName` input is wired incorrectly.

---

## Walk 10 — Verify the wiring-forgotten meta-check (SC-008)

This walk proves that a newly-introduced `apps/*` sibling without the drift-rule spreads fails the check.

### 10a — Simulate a new sibling with broken wiring

```sh
mkdir -p apps/tutorial-sandbox
cat > apps/tutorial-sandbox/.eslintrc.cjs <<'EOF'
module.exports = {
  root: false,
  rules: {
    // Deliberately NOT spreading any ...*DriftRules
  },
};
EOF

pnpm lint   # MAY pass (there's no src/ to lint in the sibling)
node scripts/check-eslint-drift-wiring.cjs   # MUST fail
```

**Expected** (stderr of the check script):

```text
❌ ESLint drift-rule wiring check failed.

The following apps/*/.eslintrc.cjs files are missing one or more drift-rule spreads:

  apps/tutorial-sandbox/.eslintrc.cjs
    Missing: ...utilsDriftRules        (expected from shared/eslint-rules/no-redeclare-utils-exports.cjs)
    Missing: ...schemasDriftRules      (expected from shared/eslint-rules/no-redeclare-schemas-exports.cjs)
    Missing: ...componentsDriftRules   (expected from shared/eslint-rules/no-redeclare-components-exports.cjs)
    Missing: ...sessionStateDriftRules (expected from shared/eslint-rules/no-redeclare-session-state-exports.cjs)
    Missing: ...dataDriftRules         (expected from shared/eslint-rules/no-redeclare-data-exports.cjs)
```

### 10b — Fix the wiring

Replace the sibling's `.eslintrc.cjs` content with the template from `contracts/rule-contract.md` §3.2. Re-run:

```sh
node scripts/check-eslint-drift-wiring.cjs   # MUST pass
```

### 10c — Clean up

```sh
rm -rf apps/tutorial-sandbox
node scripts/check-eslint-drift-wiring.cjs   # MUST pass (no new siblings)
```

### 10d — Regression sub-walk

Temporarily remove one `<pkg>DriftRules` spread from `apps/vscode/.eslintrc.cjs`:

```sh
node scripts/check-eslint-drift-wiring.cjs   # MUST fail, naming only the one missing spread
# Restore the spread
node scripts/check-eslint-drift-wiring.cjs   # MUST pass
```

**Expected**: the check precisely names the one missing spread from the one offending file — not every spread, not every file.

---

## Walk 11 — Verify the `check-no-geojson-feature.sh` wiring (SC-010)

This walk proves that the previously-unwired shell script is now invoked by `task lint`.

### 11a — Clean baseline

```sh
bash scripts/check-no-geojson-feature.sh   # MUST pass — zero GeoJSONFeature redeclarations at t=0
```

### 11b — Introduce a violation outside the script's exclusion list

The script already excludes `shared/utils/src/types.ts` (the canonical home). Add a violation anywhere else — for example:

```sh
cat > shared/components/src/bad-geojson.ts <<'EOF'
export interface GeoJSONFeature { foo: string; }
EOF

bash scripts/check-no-geojson-feature.sh   # MUST fail with the script's error output
task lint                                  # MUST also fail (the script is wired into task lint)
rm shared/components/src/bad-geojson.ts
task lint                                  # MUST pass again
```

**Expected**: both `scripts/check-no-geojson-feature.sh` and `task lint` fail on introduction and pass after removal. If only the script fails but `task lint` passes, the Taskfile wiring from `contracts/rule-contract.md` §8.1 is absent.

### 11c — Note on scope

Unlike the ESLint drift rules (which enforce only on `apps/*`), this script enforces across `apps/`, `shared/`, and `services/`. A violation introduced in any of those directories (outside the script's exclusion list) causes the guard to fire.

---

## Walk 12 — End-to-end CI verification

This is the verification reviewers should run on the implementation PR. It exercises every guard component in aggregate.

```sh
task verify
```

**Expected**: exits with status 0 on the `main`-plus-implementation tree. Then, on a branch that intentionally contains any of the violations exercised by Walks 2 / 9 / 10 / 11:

```sh
task verify
```

**Expected**: fails at the `lint` step. Depending on which violation was introduced:

- ESLint drift-rule violation → `no-restricted-syntax` error with the correct package name in the message.
- Missing `.eslintrc.cjs` spread → stderr report from `scripts/check-eslint-drift-wiring.cjs`.
- `interface GeoJSONFeature` redeclaration → output from `scripts/check-no-geojson-feature.sh`.

This mirrors what CI will do on a bad PR. If `task verify` does not aggregate all three checks, the `Taskfile.yml` wiring is incomplete (see `contracts/rule-contract.md` §7.4 and §8.1).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `pnpm lint` passes when it should fail | The `apps/*/.eslintrc.cjs` for the package containing your test file doesn't spread one of the `<pkg>DriftRules`. | Check §3 of `contracts/rule-contract.md` and the specific `.eslintrc.cjs`. Run `node scripts/check-eslint-drift-wiring.cjs` to catch this automatically. |
| Rule fires on a legitimate `export { x } from '@debrief/<pkg>'` | Bug in the selector shape — this is never expected. | Open an issue referencing §4.3 of `contracts/rule-contract.md` and `research.md` Decision 3. |
| Rule fails with "drift-rule-factory: indexPath not readable at <path>" | A package's index barrel was moved or deleted, or the caller module's `indexPath` input is wrong. | Run from repo root. If the barrel moved, update the corresponding `no-redeclare-<pkg>-exports.cjs` caller module. |
| Message contains ANSI escape codes or multi-line content | Regression against FR-008. | Fix the template in `drift-rule-factory.cjs`. |
| Adding a new export to a `@debrief/*` package does not extend the guard | Either a hand-maintained list snuck in (bug) or the transitive `export *` walker is not reaching the forwarded name. | Inspect `drift-rule-factory.cjs`; FR-006 / FR-010 / FR-015 forbid hand-maintained lists and require the transitive walk. |
| `check-eslint-drift-wiring.cjs` reports a missing spread but the spread is visibly present in the `.eslintrc.cjs` source | Identity-comparison mismatch — most commonly caused by importing the same caller module through two different relative paths (breaks require-cache identity). | Normalise the require path in the offending `.eslintrc.cjs` to match the path the check script uses (`../../shared/eslint-rules/no-redeclare-<pkg>-exports.cjs`). |
| `check-no-geojson-feature.sh` reports a violation on clean `main` | A pre-existing regression has been introduced since the last run. | Fix the offending file (not the script). The script's exclusion list is narrow and deliberate. |

---

## Time budget

- Walks 1, 2, 4, 6 — ≤ 2 minutes combined.
- Walk 3 — ≤ 1 minute.
- Walk 5 — ≤ 3 minutes (the revert step is the slowest part).
- Walk 7 — requires an editor; optional.
- Walks 9a–9d — ≤ 3 minutes combined (one package per sub-walk, ≤ 45 s each).
- Walk 10 — ≤ 2 minutes (the mkdir / rm-rf is the slowest part).
- Walk 11 — ≤ 1 minute.
- Walk 12 — ≤ 2 minutes on a warm cache.

**Total**: under 15 minutes end-to-end, comfortably within SC-006's per-lint-invocation budget of ≤ 5 s added overhead (per-invocation cost, not per-walk).
