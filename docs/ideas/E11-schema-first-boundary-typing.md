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

### Phase inventory

The audit (#206) landed on 2026-04-21 with the report at
[docs/type-audit-2026.md](../type-audit-2026.md). It enumerated 885 in-scope
named TypeScript declarations across 317 files and classified each into one
of five buckets (schema-rooted / boundary-loose / single-domain / cross-domain
hand-typed / drift-candidate). 134 rows were actionable (28 cross-domain
hand-typed + 106 drift-candidate) and each resolves to a backlog item.
The phase list below combines the original five-boundary inventory with the
audit-opened items.

| Phase | Target | Item | Approach |
|-------|--------|------|----------|
| Phase 1 | Tool-result envelope + `__datasets` sidecar | _(no current item — future)_ | Promote to LinkML. Generate TS types; add a parse-time guard (`isToolResult`) and a narrowing helper. Replace every `Record<string, unknown>` cast with a guarded call. |
| Phase 2 | NL → CQL2 LLM response shape | _(no current item — future)_ | Promote to LinkML (the canonical CQL2-JSON subset the LLM is prompted to produce). Generate TS; replace cast chains in `parseResponse.ts` with a schema-derived validator. |
| Phase 3 | Enum-bundle / taxonomy JSON | _(no current item — future)_ | The build script that produces `enum-bundle.json` exports a matching schema (LinkML if the bundle crosses to Python; otherwise a Zod schema kept alongside the build script). Filter-engine consumes typed output. |
| Phase 4 | E2E test harness | _(no current item — future)_ | Tighten harness types to use the same schema-derived types as production; replace hand-constructed payloads with builder helpers that produce schema-valid fakes. |
| Phase 5 | localStorage | _(no current item — future)_ | Each persisted key gets a Zod (or equivalent TS-only) schema co-located with its write path. Reads use `schema.parse()` — a failed parse means "missing or corrupt, fall back to default." |
| Phase 6 | Spatial types | #203 | Coordinate / Position hand-types promoted to LinkML. |
| Phase 7 | GeoJSON hand-types (RawGeoJSONFeature etc.) | #204 | Includes the `GeoJsonFeature` / `GeoJsonFeatureCollection` duplicates in `services/session-state/src/log/types.ts` surfaced by the audit. |
| Phase 8 | DisplayMode / PlaybackState | ~~#205~~ (complete) | ✓ Shipped 2026-04-21. |
| Phase 9 | MCP transport envelopes (MCP\*, ToolResult, ToolDefinition, ToolParameterMeta, ToolsUpdateMessage etc.) | #222 | 16 hand-typed sites. Includes the MCP / Tool drift clusters (`MatchResult`, `ParseResult`, `Plot`, `ToolParameter`). |
| Phase 10 | STAC catalog hand-types (StacItem / StacCatalog / StacCollection) | #223 | 5 sites + drift clusters for `StacItem` (3 members), `StacCatalog` (2), `Plot` (2). |
| Phase 11 | Session-state wire shapes (StateSnapshot / FeatureProvenance / ModifiedFeature / InputFeatureState / BranchPointLocation / CreateSnapshotOptions) | #224 | Persisted and MCP-served. Includes the `StateSnapshot` (2 members) drift cluster. |
| Phase 12 | Loader↔main IPC envelopes (CreatePlotResponse / AddFeaturesResponse / ListPlotsResponse / OpenPlotArgs / ParseResult) | #225 | Electron main↔renderer + VS Code shared shapes. Includes the `ParseResult` drift cluster. |
| Phase 13 | Residual drift (DebriefConfig, ExtensionMessage, FilterState, etc.) | #226 | 14 drift clusters that don't map to a domain-specific phase above. |
| Phase 14 | Storybook / React local-convention drift rollup (Story, Props) | #227 | No action expected — the rule fires mechanically but the findings are per-file conventions. |

See the audit report's [§1 Summary](../type-audit-2026.md#1-summary) for the
per-bucket counts and [§3 Findings](../type-audit-2026.md#3-findings) for the
per-site list.

## Success Criteria
- Zero `no-restricted-syntax` ESLint warnings in production code
- Every parse-time data boundary has either a LinkML-rooted type + guard (cross-domain) or a Zod-equivalent schema (single-domain)
- No eslint-disable comments on `no-restricted-syntax` remain
- Schema round-trip tests pass for every new LinkML class introduced

## Status
Proposed

## Items

- [#203](../../BACKLOG.md) — Spatial types (Coordinate / Position) → LinkML
- [#204](../../BACKLOG.md) — RawGeoJSONFeature → LinkML (GeoJSON hand-types)
- ~~#205~~ — DisplayMode / PlaybackState → LinkML (**complete 2026-04-21**)
- [#206](../../BACKLOG.md) — Audit non-LinkML type declarations (**complete** — this report)
- [#222](../../BACKLOG.md) — Promote MCP transport envelopes to LinkML
- [#223](../../BACKLOG.md) — Promote STAC catalog hand-types to LinkML
- [#224](../../BACKLOG.md) — Promote session-state wire shapes to LinkML
- [#225](../../BACKLOG.md) — Promote loader↔main IPC envelopes to LinkML
- [#226](../../BACKLOG.md) — Resolve residual drift clusters
- [#227](../../BACKLOG.md) — Storybook / React local-convention drift rollup (no-action documentation)

The primary deliverable of #206 is [docs/type-audit-2026.md](../type-audit-2026.md).

## Parallelisation
Phases 1 and 2 both edit LinkML — coordinate with #203, #204, #205 per their Parallelisation notes.
Phases 3, 4, 5 are TS-only and can run in parallel with each other and with phases 1/2.
The audit (#206) should land first so the phase list is complete before heavy investment.

## Reference
- [ADR-011](docs/adr/011-strict-type-boundaries.md) (if present) / Constitution Article XV.7
- Code-quality review pass (PR #465) — surfaced the initial 35-warning inventory
