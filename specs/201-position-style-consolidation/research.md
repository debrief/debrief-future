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

> **Overturned on 2026-04-18 by `/speckit.review`.** The original decision — keep the duplicates, consolidate only the type — was rejected because the two implementations differ on override-null semantics (see R-007) and leaving both in place perpetuates the drift the feature is trying to remove. **Revised decision below, followed by the original text for history.**

### Revised decision (2026-04-18)

**Delete both the local interface AND the local `resolvePositionStyle`/`computeAllPositionStyles` functions from `shared/components/src/utils/time.ts`; re-export all three from `@debrief/utils` via `shared/components/src/index.ts`.** The utils-side implementation is the survivor, with its override-null semantics changed to match the components-side (see R-007).

### Revised rationale

- Collapsing two near-duplicate implementations closes the drift surface at the function level, not just the type level. DRY in its strongest form.
- The behavioural divergence between the two resolvers is small (see R-007) but non-zero; leaving both means we're one `import` rename away from a subtle regression.
- The components-side `PositionSymbolsLayer` is the only caller of the components-side resolver, and it is immediately compatible with the utils-side surface (same function signatures; only the embedded override-null semantics change — changed to match what PositionSymbolsLayer already relies on).

### Original decision (retained for history)

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

---

## R-007: Which override-null semantics should the unified resolver use?

### Context

The two implementations differ subtly on how they handle a `null` value on an override field:

- `shared/utils/src/interval.ts:137`: `if (override.show_symbol !== undefined)` — a runtime `null` passes the check and is assigned to `showSymbol`, which violates the interface (`boolean`).
- `shared/components/src/utils/time.ts:292`: `if (override.show_symbol !== undefined && override.show_symbol !== null)` — a runtime `null` is filtered; the cascaded default wins.

The LinkML attribute description for `PositionStyleOverride.show_symbol` explicitly says *"Override whether to show symbol (null = use default/interval)"*. The components-side semantics match; the utils-side semantics do not.

### Decision

**Adopt the components semantics (`!= undefined && !== null`) for all four override fields (`show_symbol`, `symbol`, `show_label`, `label`).**

### Rationale

- Matches the LinkML attribute's documented intent. Schema is the contract (constitution Article II).
- Prevents runtime `null` from appearing on a `boolean`-typed `ResolvedPositionStyle` field (constitution Article XV: strict type safety).
- Matches the behaviour that the map renderer (`PositionSymbolsLayer`) has always relied on; the utils side is the one out of step.

### Alternatives considered

- **Utils semantics** (`!= undefined` only): rejected because it silently corrupts the output type.
- **Throw on null**: considered, rejected. A null override field is explicitly meaningful in the schema; throwing would turn a valid input into an error.

### Test impact

New unit test in `shared/utils/tests/interval.test.ts`: "null override field leaves default untouched". Asserts that `resolvePositionStyle` with `{ show_symbol: null }` yields the default's `show_symbol`, not `null`.

---

## R-008: Error policy for invalid runtime symbol values

### Context

FR-015 requires the resolver to reject invalid `override.symbol` values at runtime. Three candidate policies:

| Option | Behaviour | Trade-off |
|--------|-----------|-----------|
| Throw typed error | `resolvePositionStyle` throws `InvalidPointShapeError`. Caller decides how to recover. | Honour Article IV (services return data; frontends handle display). One test per policy branch. |
| Log warning + default | Emit a `console.warn` or `LogService.warn`, substitute `defaultStyle.symbol`. | Robust under bad data (no map-wide crash) but couples `@debrief/utils` to a log transport. |
| Silent default | Substitute `defaultStyle.symbol` with no signal. | Violates Article I.3. Not considered. |

### Decision

**Throw `InvalidPointShapeError` from the resolver. The caller (`PositionSymbolsLayer`) catches and surfaces via `LogService` (FR-018).**

### Rationale

- **Constitution Article IV** — services return data only, frontends handle display. The resolver is domain logic; error display is a frontend concern.
- **Constitution Article I.3** — the error is explicit, never silent.
- Keeps `@debrief/utils` free of UI-layer logging concerns; the utils package can remain consumable from tests, CLI scripts, and any other non-UI context without dragging in a logger.
- The caller can decide per-position whether to fall back to the default shape (preserving the rest of the track's rendering) or to halt — matches the flexibility principle in Article V.

### Alternatives considered

- **Log warning + default in-resolver**: rejected because it couples the utility library to a log transport that may not be available in every consuming context.
- **Return a `Result<ResolvedPositionStyle, Error>` type**: cleaner but intrusive (changes the function signature for a rare error path). Can be revisited as a follow-up if this pattern spreads.

### Test impact

- New unit test: "invalid symbol throws `InvalidPointShapeError` with offending value and valid set".
- New unit test on `PositionSymbolsLayer` (or integration test via Storybook): "invalid override triggers `LogService` call and does not crash the track's rendering".

---

## R-009: How should the validation set be cached?

### Context

`computeAllPositionStyles` is O(n) in positions; tracks can have 10,000+ positions. The invalid-symbol guard (R-008 + FR-015) runs on each position that has an override. Implementation options:

| Option | Code | Cost per call |
|--------|------|---------------|
| Module-level `Set` | `const VALID_POINT_SHAPES = new Set<string>(Object.values(PointShapeEnum));` | O(1) |
| Inline `includes` | `Object.values(PointShapeEnum).includes(override.symbol)` | O(1) check, but allocates a 5-element array per call |
| `in` operator on the enum | `!(override.symbol in PointShapeEnum)` | O(1); enum members double as object keys |

### Decision

**Module-level `Set`.** Declare at module scope in `shared/utils/src/interval.ts`.

### Rationale

- O(1) lookup, zero allocation per call.
- Obvious at the call site what is being checked.
- Tiny memory footprint (5 strings + Set overhead, ~bytes).
- Matches the project-wide pattern of eagerly-prepared validation sets (seen in `shared/utils/src/errorMessages.ts` and similar).

### Alternatives considered

- **Inline `includes`**: rejected — per-call allocation on a render-critical path.
- **`in` operator**: works and is as fast as the Set, but relies on the reader knowing that string-enum members are own-property keys on the generated object. Less obvious. Acceptable fallback if the `Set` import of `Object.values` is somehow problematic.

---

## R-010: Where does `PointShape` live, and what is re-exported from where?

### Context

Issue 5 in `/speckit.review` asked whether `PointShape` should live in `@debrief/utils` or `@debrief/schemas`.

### Decision

**`@debrief/utils` is the home. `@debrief/schemas` remains 100% codegen output.**

### Rationale

- `@debrief/schemas` is currently pure gen-output; introducing a hand-written derivation (even a one-line template literal) would break the invariant that "everything in this package was generated". This matters for the adherence-test story, where any hand-written file would be an exception to track.
- `PointShape` is rendering-layer shorthand — the utils package is the right home for it.
- `@debrief/components` re-exports `PointShape` (and `ResolvedPositionStyle`, and `resolvePositionStyle`, and `computeAllPositionStyles`) so that existing `import … from '@debrief/components'` call sites keep working.

### Alternatives considered

- **`@debrief/schemas`**: rejected for the reason above.
- **Both packages**: rejected — dual home is a drift risk by definition.

---

## R-011: How do we narrow `PositionStyle.symbol` / `PositionStyleOverride.symbol` from `string` to `PointShape` in generated TypeScript?

### Context

FR-014 requires the generator output to narrow these fields to `PointShape`. Currently the `gen-typescript` output emits `symbol: string,` at `shared/schemas/src/generated/typescript/types.ts:576`. The LinkML source declares `range: PointShapeEnum` — so the information exists in LinkML; the generator is simply not translating it to a TypeScript union.

### Decision

**Add a post-process step to the schemas build pipeline that narrows every attribute whose LinkML `range` is `PointShapeEnum` from `symbol: string,` to `symbol: PointShape,` in the generated output, and injects `import type { PointShape } from '@debrief/utils';` (or moves `PointShape` to `@debrief/schemas/src/hand-written/` if circular-import concerns arise — decided at implementation time).**

### Rationale

- **Deterministic**: the step runs as part of the schemas build and produces the same output on a clean regen every time.
- **Minimally invasive**: does not modify the upstream `gen-typescript` generator (an external LinkML tool outside our control).
- **Scoped**: the narrowing is limited to attributes whose LinkML `range` is `PointShapeEnum`. Other enum-ranged attributes (`NamedColorEnum`, `LineCapEnum`, etc.) are left as `string` for now — backlog #206 tracks the broader audit.

### Alternatives considered

- **Modify `gen-typescript` upstream**: out of scope; we don't control the tool.
- **Hand-edit the generated file**: rejected — breaks the "everything in generated/ is generated" invariant.
- **Drop out of auto-gen for `PositionStyle.symbol` / `PositionStyleOverride.symbol` specifically**: rejected — the attributes are structurally the same as the others in the generated interfaces; selective manual handling is a maintenance trap.
- **Use a TypeScript declaration merge**: `declare module '@debrief/schemas' { interface PositionStyle { symbol: PointShape } }` — rejected because declaration merging doesn't *replace* the original field type, only extends it, and `string` already accepts every `PointShape` value (it's the superset direction, so merge does nothing useful).

### Risks

- **High-risk research item**: the mechanism has not been prototyped. If no tractable narrowing approach is found within a reasonable implementation window, FR-014 is renegotiated *before* `tasks.md` is generated. Concretely: the fallback is to demote FR-014 to a backlog-tracked follow-up, narrow only `ResolvedPositionStyle.symbol` (FR-003, already done), and live with `PositionStyle.symbol` / `PositionStyleOverride.symbol` staying as `string` for now.
- **Build-order coupling**: the narrowing step introduces a new dependency from `@debrief/schemas` (generated code) on `@debrief/utils` (where `PointShape` lives). If this causes a circular build-order issue, `PointShape` is relocated into a hand-written file inside `@debrief/schemas` (e.g., `shared/schemas/src/hand-written/point-shape.ts`) and re-exported from the schemas barrel — accepting the loss of the "everything is generated" invariant.

### Test impact

Existing schema adherence tests exercise the generated TypeScript; they pass if the narrowed output still type-checks. A new compile-time test (e.g., a `// @ts-expect-error` fixture) asserts that `symbol: 'star'` on `PositionStyleOverride` is now rejected.

---

## R-012: Reconcile `MarkerSymbolEnum` vs `PointShapeEnum` — 17A (remove) or 17B (keep with adherence test)?

### Context

FR-017 requires one of two actions on `MarkerSymbolEnum`. Feature #091 (`specs/091-tool-parameter-context-menus/research.md` RQ-7) deliberately introduced `MarkerSymbolEnum` as a semantic sibling to `PointShapeEnum` with identical values, on the rationale that *"PointShapeEnum is used for GeoJSON styling properties, MarkerSymbolEnum is used as a tool parameter type. The values are identical but the semantic contexts are different."* The feature #091 author acknowledged a fallback: *"Only update PointShapeEnum, don't create MarkerSymbolEnum — simpler but loses the semantic distinction. Chosen as an acceptable fallback if the dual-enum approach creates confusion."*

### Decision

**17B (keep both, pin equality via a schema adherence test).** The `/speckit.review` scope expansion asked for reconciliation; 17B reconciles without overturning the prior ADR.

### Rationale

- **Respects prior decision**: the semantic distinction between styling-attribute context and tool-parameter context is a real architectural choice made by feature #091 and used today. Unilaterally deleting `MarkerSymbolEnum` would need a conversation with that feature's stakeholders, which is outside the scope of this refactor.
- **Closes the drift surface**: an adherence test that asserts `MarkerSymbolEnum.permissible_values.keys() == PointShapeEnum.permissible_values.keys()` detects at CI time any addition to one enum that isn't mirrored in the other.
- **Reversible**: if the dual-enum pattern later becomes a liability (e.g., the two genuinely need different values), removing the adherence test is trivial. If it becomes clear the distinction is unnecessary, 17A remains an option — handled via a separate ADR + feature.

### Alternatives considered

- **17A (remove `MarkerSymbolEnum`)**: cleaner end-state but requires overturning feature #091's decision. Would be right if the dual-enum pattern has caused measurable confusion since #091 shipped — a conversation not started yet. Reconsider in a follow-up.
- **Do nothing, add a comment pointing out the duplication**: rejected — comments rot, adherence tests don't.

### Test impact

New schema adherence test in `shared/schemas/tests/` (or wherever adherence tests live): assert the permissible-value sets of `PointShapeEnum` and `MarkerSymbolEnum` are identical. The test is short and deterministic.

---

## Summary of decisions

| ID | Decision | Impact on spec |
|----|----------|----------------|
| R-001 | Template-literal union `` `${PointShapeEnum}` ``, exported as named type `PointShape`. | FR-003, SC-002. |
| R-002 | **Overturned.** Consolidate both the interface AND the resolver functions into `@debrief/utils`; components package re-exports. | FR-012, SC-007. |
| R-003 | No dependency change needed. | No packaging work. |
| R-004 | `tsc` + grep sweep for `.label` residue. | FR-007, SC-003. |
| R-005 | (Refreshed) Post-expansion source-code changes span ~13 files: the original 5 + `PositionSymbolsLayer.tsx` + `position-symbols.test.ts` + `applySymbolStyle.ts` + new `InvalidPointShapeError` + `assertNever` + `common.yaml` (and the regenerated schema outputs) + one schemas-build post-process step + one schema adherence test. | Plan.md Project Structure must reflect this. |
| R-006 | Existing vitest + Playwright E2E + webview E2E; plus 3 new unit tests (null semantics, invalid-symbol guard, assertNever negative check) + 1 new schema adherence test. | SC-004, SC-005. |
| R-007 | Components null-override semantics. | FR-013. |
| R-008 | Throw `InvalidPointShapeError`; renderer catches and logs. | FR-015, FR-018, SC-009. |
| R-009 | Module-level `Set<string>` caching the validation values. | FR-015 performance. |
| R-010 | `PointShape` lives in `@debrief/utils`; `@debrief/schemas` stays codegen-only. | No new hand-written code in `@debrief/schemas` (unless R-011 fallback triggers). |
| R-011 | Post-process step in the schemas build; fallback to hand-written `PointShape` inside `@debrief/schemas` if circular imports bite. High-risk research item; FR-014 is renegotiated if no mechanism proves tractable. | FR-014. |
| R-012 | 17B: keep both enums, add a schema adherence test pinning value equality. Respects feature #091's prior decision. | FR-017, SC-010. |

No `NEEDS CLARIFICATION` markers remain. The only high-risk open item is R-011's narrowing mechanism; a time-boxed investigation in the first implementation task will confirm tractability or trigger FR-014 renegotiation.
