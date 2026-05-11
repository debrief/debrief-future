# Research: LinkML-derive `@debrief/stac-writer` contract types

**Feature**: 240-linkml-stac-writer-types
**Phase**: 0 (resolve unknowns before design)
**Date**: 2026-05-07

The spec contains zero `[NEEDS CLARIFICATION]` markers, so research here is *positive* (what we discovered while investigating the existing codebase) rather than question-resolution. Five outcomes (R1–R5) shape the design choices in `plan.md` and `data-model.md`. Outcomes R1 and R2 were materially revised after `/speckit.review` on 2026-05-08 — see the revision notes inline.

---

## R1: Should `StacItem` be added to LinkML, or its `properties` typed via `StacExtensionProperties`?

**Decision** *(revised after `/speckit.review` 2026-05-08)*: **Neither — leave `StacItem` entirely out of scope for this feature.** The writer's `StacItem` interface stays exactly as today (`properties: Record<string, unknown>`). The original plan to type `properties` as `StacExtensionProperties & Record<string, unknown>` was found to deliver no value (see "Why the originally-planned approach fails" below) and is captured as a follow-up backlog item ("Prefix-aware TS typing for `StacExtensionProperties`").

**Why the originally-planned approach fails**:

The on-disk JSON keys carry the `debrief:` prefix:
- `props['debrief:provenance_log']` — `apps/vscode/src/services/stacService.ts:1333`, `apps/web-shell/src/services/stacWriterIdb.ts:341`
- `props['debrief:overrides']` — `apps/vscode/src/services/stacService.ts:1319`
- `props['debrief:platforms']`, `props['debrief:tags']`, etc.

LinkML's `gen-typescript` strips the `debrief:` prefix when emitting field names. The generated TS interface is:

```typescript
export interface StacExtensionProperties {
    platforms?: PlatformRecord[],
    tags?: string[],
    feature_tags?: string[],
    overrides?: string[],
    provenance_log?: PropertiesProvenanceEntry[],
}
```

(See `shared/schemas/src/generated/typescript/types.ts:1625+`.) Names are unprefixed.

If `StacItem.properties` were typed as `StacExtensionProperties & Record<string, unknown>`, then `props['debrief:provenance_log']` would resolve via the `Record<string, unknown>` index signature (yielding `unknown`), not via the `StacExtensionProperties.provenance_log` slot (which has a different name). The writer would gain *zero* additional type information for any of its real access patterns.

Delivering the spec's "new `debrief:*` fields flow automatically" promise requires either:
1. A `gen-typescript` extension that emits a parallel interface with prefixed JSON keys (e.g. `'debrief:provenance_log': PropertiesProvenanceEntry[]`), OR
2. A repo-wide refactor of the writer's access pattern (`props['debrief:foo']` → `props.foo` plus a serialisation adapter that adds the prefix on write).

Both are materially larger work than this feature can absorb. Captured as a backlog follow-up.

**Alternatives considered (and rejected)**:

- **Option A — Add `StacItem` as a full LinkML class**: Re-models bare STAC 1.1 in our LinkML. Creates a *new* drift surface (us vs. the upstream STAC working group's canonical JSON Schema). Rejected.
- **Option B — Originally-planned `StacItem.properties: StacExtensionProperties & Record<string, unknown>`**: Doesn't deliver the promise (see above) — falls back to `Record<string, unknown>` for every real access. Misleading at best. Rejected.
- **Option C (chosen) — Defer the entire `StacItem` typing improvement**: Smallest correct migration. Documents the gap honestly via a backlog entry. Lets this feature ship the consolidation half (`PropertiesProvenanceEntry`) without overpromising on the half it can't deliver. ✅

**Spec-text reconciliation** *(applied 2026-05-08)*: Spec FR-001 was tightened to scope the LinkML-derivation requirement to `PropertiesProvenanceEntry` only. The Key Entities note for `StacItem` documents that it remains hand-written. SC-005 was reframed: the Article II.1 audit reports `PropertiesProvenanceEntry` as resolved while `StacItem` is a tracked deferral, not an open finding.

---

## R2: How do we handle the literal-string narrowness loss for `tool` / `method` / `source`?

**Decision** *(revised after `/speckit.review` 2026-05-08)*: **Hybrid intersection.** Re-export the LinkML-generated type and immediately tighten the three pattern-constrained fields back to literal types via an intersection in the components-side declaration. The runtime validator (`isValidPropertiesProvenanceEntry`) and the constants (`PROPERTIES_PANEL_TOOL_SENTINEL`, `PROVENANCE_LOG_CAP`, `PROVENANCE_LOG_ARCHIVE_FILENAME`) stay verbatim.

**Why the originally-accepted "loose types" decision was wrong**:

The original R2 said the runtime validator was the enforcement gate, citing the immutable-audit-trail invariant in Article III.3. Review surfaced that **`isValidPropertiesProvenanceEntry()` is only called in tests** (`apps/vscode/tests/unit/stacService.provenanceRotation.test.ts:155`, `stacService.updateItemMetadata.test.ts:119`) — not in either production write site. The two production constructs at `apps/vscode/src/services/stacService.ts:1323` and `apps/web-shell/src/services/stacWriterIdb.ts:332` rely *exclusively* on the literal-string types in the components-side hand-written declaration to catch typos at the write boundary. Accepting looser strings would have left no compile-time guard *and* no runtime guard in production — a silent-failure path in violation of Article I.3.

**The fix — five lines in `provenanceTypes.ts`**:

```typescript
// shared/components/src/PropertiesPanel/provenanceTypes.ts

import type { PropertiesProvenanceEntry as Generated } from '@debrief/schemas';

export const PROPERTIES_PANEL_TOOL_SENTINEL = 'debrief.propertiesPanel' as const;

export type PropertiesProvenanceEntry =
  Omit<Generated, 'tool' | 'method' | 'source'> &
  {
    tool: typeof PROPERTIES_PANEL_TOOL_SENTINEL;
    method: `properties-panel@${string}`;
    source: 'user';
  };

export function isValidPropertiesProvenanceEntry(
  entry: unknown,
): entry is PropertiesProvenanceEntry {
  // Body unchanged — same runtime checks as today.
}

export const PROVENANCE_LOG_CAP = 500 as const;
export const PROVENANCE_LOG_ARCHIVE_FILENAME = 'provenance_log_archive.jsonl' as const;
```

**What this delivers**:

- The schema-driven invariant is preserved: `Omit<Generated, ...>` references the LinkML-generated type, so any change to the LinkML class flows through (e.g. adding a new attribute, tightening another pattern).
- The compile-time guard is preserved: `tool`, `method`, `source` keep their literal/template-literal types. Today's typo-catching at the production write sites continues to work unchanged.
- Cost: 5 lines of hand-written narrowing in *one place* — the components-side declaration. Same place a contributor would have hand-written the type today; same place they'll edit if the constraints change.

**Alternatives considered**:

- **Option A — accept looser types** (originally chosen, then rejected after review): Re-opens an Article I.3 silent-failure path because the runtime validator isn't called in production. Rejected.
- **Option B — Hybrid intersection** (chosen, post-review): Closes the gap statically; one small file edit. ✅
- **Option C — Add runtime validator calls in production write paths**: Closes the gap dynamically (throw on bad input). Adds 2-3 lines × 2 sites + matching test. Equally valid, but B is simpler and catches the bug earlier (compile time vs write time). Captured as a stricter follow-up if needed.
- **Option D — Branded narrow shim**: Re-export the generated type but wrap fields in `string & { __brand: 'PropertiesPanelTool' }`. Forces all callers to construct via the validator. Significant ergonomic cost. Rejected.
- **Option E — Fork the generator**: Patch `gen-typescript` to emit literal types when a `pattern` matches a single literal. Out of scope; affects every other consumer of the generator. Rejected.

**Note on the read path**: The hybrid intersection guards *write*. On *read* paths (`stacService.ts:1334` casts `props['debrief:provenance_log']` to `PropertiesProvenanceEntry[]` without runtime validation), a malformed disk entry could still violate the contract silently. That's a separate residual concern — captured as a backlog follow-up ("Production read-path runtime validation of provenance entries") rather than addressed here, since the read-path issue predates this feature and is independent of the type-derivation work.

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

**Caveat — generator non-determinism (gating, P0)**: The drift check assumes `gen-typescript` and `gen-pydantic` produce byte-identical output for identical input. **This is a P0 gating verification** captured as **SC-007** in spec.md (added 2026-05-08 after `/speckit.review`). The implementation must:

1. Run `python scripts/generate.py` twice on a clean checkout.
2. Assert `git diff --quiet shared/schemas/src/generated/`.
3. **If quiet**: drift check ships as designed.
4. **If not quiet**: investigate the source of non-determinism (likely candidates: dictionary key order, embedded timestamps in headers). Either fix at the generator level, or add a normalisation pass (`prettier --write` for `.ts`; equivalent for Pydantic) between regeneration and the diff check, and verify the normalised output is byte-stable.

A non-deterministic gate is worse than no gate (Article VI.4 — CI MUST pass) because contributors learn to retry CI without investigation. Today's generated files include the header `// AUTO-GENERATED — DO NOT EDIT`, suggesting the generator is already deterministic, but the assumption is verified rather than trusted before the gate ships.

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

**Mechanical resolution under the hybrid intersection (R2)**: The writer's hand-written declaration (with the loose enum) is *deleted entirely* — replaced by a re-export of the components-side hybrid intersection, which fixes `source: 'user'`. So R4 doesn't require its own dedicated edit; it's resolved as a side-effect of the R2 implementation.

**If a future use case needs `'tool'` or `'import'`**: Add the value to LinkML (`pattern: "^(user|tool|import)$"` or — better — an explicit `permissible_values` enum), regenerate, and update the components-side intersection's `source` literal to a union (`'user' | 'tool' | 'import'`) in the same change. That's exactly the workflow this feature is establishing.

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

*(Updated 2026-05-08 after `/speckit.review` — R1 and R2 materially revised; R3–R5 substantively unchanged.)*

| ID | Decision | Effect on plan |
|----|----------|----------------|
| R1 | **`StacItem` typing dropped from this feature** — naive `StacExtensionProperties & Record<string, unknown>` doesn't deliver the spec's promise because LinkML strips the `debrief:` JSON-key prefix. Captured as a backlog follow-up. | Smaller scope; spec FR-001 narrowed to `PropertiesProvenanceEntry`. |
| R2 | **Hybrid intersection** in `provenanceTypes.ts` — re-export the LinkML-generated type, intersect to keep `tool`/`method`/`source` as literal types. The runtime validator is *not* called in production write paths today, so accepting loose types would have introduced a silent-failure path. | One small file change preserves both the LinkML link and the compile-time guard. |
| R3 | Drift check in `schema-tests.yml`; matching `task schema:check-drift` for local runs. **Gated on SC-007** — verified generator determinism (P0 verification before the gate ships; if non-deterministic, add a normalisation pass). | Enforcement at CI; no new workflow file. |
| R4 | Narrow writer's `source` enum to LinkML's `'user'` only. Mechanically resolved as a side-effect of R2 (the writer's hand-written declaration disappears entirely). | Zero dedicated edit beyond R2. |
| R5 | `linguist-generated=true` via `.gitattributes` for `shared/schemas/src/generated/**` | One-line `.gitattributes` change; PR diff ergonomics |
| (review) | Workspace dep edge `@debrief/stac-writer` → `@debrief/components` accepted (type-only via subpath leaf; ESLint bans runtime imports). | One line in writer's `package.json`; one ESLint rule. |
