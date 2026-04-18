# Epic E11: Schema-First Boundary Typing

## Problem
~35 residual ESLint warnings (`no-restricted-syntax` — ADR-011 / Constitution XV.7) flag `Record<string, unknown>` and `unknown` casts at data boundaries. They aren't hiding bugs — each has an explicit `// eslint-disable-next-line` — but they represent an inventory of "places where we parse untrusted shapes without a schema." The warnings cluster at five real boundaries:

1. **Tool-result envelope** (VS Code `extension.ts`, `resultsPanelService.ts`, and the web-shell equivalents) — payloads returned by Python MCP tools, including the `__datasets` sidecar metadata. Crosses the Python ↔ TS boundary.
2. **NL → CQL2 response** (`shared/components/src/nl-cql2/parseResponse.ts`, `buildPrompt.ts`) — JSON returned by the Claude API. Crosses an external service boundary.
3. **Enum-bundle / taxonomy** (`shared/components/src/filter-engine/engine.ts`) — reading `shared/data/enum-bundle.json`. TS-only, but the bundle is build-generated and has a knowable shape.
4. **E2E test harness fakes** (`__tests__/`, `__fixtures__/`) — scaffolding that constructs payloads by hand and casts them into place.
5. **localStorage** — UI preference persistence (split pane, layout, etc.). TS-only.

Per the architectural principle:
- Types that cross Python ↔ TS **must** be rooted in LinkML (boundaries 1 and 2).
- Types that live entirely in one domain may be hand-defined, but drift is still a bug — symmetric serialize/parse at each write/read site is the standard (boundaries 3, 4, 5).

## Proposed Solution
Multi-phase rollout, one boundary at a time. Each phase is its own backlog item under this epic, landing as an independent PR. Acceptance for the epic is: zero `no-restricted-syntax` warnings in production code; all parse points either use a LinkML-generated type + generated-guard or a Zod/equivalent validator for single-domain shapes.

### Phase inventory (initial — may grow from #206 audit)

| Phase | Target | Approach |
|-------|--------|----------|
| Phase 1 | Tool-result envelope + `__datasets` sidecar | Promote to LinkML. Generate TS types; add a parse-time guard (`isToolResult`) and a narrowing helper. Replace every `Record<string, unknown>` cast with a guarded call. |
| Phase 2 | NL → CQL2 LLM response shape | Promote to LinkML (the canonical CQL2-JSON subset the LLM is prompted to produce). Generate TS; replace cast chains in `parseResponse.ts` with a schema-derived validator. |
| Phase 3 | Enum-bundle / taxonomy JSON | The build script that produces `enum-bundle.json` exports a matching schema (LinkML if the bundle crosses to Python; otherwise a Zod schema kept alongside the build script). Filter-engine consumes typed output. |
| Phase 4 | E2E test harness | Tighten harness types to use the same schema-derived types as production; replace hand-constructed payloads with builder helpers that produce schema-valid fakes. |
| Phase 5 | localStorage | Each persisted key gets a Zod (or equivalent TS-only) schema co-located with its write path. Reads use `schema.parse()` — a failed parse means "missing or corrupt, fall back to default." |

### Inputs from #206
The type-audit report produced by #206 will likely add phases to this list (or expand an existing phase's scope). Each additional target gets its own backlog item under this epic.

## Success Criteria
- Zero `no-restricted-syntax` ESLint warnings in production code
- Every parse-time data boundary has either a LinkML-rooted type + guard (cross-domain) or a Zod-equivalent schema (single-domain)
- No eslint-disable comments on `no-restricted-syntax` remain
- Schema round-trip tests pass for every new LinkML class introduced

## Status
Proposed

## Items
To be allocated on phase kick-off. First phase targets (tool-result + NL→CQL2) will be added as individual backlog entries once spec work starts.

## Parallelisation
Phases 1 and 2 both edit LinkML — coordinate with #203, #204, #205 per their Parallelisation notes.
Phases 3, 4, 5 are TS-only and can run in parallel with each other and with phases 1/2.
The audit (#206) should land first so the phase list is complete before heavy investment.

## Reference
- [ADR-011](docs/adr/011-strict-type-boundaries.md) (if present) / Constitution Article XV.7
- Code-quality review pass (PR #465) — surfaced the initial 35-warning inventory
