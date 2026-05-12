# Feature Specification: Promote MCP transport envelopes to LinkML

**Feature Branch**: `222-linkml-mcp-envelopes`
**Created**: 2026-05-12
**Status**: Draft
**Input**: User description: "[backlog-id:222] [E11] Promote MCP transport envelopes to LinkML — the audit (#206) flagged 16 hand-typed MCP / tool-system shapes across `shared/utils/src/mcp-types.ts`, `shared/components/src/ToolMatch/mcpAdapter.ts`, `apps/vscode/src/services/mcpToolAdapter.ts`, `apps/web-shell/src/mocks/calcService.ts`, `services/session-state/src/server/mcp.ts`, and `services/session-state/src/log/types.ts` (MCPRequest, MCPToolResponse, MCPErrorResponse, MCPContentItem, MCPToolDefinition, MCPSelectionRequirement, MCPParamSchema, ToolResult, ToolDefinition, ToolParameterMeta, ToolExecutor, ToolVersionResolver, ToolName, ToolResultForLog, ToolExecutionResultForReplay, ToolsUpdateMessage). These cross the Python↔TS boundary via MCP JSON-RPC and must be rooted in LinkML. See [docs/type-audit-2026.md §3.1](../../docs/type-audit-2026.md) for the per-site list."

## Background

The 2026 type-declaration audit ([#206](../206-audit-non-linkml-types/spec.md),
captured in `docs/type-audit-2026.md`) is the evidence base for Epic **E11 —
Schema-First Boundary Typing**. The audit's R3 classifier identified
**cross-domain hand-typed** declarations: TypeScript shapes that cross the
Python↔TypeScript boundary (typically over MCP JSON-RPC) but are not derived
from the LinkML schema set under `shared/schemas/`. Hand-typed boundary
shapes are the highest-risk class of drift in this project because:

1. The two halves of each shape (Python TypedDict / Pydantic model on the
   service side; TypeScript `interface` / `type` on the consumer side) can
   diverge silently — no test catches it until a field mismatch crashes the
   webview or, worse, silently corrupts a logged tool invocation.
2. Constitution Article XV (Schema-First) mandates that any shape crossing a
   service boundary be rooted in a LinkML source-of-truth file with
   round-trip tests.

This feature addresses the **MCP / tool-system cluster** — sixteen named
declarations grouped together because they all participate in the same
JSON-RPC conversation between `services/session-state/src/server/mcp.ts`
(Python-facing) and the consumers in `apps/vscode`, `apps/web-shell`, and
the shared `@debrief/components` / `@debrief/utils` packages. The sister
clusters (STAC, session-state, loader IPC, drift roll-up) are tracked under
sibling backlog items #223–#227 and are explicitly **out of scope** here.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Single source of truth for MCP request/response envelopes (Priority: P1)

A platform-maintainer adds a new optional field to `MCPToolResponse` (say,
`partial: boolean` for streaming chunks). They edit **one** file — the
LinkML source under `shared/schemas/src/linkml/` — re-run the schema build,
and the field appears simultaneously in the generated Pydantic class used
by the Python MCP server and in the generated TypeScript type consumed by
the VS Code extension, the web-shell mock, the ToolMatch adapter, and the
session-state replay subsystem. The CI schema-adherence test fails if any
consumer is still importing a hand-typed shadow declaration.

**Why this priority**: The four core envelope shapes (`MCPRequest`,
`MCPToolResponse`, `MCPErrorResponse`, `MCPContentItem`) carry every byte
that moves over the JSON-RPC boundary. They are the cluster's highest-risk
declarations because a divergence here breaks every tool invocation, not
just one tool. Until these four are schema-rooted, the rest of the cluster
inherits their risk.

**Independent Test**: After completing P1, run the type-audit scanner
(`pnpm tsx scripts/audits/type-audit/scan.ts ...`) against the working
tree. The four named envelope declarations MUST disappear from the
`cross-domain-hand-typed` bucket in the regenerated report, and every site
that previously declared one of them MUST now import the corresponding
class from `@debrief/schemas`. The full lint / typecheck / vitest /
pytest / Playwright suite (per `CLAUDE.md` § Before Pushing) MUST pass —
demonstrating that no consumer broke during the migration.

**Acceptance Scenarios**:

1. **Given** the LinkML source file declares `MCPToolResponse` with fields
   `{ content, isError?, structuredContent? }`, **When** the schema build
   runs, **Then** `@debrief/schemas` exports a TypeScript `MCPToolResponse`
   type and `debrief_schemas` exports a Pydantic `MCPToolResponse` class
   whose serialised JSON is structurally identical for the same input.
2. **Given** the migration is complete, **When** a developer searches for
   `interface MCPRequest` or `interface MCPToolResponse` outside
   `shared/schemas/`, **Then** zero matches are returned (the hand-types
   have been deleted, not aliased).
3. **Given** a malformed MCP response (missing required `content` field)
   arrives on the wire, **When** it is validated through the generated
   Pydantic model on the Python side, **Then** validation fails with a
   field-level error message — i.e. the schema is genuinely enforcing,
   not just describing.
4. **Given** the type-audit re-runs after P1, **When** §3.1 of the
   regenerated report is inspected, **Then** the four envelope rows are
   gone and the report's `cross-domain-hand-typed` count has dropped by
   exactly four (no other clusters disturbed).

---

### User Story 2 - Schema-rooted tool discovery and parameter shapes (Priority: P2)

A tool author adds a new `debrief-calc` tool with a structured parameter
list. The MCP server advertises it through `MCPToolDefinition` /
`MCPParamSchema`; the VS Code extension's `mcpToolAdapter` and the shared
`ToolMatch` UI both render the parameter form against the **same**
generated TypeScript type. The two existing in-repo copies of
`MCPParamSchema` (one in `shared/components/src/ToolMatch/mcpAdapter.ts`,
one in `apps/vscode/src/services/mcpToolAdapter.ts`) are removed and
replaced with imports from `@debrief/schemas`. The drift cluster
`ToolParameter` (currently 2 members at
`shared/components/src/ToolMatch/types.ts:34` and
`apps/vscode/src/types/tool.ts:26`, classified under #226 but assigned to
this E11 phase) is resolved in the same pass.

**Why this priority**: The tool-discovery shapes are static catalog data
(refreshed on tool-server connect), so a divergence here causes UI glitches
rather than per-invocation crashes — high impact but lower incident
frequency than the envelopes covered by P1. Resolving the `ToolParameter`
drift simultaneously closes the most visible audit finding for this cluster.

**Independent Test**: After P2, the regenerated audit report MUST show zero
rows for `MCPParamSchema` (was 2 sites), `MCPToolDefinition` (was 1),
`MCPSelectionRequirement` (was 1), `ToolParameterMeta` (was 1),
`ToolDefinition` (was 1), and `ToolParameter` (was 2 drift members). The
ToolMatch Storybook stories MUST continue to render the parameter form with
no visual regression; the VS Code activity-panel "Tools" list MUST continue
to display tool metadata for every tool in the fixture catalog.

**Acceptance Scenarios**:

1. **Given** the LinkML source defines `MCPParamSchema` with fields
   `{ type, description?, enum?, items?, default? }`, **When** the build
   runs, **Then** every prior site (ToolMatch adapter, VS Code tool
   adapter) imports the generated type and the two hand-declared copies
   are deleted.
2. **Given** a tool catalogue payload from the Python MCP server, **When**
   it is rendered through the ToolMatch UI in the web-shell, **Then** the
   parameter form is identical (parameter labels, ordering, default
   values, required indicators) to the form rendered before this feature.
3. **Given** the `ToolParameter` drift cluster, **When** P2 lands, **Then**
   both sites import a single canonical `ToolParameter` from
   `@debrief/schemas` and the audit's drift-candidate bucket loses both
   `ToolParameter` rows.

---

### User Story 3 - Schema-rooted replay & log shapes (Priority: P3)

A developer replays a recorded session through the LogPanel. The replay
subsystem deserialises `ToolResultForLog` and `ToolExecutionResultForReplay`
entries from disk, hands them to the executor function (typed as
`ToolExecutor`) using a `ToolName` discriminator, and the activity-panel
receives `ToolsUpdateMessage` push notifications when the tool catalogue
changes. Every one of these shapes is schema-rooted; the executor and
version-resolver function aliases are typed using generated parameter and
result types rather than hand-spelled object literals.

**Why this priority**: Replay shapes are read by exactly one consumer (the
session-state replay machinery) and written by exactly one producer (the
live tool-result logger). A drift here is recoverable — old logs can be
migrated forward — so the risk profile is lower than P1 / P2. They are
included in this feature because they are the remaining seven declarations
in the audit's `cross-domain-hand-typed` bucket attributed to #222;
deferring them would leave the cluster half-migrated and require a second
worktree to close.

**Independent Test**: After P3, replaying every committed log fixture under
`services/session-state/**/__fixtures__/` MUST succeed without runtime type
errors. The audit re-run MUST show **zero** rows in §3.1 attributed to
#222 — i.e. the cluster is fully resolved and ready for the type-audit
phase ledger (`docs/type-audit-2026.md` §5) to record completion.

**Acceptance Scenarios**:

1. **Given** a recorded session containing tool invocations against tools
   that have been since renamed or version-bumped, **When** replay
   resolves each entry through `ToolVersionResolver`, **Then** the
   resolver receives a strongly-typed `ToolName` argument and returns a
   strongly-typed result identical to what the live MCP path would have
   returned.
2. **Given** a fresh checkout after this feature lands, **When** a
   contributor greps for `interface ToolResultForLog` /
   `interface ToolExecutionResultForReplay` / `type ToolName` outside
   `shared/schemas/`, **Then** zero matches are returned.
3. **Given** an `ToolsUpdateMessage` push from the extension host to the
   activity-panel webview, **When** the webview receives it, **Then** both
   ends are typed against the same generated message class and the
   payload validates against the published JSON Schema.

---

### Edge Cases

- **Function-type aliases (`ToolExecutor`, `ToolVersionResolver`)**:
  LinkML describes data shapes, not function signatures. The function
  aliases MUST be expressed as TypeScript types whose **parameter and
  return types** are each schema-rooted, while the function alias itself
  remains a thin TS-only wrapper in a `@debrief/schemas` re-export
  module. The audit MUST treat this re-export module as schema-rooted
  (it imports from generated code), removing the row.
- **Discriminated unions and string-literal enums (`ToolName`)**:
  `ToolName = keyof typeof TOOLS` is a compile-time projection of a
  registry. It cannot be expressed in LinkML directly; instead, the
  registry MUST be sourced from a schema-described list (e.g. an enum
  permissible-value set or a generated string-literal union). The plan
  phase must propose a concrete pattern.
- **Optional fields with `unknown` payloads**: `MCPContentItem` contains
  a free-form `structuredContent?` field. LinkML cannot fully constrain
  arbitrary tool payloads; this field MUST remain typed as `Any` /
  `unknown` at the schema level (i.e. the schema describes the envelope,
  not the payload). The audit's `boundary-loose` classifier should
  continue to accept this as intentional.
- **Existing log fixtures**: There are committed log-replay fixtures
  under `services/session-state/**/__fixtures__/` that were authored
  against the hand-types. They MUST continue to deserialise without
  modification — i.e. the LinkML model MUST be a superset (additive
  only) of the union of fields currently present in fixture data.
- **Cross-package version pinning**: `@debrief/utils`,
  `@debrief/components`, `@debrief/session-state`, and the VS Code /
  web-shell apps import from `@debrief/schemas`. A schema bump that
  changes a generated type must reach all consumers in the same
  release; pnpm workspace ranges already enforce this — verify no
  consumer pins an older version.
- **MCP server (Python) ↔ session-state replay (TS)**: The Python
  service emits the live tool result; the TS replay subsystem reads it
  back from disk. The LinkML model MUST be the single source from
  which both Pydantic and TypeScript are generated, with round-trip
  tests confirming bit-identical JSON across at least one fixture per
  named shape.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A LinkML source file (or set of files) under
  `shared/schemas/src/linkml/` MUST declare each of the data-bearing
  shapes in the cluster: `MCPRequest`, `MCPToolResponse`,
  `MCPErrorResponse`, `MCPContentItem`, `MCPToolDefinition`,
  `MCPSelectionRequirement`, `MCPParamSchema`, `ToolResult`,
  `ToolDefinition`, `ToolParameterMeta`, `ToolResultForLog`,
  `ToolExecutionResultForReplay`, `ToolsUpdateMessage`, and the
  resolved-canonical `ToolParameter` (drift cluster).
- **FR-002**: The schema build MUST generate corresponding Pydantic
  classes (under `shared/schemas/src/generated/python/`) and TypeScript
  types (under `shared/schemas/src/generated/ts/`) for every class
  declared in FR-001, exported from `@debrief/schemas` and
  `debrief_schemas` respectively.
- **FR-003**: Every site listed in `docs/type-audit-2026.md` §3.1 that
  is attributed to #222 MUST be migrated to import the corresponding
  generated class. The hand-typed declarations at those sites MUST be
  **deleted**, not aliased — a re-run of the audit scanner MUST show
  zero rows in §3.1 attributed to #222.
- **FR-004**: The function-type aliases (`ToolExecutor`,
  `ToolVersionResolver`) MUST remain TS-only wrappers, but their
  parameter and return types MUST be schema-rooted (i.e. they reference
  generated classes from `@debrief/schemas`). The aliases MUST live in
  a re-export module that imports from `@debrief/schemas` so the audit
  reclassifies them as `schema-rooted`.
- **FR-005**: `ToolName` MUST be derived from a schema-described
  tool-name registry such that adding a tool requires updating exactly
  one source (the registry / enum), and both Python (string literal
  type) and TypeScript (string-literal union) MUST receive the same
  set of names.
- **FR-006**: Schema-adherence tests under `shared/schemas/tests/` MUST
  exist for every new class added under FR-001, covering:
  - **Round-trip**: Python instance → JSON → TS parse → JSON → Python
    instance produces a value equal to the original.
  - **Schema comparison**: The JSON Schema generated from LinkML MUST
    match the JSON Schema generated from the Pydantic class (modulo
    permitted whitespace / ordering differences already accepted by
    the existing schema-comparison helper).
  - **Negative**: At least one invalid fixture per class fails
    validation with a field-level error.
- **FR-007**: The drift cluster `ToolParameter` (2 members per audit
  §3.2) MUST be resolved by collapsing both sites onto a single
  generated class from `@debrief/schemas`. The cluster MUST disappear
  from the audit's drift-candidate bucket.
- **FR-008**: The type-audit's classifier rules already exempt files
  importing from `@debrief/schemas` (R4 > R3). Every migrated site
  MUST end up matching R4. No new entries to the
  `CROSS_DOMAIN_NAME_PATTERNS` constant in
  `scripts/audits/type-audit/generate-report.ts` are required for this
  feature; if migration completeness depends on adding a new pattern,
  that is a sign the migration is incomplete.
- **FR-009**: The full project `task verify` pipeline (lint +
  typecheck + tests + Playwright E2E, per `CLAUDE.md` § Before
  Pushing) MUST pass on the feature branch before merge. No new
  `// @ts-expect-error`, no new `# type: ignore`, no new `as any`,
  no new `Any` casts added during the migration except where the
  cluster intentionally preserves a free-form payload field (i.e.
  `MCPContentItem.structuredContent` and `MCPErrorResponse.data`).
- **FR-010**: A changelog entry MUST be appended to
  `docs/type-audit-2026.md` §5 (Re-run log / changelog) recording the
  before/after counts for the cluster, the git SHA at which the audit
  was re-run, and a link to this spec.
- **FR-011**: Existing log-replay fixtures under
  `services/session-state/**/__fixtures__/` MUST continue to load
  without modification. If a fixture fails to load under the new
  generated types, the LinkML model MUST be widened to accept it
  (not the fixture rewritten) — i.e. the migration is additive over
  the union of currently-shipped log shapes.

### Non-Functional Requirements

- **NFR-001**: The schema build MUST remain a single command
  (`task schemas:build` or the equivalent currently in use) and its
  runtime MUST NOT increase by more than 20% over the pre-feature
  baseline.
- **NFR-002**: Generated TypeScript MUST continue to satisfy the
  project's strict-mode rules (no implicit any, no nullable mismatch,
  no unused imports) without consumers needing per-file overrides.
- **NFR-003**: Documentation under `shared/schemas/README.md` MUST list
  the MCP cluster as a worked example alongside the existing
  GeoJSON / session-state / styling examples.

### Key Entities

- **MCPRequest** — A JSON-RPC envelope sent from a consumer (VS Code,
  web-shell mock, ToolMatch UI) to the MCP server. Carries `method`,
  `params`, `id`. Used on every tool invocation.
- **MCPToolResponse** — A successful JSON-RPC response. Carries an
  ordered list of `MCPContentItem` plus optional `isError` /
  `structuredContent` fields. One per successful invocation.
- **MCPErrorResponse** — A JSON-RPC error response. Carries `code`,
  `message`, and an optional `data` payload (free-form).
- **MCPContentItem** — A single piece of returned content: text,
  resource link, image, or structured payload. Multiple per response.
- **MCPToolDefinition** — Static catalogue entry advertised by the
  MCP server: name, description, input schema (`MCPParamSchema`),
  selection requirements (`MCPSelectionRequirement`).
- **MCPSelectionRequirement** — Predicate describing what feature
  selection a tool needs (e.g. "at least one Track", "exactly one
  Point"). Drives the "Enabled?" indicator in the ToolMatch UI.
- **MCPParamSchema** — Per-parameter schema fragment (JSON-Schema-
  shaped: `type`, `description?`, `enum?`, `items?`, `default?`).
  Currently duplicated in two adapter files — the most visible drift.
- **ToolResult** — Logical tool invocation result as seen by the
  consumer (after the MCP layer has unwrapped `MCPToolResponse`).
  Used by `apps/web-shell` mock and the LogPanel.
- **ToolDefinition** — Consumer-facing flattened view of an
  `MCPToolDefinition` (with the param list materialised into
  `ToolParameterMeta[]`). Used by ToolMatch and the activity-panel.
- **ToolParameter** — Canonical parameter descriptor used by both
  ToolMatch and the VS Code tool adapter. Currently a drift cluster
  with 2 sites; resolved by this feature.
- **ToolParameterMeta** — Display-time metadata for a single tool
  parameter (label, validation hints). Web-shell mock only.
- **ToolResultForLog** — Persisted form of a tool result, written
  by the live tool-result logger and read back by replay. Includes
  provenance, timestamps, and a hash of the input feature set.
- **ToolExecutionResultForReplay** — Hydrated `ToolResultForLog`
  with executor-resolved version info attached. Consumed by the
  replay engine.
- **ToolsUpdateMessage** — Push notification from the extension host
  to the activity-panel webview when the tool catalogue changes.
- **ToolExecutor** *(function alias)* — Callable signature
  `(toolId, featureIds, params) → Promise<ToolResultForLog>`. Each
  parameter and the return type is schema-rooted; the alias itself
  is a TS-only convenience.
- **ToolVersionResolver** *(function alias)* — Callable signature
  `(toolId) → Promise<string | null>`. Same constraint as
  `ToolExecutor`.
- **ToolName** *(string-literal projection)* — Discriminator string
  union over the registered tool names. Derived from a
  schema-described registry (FR-005).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A re-run of the type-audit scanner against the merged
  feature branch reports **zero** rows in §3.1
  (`cross-domain-hand-typed`) attributed to #222 — down from the
  17 rows captured at audit commit
  `01166d6e8ef72ed5cf25c339f0d9fa7dfc2b15b1`.
- **SC-002**: A re-run of the type-audit scanner reports **zero** rows
  for `ToolParameter` in §3.2 (`drift-candidate`) — down from the 2
  rows attributed to this E11 phase.
- **SC-003**: A grep across the in-scope tree (`apps/`, `shared/`,
  `services/`, excluding generated code and test fixtures) for
  `interface MCP*` / `interface Tool*` / `type ToolName` returns hits
  **only** in files under `shared/schemas/src/`, in `@debrief/schemas`
  re-export modules for the function aliases, and in TS-only
  convenience types marked as such (e.g. component-local Props).
- **SC-004**: For every named class in FR-001, at least one round-trip
  schema-adherence test exists in `shared/schemas/tests/` and passes
  in CI. Coverage report shows 100% of named classes touched by at
  least one round-trip fixture.
- **SC-005**: The full `task verify` pipeline passes on the feature
  branch with no new `// @ts-expect-error`, `# type: ignore`,
  `as any`, or `Any` casts attributable to this migration (existing
  ones grandfathered; the diff MUST NOT add any new ones except for
  `MCPContentItem.structuredContent` and `MCPErrorResponse.data`,
  which are intentionally free-form).
- **SC-006**: The end-to-end "invoke a calc tool from the web-shell
  ToolMatch UI" Playwright path completes successfully against the
  same fixture catalogue as before the feature, demonstrating no
  consumer-visible regression in the tool-discovery / invocation
  flow.
- **SC-007**: `docs/type-audit-2026.md` §5 contains a new changelog
  entry crediting this spec, the merge git-SHA, and the before/after
  row counts. The audit's "Newly opened backlog items" callout for
  #222 is annotated as resolved.

## Assumptions

- **A-001**: The MCP JSON-RPC framing layer lives at
  `services/session-state/src/server/mcp.ts` and is **in scope** for
  this migration — `MCPRequest` (defined as a hand-typed TypeScript
  interface at that site today) is one of the four envelope classes
  being promoted to LinkML under FR-001. There is no separate
  `services/mcp-common/` package: framing and payload shapes co-exist
  in the same file, so promoting the envelope classes necessarily
  promotes framing. Method dispatch and request/response correlation
  logic itself remains TS-only (LinkML describes data shapes, not
  control flow); only the request/response/error envelope **shapes**
  move to LinkML.
- **A-002**: There is no need to preserve backwards compatibility
  with previously-recorded log files that pre-date the audit. If
  fixture-loading widens the schema (per FR-011), the resulting
  generated types are still backwards-compatible with the live data
  flowing on `main` today.
- **A-003**: The schema-build toolchain (`gen-pydantic`,
  `gen-typescript`, `gen-json-schema`) supports every LinkML
  construct this feature needs. If a needed feature is missing
  (e.g. discriminated unions, function-aware re-exports), the
  workaround is to keep the un-modellable part TS-only and route
  the data-bearing fields through LinkML — matching the existing
  pattern used for `ToolExecutor` / `ToolVersionResolver` in this
  spec.
- **A-004**: Python service code that currently consumes the MCP
  shapes already uses Pydantic v2 idioms compatible with generated
  models (no v1-only `Config` classes, no custom `__init__`). If a
  consumer needs adapter glue, that adapter is a thin wrapper and
  not a re-declaration.
- **A-005**: The `@debrief/schemas` package's public API surface is
  allowed to grow by ~14 additional named exports. No consumer is
  currently using `import *` from the package, so additive exports
  are non-breaking.
- **A-006**: The `services/session-state` log format is treated as
  the canonical schema for log entries — i.e. when LinkML and the
  on-disk fixture diverge, LinkML widens to match the fixture, not
  vice-versa.

## Dependencies

- **D-001**: Audit #206 (the type-declaration audit) is committed
  and its scanner is runnable from the feature branch — required
  to verify SC-001 / SC-002.
- **D-002**: The LinkML schema build toolchain is functional on
  `main` (it is — the existing `shared/schemas/` package generates
  260 schema-rooted shapes today).
- **D-003**: No blocking dependency on sibling E11 items (#223 STAC,
  #224 session-state, #225 loader IPC, #226 drift, #227 rollup).
  This feature touches MCP-cluster files only; if a shared file
  appears in another sibling's diff, last-mover-wins and the rebase
  is handled in the plan phase.

## Out of Scope

- **OOS-001**: STAC catalog hand-types (#223).
- **OOS-002**: Session-state wire shapes other than `ToolResultForLog`
  / `ToolExecutionResultForReplay` — i.e. `StateSnapshot`,
  `FeatureProvenance`, `ModifiedFeature`, `InputFeatureState`,
  `BranchPointLocation`, `CreateSnapshotOptions` belong to #224.
- **OOS-003**: Loader↔main IPC envelopes (#225).
- **OOS-004**: Drift clusters other than `ToolParameter` (#226).
- **OOS-005**: Storybook / React-component Props rollups (#227).
- **OOS-006**: Any change to the MCP JSON-RPC framing **logic**
  (method dispatch, request/response correlation, transport-layer
  error handling) at `services/session-state/src/server/mcp.ts`.
  The envelope **shapes** at that site (e.g. `MCPRequest`) are
  promoted to LinkML per FR-001 / A-001; the surrounding control
  flow that consumes them is not refactored here.
- **OOS-007**: Performance optimisation of the MCP transport. The
  migration MUST NOT regress runtime performance, but no new
  optimisation work is undertaken under this feature.
- **OOS-008**: Adding new MCP fields beyond what is required to
  preserve the existing wire format. Schema additions during this
  migration MUST be limited to what is necessary to capture the
  union of currently-shipping hand-types.
