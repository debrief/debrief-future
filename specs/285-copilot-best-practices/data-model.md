# Data Model: Copilot Chat Integration Best-Practices Upgrade (285)

No LinkML schema changes. All entities are either workspace configuration
artefacts (validated by drift check + unit tests) or TypeScript view types
local to `apps/vscode/src/copilot/` (extension-internal, not cross-boundary —
Article II untouched; the summary view is extended per the derived-not-rewritten
rule where it mirrors existing types).

## 1. PrimingInstructions (workspace artefact)

| Field | Notes |
|---|---|
| canonical path | `.github/copilot-instructions.md` (repo root) |
| synced copies | `preview/workspace/samples/.github/copilot-instructions.md` |
| content | Debrief vocabulary, tool conventions (summarise-before-edit, list-before-run, never fabricate, edits-are-unsaved) — carried over from #284 file |
| validation | drift check: SHA-256 of each copy == canonical (CI-fatal) |

## 2. DebriefAnalystAgent (workspace artefact — `.agent.md`)

| Front-matter field | Value / constraint |
|---|---|
| `name` | `Debrief Analyst` |
| `description` | analyst-facing, one sentence |
| `model` | pinned Sonnet-class picker id (implementation-time choice) |
| `tools` | exactly: 4 `debrief_*` tools + documented minimal built-ins |
| body | embedded conventions (subset of PrimingInstructions) |

Placement mirrors PrimingInstructions (canonical + synced copy, same drift check).

## 3. ScenarioPrompt (workspace artefact — `.prompt.md` × 8)

| Field | Notes |
|---|---|
| filename | `demo-<n>-<slug>.prompt.md`, n = 1..8 (5 happy, 3 fail-safe) |
| front matter | `agent: Debrief Analyst` (inherits model + tools) |
| body | scenario utterance, verbatim-equivalent to replay-corpus utterance |
| validation | unit test: body ↔ `scenarios.transcript.test.ts` corpus parity |

## 4. ApprovalPolicyDeclaration (configuration)

| Field | Notes |
|---|---|
| mechanism | `configurationDefaults` → `chat.tools.eligibleForAutoApproval` |
| `debrief_runTool` | `false` (never auto-approvable) |
| read-only tools | absent (host/user discretion; pre-approval documented, never granted by extension) |
| echo | same keys in `debrief-preview.code-workspace` settings |
| backstop | existing `prepareInvocation` confirmation + invoke-time mutation guard (unchanged) |

## 5. PlotSummaryView v2 (TypeScript view type — extends #284 shape)

```
PlotSummaryView {
  plotId, title,
  timeSpan: { start, end } | null,
  features: FeatureInventoryEntry[],
  truncated: boolean,          // now: true when ANY content was shed (budget or cap)
  shedding?: SheddingNotice,   // NEW — present when truncated
  approxTokens: number,        // computed over emitted payload (compact)
  openPlots: OpenPlotView[],
  selectionOnly?: true
}

FeatureInventoryEntry {
  id, name, type, platform,
  timeSpan,                    // priority: shed 2nd
  pointCount,
  spatialDigest?: string       // NEW — "sector/extent" e.g. "NW/wide"; omitted
                               // when feature has no geometry; priority: shed 1st
}

SheddingNotice {
  omitted: string[]            // which content classes were shed, in order
  guidance: string             // how to narrow scope (selection / search / featureNames)
}
```

**Priority order (highest survives longest)**: plot identity + counts +
SheddingNotice → feature id/name/type → per-feature timeSpan → spatialDigest.
`INVENTORY_CAP = 200` retained as final backstop only.

**State/rendering**: rendered via prompt-tsx element (`summaryPrompt.tsx`) when
the host supplies `tokenizationOptions`; compact-JSON text part otherwise
(identical field content at full budget — parity asserted in tests).

## 6. SpatialDigest (derived value)

| Component | Domain | Derivation |
|---|---|---|
| sector | `N NE E SE S SW W NW C` | feature bbox centroid vs 3×3 grid over plot bbox |
| extent | `pt | local | wide` | feature bbox diagonal / plot bbox diagonal buckets |

Deterministic (Article I.4). Undefined (omitted) for zero-geometry features.

## 7. McpServerRegistration (extension config + provider)

| Field | Notes |
|---|---|
| provider id | `debrief.stacMcp` |
| definition | stdio: resolved Python interpreter → `python -m debrief_stac.mcp_server` |
| env/args | catalog path from `debrief.stacCatalogPath` |
| gate | `debrief.mcp.autoStart` setting (existing, default false) |
| failure mode | log diagnostic; LM tools unaffected (never an error dialog) |

## 8. ComparisonFindingsNote (evidence artefact)

`evidence/mcp-vs-lmtool-comparison.md`: query-matrix parity table (FR-020),
per-scenario routing outcome + latency under config A/B (R9), setup-friction
notes, recommendation for the E13 tool-surface contract. Follows the #284
findings-report structure.
