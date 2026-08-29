# Implementation Plan: Copilot Chat Integration Best-Practices Upgrade

**Branch**: `285-copilot-best-practices` | **Date**: 2026-07-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/285-copilot-best-practices/spec.md`

## Summary

Upgrade the #284 Copilot spike surface to current VS Code/Copilot best practice
across five slices: (1) place the domain-priming file where the host actually
loads it (repo root + preview workspace root, canonical source + CI drift
check); (2) ship a "Debrief Analyst" custom agent (`.agent.md`, pinned model,
restricted tool list) and the eight #284 scenarios as `.prompt.md` slash
commands; (3) declare `debrief_runTool` ineligible for auto-approval via
contributed configuration defaults and document read-only pre-approval;
(4) make tool results compact and the plot summary budget-aware via
`@vscode/prompt-tsx` priority-ranked rendering, adding a per-feature spatial
digest; (5) register the existing `debrief_stac` Python MCP server through
`McpServerDefinitionProvider` and record an MCP-vs-LM-tool routing comparison
for E13. No changes to the four-tool contract's behavioural invariants
(dirty-only edits, confirmation gate, corrective fail-safes, telemetry,
provenance).

## Technical Context

**Language/Version**: TypeScript 5.x (strict — Article XV) in `apps/vscode`; Python 3.11 untouched (existing `debrief_stac.mcp_server` consumed as-is)
**Primary Dependencies**: VS Code Extension API (existing ^1.99 engine; new API used behind capability checks: `McpServerDefinitionProvider`, custom agents/prompt files are host-side file conventions, not API); `@vscode/prompt-tsx` (**new dev/runtime dependency** — justified under Constitution Check Article IX); existing `src/copilot/` modules (`summarize.ts`, `resultHelpers.ts`, `runToolTool.ts`, `registerLmTools.ts`), `calcService`, `stacService`
**Storage**: None new. Reads existing STAC catalog; workspace-level config files (`.github/`, `.vscode/`, `*.code-workspace`) are committed artefacts
**Testing**: vitest unit tests in `apps/vscode/tests/unit/copilot/` (extends the 48-test + 8-scenario transcript-replay suite); CI drift-check for priming copies; token-probe regeneration script
**Target Platform**: VS Code desktop 1.99+ (graceful degradation) with full behaviour on 1.106+ (custom agents, per-tool approval policy); browser-preview Code Server workspace
**Project Type**: VS Code extension + workspace configuration pack (no web/mobile split)
**Performance Goals**: Typical-plot summary (incl. spatial digest) within documented typical budget; compact serialization ≥15% payload reduction at every #284 probe size; over-budget summaries degrade by priority, never error
**Constraints**: #284 invariants preserved (FR-023); Copilot cloud dependency acceptable for this demo/research surface only (Article I governs shipped capability — same posture as #284); MCP server failure non-fatal
**Scale/Scope**: 4 LM tools, 8 scenario prompts, 1 custom agent, 2 workspace roots, ~10 existing test files extended

## Constitution Check

*GATE: evaluated pre-Phase-0 and re-checked post-Phase-1 — PASS (one justified note).*

- **Article I (offline by default)**: This feature extends the #284 demo/research surface, which is explicitly not a production commitment; the offline successor is E13/#235. The MCP experiment and budget-aware summary *reduce* eventual cloud coupling (the summary contract and MCP serving both transfer to a local-model panel). No shipped core capability gains a network dependency. Same justification as #284, recorded there and re-affirmed here.
- **Article III (provenance)**: unchanged — `utterance` provenance capture and telemetry are preserved invariants (FR-023).
- **Article IV (boundaries)**: services untouched; the MCP experiment reuses the existing thin FastMCP wrapper over `debrief_stac` (IV.3 — domain logic stays in the pure library). No frontend persistence added.
- **Article VI/VII (testing, tests define done)**: every slice has an automated gate — drift check (US1), scenario replay extension (US2), approval-declaration assertion (US3), summary-format tests + regenerated probe (US4), result-parity matrix (US5).
- **Article VIII (specs before code)**: spec.md merged first; this plan + ADR note for the prompt-tsx dependency.
- **Article IX (dependencies)**: **`@vscode/prompt-tsx` is a new dependency** — Microsoft-maintained, purpose-built for exactly this (token-budget-aware LM tool results), no transitive baggage of note, pinned. Alternative (hand-rolled priority pruning) rejected: re-implements the host's sanctioned budget mechanism without access to the caller's tokenizer. Justification recorded here per Article IX.1.
- **Article X (security)**: no secrets; no new network calls from the extension (Copilot itself is the transport, as in #284).
- **Article XV (strict types)**: all new TS strict; prompt-tsx elements fully typed; the summary view type is extended, not weakened.

## Project Structure

### Documentation (this feature)

```text
specs/285-copilot-best-practices/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── customization-pack.md   # File formats + placement contract (US1–US3)
│   └── plot-summary-v2.md      # Budget-aware summary result contract (US4)
├── checklists/requirements.md
└── tasks.md             # /speckit.tasks output (not created here)
```

### Source Code (repository root)

```text
.github/
├── copilot-instructions.md          # NEW — canonical priming (moved from apps/vscode/.github/)
├── agents/debrief-analyst.agent.md  # NEW — custom agent (US2)
└── prompts/demo-*.prompt.md         # NEW — 8 scenario prompts (US2)

preview/workspace/samples/
├── .github/copilot-instructions.md  # NEW — synced copy for the preview workspace root (US1)
├── .github/agents/                  # NEW — synced copy (US2)
└── .github/prompts/                 # NEW — synced copy (US2)

preview/workspace/debrief-preview.code-workspace  # MODIFIED — approval settings (US3)

apps/vscode/
├── package.json                     # MODIFIED — configurationDefaults (approval policy),
│                                    #   contributes.mcpServerDefinitionProviders (US5),
│                                    #   @vscode/prompt-tsx dependency
├── .github/copilot-instructions.md  # REMOVED (relocated to canonical root)
├── src/copilot/
│   ├── resultHelpers.ts             # MODIFIED — compact serialization (US4)
│   ├── summarize.ts                 # MODIFIED — spatial digest + priority ranks (US4)
│   ├── summaryPrompt.tsx            # NEW — prompt-tsx element for budget-aware rendering (US4)
│   ├── summarizeCurrentPlotTool.ts  # MODIFIED — renderElementJSON + tokenizationOptions (US4)
│   └── mcpProvider.ts               # NEW — McpServerDefinitionProvider for debrief_stac (US5)
├── src/extension.ts                 # MODIFIED — register MCP provider (guarded, non-fatal)
└── tests/unit/copilot/              # EXTENDED — summary v2, digest, compact, approval decl,
                                     #   drift check, scenario prompts ↔ replay parity

scripts/check-copilot-customization-drift.mjs  # NEW — CI drift check (US1/FR-003)

services/stac/src/debrief_stac/mcp_server.py   # UNCHANGED (consumed as-is)
```

**Structure Decision**: All extension work stays inside the existing
`apps/vscode/src/copilot/` quarantine established by #284; customization
artefacts are workspace content at the two demo workspace roots with the repo
root as canonical source and a script-enforced sync.

## Media Components

None — VS Code extension configuration/infrastructure feature; no shared React
components change. Blog media will be chat-session screenshots captured per
quickstart into `evidence/screenshots/` (live Copilot session in the preview,
as done for #284).

## Storybook E2E Testing

None - no interactive UI components.

## Web-Shell E2E Testing

None - no extension workflow changes (the web-shell does not host Copilot chat;
evidence screenshots come from the preview Code Server session per quickstart).

## Complexity Tracking

No constitution violations requiring justification beyond the Article IX
dependency note recorded in the Constitution Check above.
