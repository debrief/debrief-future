# Implementation Plan: Promote MCP transport envelopes to LinkML

**Branch**: `222-linkml-mcp-envelopes` | **Date**: 2026-05-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/222-linkml-mcp-envelopes/spec.md`

## Summary

Promote the **MCP / tool-system cluster** — 17 cross-domain hand-typed
TypeScript declarations and 2 drift-cluster members (`ToolParameter`)
identified by the 2026 type audit ([`docs/type-audit-2026.md`](../../docs/type-audit-2026.md)
§3.1 + §3.2) — onto LinkML-rooted classes generated under
`shared/schemas/`. Existing hand-types at 7 source files are **deleted**
(not aliased) and replaced with imports from `@debrief/schemas` / the
`debrief_schemas` Pydantic package. Coverage is verified by a re-run of
the audit scanner: zero §3.1 rows attributed to #222 and zero
`ToolParameter` rows in §3.2 (per SC-001 / SC-002).

**Approach** — single LinkML schema file (`mcp.yaml`) co-located with
the existing `tool.yaml` / `tool-result.yaml` so MCP cluster classes
sit alongside their adjacent tool-metadata classes; three migration
slices (P1 envelopes → P2 discovery → P3 replay) each independently
shippable and gate-able by a fresh audit re-run; one acceptable
schema-boundary deviation (two free-form payload fields kept as
`range: Any` — matching the established `raw-geojson.yaml` precedent
and explicitly enumerated in spec §Edge Cases).

## Technical Context

**Language/Version**: Python 3.11 (services, schema-build tooling,
adherence tests); TypeScript 5.x strict (consumer sites, generated
types, vitest fixtures).
**Primary Dependencies**: LinkML ≥ 1.7.0 (schema source +
`gen-pydantic` / `gen-typescript` / `gen-json-schema`); Pydantic v2
(generated Python models); `@debrief/schemas` workspace package
(TypeScript re-exports); `debrief_schemas` Python package (Pydantic
re-exports); no new external runtime dependencies.
**Storage**: N/A — schema build outputs to
`shared/schemas/src/generated/{python,typescript,json-schema}/`
which is committed; on-disk log fixtures under
`services/session-state/**/__fixtures__/` are read-only inputs to
the round-trip tests (FR-011: schema widens to accept fixtures,
fixtures never rewritten).
**Testing**: pytest (Python adherence + round-trip, under
`shared/schemas/tests/`); vitest (TS-side schema-compare and
type-narrow tests); Playwright (one E2E in `apps/web-shell` to
prove no consumer-visible regression for the calc-tool invocation
flow); `pnpm tsx scripts/audits/type-audit/scan.ts` (the audit
scanner itself — used as a verification harness for SC-001/002).
**Target Platform**: Linux server (Python MCP host); browser
(VS Code webviews, web-shell, Storybook); Node 20.x (VS Code
extension host, schema build).
**Project Type**: Monorepo (`pnpm` + `uv` workspaces). Cluster
spans `shared/schemas/`, `shared/utils/`, `shared/components/`,
`services/session-state/`, `apps/vscode/`, `apps/web-shell/`.
**Performance Goals**: Schema build runtime MUST stay within
+20% of pre-feature baseline (NFR-001). MCP request/response
hot path MUST NOT regress measurably — the generated types are
plain structural shapes with no runtime overhead beyond what
the hand-types had.
**Constraints**: Constitution Article XV (strict types — no new
`Any` / `any` casts except the two enumerated free-form
payload fields). Constitution Article II (schema integrity —
round-trip + comparison + golden adherence tests mandatory).
No new external dependencies (NFR-001 implies).
**Scale/Scope**: ~17 LinkML classes added; ~7 hand-type sites
deleted; 2 drift sites collapsed; ~14 new export entries on
`@debrief/schemas`; ~14 new Pydantic exports on
`debrief_schemas`; 1 new adherence-test module per class group
(~3–4 new test files); 1 new docs section in
`shared/schemas/README.md` (NFR-003).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1
design.*

All articles pass. One Article XV exception documented in Complexity
Tracking below: two free-form payload fields keep `range: Any`,
matching the existing `raw-geojson.yaml` `JsonObject` wildcard
precedent. Spec §Edge Cases #3 documents the rationale.

**Initial gate**: PASS. Proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/222-linkml-mcp-envelopes/
├── plan.md                       # This file (/speckit.plan output)
├── spec.md                       # Feature specification
├── checklists/
│   └── requirements.md           # Spec quality checklist
├── research.md                   # Phase 0 — open design questions resolved
├── data-model.md                 # Phase 1 — class catalogue + field tables
├── contracts/
│   ├── mcp.linkml.yaml.draft.md  # Phase 1 — outline of the new LinkML schema
│   └── json-schema.expected.md   # Phase 1 — checklist of generated JSON Schema
├── quickstart.md                 # Phase 1 — dev verification recipe
├── evidence/
│   └── opening-context.md        # Phase 2 — cached opener for feature post
└── tasks.md                      # /speckit.tasks output (NOT created here)
```

### Source Code (repository root)

Cluster spans the existing monorepo packages; no new directories.
The single new LinkML file is `shared/schemas/src/linkml/mcp.yaml`.
Consumer sites under `shared/utils/`, `shared/components/`,
`services/session-state/`, `apps/vscode/`, `apps/web-shell/` have
their hand-types deleted and replaced with imports from
`@debrief/schemas`. Full per-site list in `data-model.md`
§"Class summary table".

**Structure Decision**: Use the existing `shared/schemas/` package as
the single home for the new LinkML source. Co-locate the new MCP
classes in a fresh `mcp.yaml` (rather than appending to `tool.yaml`)
because (a) it isolates the cluster for reviewers, (b) imports are
cheap in LinkML, and (c) it mirrors the existing pattern where
related-but-distinct cluster lives in its own file (e.g.
`session-state.yaml`, `storyboard.yaml`).

## Media Components

None — backend / infrastructure feature.

The migration is invisible at the UI surface: every existing component
(ToolMatch, ActivityPanel, LogPanel) continues to render identical
output because the generated types are structurally identical to the
hand-types they replace.

## Storybook E2E Testing

None — no interactive UI components added or modified.

The cluster's UI-facing entry points already have Storybook coverage.
The migration MUST NOT change their visual output; existing vitest +
Storybook snapshot tests catch any regression.

## Web-Shell E2E Testing

| Workflow | Panels/Components Involved | Key Selectors |
|----------|---------------------------|---------------|
| Invoke a calc tool from ToolMatch | ToolMatch parameter form, MapView selection, LogPanel result row | `[data-testid="toolmatch-tool-row"]`, `[data-testid="toolmatch-invoke"]`, `[data-testid="log-panel-entry"]` |

**Testing Strategy**: Reuse the existing calc-tool invocation E2E in
`apps/web-shell/playwright/tests/`. SC-006 demands "same fixture
catalogue as before the feature," so the test MUST be reused, not
authored. Test path resolved during /speckit.tasks per Research R-007.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Two free-form fields modelled as `range: Any` in LinkML (`MCPContentItem.structuredContent`, `MCPErrorResponse.data`) — Article XV requires explicit types | The MCP protocol intentionally allows tools to return arbitrary JSON payloads alongside content blocks; constraining the shape at the schema layer would either require enumerating every existing tool's return-payload contract (out of scope per OOS-008) or reject valid live payloads. The fields are documented as boundary-loose intentionally in spec §Edge Cases. | Strict schema rejection would break existing tools (e.g. chart-renderer's vega-spec). Tool-specific subclasses with discriminated unions would explode the schema (~30 tools × N response shapes). Two-tier validation is a separate backlog item (E11 phase 4). The retained `Any` matches the precedent in `raw-geojson.yaml` (`JsonObject` wildcard) and `tool-result.yaml` (DatasetEnvelope.data). |
