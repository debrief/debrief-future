# Quickstart: Drift-Prevention Rule for `@debrief/utils` Re-duplication

**Feature**: 214-utils-drift-guard
**Phase**: 1
**Date**: 2026-04-20

This document shows how a contributor can — in about five minutes — run the guard, trigger a violation, observe the failure, and fix it. It doubles as a verification recipe for SC-001, SC-002, SC-003, SC-004, SC-005, SC-007.

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

## Walk 8 — End-to-end CI verification

This is the verification reviewers should run on the implementation PR:

```sh
task verify
```

**Expected**: exits with status 0 on the `main`-plus-implementation tree. Then, on a branch that intentionally contains a violation (e.g., a throwaway commit adding an `apps/vscode/src/utils/bounds.ts`):

```sh
task verify
```

**Expected**: fails at the `lint` step with the `no-restricted-syntax` error. This mirrors what CI will do on a bad PR.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `pnpm lint` passes when it should fail | The `apps/*/.eslintrc.cjs` for the package containing your test file doesn't spread `utilsDriftRules`. | Check §3 of `contracts/rule-contract.md` and the specific `.eslintrc.cjs`. |
| Rule fires on a legitimate `export { x } from '@debrief/utils'` | Bug in the selector shape — this is never expected. | Open an issue referencing §4.3 of `contracts/rule-contract.md` and `research.md` Decision 3. |
| Rule fails with "shared/utils/src/index.ts not found" | Running from a directory where the relative path resolves incorrectly, or `shared/utils/src/index.ts` was deleted or moved. | Run from repo root. If `index.ts` moved, update `no-redeclare-utils-exports.cjs` accordingly. |
| Message contains ANSI escape codes or multi-line content | Regression against FR-008. | Fix the template in `no-redeclare-utils-exports.cjs`. |
| Adding a new export to `@debrief/utils` does not extend the guard | The rule module is using a hand-maintained list somewhere (bug). | Inspect `no-redeclare-utils-exports.cjs`; FR-006 and FR-010 forbid hand-maintained lists. |

---

## Time budget

- Walks 1, 2, 4, 6 — ≤ 2 minutes combined.
- Walk 3 — ≤ 1 minute.
- Walk 5 — ≤ 3 minutes (the revert step is the slowest part).
- Walk 7 — requires an editor; optional.
- Walk 8 — ≤ 2 minutes on a warm cache.

**Total**: under 10 minutes end-to-end, well within SC-006's per-lint-invocation budget of ≤ 5 s added overhead.
