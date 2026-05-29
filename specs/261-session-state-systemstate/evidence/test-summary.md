---
feature: "261-session-state-systemstate"
captured_at: "2026-05-28T20:27:33Z"
git_sha: "63cfbb6"
tests_passed: 2620
tests_failed: 0
tests_skipped: 1
coverage_pct: null
---

# Test Summary: Retire the sidecar — all plot state in the FeatureCollection

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 2621 (2620 pass, 1 skip, 1 xfail) |
| Passed | 2620 |
| Failed | 0 |
| Skipped | 1 |
| Coverage | n/a (suite-level) |

Aggregated across the four suites this feature touches:

| Suite | Command | Pass |
|-------|---------|------|
| Schema adherence (Python) | `uv run pytest` (shared/schemas) | 1071 |
| session-state (Vitest) | `pnpm --filter @debrief/session-state test` | 696 |
| VS Code extension (Vitest) | `pnpm --filter debrief-vscode test` | 845 |
| Web-shell E2E (Playwright) | `node run-playwright.mjs system-state-roundtrip` | 4 (+2 #237 regression) |

## Test Breakdown

### Schema (Article II.2 — gate before runtime, SC-005/SC-008)

| Test | Status |
|------|--------|
| Pydantic adherence: 4 SystemState variants parse + round-trip; `visible:false` feature | Pass |
| Invalid fixtures rejected by Pydantic (non-string id, unknown state_type, missing discriminator) | Pass |
| Rules-based invalid (`spatial` missing `viewport`) rejected by generated JSON Schema if/then | Pass |
| Cross-language Py→JSON→TS→JSON→Py round-trip, all variants + visibility | Pass |
| Enum-parity (DisplayModeEnum/PlaybackStateEnum/TimeUnitEnum) repointed to common.yaml | Pass |

### Shared helper (services/session-state/src/system-state — 42 unit tests)

| Test | Status |
|------|--------|
| `read.ts` — every `SystemStateLoadError.kind` branch; empty FC ⇒ `{}`; no input mutation | Pass |
| `write.ts` — upsert by `state.<type>`; ≤1 per state_type; **no provenance** (FR-013); no mutation | Pass |
| `validate.ts` — per-variant Zod accept/reject; temporal cross-field invariants fire | Pass |
| `visibility.ts` — absent⇒visible; hidden round-trip; reveal clears flag; pure | Pass |
| `mapping.ts` — epoch↔ISO bit-equality; FeatureSelection split; null/empty ⇒ omit | Pass |
| `active-storyboard` — helper writes #237 wire shape verbatim (NG-002) | Pass |
| dirty-tracking contract — view-state actions leave dirty=false (FR-019); markDirty sets it (FR-021) | Pass |

### Hosts

| Test | Status |
|------|--------|
| VS Code `systemStateBridge` — hydrate-to-defaults, save yields 3 state.* features, active_storyboard pass-through, round-trip, strict-on-import throws (T057/T070) | Pass |
| Web-shell E2E — view-state mirrored into FC + restored in a fresh store from the file alone (US1) | Pass |
| Web-shell E2E — per-feature visibility rides in FC and round-trips (US3) | Pass |
| Web-shell E2E — strict-on-import error banner names the offending feature id (FR-012) | Pass |
| Web-shell E2E — single self-describing FeatureCollection, no sidecar (SC-002) | Pass |
| #237 active-storyboard persistence spec — unchanged behaviour (NG-002, T058) | Pass |

## Key Scenarios Verified

- **Self-describing round-trip (US1, SC-001):** save a recognisable viewport + time window + playhead + selection, transfer ONLY `features.geojson` into a fresh store, and all are restored — proven end-to-end in the browser (`roundtrip-host-b.png`: title `transferred/plot.geojson`, playhead `09:30:00`, selection `track-hms-defender`).
- **Sidecar gone (US2, SC-002):** the package sidecar I/O is deleted; a repo grep finds no runtime read/write code; the sample catalog item dirs are exactly `item.json` + `features.geojson` (+ thumbnails).
- **Visibility as a feature property (US3, SC-004):** hidden features carry `properties.visible:false` and survive a features-only transfer.
- **Host parity via one shared writer (US4, SC-003/SC-007):** a single `@debrief/session-state` helper is the sole producer/consumer of SystemState read/write for both hosts; `active_storyboard` keeps its #237 wire shape.
- **Strict-on-import (SC-006):** malformed / duplicate-state_type / cross-field-invariant SystemState features fail load with a structured error naming the feature id — no silent fallback or clamping.

## Known Issues / Scope Notes

- **active_storyboard consolidation (tasks T052–T054):** the web-shell's interactive active-storyboard read/write deliberately continues to use the tolerant `@debrief/components` helpers (R-011) rather than the strict shared helper, because the strict helper's load reader throws on duplicate/malformed features and the web-shell calls it on every edit. The shared helper owns the unified *load-time* read of all four variants and is the single writer for the three migrated variants. No host re-implements the SystemState wire shape. Recorded as ADR.
- **Web-shell durable persistence:** the web-shell mirrors view-state into the *in-memory* FeatureCollection (FR-009a); durable IDB persistence of arbitrary plot edits remains the #250 residual (an auto-commit-trigger UX decision, explicitly out of scope per the spec's Dependencies section).
- **Interaction GIF (T105):** `screenshots/interaction.gif` — a 4-frame animated GIF (560×315, 41 KB) of the headline flow (host A view → host B restored → visibility round-trip), assembled from the captured PNG frames with a self-contained GIF89a encoder (no ffmpeg/imagemagick in the cloud env; sharp's raw-animation path is unsupported by this libvips build).
