# Phase 0 — Research: MCP transport envelopes → LinkML

**Feature**: 222-linkml-mcp-envelopes
**Date**: 2026-05-12

Resolves the open design questions called out in spec.md §Edge Cases
and plan.md §Technical Context. Each entry follows the
**Decision / Rationale / Alternatives** format.

---

## R-001 — How to schema-root `ToolName` (`keyof typeof TOOLS`)

**Context**: `services/session-state/src/server/mcp.ts:49` declares
`type ToolName = keyof typeof TOOLS` over a const-asserted object
literal containing 11 session-state tool entries. The audit
classifies `ToolName` as `cross-domain-hand-typed` because it crosses
the Python↔TS boundary via JSON-RPC request validation.

**Decision**: Add a permissible-values enum `SessionMCPToolName` to
`shared/schemas/src/linkml/mcp.yaml` with one entry per current
session-state tool name. The TS generator produces a string-literal
union; the Python generator produces a `StrEnum`. The local
`type ToolName` becomes `import type { SessionMCPToolName } from '@debrief/schemas'`
and the `TOOLS` const is retyped as `Record<SessionMCPToolName, ToolHandler>`,
giving a compile-time guarantee that schema and registry stay in lockstep.

**Rationale**:

1. Article XV demands explicit types. The current `keyof typeof TOOLS`
   is explicit only on the TS side — the Python service has no
   equivalent narrow type, so a tool name added in TS can be invoked
   but not handled.
2. The number of session-state tools is small (11) and changes only
   when the session-state API surface grows.
3. LinkML permissible-values is the already-used pattern in this repo
   for cross-language string unions (`OutputKindEnum`, `ResultCategoryEnum`,
   `ToolCategoryEnum`).

**Alternatives considered**:

- Keep as TS-only `keyof` projection — fails audit R4 (no schemas import).
- Generate LinkML enum *from* the registry — reverses canonical direction (Article II.1).
- Add to `tool.yaml` — conflates session-state with tool-catalogue concerns.

---

## R-002 — Function-type aliases (`ToolExecutor`, `ToolVersionResolver`)

**Context**: LinkML describes data shapes, not callable signatures.
These aliases at `services/session-state/src/log/types.ts:281` and `:299`
are TS function types whose parameters and return types are
schema-bearing but whose alias-ness is not.

**Decision**: Move the function aliases into a thin re-export module
inside `@debrief/schemas` — specifically
`shared/schemas/src/typescript/aliases/mcp-functions.ts` (matching the
existing `unions.ts` pattern). The module imports the generated
parameter / return types from LinkML-derived modules and declares the
function aliases as one-line type expressions. Consumer sites import
from `@debrief/schemas`; the audit's R4 rule reclassifies the
containing file as `schema-rooted`.

**Rationale**:

1. Article II.1 (single source of truth) is preserved — the data half
   of each function is generated; only the function-type wrapper is
   TS-syntax-only and lives inside the schema package.
2. No new audit-scanner rule needed (FR-008 forbids extending
   `CROSS_DOMAIN_NAME_PATTERNS`).
3. Python equivalence unnecessary: function types are TS-side
   convenience.

**Alternatives considered**:

- Leave at original sites — violates FR-003.
- Re-export from `@debrief/utils` — not schema-rooted.
- Custom LinkML function-type generator — over-engineering.

---

## R-003 — Free-form payload fields (Article XV exception)

**Context**: MCP tools intentionally return arbitrary JSON payloads
alongside structured `content` blocks. The hand-types declare these
as `Record<string, unknown>` / `unknown`.

**Decision**: Model `MCPContentItem.structured_content`,
`MCPToolResponse.structured_content`, `MCPErrorResponse.data`,
`MCPRequest.input`, `ToolResultForLog.params`, and `ToolResult.output`
with `range: Any` directly. Each field is annotated with a docstring
explicitly referencing Article XV.2 and Edge Case #3 in spec.md.

**Rationale**:

1. Established precedent: `shared/schemas/src/linkml/raw-geojson.yaml`
   defines a `JsonObject` wildcard with the same `range: Any` pattern
   and cites Article XV.2.
2. The audit's `boundary-loose` (R2) classifier was authored for
   exactly this case.
3. Article XV.2: "When external libraries return untyped data, narrow
   to a concrete type at the boundary immediately." Consumer code that
   wants to use `structuredContent` narrows it via a tool-specific
   Zod schema before reading.

**Alternatives considered**:

- Discriminated union per tool — out of scope (OOS-008); explodes schema.
- Drop the field — breaks live tools.
- Sibling subclass — functionally identical, adds a class for no gain.

---

## R-004 — Single LinkML file vs splitting

**Decision**: One file `shared/schemas/src/linkml/mcp.yaml` with
banner-separated sections (Envelopes / Discovery / Replay), mirroring
the `tool.yaml` convention.

**Rationale**: Existing convention; cross-references between the
three semantic groups; reviewers navigate by banner.

**Alternatives considered**: Append to `tool.yaml` — different
lifecycles. Split per slice — cross-file `imports:` cycles for no gain.

---

## R-005 — Migration ordering and rollback granularity

**Decision**: One PR, three commits in P1 → P2 → P3 order. Each commit:
adds the LinkML section for its slice, re-runs the schema build,
migrates consumer sites, adds round-trip tests, passes `task verify`
standalone. Final commit appends the changelog entry to
`docs/type-audit-2026.md` §5 (FR-010) and updates
`shared/schemas/README.md` (NFR-003).

**Rationale**: Bisect-friendliness; reviewer cognitive load; type-audit
row count drops monotonically; rollback safety.

**Alternatives considered**: Three separate PRs — rebase pain.
One commit — loses bisect granularity. Per-class commits — too granular.

---

## R-006 — `MCPRequest.input` per-tool typing

**Decision**: Keep `input` as `range: Any` for this feature. Per-tool
typed inputs are tracked separately under E11 phase 4
(tool-result-typing), out of scope per OOS-008.

**Rationale**: Same logic as R-003. The MCP envelope schema describes
the envelope; the per-tool payload is the tool's own contract,
validated by Pydantic input model on dispatch.

---

## R-007 — Calc-tool Playwright regression test

**Context**: Spec SC-006 demands no consumer-visible regression in
the tool-discovery / invocation flow.

**Decision**: During /speckit.tasks, locate the specific Playwright
test that exercises ToolMatch → invoke → LogPanel in
`apps/web-shell/playwright/tests/`. Candidates: `tool-invocation.spec.ts`,
`calc-tool-flow.spec.ts` (existence unconfirmed).

**Outcome contingencies**:

- If E2E exists: record path in quickstart.md and task T-VERIFY-001.
- If no E2E exists: relax SC-006 to "Storybook + vitest visual-regression
  suite passes with byte-identical screenshots" — update spec via
  /speckit.apply-feedback rather than blocking on a new E2E.

---

## Open follow-ups (not blocking this plan)

- E11 phase 4 — Tool-result-typing: per-tool input/output shapes;
  expected to open as #228+ after #222–#227 complete.
- MCP framing site (`services/session-state/src/server/mcp.ts`):
  `MCPRequest` is hand-typed there today and is migrated to LinkML
  in scope under FR-001 (see updated A-001). The surrounding
  framing **logic** (dispatch, correlation) is not refactored —
  only the envelope shapes move. No follow-up item needed.
