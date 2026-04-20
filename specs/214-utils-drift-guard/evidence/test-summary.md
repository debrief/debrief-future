---
feature: 214-utils-drift-guard
captured_at: 2026-04-20T23:12:50Z
git_sha: 1f0222c
tests_passed: 52
tests_failed: 0
tests_skipped: 0
coverage_pct: n/a
---

# Test Summary — 214-utils-drift-guard

All 52 Vitest tests under `shared/utils/tests/eslint-rules/` pass against the
implementation tree.

## Per-file breakdown

| Test file | Tests | Scenarios covered |
|-----------|-------|-------------------|
| `drift-rule-factory.test.ts` | 24 | Public contract (single-name input, determinism, messages, empty-set stderr warning, missing indexPath, invalid packageName). Transitive `export *` walker (one-hop, two-hop, cycles, bare / absolute specifiers, `.js`/`.cjs`/`.mjs` suffix stripping). AST shape coverage (7 positive + 3 negative fixtures). Message format assertions. |
| `no-redeclare-utils-exports.test.ts` | 12 | All 7 positive / 3 negative fixtures fire / don't fire. Symbol-match not filename-match behaviour (US1 scenario 2). SC-004 auto-extension with synthetic index. Single-line ASCII-only message assertions (US3 scenario 4). |
| `no-redeclare-schemas-exports.test.ts` | 2 | Positive fixture fires with `@debrief/schemas` message; negative fixture passes. |
| `no-redeclare-components-exports.test.ts` | 2 | Positive fixture fires with `@debrief/components` message; negative fixture passes. |
| `no-redeclare-session-state-exports.test.ts` | 3 | Positive fixture fires with `@debrief/session-state` message AND on a name reached only via `export *` forwarding (`getSessionStore`). Rules array explicitly contains a selector for `getSessionStore` (regression guard for the walker). Negative fixture passes. |
| `no-redeclare-data-exports.test.ts` | 2 | Positive fixture fires with `@debrief/data` message; negative fixture passes. |
| `check-eslint-drift-wiring.test.ts` | 7 | Real-tree pass. Synthetic tree: all five spreads present (pass), all missing (fails with all 5 caller modules named), partial missing (fails with only the missing one), no `no-restricted-syntax` rule at all (all 5 reported missing), broken config throwing at `require()` (distinct stderr line), `apps/*` sibling without any `.eslintrc.cjs` (skipped). |

## Scenarios verified (by user story)

- **US1** — drift guard fires on `calculateBounds` redeclaration under `apps/*` with a message naming the file, the symbol, and `@debrief/utils`; does not fire on re-exports, `export *`, or non-exported locals.
- **US2** — barrel `export { calculateBounds } from '@debrief/utils'` and `export * from '@debrief/utils'` both pass cleanly (no `eslint-disable` needed).
- **US3** — every generated message contains the literal `apps/*`, the canonical `import { <name> } from '<package>';` hint, is single-line, and contains no ANSI escapes.
- **US4** — removing any one `...<pkg>DriftRules` spread from any `apps/*/.eslintrc.cjs` causes `node scripts/check-eslint-drift-wiring.cjs` to exit 1 with stderr naming the offending file and the missing spread identifier.
- **US5** — four additional packages (`@debrief/schemas`, `@debrief/components`, `@debrief/session-state`, `@debrief/data`) produce messages naming the correct source package, and the `@debrief/session-state` transitive `export *` walker contributes names that would otherwise be missed.
- **US6** — `bash scripts/check-no-geojson-feature.sh` is invoked by `task lint`; a new `interface GeoJSONFeature { ... }` under `apps/`, `shared/`, or `services/` (outside the script's exclusion list) fails CI via the `task lint` aggregate.

## Known issues

None. All 52 tests green.

## How to reproduce

From repo root:

```sh
pnpm --filter @debrief/utils test -- tests/eslint-rules
```
