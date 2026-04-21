---
layout: future-post
title: "Shipped: Keeping the bounds-utility consolidation from drifting back"
date: 2026-04-20
track: [credibility]
author: Ian
reading_time: 4
tags: [tracer-bullet, developer-experience, lint, utils]
excerpt: "Three silent-failure gaps closed — drift guards for all five @debrief/* packages, a wiring-forgotten meta-check, and a grandfathered script now wired."
---

## What We Built

Feature #200 consolidated `calculateBounds` into `@debrief/utils`. The consolidation stuck, but the durability of that guarantee was fragile. A contributor working from an old branch, unaware of the prior consolidation, could quietly reintroduce `apps/vscode/src/utils/bounds.ts`, pass local tests, and slip the duplication into `main`.

Feature #214 makes that guarantee durable. We built a parameterised ESLint rule factory (`shared/eslint-rules/drift-rule-factory.cjs`) that reads the TypeScript barrel of any `@debrief/*` package, notes every symbol it exports, and fails the build if an `apps/*` file declares an original (non-re-exported) export with one of those names. Five thin caller modules wire the factory into `apps/*/.eslintrc.cjs` via spreads. A meta-check script (`scripts/check-eslint-drift-wiring.cjs`) asserts every `apps/*` sibling includes every spread; it runs as part of `task lint` and fails CI if any spread is missing.

The scope expanded during review to cover all five `@debrief/*` packages: `@debrief/utils`, `@debrief/schemas`, `@debrief/components`, `@debrief/session-state`, and `@debrief/data`. We also wired in `scripts/check-no-geojson-feature.sh`, which had existed in the tree but was unwired and silent.

## The Three Gaps

### Gap 1: Wiring-forgotten meta-check (US4)

The original plan only guarded `@debrief/utils`. But what if a new `apps/newapp/` sibling is added, or a `.eslintrc.cjs` is copied and the spreads are forgotten? Local lint passes, CI fails at the last moment. The meta-check (`scripts/check-eslint-drift-wiring.cjs`) reads every `apps/*/.eslintrc.cjs`, verifies the five drift-rule spreads are present, and exits 1 if any are missing. A missing spread surfaces a CI error naming the file and the spread identifier, which guides the fix immediately.

### Gap 2: Generalised coverage (US5)

`@debrief/schemas`, `@debrief/components`, `@debrief/session-state`, and `@debrief/data` face the same decay risk as `@debrief/utils`. Without guards, a future PR could redeclare `TableDataset` in `apps/vscode/src/schemas/`, or duplicate a hook under `apps/*/src/hooks/`, and the duplication would pass review. The factory pattern makes adding each package a one-line caller module plus one line in the meta-check's `CALLER_MODULES` array. When a sixth `@debrief/*` package is added to the monorepo, extending the guards is now three lines, not three hours of wiring.

### Gap 3: Unwired grandfathered script (US6)

`scripts/check-no-geojson-feature.sh` lived in the tree, checked that `GeoJSONFeature` isn't redeclared under `apps/`, `shared/`, or `services/`, but was never invoked by CI or `task lint`. It was dead code — effective only if someone ran it manually. We wired it into `task lint` directly. Now a contributor who accidentally adds `interface GeoJSONFeature { ... }` anywhere outside the script's exclusion list hits a CI failure and sees exactly which file, in which package, introduced the duplication.

## The Factory Pattern

The design follows a simple precedent:

1. A single factory function (`drift-rule-factory.cjs`) accepts `(packageName, indexPath)`.
2. It parses the package's TypeScript index barrel, walks transitive `export *` chains, and builds a list of every exported name.
3. It generates seven `no-restricted-syntax` selectors — one per AST shape (function, const, class, type alias, interface, enum, default export) — each forbidding a redeclaration under `apps/*`.
4. Each `@debrief/*` package gets a thin caller module (`no-redeclare-{package}-exports.cjs`) that invokes the factory and exports `{ rules }`.
5. Each `apps/*/.eslintrc.cjs` spreads every caller module: `...<pkg>DriftRules` for each of the five packages.
6. The meta-check script reads every `apps/*/.eslintrc.cjs`, asserts every required spread is present, and fails if any are missing.

This is now the precedent for future drift guards in this monorepo. Any new guard — whether for a sixth `@debrief/*` package or a different concern — should follow this pattern: parameterised factory, thin callers, spread-based wiring, meta-check.

## Lessons Learned

**Derived forbidden-sets beat hand-maintained lists.** The rule doesn't have a hard-coded list of forbidden names. It parses `@debrief/utils/src/index.ts` (or the equivalent barrel) at lint time. When a new export is added to the package, the guard extends automatically on the next lint run, with zero edits to the rule module. Hand-maintained lists decay within a quarter.

**Structural wiring assertions beat semantic ones.** The meta-check doesn't parse every `apps/*/.eslintrc.cjs` for the string `no-redeclare-utils-exports` (which would be fragile). It uses `require()` identity comparison: `require('./drift-rules/no-redeclare-utils-exports.cjs') === require('./drift-rules/no-redeclare-utils-exports.cjs')`. The spread must be present and must be the exact object; copy-paste and rename break the check.

**Red squiggles in the editor beat CI-only checks.** Because this is an ESLint rule, the VS Code ESLint extension surfaces the violation on the line the contributor is typing, before they even save. The feedback loop is in seconds, not minutes. Contrast this with `check-no-geojson-feature.sh`, which was CI-only: contributors didn't see the failure until CI ran, which is why it was effectively dead code despite being written and checked in.

**Grandfathered scripts need wiring, not replacement.** We could have rewritten `check-no-geojson-feature.sh` into the drift-rule factory, but the factory only covers `apps/*`, and the script also covers `shared/` and `services/`. Rather than attempt a migration that would have changed its scope, we wired it as-is into `task lint`. Same intent, same code, now enforced.

## By the Numbers

| Metric | Value |
|--------|-------|
| Vitest tests passing | 52 |
| Packages guarded | 5 |
| AST shapes covered per package | 7 |
| Test scenarios (US1–US6) | 6 |
| `task lint` integration points | 3 (pnpm lint + meta-check + geojson script) |

## What's Next

The factory pattern is recorded in ADR-020 as the precedent for future drift guards. Eleven pre-existing name-collisions surfaced by the new rules are suppressed inline with scope notes; follow-up specs will consolidate or rename them.

→ [See the spec](https://github.com/IanMayo/debrief-future/tree/main/specs/214-utils-drift-guard)
→ [See the code](https://github.com/IanMayo/debrief-future/tree/main/shared/eslint-rules)
