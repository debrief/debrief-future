# Quickstart: Copilot Chat Best-Practices Upgrade (285)

Drive the upgraded demo surface and produce the evidence. Builds on the #284
quickstart; differences are marked **NEW**.

## Prerequisites

- VS Code **1.106+** for the full experience (custom agents, per-tool approval
  policy). 1.99+ works with #284-level behaviour.
- GitHub Copilot Chat signed in, agent mode enabled.
- Debrief extension built from this branch; debrief-calc Python env resolvable.
- Open one of the two supported workspaces: the preview
  `debrief-preview.code-workspace` (Code Server) or the repo root.

## 1. Verify priming loads (US1 — SC-001)

1. Send any chat request in agent mode.
2. Expand the request's applied-context/instructions indicator.
3. Confirm "copilot-instructions.md" (Debrief priming) is listed. Screenshot →
   `evidence/screenshots/priming-applied-{preview,root}.png`.

## 2. Run demos the new way (US2 — SC-002/003)

1. Open the chat agent picker → select **Debrief Analyst** (**NEW**). Verify
   the pinned model shows; if your subscription lacks it, the host falls back
   to your default model (expected, notice shown).
2. Type `/` → the eight `demo-*` commands appear (**NEW**).
3. Run `/demo-1-open-plot` … `/demo-8-…` in order. Each must reproduce its
   #284 scripted outcome (terminal tool, gating, refusals). Record a live
   session for SC-003.

## 3. Approvals (US3 — SC-004)

One-time demo setup (**NEW**): Command Palette → **Chat: Manage Tool
Approval** → pre-approve `debrief_searchPlots`, `debrief_summarizeCurrentPlot`,
`debrief_listTools` at workspace scope. Do NOT pre-approve `debrief_runTool`.

Bypass-proof check: enable `chat.tools.global.autoApprove` (or `/yolo`), run a
mutating scenario — the plain-language confirmation MUST still appear
(`debrief_runTool` is declared ineligible for auto-approval). Decline → plot
byte-identical. Screenshot both.

## 4. Budget-aware summary (US4 — SC-005/006)

- `/demo-2-summarise` on a typical plot: feature entries now include
  `spatialDigest` (e.g. `"NW/wide"`). Ask "colour the northern track red" —
  the model must target the correct feature id without a follow-up call.
- Load the 250-feature probe fixture, summarise: output fits the granted
  budget, `shedding` notice lists omitted content and narrowing guidance.
- Regenerate the probe table: `evidence/token-budget-v2.md`.

## 5. MCP hybrid experiment (US5 — SC-007)

1. Set `debrief.mcp.autoStart: true` (**NEW** — registers the existing Python
   STAC MCP server via the extension; no manual mcp.json).
2. Config A: disable `debrief_searchPlots` in the tool picker → search via the
   MCP-served tool. Config B: inverse.
3. Run the parity script (query matrix × fixtures) — result sets identical.
4. Run the search-terminating scenarios under A and B; record routing +
   latency → `evidence/mcp-vs-lmtool-comparison.md`.
5. Kill the Python env and restart: LM tools must keep working; MCP failure is
   a log line, not a dialog (FR-021).

## Automated gates (run before pushing)

```sh
task verify                       # lint (incl. drift check), typecheck, tests
node scripts/check-copilot-customization-drift.mjs   # standalone drift check
```

Unit suites extended in `apps/vscode/tests/unit/copilot/`: summary v2 +
digest + shedding, compact-serialization reduction, prompt↔replay-corpus
parity, approval-declaration presence, MCP provider guard.
