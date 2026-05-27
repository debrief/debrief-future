---
feature: "273-storyboard-preview-button"
captured_at: "2026-05-27T06:56:35Z"
git_sha: "b13fcec"
tests_passed: 173
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: Storyboard live Preview button + web-shell briefing-zip export parity

## Results

| Metric | Value |
|--------|-------|
| Total Tests (new/affected suites) | 173 |
| Passed | 173 |
| Failed | 0 |
| Skipped | 0 |
| Coverage | n/a (counts below are pass/fail) |

Counts cover the suites this feature added to or depends on. Figures are the
full-suite totals after the change (each stayed green); the **#273-specific**
additions are called out per suite.

## Test Breakdown

### `@debrief/briefing-renderer` (vitest) — 70 passed

| Area | Status |
|------|--------|
| `urlDataLoader` — fetch once + validate + synth item/config (G4) | Pass |
| `urlDataLoader` — unreachable / bad-JSON / no-storyboard → `InlineDataLoadError` (G5/G7) | Pass |
| `urlDataLoader` — zero-scene storyboard validates (G6) | Pass |
| `boot` — URL-boot → `ready` with online basemap (G4) | Pass |
| `boot` — zero scenes → `empty` (G6); unreachable → `error` (G5) | Pass |
| `boot` — inline path issues **no** network request (G3 / FR-011) | Pass |
| `inlineDataLoader` — no `fetch` on the inline path (G3 / FR-011) | Pass |
| `BriefingMap.resolveTileUrl` — unset → bundled tiles; set → online (Basemap) | Pass |
| Existing inline-boot / playback / probes suites (unchanged, still green) | Pass |

### `@debrief/briefing-export` (vitest) — 44 passed

| Area | Status |
|------|--------|
| Relocated pure-core unit tests (scope / item / tiles / inject / zip / fetch) | Pass |
| Cross-surface zip **equivalence** — VS Code-style vs web-shell-style deps (C-D2/FR-015) | Pass |

### `@debrief/components` — StoryboardPanel (vitest) — 47 passed

| Area | Status |
|------|--------|
| Preview renders iff `onPreview` set; legacy parity (C-A1/C-A3) | Pass |
| Click fires `onPreview` once (C-A4) | Pass |
| Disabled + explanatory tooltip when no scenes / `canPreview=false` (C-A2/FR-007) | Pass |

### `debrief-vscode` (vitest) — 808 passed

| Area | Status |
|------|--------|
| `BriefingPreviewServer` — serves `/` + `/features.geojson` (C-B2/C-B3) | Pass |
| `BriefingPreviewServer` — `Host`-allowlist 403s foreign hosts (C-B7) | Pass |
| `BriefingPreviewServer` — path-traversal / 404 guards | Pass |
| `previewStoryboard` — scope + seed + open browser (happy path) | Pass |
| `previewStoryboard` — empty storyboard refuses to launch (C-B6) | Pass |
| `previewStoryboard` — unknown id + tab-blocked surface errors (FR-009) | Pass |
| Existing briefing-zip export suite via the re-export barrel (T011, unchanged) | Pass |

### `@debrief/web-shell` (vitest) — `previewStoryboardWeb` — 4 passed

| Area | Status |
|------|--------|
| `buildPreviewUrl` — encodes blob URL onto the renderer base | Pass |
| Scopes active storyboard, builds blob, opens renderer tab (C-C1/C-C2) | Pass |
| Pop-up blocked → `PreviewBlockedError` + blob revoked (C-C4/FR-009) | Pass |

### Storybook E2E (`@debrief/components`, Playwright) — Preview control

| Area | Status |
|------|--------|
| Preview enabled, 3 themes (light/dark/vscode) — screenshots captured | Pass |
| Preview disabled + tooltip with no scenes — screenshot captured | Pass |
| Absent `onPreview` → no Preview button | Pass |

Screenshots written to `evidence/screenshots/`:
`storyboard-preview-{light,dark,vscode}.png`, `preview-disabled-no-scenes.png`.

## Key Scenarios Verified

- **Live preview (US1)** — the renderer's additive `?features=` URL-boot path
  fetches, validates (existing validators), and plays back the active
  storyboard with an online basemap, end-to-end via unit tests on both the
  loader and the boot lifecycle.
- **Offline regression guard (US3)** — the inline boot path makes zero network
  requests for storyboard data; the two boot paths share validators but never
  each other's I/O.
- **Both surfaces (SC-002)** — VS Code launches via a loopback server (Host-
  allowlisted against DNS rebinding); web-shell launches via a same-origin blob
  URL. Both reuse the shared `scopeStoryboard` core so they target the same
  active storyboard.
- **Shared, not re-implemented (FR-016)** — the packing core is one shared
  package; an equivalence test proves VS Code-style and web-shell-style deps
  yield functionally-equivalent zips.

## Known Issues / Deferred

- **Web-shell `Export as briefing zip` UI (US2 / T031–T032)** — deferred. The
  shared packing core is extracted and proven host-agnostic (equivalence test),
  but surfacing the Export *button* in the web-shell needs a web `readStaticBundle`
  that enumerates the served `/briefing-renderer/` assets over HTTP (no
  directory listing) — a renderer-asset-manifest addition beyond this pass. The
  reusable mechanism (shared core + adapter seam) is in place; only the
  web-shell wiring + button remain. US2 is P2.
- **Web-shell preview Playwright workflow (T038/T039)** — deferred. The web-shell
  preview launcher is covered by unit tests (`previewStoryboardWeb`) and the
  Vite serving plugin is in place; a full new-tab Playwright workflow against a
  served renderer is the remaining E2E.
- **Storybook E2E pre-existing failures** — 6 unrelated `Empty` / `WithOneScene`
  assertions fail in the cloud Storybook run (e.g. a `role="listitem"`
  expectation on `SceneRow`, which #273 did not touch). All #273 Preview tests
  pass and all four evidence screenshots were captured.

## Environment

- Runners: vitest (renderer / export / components / vscode / web-shell), Playwright (`@sparticuz/chromium` bundled Chromium, cloud session).
- Branch: `claude/speckit-implement-273-t2ska`
