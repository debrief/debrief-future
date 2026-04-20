---
description: "Task list for #195 NL search in Layers & Tools panels"
---

# Tasks: NL Search in Layers & Tools Panels

**Input**: Design documents from `/specs/195-nl-layers-tools/`
**Prerequisites**: plan.md (present), spec.md (present). Depends on #191 landing.

**Tests**: Required — every behavioural change has an accompanying unit and/or E2E test.

**Organization**: Grouped by user story (US1 Layers, US2 Tools, US3 Failure-consistency).

---

## Evidence Requirements

**Evidence Directory**: `specs/195-nl-layers-tools/evidence/`

Minimum:
1. `evidence/test-summary.md` (using `.specify/templates/evidence/test-summary-template.md`)
2. `evidence/usage-example.md` — short transcript showing NL submission in all three panels
3. Feature-type evidence (VS Code Extension):
   - `evidence/screenshots/layers-chips-applied.png`
   - `evidence/screenshots/tools-chips-applied.png`
   - `evidence/screenshots/cross-panel-concurrency.gif` (< 5 s, shows three submissions resolving independently)
   - `evidence/screenshots/layers-banner-auth-failure.png` (matching copy to Catalog Overview equivalent)
   - `evidence/e2e-trace.zip` (Playwright trace from the cross-panel-concurrency scenario)

---

## Phase 1 — Shared foundations (US1 + US2 + US3)

- [ ] T001 **[P]** Extend `apps/vscode/src/webview/messages.ts` — add `panelOrigin: "catalog-overview" | "layers" | "tools"` to the existing `nlGenerate`, `nlOutcome`, `nlAbort` message variants. Update the exported type-guard helpers if any.
- [ ] T002 **[P]** Extend `shared/components/src/nl-cql2/clients.ts` — `createPostMessageLLMClient` gains an optional `panelOrigin` parameter (default `"catalog-overview"`). Every emitted `nlGenerate` message carries the panel origin.
- [ ] T003 Edit `apps/vscode/src/services/llmProxy.ts` — change the inflight map from `Map<requestId, AbortController>` to `Map<string, AbortController>` keyed by `${panelOrigin}:${requestId}`. Read `panelOrigin` from incoming `nlGenerate`; thread it through the outcome message and the structured telemetry record.
- [ ] T004 Edit `apps/vscode/src/services/llmProxy.ts` — confirm the ceiling counter is a single session-scoped integer and that it is decremented before the provider call, not after classification. Add an inline comment explaining "session-wide budget, not per-panel".
- [ ] T005 Edit `apps/vscode/src/webview/web/catalogOverview.tsx` — pass `panelOrigin: "catalog-overview"` to `createPostMessageLLMClient`. Regression-only edit.

## Phase 2 — User Story 1: Layers panel NL mode (P1)

- [ ] T010 **[US1]** Locate `apps/vscode/src/webview/web/layersPanel.tsx`; identify the `FilterBar` mount point.
- [ ] T011 **[US1]** Construct `createPostMessageLLMClient(vscode, { panelOrigin: "layers" })` in `layersPanel.tsx` inside a `useMemo` keyed on the `debrief.nlSearch.enabled` setting value. When the setting is off, the `useMemo` returns `undefined` so `FilterBar` falls back to literal-substring filtering.
- [ ] T012 **[US1]** Pass the memoised client as `<FilterBar llmClient={...} placeholder="Try: submarine tracks" />`. Preserve all existing `FilterBar` props.
- [ ] T013 **[US1] [P]** Write unit test `apps/vscode/src/webview/web/__tests__/layersPanel.test.tsx` — asserts the client is constructed with `panelOrigin: "layers"` when enabled and `undefined` when disabled.

## Phase 3 — User Story 2: Tools panel NL mode (P2)

- [ ] T020 **[US2]** Mirror T010 for `apps/vscode/src/webview/web/toolsPanel.tsx`.
- [ ] T021 **[US2]** Mirror T011: `useMemo` with `panelOrigin: "tools"`.
- [ ] T022 **[US2]** Mirror T012: `placeholder="Try: tools that operate on tracks"`.
- [ ] T023 **[US2] [P]** Mirror T013 for `toolsPanel.test.tsx`.

## Phase 4 — User Story 3: Failure-consistency across panels (P3)

- [ ] T030 **[US3] [P]** Add vitest `apps/vscode/src/services/llmProxy.test.ts` — "new submission in panel A does not cancel in-flight in panel B". Setup: two concurrent `nlGenerate` messages, one from `layers`, one from `tools`. Fire a third `nlGenerate` from `layers` before the first resolves. Assert the `tools` in-flight call is NOT aborted.
- [ ] T031 **[US3] [P]** Add vitest `llmProxy.test.ts` — "ceiling-reached affects all panels". Setup: ceiling = 2, two successful submissions exhaust the budget. Third submission from any panel must resolve synchronously with `ceiling-reached`, no provider call.
- [ ] T032 **[US3] [P]** Add vitest `llmProxy.test.ts` — "telemetry record contains correct panel_origin per submission". Submit one from each of the three panels; assert three telemetry records with distinct `panel_origin` values.
- [ ] T033 **[US3] [P]** Add Storybook variants in `shared/components/src/FilterBar/FilterBar.stories.tsx` — `NlModeLayersPanel` and `NlModeToolsPanel` (same stub client as the `NlModeWithStubClient` story, differing placeholders).
- [ ] T034 **[US3]** Extend `shared/components/e2e/FilterBar-nl.spec.ts` — parametric coverage for the two new story variants in light/dark/vscode themes.

## Phase 5 — E2E integration

- [ ] T040 Edit `tests/e2e/test-vscode-nl-search.spec.ts` — add `layers-happy-path` scenario (open Layers, type phrase, Enter, assert chips). Reuse the stub provider from #191.
- [ ] T041 Edit `tests/e2e/test-vscode-nl-search.spec.ts` — add `tools-happy-path` scenario. Parametrise with T040 where possible.
- [ ] T042 Edit `tests/e2e/test-vscode-nl-search.spec.ts` — add `cross-panel-concurrency` scenario: open all three panels, issue three submissions within 100 ms, assert all three resolve with correct chips and independent `submission_id`.
- [ ] T043 Edit `tests/e2e/test-vscode-nl-search.spec.ts` — add `ceiling-reached-crosses-panels` scenario: set ceiling=2, submit twice in Catalog Overview, then submit from Layers; assert the `ceiling-reached` banner renders in Layers without a network call.
- [ ] T044 Edit `tests/e2e/test-vscode-nl-search.spec.ts` — add a parametric `per-panel-failure-matrix` test covering two failure classes (auth-failure, rate-limit) from each of the three panels, asserting banner copy and `data-transport-reason` are byte-identical across panels.

## Phase 6 — Polish + Evidence

- [ ] T050 Confirm no regressions: re-run the full #191 E2E suite; all existing scenarios pass.
- [ ] T051 Run `task verify` — lint, typecheck, test. Fix any issues surfaced.
- [ ] T052 **[P]** Capture `evidence/screenshots/layers-chips-applied.png` and `tools-chips-applied.png` from the E2E run.
- [ ] T053 **[P]** Capture `evidence/screenshots/cross-panel-concurrency.gif` from the T042 Playwright trace.
- [ ] T054 **[P]** Capture at least one failure-banner screenshot per non-default panel (Layers, Tools) for evidence.
- [ ] T055 Write `evidence/test-summary.md` using `.specify/templates/evidence/test-summary-template.md`. Include git_sha, captured_at, tests passed/failed/skipped.
- [ ] T056 Write `evidence/usage-example.md` — short annotated transcript showing an analyst workflow across all three panels.
- [ ] T057 Save the E2E trace ZIP to `evidence/e2e-trace.zip`.
- [ ] T058 Update `docs/project_notes/issues.md` with the implementation entry linking to the PR.

## Phase 7 — PR creation

- [ ] T060 Create PR with title `[#195] NL search in Layers & Tools panels` linking the spec, plan, and evidence. Use the `/speckit.pr` skill if available, else `gh pr create` with the standard template.

---

## Dependencies

- Phase 1 foundations (T001–T005) must land before Phase 2 or Phase 3 (they define the message shape and `createPostMessageLLMClient` signature).
- Phase 2 (US1) and Phase 3 (US2) are independent of each other — can ship in either order or together.
- Phase 4 (US3) depends on Phase 1, 2, 3 all landing — its tests exercise the full wiring.
- Phase 5 (E2E) depends on Phase 2 + Phase 3 at minimum.
- Phase 6 polish requires everything green.

## Parallelisation notes

Tasks marked **[P]** can be worked in parallel within their phase. The Layers and Tools panel wiring (Phases 2 and 3) can be divided between two contributors. The vitest tests in Phase 4 are file-scoped and independent.
