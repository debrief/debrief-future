# E2E Test Restoration Requirements

> **STATUS: COMPLETE** — All skipped tests have been restored and 10 new spec
> files added. The VS Code E2E suite now covers 18 spec files matching
> web-shell's 13 categories. This document is retained for historical context.

## Completed Work

### Phase 7: Restoration (Complete)

Four previously-skipped spec files have been restored with active assertions:

| File | Tests | Status |
|------|-------|--------|
| `test-load-display.spec.ts` | T014–T017 | Restored — assertions active |
| `test-analysis-tool.spec.ts` | T018–T021 | Restored — assertions active |
| `test-error-feedback.spec.ts` | T022–T024 | Restored — assertions active |
| `test-tune-prov.spec.ts` | Tune/Prov | Restored — assertions active |

### Phase 8: Expansion (Complete)

Ten new spec files created to match web-shell categories:

| File | Category | Active/Fixme |
|------|----------|-------------|
| `test-selection-sync.spec.ts` | Selection sync | 5 active |
| `test-time-controller.spec.ts` | Time controller | All fixme |
| `test-drawing.spec.ts` | Drawing tools | All fixme |
| `test-catalog-browse.spec.ts` | Catalog browse | 2 active, 1 fixme |
| `test-log-panel.spec.ts` | Log panel | All fixme |
| `test-log-edit-face.spec.ts` | Log edit face | All fixme |
| `test-event-log-propagation.spec.ts` | Event propagation | All fixme |
| `test-styling-tools.spec.ts` | Styling tools | All fixme |
| `test-undo-redo-split.spec.ts` | Undo/redo/split | All fixme |
| `test-capture-log-evidence.spec.ts` | Log evidence | All fixme |

Tests marked `fixme` use `test.fixme()` with backlog cross-references per
FR-011 strategy — they appear in reports as "to be implemented" rather than
being silently skipped.

### Page Object Updates

`DebriefWebview` page object extended with selectors for:
- Selection sync (feature list, rows, selected state)
- Time controller (scrubber, play/pause, display mode)
- Drawing tools (trigger, palette, shapes)
- Tools panel (items, active/inactive, context menu)
- Edit face / flip card (edit icons, params, done button)
- GoldenLayout tabs (activity panel, tab switching)

---

## Infrastructure (Unchanged)

| Component | Status | Location |
|-----------|--------|----------|
| Chromium download from GH release | Working | `tests/e2e/scripts/ensure-chromium.sh` |
| Playwright config with sandbox flags | Working | `tests/e2e/playwright.config.ts` |
| openvscode-server auto-start | Working | `tests/e2e/global-setup.ts` |
| Welcome tab workaround | Working | `tests/e2e/models/code-server-page.ts` |
| CodeServerPage page object | Working | `tests/e2e/models/code-server-page.ts` |
| DebriefWebview page object | Complete | `tests/e2e/models/debrief-webview.ts` |
| Test fixtures | Working | `tests/e2e/fixtures/base.ts` |
| Docker image | Working | `docker/code-server/Dockerfile` |
| CI workflow | Working | `.github/workflows/e2e.yml` |

## Key Design Decisions

- **Structural assertions**: "at least one track exists" not "exactly 3 tracks"
- **test.fixme() over .skip()**: Makes gaps visible in reports
- **Real Python services**: No mocks — debrief-io, debrief-stac, debrief-calc
  parse real REP files for true end-to-end fidelity
- **Dual-platform strategy**: Web-shell tests (fast, mocked) + VS Code E2E
  (slower, real services) run in parallel CI jobs
