# Research: LinkML-derive `@debrief/stac-writer` contract types

**Feature**: 240-linkml-stac-writer-types
**Phase**: 0 (resolve unknowns before design)
**Date**: 2026-05-07

The spec contains zero `[NEEDS CLARIFICATION]` markers, so research here is *positive* (what we discovered while investigating the existing codebase) rather than question-resolution. Five outcomes (R1–R5) shape the design choices in `plan.md` and `data-model.md`.

---

## R1: Should `StacItem` be added to LinkML?

**Decision**: **No.** Keep `StacItem` as a TypeScript-only interface in `@debrief/stac-writer/src/interface.ts`, but type its `properties` as `StacExtensionProperties & Record<string, unknown>`, importing `StacExtensionProperties` from `@debrief/schemas`.

**Rationale**:

The writer's `StacItem` is the bare STAC 1.1 Item shape (`id`, `properties`, `assets`, `links`, plus arbitrary top-level keys via `[k: string]: unknown`) with the Debrief extension layered into `properties`. The bare STAC 1.1 shape is **not authored here** — it is a stable upstream contract owned by the STAC working group, with its own canonical JSON Schema at `https://schemas.stacspec.org/v1.1.0/item-spec/json-schema/item.json`. Re-modelling that shape in this repo's LinkML would:

1. Introduce a second source-of-truth for STAC 1.1 (the LinkML re-model) without removing the upstream one. This *creates* schema drift (between our re-model and the canonical STAC schema) instead of eliminating it.
2. Force tracking of upstream STAC 1.1 evolutions in our LinkML — work without value.
3. Force LinkML to express "any top-level key passes through" (`[k: string]: unknown`) — possible via `additionalProperties: true` on the JSON Schema side, but awkward in LinkML's class model and lossy after generation.

The *meaningful* part of the writer's `StacItem` — the part that the spec actually cares about, where new `debrief:*` extension fields land — is `properties`. That portion is already modelled in LinkML as `StacExtensionProperties`. Importing that single class into the writer's `StacItem` definition delivers the spec's intent (new extension fields propagate automatically) without re-modelling STAC 1.1.

After the migration, adding a new `debrief:*` field to `stac-extension.yaml` produces an updated `StacExtensionProperties` interface, which the writer's `StacItem.properties` references via `&`. Static type-checkers see the new field through the writer's surface immediately. ✅

**Alternatives considered**:

- **Option A — full LinkML `StacItem` class**: Adds work without value (see above). Rejected.
- **Option B — `StacItem.properties: any`**: Loses Article XV compliance. Rejected.
- **Option C — `StacItem.properties: StacExtensionProperties`** (no `& Record<string, unknown>`): Tightens past today's behaviour — the writer would refuse unknown keys it currently accepts. This would break round-trip on already-emitted items that carry future-Debrief or unrelated extension fields. Rejected.
- **Option D (chosen) — `properties: StacExtensionProperties & Record<string, unknown>`**: Known fields are typed and flow from LinkML; unknown fields still pass through. Matches today's runtime behaviour exactly. ✅

**Spec-text reconciliation**: FR-001 reads "consume LinkML-generated TypeScript declarations for `StacItem` and `PropertiesProvenanceEntry`." Strictly, after this design only `PropertiesProvenanceEntry` is fully LinkML-derived; `StacItem` *references* a LinkML-derived type rather than being one itself. This satisfies the spec's *intent* (close the drift gap on the Debrief extension surface) while respecting an upstream-schema boundary the spec didn't explicitly call out. The spec's edge-case bullet *"Two `StacItem`s in the world: STAC's own Item shape (from the STAC 1.1 spec) and the Debrief-extended Item shape co-exist in the codebase"* implicitly endorses this distinction.

---

## R2: How do we handle the literal-string narrowness loss for `tool` / `method` / `source`?

**Decision**: **Accept the looser static types.** Keep the runtime validator (`isValidPropertiesProvenanceEntry`) and the constants (`PROPERTIES_PANEL_TOOL_SENTINEL`, `PROVENANCE_LOG_CAP`, `PROVENANCE_LOG_ARCHIVE_FILENAME`) in `@debrief/components/src/PropertiesPanel/provenanceTypes.ts` exactly as they are today. Re-export the *type* from `@debrief/schemas`, but keep a hand-written **type-guard** that narrows generated `string` fields to literal types at the boundary.

**Rationale**:

LinkML's `pattern` constraint generates JSON Schema `pattern` properties and Pydantic regex validators, but `gen-typescript` emits `string` (it has no general way to translate regex into TS literal types). The hand-written type today gets tighter static types via three TS-specific constructs (`typeof X`, template literals, `'user'` literal) that LinkML cannot express.

Three options:

- **Option A — accept looser types** (chosen): Static surface becomes `tool: string`, `method: string`, `source: string`. Runtime validator stays. Trade-off: a typo at the call site won't be caught by `tsc`; it will be caught by the runtime validator and by tests. The trade-off is consistent across all existing `gen-typescript` consumers in this repo.
- **Option B — branded narrow shim**: Re-export the generated type but wrap fields in `string & { __brand: 'PropertiesPanelTool' }` type aliases. Forces all callers to construct via the validator. Adds significant ergonomic cost (every caller needs the brand) for marginal type-safety gain.
- **Option C — fork the generator**: Patch `gen-typescript` to emit literal types when a `pattern` matches a single literal. Out of scope; affects every other consumer of the generator.

Option A is the least-invasive. The runtime validator + constants close the loop at the *write boundary* — where it matters most for an immutable audit trail (Article III.3).

**Alternatives considered**: B and C above. Both rejected on cost-vs-value grounds.

**Concrete migration shape** (final form):

```typescript
// shared/components/src/PropertiesPanel/provenanceTypes.ts

import type { PropertiesProvenanceEntry as GeneratedEntry } from '@debrief/schemas';

export const PROPERTIES_PANEL_TOOL_SENTINEL = 'debrief.propertiesPanel' as const;

export type PropertiesProvenanceEntry = GeneratedEntry;

export function isValidPropertiesProvenanceEntry(
  entry: unknown,
): entry is PropertiesProvenanceEntry {
  // Body unchanged — same runtime checks as today.
}

export const PROVENANCE_LOG_CAP = 500 as const;
export const PROVENANCE_LOG_ARCHIVE_FILENAME = 'provenance_log_archive.jsonl' as const;
```

---

## R3: Where does the drift check live?

**Decision**: **Add the drift step to `.github/workflows/schema-tests.yml`**, immediately after the existing `Run schema generation` step. Add matching `task schema:generate` + `task schema:check-drift` targets to the root `Taskfile.yml` so contributors can run the same check locally.

**Rationale**:

- `schema-tests.yml` already runs `uv run python scripts/generate.py` on every push to `main`, `claude/*`, or `000-schemas`, and on PRs into `main` that touch `shared/schemas/**`. Adding `git diff --exit-code shared/schemas/src/generated/` after that step costs no extra CI time — the generation already runs.
- However, that workflow is **path-filtered** to `shared/schemas/**` — so a PR that *only* changes a consumer (e.g. `@debrief/components`) without touching the schema source won't trigger it. That's actually fine for drift-of-generated-artefacts (the drift can only happen if someone hand-edited a generated file, which means they touched `shared/schemas/src/generated/**`), since that path matches the filter. But to remove any ambiguity, **also add `shared/schemas/src/generated/**` to the path filter**.
- The drift step's failure message must name the regeneration command (`task schema:generate`, or fallback `cd shared/schemas && uv run python scripts/generate.py`). This is critical for FR-006.

**Failure-mode design**:

```yaml
- name: Check generated artefacts are up-to-date
  run: |
    if ! git diff --exit-code -- src/generated/; then
      echo "::error::Generated artefacts under shared/schemas/src/generated/ have drifted from the LinkML source."
      echo "::error::Run 'task schema:generate' (or 'cd shared/schemas && uv run python scripts/generate.py') and commit the result."
      exit 1
    fi
```

**Alternatives considered**:

- **Option A — drift check in `ci.yml`** instead of `schema-tests.yml`: Would require duplicating the generator setup (uv install + Python toolchain) into the main CI workflow that today runs only Node/pnpm. Rejected — increases CI surface area for no value.
- **Option B — pre-commit hook only** (no CI check): Pre-commit hooks can be skipped. Constitution Article VI.4 requires CI to enforce. Rejected.
- **Option C — uncommit generated artefacts; generate on every install**: Changes the project's existing convention (artefacts ARE committed today, and the `package.json` `main` for `@debrief/schemas` points at them directly without a build step). Rejected — out of scope.

**Caveat — generator non-determinism**: The drift check assumes `gen-typescript` and `gen-pydantic` produce byte-identical output for identical input. Spot-check this by running the generator twice on `main` before this feature lands; if the diff is non-empty, the migration includes a small normalisation pass (e.g. `prettier --write` on the generated TS) before the diff check. Today's generated files include the header `// AUTO-GENERATED — DO NOT EDIT`, suggesting the generator is already deterministic, but verifying this is a P0 task.

---

## R4: What's the `source` enum divergence (`'user' | 'tool' | 'import'` in writer vs `^user$` in LinkML)?

**Decision**: **Narrow the writer's enum to match LinkML.** The values `'tool'` and `'import'` are dead code today — no in-repo caller passes either of them. Removing them is a behaviour-preserving simplification.

**Rationale**:

`@debrief/stac-writer/src/interface.ts:47` declares `source: 'user' | 'tool' | 'import'`. LinkML's `PropertiesProvenanceEntry.source` has `pattern: "^user$"` — only `'user'` is a valid value at the schema level. The runtime validator in `@debrief/components/src/PropertiesPanel/provenanceTypes.ts:43` enforces `e.source === 'user'`. So:

- The schema says `'user'` only.
- The runtime says `'user'` only.
- The writer's TS interface says three values.

This is a textbook drift symptom — exactly the class of problem the spec exists to eliminate. The two extra values were defensive-future-proofing that never landed. Removing them aligns the three sources of truth.

**Migration impact**: A grep confirms no in-repo caller passes `'tool'` or `'import'` to a `PropertiesProvenanceEntry.source` field. Zero breakage.

**If a future use case needs `'tool'` or `'import'`**: Add the value to LinkML (`pattern: "^(user|tool|import)$"` or — better — an explicit `permissible_values` enum), regenerate, and the writer surface picks it up automatically. That's exactly the workflow this feature is establishing.

**Alternatives considered**:

- **Option A — keep the writer's enum, loosen LinkML**: Loosens the schema for no real consumer, weakens Article III.3 (audit trail integrity benefits from tighter constraints). Rejected.
- **Option B — keep both, document the divergence**: Cements the drift. Rejected — defeats the spec's purpose.

---

## R5: Should generated artefacts be additionally marked as not-for-hand-edit?

**Decision**: **Yes, lightly.** Keep the existing `// AUTO-GENERATED — DO NOT EDIT` header (already present). Add `shared/schemas/src/generated/** linguist-generated=true` to `.gitattributes` so GitHub's PR diff view collapses these files automatically and they are excluded from language statistics.

**Rationale**:

- The header comment is already there and already does its job at the file level.
- `linguist-generated=true` adds a *PR-review* signal — collapsed-by-default in the GitHub diff viewer. Reviewers won't waste time reviewing line-by-line diffs of regenerated files; the drift check provides the actual correctness gate.
- The drift check (R3) is the enforcement; markers are just navigational aids.

**Alternatives considered**:

- **Option A — no additional markers**: Leaves the existing convention as-is. Rejected — the diff view is noisy on PRs that touch the schema; collapsing the regenerated files improves review ergonomics.
- **Option B — heavier guard (e.g. CODEOWNERS rule, custom ESLint rule)**: Over-engineered for the size of the surface. Rejected.

---

## Summary of resolved decisions

| ID | Decision | Effect on plan |
|----|----------|----------------|
| R1 | No LinkML `StacItem` class; use `StacExtensionProperties & Record<string, unknown>` for `StacItem.properties` | Smallest possible LinkML surface; no upstream re-modelling |
| R2 | Accept looser TS types from generator; keep runtime validator + constants | Three TS hand-writes collapse to one re-export plus an unchanged validator |
| R3 | Drift check in `schema-tests.yml`; matching `task schema:check-drift` for local runs | Enforcement at CI; no new workflow file |
| R4 | Narrow writer's `source` enum to LinkML's `'user'` only | One-line TS change; zero behaviour impact |
| R5 | `linguist-generated=true` via `.gitattributes` for `shared/schemas/src/generated/**` | One-line `.gitattributes` change; PR diff ergonomics |
