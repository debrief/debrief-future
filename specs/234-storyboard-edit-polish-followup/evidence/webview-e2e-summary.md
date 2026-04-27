# Web-Shell + Code-Server E2E Summary — Feature 234

**Captured:** 2026-04-27
**Git SHA:** 1363820

## Web-shell Playwright (apps/web-shell)

| Spec | Tests | Result | Notes |
|------|-------|--------|-------|
| `storyboard-edit.spec.ts` | 19 (12 smoke + 7 new) | ✅ all passing | Smoke from #230 + Phase 7 scenarios |
| `storyboard-edit-a11y.spec.ts` | 5 | ✅ all passing | 0 serious/critical, 0 moderate across 5 panel states (Phase 5) |
| `storyboard-edit-interaction-gif.spec.ts` | 1 | ✅ passing | interaction.gif: 1.44 MB / 3.80 s — under 1.8 MB soft / 2 MB / 5 s caps (Phase 7) |

**Total web-shell: 25 tests passing.**

## Code-server Playwright (tests/e2e)

| Spec | Tests | Result | Notes |
|------|-------|--------|-------|
| `test-storyboard-edit.spec.ts` | 14 | ⏸ `test.describe.skip` | Blocked: Issue #143 (webview iframe hierarchy in openvscode-server). Each scenario structurally complete; un-skip when #143 lands. |

**Total code-server: 14 tests scaffolded, gated on upstream blocker.**

## Screenshot index

### Phase 7 — refreshed via the new web-shell scenarios

`specs/218-storyboarding-edit/evidence/screenshots/`:

| File | Source spec | Captured by |
|------|-------------|-------------|
| `storyboard-panel-default.png` | storyboard-edit.spec.ts:48 | smoke `harness renders with fixture Scenes` |
| `storyboard-edit-form-open.png` | storyboard-edit.spec.ts:72 | smoke `chevron toggles inline edit form` |
| `storyboard-overflow-menu-open.png` | storyboard-edit.spec.ts:84 | smoke `overflow menu opens on right-click` |
| `storyboard-undo-toast.png` | storyboard-edit.spec.ts:97 | smoke `overflow menu Delete triggers undo toast` |
| `storyboard-stale-badge.png` | storyboard-edit.spec.ts:118 | smoke `stale badge renders and clears on refresh` |
| `storyboard-missing-data-remediation.png` | storyboard-edit.spec.ts:150 | smoke `missing-data harness knob renders affordance` |
| `interaction.gif` | storyboard-edit-interaction-gif.spec.ts | Phase 7 interaction recording |

### Phase 4 — pending vscode-native chrome capture

| File | Source spec | Status |
|------|-------------|--------|
| `vscode-native-chrome.png` | tests/e2e/test-storyboard-edit.spec.ts | Pending — captured during `rename scene → native input-box visible mid-flow` once #143 unblocks |

## Cloud testing path

For Claude Code cloud sessions, the canonical run path is documented at `docs/project_notes/code-server-cloud-testing.md`. Web-shell Playwright runs work today via:

```sh
cd apps/web-shell && node run-playwright.mjs <pattern>
```

Code-server Playwright runs (when un-skipped) work via:

```sh
bash tests/e2e/scripts/cloud-e2e-setup.sh
```

Both bundle Chromium via `@sparticuz/chromium` so the standard browser-CDN download (which 403s in the cloud sandbox) is bypassed.
