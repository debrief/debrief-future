# Audit: non-LinkML type declarations across the monorepo

## Problem
Architectural principle: LinkML is the root of truth for types; TS and Python are generated from it. The essential requirement applies when an object crosses the Python / TS boundary; single-domain types may be hand-defined *by exception*, but each exception should be a conscious decision rather than an accident.

The code-quality review pass (PR #465) surfaced several cases where hand-typed interfaces had drifted from each other or from the LinkML schema (`ResolvedPositionStyle`, `Coordinate`, `ViewportPolygon`, `GeoJSONFeature`, `DisplayMode`, `PlaybackState`, `DatasetEnvelope`, tool-result envelopes, etc.). Each one has its own follow-up item — but there is no systematic inventory of *all* hand-typed types in the monorepo. Without that inventory we can't tell which are intentional exceptions vs. accidental drift risks waiting to surface.

## Proposed Solution
Analysis-phase task producing a written inventory and triage report. Not a code change.

1. Enumerate every `interface` / `type` / `enum` declaration under `apps/`, `shared/` (excluding `generated/`), and `services/` — excluding LinkML-generated output and test-local types.
2. For each, classify:
   - **Schema-rooted** (imports from `@debrief/schemas`) — OK
   - **Boundary / parse-time loose type** (e.g. `RawGeoJSONFeature`, raw JSON parsing) — ideally LinkML-rooted per #204, otherwise justified exception
   - **Single-domain convenience type** (TS-only, no Python counterpart, stays in one runtime) — allowed exception; record justification
   - **Cross-domain runtime type with hand-typed definition** (crosses Python / TS or stored to disk) — **violates principle; must be promoted to LinkML**
   - **Drift candidate** (same-name-different-shape with another TS type or with a schema type) — fix required
3. Produce `docs/type-audit-2026.md` (or similar) listing every type with its classification, location, and recommended action.
4. For each "must be promoted to LinkML" and "drift candidate" entry, either open a dedicated backlog item or fold into an existing one.
5. Feed the findings into E11 (Schema-First Boundary Typing) so the rollout has a concrete target list.

## Success Criteria
- `docs/type-audit-2026.md` exists and covers every non-generated type declaration
- Each type has an explicit classification and recommended action
- New backlog items exist for every "promote to LinkML" and "drift candidate" finding not already covered by #203 – #205 or E11
- The audit report is linked from E11's epic document

## Dependencies
None (analysis task). Outputs feed into E11.

## Parallelisation
Fully parallel with every code change — this is read-only analysis that produces a document.

## Complexity
Medium (scope is large; judgement is required for each classification)

## Reference
Discovered during the code-quality review pass; see PR #465 report "Audit non-LinkML type declarations" durable note.
