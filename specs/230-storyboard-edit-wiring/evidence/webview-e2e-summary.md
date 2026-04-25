# Web-shell E2E summary

**Feature**: 230 | **Run date**: 2026-04-24 | **Runner**: `@playwright/test` ^1.57.0

## Scenarios run

| # | Scenario | FR / SC | Status |
|---|----------|---------|--------|
| 1 | Harness renders with fixture Scenes | FR-020 | ✅ Pass |
| 2 | Chevron toggles inline edit form | FR-001, FR-004 | ✅ Pass |
| 3 | Overflow menu opens on right-click, lists six actions | FR-003 | ✅ Pass |
| 4 | Overflow menu Delete → undo toast → Undo restores | FR-005, US2 AC2 | ✅ Pass |
| 5 | Stale badge from `?stale` knob clears on Refresh all | FR-012 | ✅ Pass |
| 6 | `Shift+F10` opens overflow menu | FR-003 (keyboard) | ✅ Pass |
| 7 | `?missingData=sceneC:f1,f2` surfaces remediation affordance | FR-022 | ✅ Pass |

**Total**: 7 / 7 pass. Run time: 6.5 s.

## Screenshot index

All screenshots live under `specs/218-storyboarding-edit/evidence/screenshots/`
(per FR-040 — this feature completes #218's deferred T097).

| File | Captured in | Depicts |
|------|-------------|---------|
| `storyboard-panel-default.png` | scenario #1 | Panel with three fixture Scenes, no form open |
| `storyboard-edit-form-open.png` | scenario #2 | Scene B expanded with inline edit form visible |
| `storyboard-overflow-menu-open.png` | scenario #3 | Right-click menu showing six actions |
| `storyboard-undo-toast.png` | scenario #4 | Scene B deleted, Undo toast pinned to bottom of panel |
| `storyboard-stale-badge.png` | scenario #5 | Scenes A and C showing StaleBadge with tooltip feature IDs |
| `storyboard-missing-data-remediation.png` | scenario #7 | Missing-data panel inside sceneC's edit form |

## Not yet captured (future expansion)

The full #218 evidence-requirements table calls for additional screenshots
(`storyboard-header-rename.png`, `duplicate-timestamp-prompt.png`,
`copy-to-other-picker.png`, `copy-error-toast.png`, `refresh-all-stale-summary.png`,
`vscode-native-chrome.png`) and an `interaction.gif` of the core polish loop.
These require either (a) VS Code command-palette chrome (for the native
prompt / picker shots) or (b) additional harness scenarios. The Playwright
smoke suite built here is the foundation for those additions — the
harness + page object support them with no additional scaffolding.

## VS Code code-server E2E

**Deferred**: Not captured in this run. The `test-storyboard-edit.spec.ts`
in `apps/vscode/tests/e2e/` is the home for the thin VS Code-chrome
coverage (palette invocation for each new command, `showInputBox` prompts,
`showQuickPick` for copy-to-other, native toasts). That spec is planned for
a follow-up PR once the web-shell harness has been merged and the
evidence-requirements table gaps are identified.

## Perf budget

No regression in `onPlotOpened` perf. The reducer state derivation is O(1) per
action and `composeSceneEditViewModels` is O(active-storyboard Scenes) —
same bound #218 established (FR-008, review 13A).

## A11y

Overflow menu passes WAI-ARIA `role="menu"` / `role="menuitem"` with
ArrowDown/ArrowUp/Home/End/Escape/Tab keyboard patterns (verified in
`SceneOverflowMenu.test.tsx`). A full `@axe-core/playwright` scan is
deferred to a follow-up alongside the additional Playwright scenarios.
