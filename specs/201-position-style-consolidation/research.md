# Phase 0 Research: ResolvedPositionStyle Consolidation

**Feature**: 201-position-style-consolidation
**Date**: 2026-04-18
**Status**: Complete — all questions resolved (no `NEEDS CLARIFICATION` markers remain in the spec; the open items below were design questions identified while drafting the plan).

## R-001: How should the `symbol` field be typed so that it derives from `PointShapeEnum` without forcing every call site to use enum members?

### Context

`@debrief/schemas` generates `PointShapeEnum` as a TypeScript **string enum**:

```ts
export enum PointShapeEnum {
  circle = "circle",
  square = "square",
  triangle = "triangle",
  diamond = "diamond",
  cross = "cross",
}
```

Under TypeScript `strict: true`, a string enum is nominal: `const s: PointShapeEnum = 'circle'` is a **type error** — you would need `PointShapeEnum.circle`. That would cascade across every caller that currently writes string literals, test fixture literals, `as 'circle'` casts, etc.

Three candidate types for the canonical `ResolvedPositionStyle.symbol` field:

| Option | Definition | Ergonomics | Schema-linked? | Churn to call sites |
|--------|------------|------------|----------------|---------------------|
| A — raw enum | `symbol: PointShapeEnum` | Bad. Assignments `{ symbol: 'circle' }` break. | Yes | **High** (every fixture/renderer touches `.circle` etc.) |
| B — template-literal union | `` type PointShape = `${PointShapeEnum}`; symbol: PointShape `` | Good. Accepts both `PointShapeEnum.circle` and the string `'circle'`. Resolves to `"circle" \| "square" \| "triangle" \| "diamond" \| "cross"` at type-check time. | Yes — adding a value to the enum auto-extends the union. | **Minimal** (string literals still assignable). |
| C — `keyof typeof` + index | `` type PointShape = typeof PointShapeEnum[keyof typeof PointShapeEnum] `` | Good — equivalent assignment compatibility to B, more verbose, less readable. | Yes | Minimal |

### Decision

**Option B: template-literal union `` `${PointShapeEnum}` ``.**

Export a named type alongside the interface so consumers can use it directly if they want:

```ts
import { PointShapeEnum } from '@debrief/schemas';

export type PointShape = `${PointShapeEnum}`;

export interface ResolvedPositionStyle {
  showSymbol: boolean;
  symbol: PointShape;
  showLabel: boolean;
  labelText: string | null;
}
```

### Rationale

- **Schema-linked.** The type alias `PointShape` is a direct transformation of the generated enum. Adding a value in LinkML → regenerating → no hand-edit in `@debrief/utils`. Satisfies **FR-003** and **SC-006**.
- **No churn for call sites.** Every existing object-literal and `as` cast continues to type-check unchanged. Satisfies the behaviour-preservation intent (**SC-004**) without a ripple of ergonomic breakage across the monorepo.
- **Assignable from `string` via `as` cast.** The current resolver does `symbol: symbol as ResolvedPositionStyle['symbol']` (where `symbol` is typed as `string` because the generated `PositionStyle.symbol: string`). That exact cast continues to work — the target narrows from a hand-typed 3-shape union to the 5-shape schema-derived union without rewriting the resolver's cast site.
- **Not `any`.** Satisfies constitution Article XV: the field is a concrete, narrow union derived from the schema.

### Alternatives considered

- **Option A (raw enum).** Rejected: too costly for callers that assemble styles from string data (sample fixtures, test inputs, renderer `switch (symbol) case 'circle'` blocks). Also doesn't interoperate with the generated `PositionStyle.symbol: string` without a cast — same cast ergonomics as Option B but worse downstream.
- **Option C (keyof typeof).** Rejected: functionally equivalent to B but harder to read; no benefit.
- **Keep hand-typed 5-shape union.** Rejected: this is precisely the drift surface the feature exists to close. Fails FR-003 and SC-002.

---

## R-002: Should `shared/components/src/utils/time.ts` keep its own `resolvePositionStyle`/`computeAllPositionStyles` implementations, or delete them and re-export from `@debrief/utils`?

### Context

There are **two** near-duplicate implementations of the same resolver:

- `shared/utils/src/interval.ts` — the canonical implementation; field name `label`; 3-shape cast.
- `shared/components/src/utils/time.ts` — a near-duplicate; field name `labelText`; 5-shape cast; slightly different override semantics (`override.show_symbol !== undefined && override.show_symbol !== null` vs utils' `override.show_symbol !== undefined`).

The spec (Assumption A-005) explicitly says **implementation consolidation is out of scope**. This research item is just to confirm the minimum change required for the type consolidation.

### Decision

**Delete only the `interface ResolvedPositionStyle` declaration from `shared/components/src/utils/time.ts`; import it from `@debrief/utils`. Leave the `resolvePositionStyle`/`computeAllPositionStyles` functions in that file as-is.** Their existing return type annotation will now resolve to the canonical interface (now with `labelText` on the utils side too — matching what this file has always written).

Update the components' barrel (`shared/components/src/index.ts`) to re-export the type **from `@debrief/utils`** (not from `./utils/time`), so that consumers importing `ResolvedPositionStyle` from `@debrief/components` receive the canonical type.

### Rationale

- **Behaviour preservation.** The components-side implementation is currently used by `PositionSymbolsLayer.tsx` (the only map renderer that computes resolved styles). Leaving that function in place means zero runtime change.
- **Scope discipline.** Implementation de-duplication is non-trivial (the two implementations differ subtly on `null` vs `undefined` handling of `show_symbol`) and would either need a behaviour-equivalence test or a deliberate choice of one implementation over the other. Both are better handled as a follow-up tech-debt item.
- **Satisfies FR-001, FR-002, FR-010.** Exactly one `interface` declaration remains; the components module imports from utils; public re-exports continue to work.

### Alternatives considered

- **Delete both the local interface and the local implementation; import both from `@debrief/utils`.** Tempting (less code), but carries behavioural risk because the two implementations differ on edge cases. Flagged as a **follow-up** (see Out of Scope in spec.md).
- **Move the canonical type to `@debrief/schemas` instead of `@debrief/utils`.** Rejected: `ResolvedPositionStyle` is a *rendering-side* derivation, not a schema artefact. The schema package should stay LinkML-generated only. Backlog idea #206 tracks the separate question of whether non-LinkML types elsewhere should move.

---

## R-003: Does `@debrief/utils` currently depend on `@debrief/schemas`, or will importing `PointShapeEnum` require adding a workspace dep?

### Context

`shared/utils/src/types.ts` already imports `PositionStyle` and `PositionStyleOverride` from `@debrief/schemas`:

```ts
import type { PositionStyle, PositionStyleOverride } from '@debrief/schemas';
```

### Decision

**No dependency change required.** `@debrief/utils` already depends on `@debrief/schemas`. Adding an import for `PointShapeEnum` reuses the existing dep.

### Rationale

Verified by inspection of `shared/utils/src/types.ts:6` (existing `import type { PositionStyle, PositionStyleOverride } from '@debrief/schemas'`). The `PointShapeEnum` export is emitted by the same generator into the same barrel (`shared/schemas/src/generated/typescript/types.ts:70`).

### Alternatives considered

- **Import from the schemas package-relative path.** Unnecessary — the workspace barrel is the canonical import point and already in use.

---

## R-004: How do we detect residual `.label` reads (FR-007) given that TypeScript can't catch them through structural / `any`-typed / JSON-deserialised access?

### Context

FR-007 requires zero `.label` access on values typed as `ResolvedPositionStyle`. `tsc` will catch all **typed** reads after the rename. But the codebase also contains many `.label` reads on *other* types (VSCode tree items, chart axis definitions, form field descriptors, etc.) — these are unrelated and must not be touched.

### Decision

**Two-stage verification during implementation:**

1. **Grep-based audit pre-change.** Before renaming, enumerate all `.label` reads that are structurally adjacent to a resolved-style value. Identified by grep for `\.label\b` AND filter by proximity to `ResolvedPositionStyle` / `resolvePositionStyle` / `computeAllPositionStyles` / `resolvedStyles` / known renderers. Expected count: 5 (all in `shared/utils/tests/interval.test.ts`). Any other match is examined manually; most will be on unrelated types.

2. **Post-change verification.**
   - Run `pnpm -r typecheck` — catches every typed read site that wasn't updated.
   - Run `grep -rn 'ResolvedPositionStyle' shared apps services` and visually confirm every call site uses `.labelText`, not `.label`, on each result.
   - Run the full CI gate (`CLAUDE.md` §"Before Pushing").

### Rationale

- Pure type-driven rename is ~99% safe under `strict: true`. The ~1% edge cases (structural/`any`/JSON) are caught by the grep sweep. No separate tooling investment required.
- The codebase has no JSON-persisted `ResolvedPositionStyle` (it's a rendering-layer derived type, never serialised), so the JSON risk is effectively nil.

### Alternatives considered

- **Add an ESLint rule banning `.label` on this type.** Overkill for a one-shot rename. Not justified under constitution Article IX (minimal dependencies — also applies to lint rules as liabilities).

---

## R-005: Does the field rename `label → labelText` break any in-repo consumer beyond `shared/utils/tests/interval.test.ts`?

### Context

From codebase sweep (Grep `ResolvedPositionStyle` across `*.ts`/`*.tsx`):

- **Producers (write `.label` / `.labelText`)**: `shared/utils/src/interval.ts` (writes `.label`, will be renamed); `shared/components/src/utils/time.ts` (already writes `.labelText`).
- **Consumers (read `.label` / `.labelText`)**:
  - `shared/utils/tests/interval.test.ts` — reads `.label` × 5. **Updated by this feature.**
  - `shared/components/src/MapView/PositionSymbolsLayer.tsx:223-225` — reads `style.showLabel && style.labelText` / `{style.labelText}`. **Already uses `labelText`; unchanged.**
  - No other reads on a `ResolvedPositionStyle` value exist (verified by sweep).

### Decision

**The only consumer requiring source-code changes is `shared/utils/tests/interval.test.ts`** (5 assertion renames). The components-side renderer already uses `labelText` and needs no change. FR-006 and FR-007 therefore map to a single test file.

### Rationale

Satisfies the scope claim in spec.md §"Scale/Scope": < 60 lines of code touched, confined to 5 files listed in the Project Structure tree.

### Alternatives considered

N/A — this is a factual finding, not a choice.

---

## R-006: What is the behaviour-preservation test strategy (SC-004) given the spec forbids adding new tests?

### Context

SC-004 requires identical rendering before/after on the sample catalog. The spec's Out of Scope says no new tests are *required*, but it does not forbid them.

### Decision

**Three layers of existing coverage are sufficient:**

1. **Existing vitest unit tests** (`shared/utils/tests/interval.test.ts`) exercise the resolver's every cascade branch and now assert on `labelText`. If any branch emits the wrong text or shape, these fail.
2. **Existing Storybook/Playwright E2E** that load the sample catalog and render position markers (via `PositionSymbolsLayer`). These confirm downstream rendering is unchanged under each theme.
3. **Existing VS Code webview E2E** (`tests/e2e/*.spec.ts`) load a real REP plot and visually verify tracks render — the ultimate integration check.

No new test is introduced. If any layer flags a regression, the implementation is reworked until all three are green.

### Rationale

Following constitution Article VI (tests gate merges) and Article VII (test-driven AI collaboration) — using existing assertions as the spec of "done" rather than inventing new ones for a zero-behaviour-change refactor.

### Alternatives considered

- **Add a golden-fixture snapshot test rendering `PositionSymbolsLayer` against the sample catalog.** Tempting but premature — the three existing layers are already designed to catch rendering regressions. Adding another would overlap their coverage without increasing confidence.

---

## Summary of decisions

| ID | Decision | Impact on spec |
|----|----------|----------------|
| R-001 | Use template-literal union `` `${PointShapeEnum}` `` for the `symbol` field; export as named type `PointShape`. | Satisfies FR-003 and SC-002 without call-site churn. |
| R-002 | Delete only the local `interface ResolvedPositionStyle` in `shared/components/src/utils/time.ts`; leave the local resolver functions in place. | Satisfies FR-001 and FR-002; keeps scope tight (A-005). |
| R-003 | No dependency change needed — `@debrief/utils` already depends on `@debrief/schemas`. | No packaging work; removes a false concern. |
| R-004 | Post-change verification by `tsc` + targeted grep sweep; no new lint rule. | Satisfies FR-007 and SC-003. |
| R-005 | The only source-code change outside the type definition is 5 assertion renames in `shared/utils/tests/interval.test.ts`. | Confirms scale estimate in plan.md. |
| R-006 | Use existing vitest + Storybook E2E + webview E2E; no new tests. | Satisfies SC-004 and SC-005 with zero new test investment. |

No `NEEDS CLARIFICATION` markers remain. Phase 1 (design & contracts) may proceed.
