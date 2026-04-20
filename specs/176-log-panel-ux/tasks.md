---

description: "Reduced task list for Feature 176 — Analysis Log Panel Rich Card UX (post-review)"
---

# Tasks: Analysis Log Panel — Rich Card UX (Reduced Scope)

**Input**: Design documents from `/specs/176-log-panel-ux/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/log-panel-types.ts, quickstart.md
**Review gate**: `/speckit.review` (decisions 1A/2A/3A/4A/5A/6A/7A/8A/9A/10A/11A)

**Why this list is short**: Feature 176 is already ~85% implemented on `main`. The `LogPanel/` module already contains `ToolCategoryIcon.tsx`, `ParameterChip.tsx`, `TrackBadge.tsx`, `paramTypeInference.ts`, `toolCategories.ts`, the 4-tab ARIA tablist, the 3-row card anatomy, and the unified `ViewMode`. The original 88-task plan would have duplicated that work. This list addresses only the genuine gaps.

**Tests**: Tests are REQUIRED — vitest (unit + component) + Playwright component E2E. Webview E2E stays `.fixme` pending #143.

---

## Review Decisions Applied

| # | Decision | Encoded in |
|---|----------|------------|
| 1A | Show all param chips (drop the `!param.default` filter); keep `slice(0,5)` + "+N more" indicator | T006 |
| 2A | Detect snapshot entries via `resolveToolCategory(toolName).category === 'snapshot'` | T007 |
| 3A | Replace the original 88-task tasks.md with this reduced version | (this file) |
| 4A | Rename `isDefault` → `isNonDefault` across types, code, tests, contract | T001 |
| 5A | Widen `ToolCategoryConfig.category` to `ToolCategory \| null`; drop inline union + `ToolCategoryFallback` duplicate | T003 |
| 6A | Wire `LOG_PANEL_STRINGS.chipNonDefaultTooltip` + add `trackBadgeDeletedSuffix`; use in `ParameterChip`/`TrackBadge` | T002 |
| 7A | Atomic rename + test updates (one task) gated by `pnpm -r typecheck` | T001 |
| 8A | Roving `tabIndex` + ←/→/Home/End keyboard nav on `LogActionBar` | T008 |
| 9A | Convert `tests/e2e/test-log-panel.spec.ts` `describe.skip` → `describe.fixme` referencing #143 | T016 |
| 10A | Keep chip cap at 5 + "+N more" (no `React.memo`, no virtualisation) | T006 |
| 11A | Sanity-check `stepIndexMap` `useMemo` deps during T007 edits | T007 |

---

## Evidence Requirements

**Evidence Directory**: `specs/176-log-panel-ux/evidence/`
**Media Directory**: `specs/176-log-panel-ux/media/`

### Planned Artifacts

| Artifact | Description |
|----------|-------------|
| `evidence/test-summary.md` | YAML front matter + vitest and Playwright component-E2E counts |
| `evidence/usage-example.md` | Host integration snippet + sample timeline + expected rendering |
| `evidence/screenshots/component-light.png` | Storybook Rich Card in light theme |
| `evidence/screenshots/component-dark.png` | Storybook Rich Card in dark theme |
| `evidence/screenshots/component-vscode.png` | Storybook Rich Card in vscode theme |
| `evidence/screenshots/interaction.gif` | < 5s, < 2MB — card selection + cycling all 4 view tabs |
| `evidence/screenshots/edge-cases.png` | Snapshot / no-params / unknown tool / "+N more" chip |
| `evidence/screenshots/disabled-state.png` | Disabled card at 50% opacity with badge |
| `media/shipped-post.md` | Blog post on the rich-card redesign |
| `media/linkedin-shipped.md` | 150–200 word LinkedIn summary |

### PR Creation

`/speckit.pr` opens the feature PR in `debrief/debrief-future` and the blog PR in `debrief.github.io`.

---

## Phase A: Bug Fixes + Type Consolidation

> Every task in this phase edits existing files. No new source files are created.
> All changes gated by `pnpm -r typecheck` + `pnpm --filter @debrief/components test`.

- [x] T001 Atomically rename `isDefault` → `isNonDefault` (polarity flip) across `shared/components/src/LogPanel/types.ts` (ParamChipData), `shared/components/src/LogPanel/ParameterChip.tsx` (render condition), `shared/components/src/LogPanel/LogEntry.tsx` (chip construction), `shared/components/src/LogPanel/__tests__/ParameterChip.test.tsx` (fixtures), and `specs/176-log-panel-ux/contracts/log-panel-types.ts` — verify with `pnpm -r typecheck`
- [x] T002 Wire `LOG_PANEL_STRINGS.chipNonDefaultTooltip` into `ParameterChip` non-default marker `aria-label`, add new `trackBadgeDeletedSuffix` string used by `TrackBadge` for deleted-feature badges in `shared/components/src/LogPanel/strings.ts`, `shared/components/src/LogPanel/ParameterChip.tsx`, `shared/components/src/LogPanel/TrackBadge.tsx`
- [x] T003 Widen `ToolCategoryConfig.category` to `ToolCategory | null`; drop inline fallback union from `resolveToolCategory`; delete duplicate `ToolCategoryFallback` from contract in `shared/components/src/LogPanel/types.ts`, `shared/components/src/LogPanel/toolCategories.ts`, `specs/176-log-panel-ux/contracts/log-panel-types.ts`
- [x] T004 Replace local-time `toLocaleTimeString` with UTC formatting — emit `HH:MM:SS UTC` per FR-014 + research R6 in `shared/components/src/LogPanel/utils.ts`
- [x] T005 Fix `formatDuration` to emit `X.Xs` (single-decimal) for whole seconds ≥1 per FR-013 in `shared/components/src/LogPanel/utils.ts`
- [x] T006 Stop filtering defaults; render all parameter chips with `isNonDefault` marker for non-defaults; keep `.slice(0,5)` cap; append a `+N more` indicator chip when truncated per Decisions 1A/10A in `shared/components/src/LogPanel/LogEntry.tsx`
- [x] T007 Render `"No parameters"` muted-italic placeholder when `chips.length === 0`; render `"Manual checkpoint"` muted-italic (and omit duration) when `resolveToolCategory(entry.toolName).category === 'snapshot'` per Decision 2A + FR-012; add `aria-selected={isSelected}` and step-numbered `aria-label` to the card root per FR-018; during this edit, sanity-check that `stepIndexMap` deps in `LogByFeature.tsx` still reflect `[entries]` only per Decision 11A — in `shared/components/src/LogPanel/LogEntry.tsx` and spot-check `shared/components/src/LogPanel/LogByFeature.tsx`
- [x] T008 Implement roving `tabIndex` + `onKeyDown` (←/→/Home/End) keyboard nav for the 4-tab `role="tablist"` per Decision 8A + FR-018 in `shared/components/src/LogPanel/LogActionBar.tsx`

---

## Phase B: Test Coverage Gaps

> Tests written FIRST where possible. Each test file is self-contained (`[P]`-able with its siblings).

- [x] T009 [P][test] Component tests for `LogEntry`: 3-row anatomy (header/meta/params rows present), newest-first stepIndex, rationale tooltip shows when non-empty + hidden when empty string, `aria-selected` toggles with `isSelected`, step number in `aria-label`, multi-track wrap via flex-wrap, all 5 category icons render correctly via `ToolCategoryIcon` in `shared/components/src/LogPanel/__tests__/LogEntry.test.tsx`
- [x] T010 [P][test] Component tests for `LogEntry` edge cases: "Manual checkpoint" renders + duration omitted for snapshot-category entries, "No parameters" placeholder when chips empty, "+N more" indicator appears when >5 params, disabled card renders badge + 50% opacity CSS class + remains clickable in `shared/components/src/LogPanel/__tests__/LogEntryEdgeCases.test.tsx`
- [x] T011 [P][test] Component tests for `ToolCategoryIcon`: all 5 categories render correct background + glyph + aria-label, null category falls back to neutral grey in `shared/components/src/LogPanel/__tests__/ToolCategoryIcon.test.tsx`
- [x] T012 [P][test] Component tests for `TrackBadge`: existing + deleted variants, aria-label uses `trackBadgeDeletedSuffix`, multi-badge wrap in `shared/components/src/LogPanel/__tests__/TrackBadge.test.tsx`
- [x] T013 [P][test] Component tests for `LogActionBar` 4-tab ARIA tablist: `role="tablist"`/`role="tab"`, one `aria-selected="true"` at a time, ←/→ cycle selection with wrap, Home/End jump to first/last, inactive tabs have `tabIndex={-1}` per Decision 8A in `shared/components/src/LogPanel/__tests__/LogActionBar.test.tsx`
- [x] T014 [P][test] Update `formatDuration.test.ts` to assert `"1.0s"` (not `"1s"`) for whole seconds; add new `formatTimestamp.test.ts` asserting UTC output with `HH:MM:SS UTC` suffix and stable output across timezones in `shared/components/src/LogPanel/__tests__/formatDuration.test.ts` and `shared/components/src/LogPanel/__tests__/formatTimestamp.test.ts`

---

## Phase C: Storybook + E2E

- [x] T015 Add focused Storybook stories: `AllCategories` (5 categories + neutral fallback side-by-side), `AllChipTypes` (each of 5 chip types + plain-text fallback + non-default markers + "+N more" truncation), `EdgeCases` (snapshot entry + no-params entry + missing duration + multi-track wrap), `DisabledCard` in `shared/components/src/LogPanel/LogPanel.stories.tsx`
- [x] T016 Convert `tests/e2e/test-log-panel.spec.ts` from `test.describe.skip(...)` to `test.describe.fixme(...)` with explicit reference to issue #143 in the comment per Decision 9A in `tests/e2e/test-log-panel.spec.ts`
- [x] T017 [test] Create component Playwright E2E for rich-card render + 4-tab cycling + card selection in light + vscode theme variants; use `run-playwright.mjs` (bundled `@sparticuz/chromium`) per `docs/project_notes/playwright-installation-research.md` in `shared/components/e2e/LogPanel.spec.ts`

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — the `shared/components/e2e/` directory does not exist yet; T017 creates it. Run via `pnpm --filter @debrief/components test:e2e` (add the script to `shared/components/package.json` if missing).

---

## Phase D: Evidence + Media + PR

- [x] T018 Capture test results using the template (`.specify/templates/evidence/test-summary-template.md`) with YAML front matter (`feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`) in `specs/176-log-panel-ux/evidence/test-summary.md`
- [x] T019 [P] Capture light/dark/vscode theme screenshots + edge-cases + disabled-state + interaction GIF (< 5s, < 2MB) per quality rubric in `specs/176-log-panel-ux/evidence/screenshots/`
- [x] T020 [P] Create usage demonstration showing host integration + sample timeline + expected rendering in `specs/176-log-panel-ux/evidence/usage-example.md`
- [x] T021 [P] Create shipped blog post and LinkedIn summary via Content Specialist agent in `specs/176-log-panel-ux/media/shipped-post.md` and `specs/176-log-panel-ux/media/linkedin-shipped.md`
- [x] T022 Create PR and publish blog: run `/speckit.pr` — Feature PR: https://github.com/debrief/debrief-future/pull/480

**T022 must run last.** It depends on T018–T021 being complete and opens both the feature PR in `debrief/debrief-future` and the blog PR in `debrief.github.io`.

---

## Dependencies

### Task Order

- **T001 must land first** — renames `isDefault` → `isNonDefault` and breaks every other file that constructs or consumes `ParamChipData`.
- **T002, T003, T004, T005** are independent of T001 *in principle* but by convention run after to keep typecheck green between commits.
- **T006** depends on T001 (`isNonDefault` semantics) and T002 (aria-label string).
- **T007** depends on T006 (chip rendering structure) to avoid re-editing `LogEntry.tsx` twice.
- **T008** is independent of the LogEntry edits; can run in parallel with T006/T007.
- **Phase B tests (T009–T014)** should be written *before or during* their corresponding implementation tasks — red before green per Article VII.
- **T015** Storybook stories depend on T006/T007/T008 being merged so the stories render correctly.
- **T016** (`.skip` → `.fixme`) is independent; can run any time.
- **T017** Playwright E2E depends on T015 (stories to drive against).
- **Phase D (T018–T022)** gates on Phase A/B/C being complete.

### Parallel Opportunities

- T002, T003, T004, T005 can run in parallel (separate concerns in separate regions of separate files).
- T008 can run in parallel with T006/T007 (`LogActionBar` vs `LogEntry`).
- All Phase B tests (T009–T014) are independent test files — fully parallel.
- T019 (screenshots), T020 (usage example), T021 (media) are all `[P]`.

---

## Implementation Strategy

### Incremental Delivery

1. **Land T001** — atomic polarity rename, CI green. This is the widest-reach change; do it first so subsequent commits are simpler.
2. **Land T002–T005** — small bug fixes + i18n wiring + type consolidation. Each can be its own commit.
3. **Land T006–T007** — chip rendering + placeholders + aria attributes on `LogEntry.tsx`. Drive with test T009/T010.
4. **Land T008** in parallel — ARIA keyboard nav on `LogActionBar.tsx`. Drive with test T013.
5. **Land T009–T014** tests alongside their implementations (red before green).
6. **Land T015** Storybook stories — now implementation is stable.
7. **Land T016–T017** E2E — convert the skip, add the new component spec.
8. **Phase D** — capture evidence, media, and open PRs.

### Why This Is Safer Than the Original 88-Task Plan

- Zero duplication of existing files.
- No rewrite of already-green `ParameterChip`, `ToolCategoryIcon`, `TrackBadge`, or `paramTypeInference`.
- Every change is either a narrow bug fix or a missing test — the riskiest change (T001 polarity rename) is caught by `tsc` before merge.
- Preserves every existing test that passes today.

---

## Notes

- `[P]` = different files, no dependencies.
- `[test]` = test task that must FAIL before its implementation lands.
- Run `task verify` (or the 4-step fallback in `CLAUDE.md` "Before Pushing") before every push.
- T022 (`/speckit.pr`) MUST be the final task — it depends on all evidence + media being in place.
