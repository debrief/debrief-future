---
feature: "273-storyboard-preview-button"
captured_at: "2026-05-28T20:35:00Z"
git_sha: "dbb91cf"
tests_passed: 173
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

> **Continuation update (2026-05-28).** While capturing live-preview evidence,
> the preview map came up empty — root-caused to a latent identity defect
> (ADR-035): capture read the non-existent `properties.id` on data features, so
> tracks were dropped from `visible_feature_ids` and the briefing rendered no
> vessels. Fixed by routing identity through `getPlotFeatureId` (top-level
> GeoJSON `id`) at all five collection/resolution sites, plus a lint ban on
> inline-object casts. The web-shell preview workflow E2E (T038/T039) now exists
> and **passes**, producing the real playback screenshots. See the
> "Continuation" section at the foot of this file.

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
- **Web-shell preview Playwright workflow (T038/T039)** — ✅ **done** (2026-05-28).
  `apps/web-shell/playwright/tests/storyboard-preview.spec.ts` drives the real
  flow end-to-end and passes; see the Continuation section.
- **Storybook E2E pre-existing failures** — 6 unrelated `Empty` / `WithOneScene`
  assertions fail in the cloud Storybook run (e.g. a `role="listitem"`
  expectation on `SceneRow`, which #273 did not touch). All #273 Preview tests
  pass and all four evidence screenshots were captured.

## Continuation (2026-05-28) — ADR-035 fix + real preview workflow E2E

### Canonical-identity regression (ADR-035)

| Area | Status |
|------|--------|
| `getPlotFeatureId` reads the top-level `id`; ignores `properties.id` even when both exist; coerces numeric id; returns undefined for empty/missing (`shared/components/.../featureId.test.ts`, 5 tests) | Pass |
| `@debrief/components` full suite after the change (2165 tests) | Pass |
| `debrief-vscode` full suite after the change (808 tests; the slow briefing-zip happy-path test had its timeout raised from the 5 s default to de-flake under full-suite load) | Pass |

The fix routes identity through `getPlotFeatureId` at all five sites: VS Code +
web-shell capture, web-shell update-to-current, the extension host-deps
collector, and the missing-data resolver (`collectResolvableFeatureIds`).

### Web-shell live-preview workflow E2E (T038 / T039) — Playwright, passes

`apps/web-shell/playwright/tests/storyboard-preview.spec.ts` (cloud Chromium):

| Step | Status |
|------|--------|
| Open *Saxon Warrior — Twin CPA* (two tracks) via quick-search + double-click | Pass |
| Capture four Scenes at progressively tighter framings + advancing time | Pass |
| Click **Preview** → new tab opens at `/briefing-renderer/?features=blob%3A…` | Pass |
| Renderer reaches `ready`, transport reads `1 / 4`, OSM basemap paints | Pass |
| **ADR-035 guard:** every captured Scene references both tracks (`visible_feature_ids ≥ 2`) | Pass |
| **ADR-035 guard:** renderer draws the vessel-track SVG paths (preview not empty) | Pass |
| Step transport through all four Scenes; `P` enters Present mode (chrome hidden) | Pass |

Screenshots written to `evidence/screenshots/` (also mirrored to `media/images/`):
`preview-trigger-webshell.png` (the authoring surface + Preview button),
`preview-playback-webshell.png` (headline), `preview-scene-{1-overview,2-approach,3-convergence,4-closing}.png`,
`preview-present-mode.png`.

> Note: the cloud test env routes egress through a TLS-intercepting proxy whose
> CA the bundled Chromium doesn't trust, so the spec uses a context with
> `ignoreHTTPSErrors: true` purely so the OSM basemap paints for the
> screenshots. Real users reach OSM directly; no product code is affected.

## Environment

- Runners: vitest (renderer / export / components / vscode / web-shell), Playwright (`@sparticuz/chromium` bundled Chromium, cloud session).
- Branch: `claude/speckit-implement-273-t2ska`
