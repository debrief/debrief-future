# Implementation Plan: Tabular Results Panel — VS Code Extension Integration

**Branch**: `claude/vscode-tabular-results-CFFcS` (spec dir `178-vscode-tabular-results`) | **Date**: 2026-04-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/178-vscode-tabular-results/spec.md`

## Summary

Bring the Tabular Results Panel (feature 177, currently web-shell only) into the VS Code extension. Add a new `WebviewView` Results panel in the VS Code panel area (beneath the editor) that consumes `DatasetEnvelope` outputs from `debrief-calc` tools, renders them through the **unchanged** shared `ChartPanelWrapper` + `TableRenderer`, and exposes Save / Save As / Retry / file actions. Persistence reuses the existing `StacService.addResultAsset` and a new `LogService.recordFileSaved` provenance entry that links saved CSVs back to their originating `ToolRunEvent`. Cross-webview state lives in a new singleton `ResultsPanelService` (extension host = source of truth, R5). Open questions from SRD §10 are all resolved in [research.md](./research.md).

The work is integration plumbing — no new schemas, no new visual components, no GoldenLayout in VS Code.

## Technical Context

**Language/Version**: TypeScript 5.x (VS Code extension + shared components, host + webview), Python 3.11 (no changes required — debrief-calc already returns the right shapes)
**Primary Dependencies**: VS Code Extension API ^1.85.0, React 18.x, `@debrief/components` (`ChartPanelWrapper`, `TableRenderer`, `ChartRenderer`, `PanelContext`), `@debrief/utils` (`buildCsvContent`, `generateCsvFilename`, `sanitizeFilename`, NEW `parseCsvToTableDataset` and NEW `synthesizeTableDataset`), `@debrief/session-state` (`LogService` — extended with `recordFileSaved`), existing `apps/vscode/src/services/stacService.ts`
**Storage**: STAC catalog assets on local filesystem (CSV files in `<plot>/assets/`); analysis log JSON (existing PROV-aligned format) — no schema migration
**Testing**: vitest (unit) for `ResultsPanelService`, `LogService.recordFileSaved`, CSV round-trip; Playwright (E2E) under `tests/e2e/` against the real VS Code webview via `@sparticuz/chromium`
**Target Platform**: VS Code 1.85+ (desktop + code-server); Linux/macOS/Windows
**Project Type**: Monorepo — TypeScript workspaces (`pnpm`) and Python workspaces (`uv`); this feature touches the `apps/vscode`, `shared/components`, `shared/utils`, `services/session-state`, and `apps/web-shell` packages
**Performance Goals**: Tab appears within 5 seconds of tool completion (SC-001); no additional latency added by the host-side coordinator (the long pole is the existing tool execution)
**Constraints**: Offline by default (Article I); no GoldenLayout in VS Code (SRD §8); shared components reused unchanged (NFR-1, FR-025, SC-006); strict type safety — no `any` (Article XV); CSP `default-src 'none'` for the new webview (NFR-4)
**Scale/Scope**: 1 new VS Code service (`ResultsPanelService`), 1 new VS Code view provider (`ResultsPanelViewProvider`), 1 new webview entry (`resultsPanel.tsx`), 1 new shared utility (`synthesizeTableDataset`), 1 extended shared utility (`parseCsvToTableDataset`), 1 extended interface method (`LogService.recordFileSaved`), targeted modifications to `executeTool.ts` and `extension.ts` wiring; ~10 unit tests + ~5 Playwright tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Compliance | Notes |
|---------|------------|-------|
| I. Defence-Grade Reliability | ✅ Pass | All new code is offline; no network. Failed saves leave no partial state (FR-011). |
| II. Schema Integrity | ✅ Pass | No LinkML schema changes. The new `FileSavedEvent` reuses the existing `LogEntry` envelope with sentinel field values (additive only — Article XIV). |
| III. Data Sovereignty | ✅ Pass | Every save records a `FileSavedEvent` in provenance (FR-009). Source files unchanged. No telemetry. CSV is a standard export format. |
| IV. Architectural Boundaries | ✅ Pass | `ResultsPanelService` lives in the extension host, not the webview. Python services unchanged — only the VS Code consumer is added. The webview is dumb (R5). |
| V. Extensibility | ✅ Pass | Reuses existing `DatasetEnvelope` extension point — any tool that returns `__datasets` or `statistics` automatically benefits. No tool registry changes. |
| VI. Testing | ✅ Pass | Unit tests for new service + new log method; Playwright E2E for the user stories. |
| VII. Test-Driven AI Collaboration | ✅ Pass | Acceptance scenarios in spec.md + test contracts in `contracts/results-panel-service.md` define "done" before implementation. |
| VIII. Documentation | ✅ Pass | This plan, research.md, data-model.md, contracts/, quickstart.md authored before any code. |
| IX. Dependencies | ✅ Pass | No new third-party dependencies. CSV parser is internal (< 100 LOC, RFC-4180 subset for our own files). |
| X. Security | ✅ Pass | New webview enforces CSP `default-src 'none'` (NFR-4). No secrets in CSV output. |
| XI. Internationalisation | ✅ Pass | Reuses existing `resultsPanelLabels.ts` from feature 177 — all strings already externalised. |
| XII. Community Engagement | ✅ Pass | Planning post + LinkedIn summary generated as Phase 2 output. |
| XIII. Contribution Standards | ✅ Pass | Atomic commits, PR review, CI gate. |
| XIV. Pre-Release Freedom | ✅ Pass | Pre-v4.0.0 — additive log field permitted. |
| XV. Strict Type Safety | ✅ Pass | New `ResultTab` type is fully concrete; no `any`. New `LogService.recordFileSaved` signature is explicit. Webview message types extend the existing discriminated union. |

**Result**: PASS — no violations. Complexity Tracking section below is empty.

## Project Structure

### Documentation (this feature)

```text
specs/178-vscode-tabular-results/
├── plan.md                                  # This file
├── research.md                              # Phase 0 — open questions resolved
├── data-model.md                            # Phase 1 — entities and state transitions
├── quickstart.md                            # Phase 1 — minimum verification path
├── contracts/                               # Phase 1 — interface contracts
│   ├── webview-messages.md                  # Extension ⇄ Webview message protocol
│   ├── results-panel-service.md             # ResultsPanelService public interface
│   └── log-service-extension.md             # LogService.recordFileSaved
├── checklists/
│   └── requirements.md                      # From /speckit.specify
├── media/                                   # Phase 2 — content drafts
│   ├── planning-post.md
│   └── linkedin-planning.md
└── tasks.md                                 # NOT created here — /speckit.tasks output
```

### Source Code (repository root)

```text
apps/vscode/
├── src/
│   ├── services/
│   │   ├── resultsPanelService.ts           # NEW — singleton coordinator (R5, contracts/results-panel-service.md)
│   │   ├── stacService.ts                   # MODIFIED — add deleteResultAsset() if not present (FR-018)
│   │   └── ...                              # other services unchanged
│   ├── views/
│   │   ├── resultsPanelView.ts              # NEW — WebviewViewProvider for the Results panel (R1)
│   │   ├── activityPanelView.ts             # MODIFIED — wire file:action handlers for Open/Reveal/OpenWith/Delete (FR-015–FR-018)
│   │   └── ...
│   ├── commands/
│   │   ├── executeTool.ts                   # MODIFIED — call resultsPanelService.addDatasetsForToolResult() / addErrorTab() after each run
│   │   └── ...
│   ├── webview/
│   │   ├── messages.ts                      # MODIFIED — add results:* message types (contracts/webview-messages.md)
│   │   ├── messages.test.ts                 # MODIFIED — discriminated-union round-trip tests for new types
│   │   └── web/
│   │       ├── resultsPanel.tsx             # NEW — small React app: <PanelContext.Provider><ChartPanelWrapper/></PanelContext.Provider>
│   │       └── ...                          # other entries unchanged
│   ├── extension.ts                         # MODIFIED — instantiate ResultsPanelService and ResultsPanelViewProvider; wire deps
│   └── package.json                         # MODIFIED — register new view container + view in contributes
└── ...

shared/
├── components/                              # UNCHANGED — ChartPanelWrapper, TableRenderer, PanelContext consumed as-is
└── utils/
    └── src/
        ├── csv.ts                           # MODIFIED — add parseCsvToTableDataset() (R3 inverse of buildCsvContent)
        ├── csv.test.ts                      # MODIFIED — round-trip tests for parser
        ├── datasetSynthesis.ts              # NEW — synthesizeTableDataset() extracted from web-shell (R6)
        └── datasetSynthesis.test.ts         # NEW

services/
└── session-state/
    └── src/
        └── log/
            ├── types.ts                     # MODIFIED — add recordFileSaved to LogService interface + FILE_SAVE_TOOL_SENTINEL constant (R7, contracts/log-service-extension.md)
            └── logService.ts                # MODIFIED — implement recordFileSaved

apps/web-shell/
└── src/
    └── mocks/
        └── calcService.ts                   # MODIFIED — call shared synthesizeTableDataset() instead of inline copy (NFR-1)

tests/
└── e2e/
    ├── test-tabular-results-display.spec.ts # NEW — US1 verification
    ├── test-tabular-results-save.spec.ts    # NEW — US2 + US3 verification
    └── test-tabular-results-actions.spec.ts # NEW — US4 verification
```

**Structure Decision**: Single-monorepo extension to existing packages — no new package created. The `apps/vscode/src/` source root absorbs the new service, view, and webview entry; `shared/utils` absorbs the round-trip parser and the extracted synthesizer; `services/session-state` absorbs the new log method. The `apps/web-shell` change is a refactor-only consequence of NFR-1 (no forks).

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| (none new) | `shared/components/src/panels/ChartPanelWrapper.stories.tsx` | (existing) | Existing story already covers the renderer used in this feature; no new story to bundle. |

**Inclusion Criteria Applied**:
- [ ] New visual component
- [ ] Significant visual change
- [ ] Interactive demo adds narrative value

**Bundleability Verified**:
- [ ] Stories exist in Storybook *(existing — not new for this feature)*
- [ ] Components render standalone *(yes, via the existing story)*
- [ ] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/panels-chartpanelwrapper--default`

**Decision**: None new — this feature is integration plumbing for an existing component already shipped (and storyed) under feature 177. The shipped post can link to the existing ChartPanelWrapper story.

## Storybook E2E Testing

None — no new visual components or stories. The existing `ChartPanelWrapper` story (from feature 177) already has theme-variant E2E coverage and is consumed unchanged.

*If no e2e tests needed, write "None - no interactive UI components"*: **None new — feature reuses existing storied components.**

## VS Code Webview E2E Testing

| Workflow | Panels Involved | Key Selectors | Interactions |
|----------|----------------|---------------|--------------|
| Display tool result as table tab | Map Panel, Activity Panel, **Results Panel (NEW)** | `.leaflet-container`, `[data-testid="panel-chart"]`, `.activity-panel-webview` | Open REP, select track, run track-stats, verify table tab |
| Display tool result as chart tabs | Map Panel, Results Panel | `[data-testid="panel-chart"]`, tab labels `Range` / `Bearing` | Open REP, select two tracks, run range-bearing, verify two chart tabs |
| Save result and verify provenance | Results Panel, Layers Toolbar | Save button, Associated Files dropdown | Click Save, assert toast, assert dropdown updates, assert FileSavedEvent in log |
| Save As with custom name | Results Panel | Save As button, base-name input, OK button | Click Save As, fill name, submit, assert filename |
| Reveal in Explorer | Layers Toolbar dropdown | Dropdown item `Reveal` | Click, assert VS Code Explorer focus |
| Retry failed run | Results Panel | Retry button | Trigger failure, click Retry, assert tab transitions |

**Testing Strategy**:
- [x] Extension workflow works end-to-end in code-server
- [x] Webview content accessible via `frameLocator` chaining
- [x] Page objects updated for new selectors (new `ResultsPanelPage` page object)
- [x] Screenshots captured for evidence

**Test File Location**: `tests/e2e/test-tabular-results-*.spec.ts`

**Infrastructure**:
- Patches applied by `tests/e2e/scripts/patch-webview.sh` (no changes — the new view is a `WebviewView` like the others)
- Content injection via `tests/e2e/helpers/webview-injector.ts` (extend with a `getResultsPanelFrame()` helper)
- Headed Chromium required: `xvfb-run --auto-servernum npx playwright test ...`

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

(empty — no violations)
