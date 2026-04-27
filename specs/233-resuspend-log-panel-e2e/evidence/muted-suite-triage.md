---
git_sha: 561ff0c
captured_at: 2026-04-27
feature: 233-resuspend-log-panel-e2e
fulfils: FR-007
---

# Muted E2E Suite Triage (post-#142, pre-#143)

**Purpose**: Single artefact catalogue of every `tests/e2e/*.spec.ts` file currently muted at the `describe` level, captured at the moment #142 (Patch 3 — visibility-gate removal) lands and the log-panel suite returns to coverage. The catalogue exists so future un-mute work on #143 can plan the next wave from one place rather than re-discovering the inventory.

**Scope**: `describe`-level mutes only (`test.describe.skip(...)` and `test.describe.fixme(...)`). Per-test `test.skip(...)` / `test.fixme(...)` inside otherwise-active suites are not catalogued here — they belong to their own suite's evidence.

**Not in scope for this PR**: un-muting any suite in this table. All sixteen are blocked on **#143** (a different webview-iframe failure mode from the visibility-gate fix Patch 3 delivered for #142). They MUST stay muted until #143 ships its own fix and a per-suite un-mute spec — modelled on this one (#233) — is authored for each.

## Triage table

| # | Spec file | Mute flavour | Blocker | Patch-3 affects? | Scope (one-line) |
|---|-----------|--------------|---------|------------------|------------------|
| 1 | `test-analysis-tool.spec.ts` | `describe.skip` | #143 | No (also requires `debrief-calc` not installed in E2E env — independent gate) | US2 — analysis tool execution workflow |
| 2 | `test-capture-log-evidence.spec.ts` | `describe.skip` | #143 | No (iframe-render path, not visibility-gate) | Capture log-evidence screenshots |
| 3 | `test-catalog-browse.spec.ts` | `describe.skip` | #143 | No | STAC catalog browse panel |
| 4 | `test-drawing.spec.ts` | `describe.skip` (+ inner `test.fixme` on Geoman load) | #143 | No (also Geoman lib not yet validated in E2E — separate gate) | Drawing tools (Geoman) |
| 5 | `test-event-log-propagation.spec.ts` | `describe.skip` | #143 | No | Event-log propagation across panels |
| 6 | `test-load-display.spec.ts` | `describe.skip` | #143 | No | US1 — load-and-display workflow |
| 7 | `test-log-edit-face.spec.ts` | `describe.skip` | #143 | No | Log entry edit-face form |
| 8 | `test-real-webview.spec.ts` | `describe.skip` | #143 | **Spot-check candidate** — operator should confirm this stays muted; closest in scope to log-panel | Real webview screenshot |
| 9 | `test-selection-sync.spec.ts` | `describe.skip` | #143 | No | Selection sync between map/timeline/list |
| 10 | `test-storyboard-capture.spec.ts` | `describe.skip` | #143 | No | Storyboard US1 — capture flow |
| 11 | `test-storyboard-playback.spec.ts` | `describe.skip` | #143 | No | Storyboard US1 — playback flow |
| 12 | `test-styling-tools.spec.ts` | `describe.skip` | #143 | No | Feature styling tools |
| 13 | `test-time-controller.spec.ts` | `describe.skip` | #143 | No | Time controller scrubber |
| 14 | `test-tune-prov.spec.ts` | `describe.skip` | #143 | No | US-Tune — PROV tuning workflow |
| 15 | `test-undo-redo-split.spec.ts` | `describe.skip` | #143 | No | Undo/redo with feature split |
| 16 | `test-vscode-nl-search.spec.ts` | `describe.skip` (×2 — separate `describe`s) | T054/T086 (harness) + #198 (keyring) | No | NL search in VS Code Catalog |

## Spot-check (FR-007 sub-requirement)

The operator MUST run `test-real-webview.spec.ts` once locally with the un-muted log-panel branch active, *without un-muting it*, just to confirm the failure mode is still iframe-render (not the visibility-gate Patch 3 fixed). Expected:

```sh
# Sanity-check: should still fail with #143 symptom, NOT #142 symptom
npx playwright test --config tests/e2e/playwright.config.ts test-real-webview --reporter=list
# Expected: tests are skipped (because describe.skip), exit 0 — that's the no-op assertion.
# To actually trigger the failure, temporarily flip skip→only on one test (do NOT commit):
#   test.only('...', async () => { ... });
# Run again and capture the failure mode in evidence/. Revert before commit.
```

If the failure mode matches `Webview frame ... not found after 15000ms` (the #142 symptom), reopen #142 — Patch 3 was incomplete. If it matches a different webview-iframe error (e.g. iframe `src` never set, content-render race), it's #143 territory and the suite stays muted.

## Companion: probe disposal

`tests/e2e/test-webview-probe.spec.ts` is NOT in the table above because its mute flavour is per-test `test.fixme` (inside an otherwise-active `describe`), and its disposition is *delete*, not *un-mute*. Tracked separately under FR-006.

## What this catalogue does NOT do

- Does not propose un-muting any of the sixteen suites.
- Does not propose a triage of per-test `test.fixme` calls inside otherwise-active suites — those belong to their owning suite's spec.
- Does not predict whether #143 will be one fix or many — the catalogue is purely descriptive of the current muted state.

## Update protocol

When a future un-mute spec lands for any row in this table, the row should be deleted from this catalogue and a one-line entry added to a "Resolved" section at the bottom (with a link to the un-mute spec). When the catalogue reaches zero remaining rows, the file itself can be deleted with a final commit closing #143's last un-mute spec.

## Resolved (un-muted since this catalogue was authored)

*None yet.*
