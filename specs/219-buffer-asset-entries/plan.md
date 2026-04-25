# Implementation Plan: Buffer Scene-Thumbnail Asset Entries Until Save

**Branch**: `219-buffer-asset-entries` (cloud-session branch: `claude/speckit-specify-219-r7BCW`) | **Date**: 2026-04-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/219-buffer-asset-entries/spec.md`

## Summary

Restore the in-memory-session-vs-persisted-plot boundary that #216 currently violates: today every Scene capture rewrites `item.json` to register a `scene-thumbnail-{id}` (and `-sm`) asset entry, even though the rest of the editor flushes plot mutations only at save time. The fix is narrow because Scene thumbnails are rendered by file-path convention (`{stacItemPath}/scene-thumbnails/scene-{id}.png`) — `item.json.assets` is consumed only by the orphan-asset GC pass, not by any rendering surface. So we keep the PNG write eager (consumers keep working with no awareness of buffering) and defer purely the item.json asset-entry merge into a per-plot in-memory buffer that flushes through the existing save-time `item.json` rewrite in `saveSession.ts`.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node 20.x runtime via VS Code extension host
**Primary Dependencies**: VS Code Extension API (^1.85.0), existing modules — `sceneThumbnailService`, `storyboardEditService`, `sessionManager`, `MapPanel`, `saveSession` command. **No new runtime dependencies.**
**Storage**: Local filesystem — STAC item directory (`{stacItemPath}/item.json`, `{stacItemPath}/scene-thumbnails/*.png`). In-memory `Map<stacItemPath, Map<assetKey, PendingAssetEntry>>` for the buffer.
**Testing**: vitest (unit) — `apps/vscode/tests/unit/sceneThumbnailService.test.ts`, `captureScene.test.ts` (migrate); add `sceneThumbnailBuffer.test.ts` and extend `saveSession.test.ts`.
**Target Platform**: VS Code extension (`apps/vscode/`), runs in extension host on Linux/macOS/Windows.
**Project Type**: Single project — existing monorepo, change is contained to `apps/vscode/src/{services,commands,extension.ts}`.
**Performance Goals**: Capture path drops one synchronous `item.json` read + atomic write (~5–10ms saved). Save path adds one merge step over the buffer (negligible — ≤ 100 entries typical, single rewrite).
**Constraints**: Atomic save-time `item.json` rewrite (existing `writeAtomic` helper preserved). No new orphan-asset class (existing `gcOrphanAssets` continues to be the sole GC mechanism). Multi-plot isolation. Must not regress existing `Captures, Storyboard edits, save flow, GC` tests.
**Scale/Scope**: Typical session has ≤ 50 captured Scenes per plot, ≤ 5 open plots, single user. Buffer memory footprint bounded by the asset-entry metadata (≈ 200 bytes × N entries) — irrelevant.

## Constitution Check

*Re-evaluated post-Phase-1; result unchanged.*

| Article | Status | Notes |
|---------|--------|-------|
| I. Defence-Grade Reliability | PASS | Offline-only by construction; no network. No silent failures — buffer-flush failures surface through the existing save error path. Reproducible. |
| II. Schema Integrity | N/A | No LinkML schema changes. `Scene.thumbnail_asset_ref` stays an opaque string ref; `item.json` shape unchanged. |
| III. Data Sovereignty | PASS — net win | Provenance preserved (storyboard activity log untouched). Source preservation is *strengthened*: `item.json` is now untouched until save, matching how `features.geojson` is treated. Data stays local. |
| IV. Architectural Boundaries | PASS — net win | Restores the boundary this feature exists to fix. Service still returns data only (asset key); no UI coupling. Frontends still don't persist directly. |
| V. Extensibility | N/A | Internal refactor; no extension surface change. |
| VI. Testing | PASS | Buffer service gets its own unit suite; existing capture/save/GC suites migrated, not weakened. |
| VII. Test-Driven AI Collaboration | PASS | Spec acceptance scenarios are executable; quickstart spells out the verification recipe. |
| VIII. Documentation | PASS | This plan, spec, research, data-model, contracts, quickstart. ADR-worthy paragraph captured below in §"Decisions of Note". |
| IX. Dependencies | PASS | Zero new dependencies. |
| X. Security | N/A | No new attack surface. |
| XI. Internationalisation | N/A | No user-facing strings. |
| XII. Community Engagement | N/A | Internal architectural cleanup. |
| XIII. Contribution Standards | PASS | Atomic commits planned per task; PR review required. |
| XIV. Pre-Release Freedom | PASS | Pre-v4.0.0 — internal contract changes are permitted. |
| XV. Strict Type Safety | PASS | All new code typed; no `any`. The buffer entry type is a narrow concrete interface. |

**Gate result**: PASS. No complexity violations to track.

### Decisions of Note (ADR-flavour, captured here rather than a separate doc)

1. **PNGs stay eager; only `item.json` registration is deferred.** Justified by the consumer model — the Storyboard panel resolves thumbnails by path convention and never consults `item.json.assets`. Eager PNG writes therefore have no consumer-visible cost, and they keep the panel rendering immediately on capture without any buffer-aware code path. Discarded captures become orphan PNGs and are reclaimed by the existing `gcOrphanAssets` pass — the same mechanism that already handles partial-failure orphans today.
2. **Save-time merge piggybacks on the existing `item.json` rewrite in `saveSession.ts`.** Today the save path already reads `item.json`, sets the plot-level `thumbnail` / `thumbnail-sm` keys, and rewrites atomically. Folding the buffer-flush into that same rewrite keeps the save path to a single `item.json` write per save (preserving SC-002).
3. **Buffer flush filters by live `thumbnail_asset_ref` references.** At save time we only commit buffered entries whose Scene still exists in the in-memory plot. This makes undo/scene-delete handling implicit — no plumbing required into the storyboardEdit undo path. (Effectively: `gcOrphanAssets`-style logic, applied to the buffer rather than to `item.json`.)
4. **Buffer keyed by `stacItemPath`, owned by a singleton service.** Matches the existing `sceneThumbnailService` API (which already takes `stacItemPath`) and avoids coupling to `documentUri` parsing. The singleton lifecycle is the extension activation lifetime; per-plot entries are cleared on plot close and on save success.

## Project Structure

### Documentation (this feature)

```text
specs/219-buffer-asset-entries/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── scene-thumbnail-buffer.md  # Phase 1 output — buffer service & refactored sceneThumbnailService API
├── checklists/
│   └── requirements.md  # Spec quality checklist (already filled in /speckit.specify)
└── evidence/
    └── opening-context.md  # Phase 2 output — cached opener for the eventual feature post
```

### Source Code (repository root)

```text
apps/vscode/
├── src/
│   ├── services/
│   │   ├── sceneThumbnailService.ts           # MODIFIED — split write into PNG-only + return entry descriptors
│   │   ├── sceneThumbnailBuffer.ts            # NEW — per-plot in-memory buffer of pending asset entries
│   │   └── sceneThumbnailError.ts             # UNCHANGED — existing error taxonomy preserved
│   ├── commands/
│   │   ├── captureScene.ts                    # MODIFIED — captures enqueue into buffer, do not rewrite item.json
│   │   └── saveSession.ts                     # MODIFIED — flush buffer through the existing item.json rewrite
│   └── extension.ts                           # MODIFIED — instantiate buffer singleton, wire into captureThumbnail port and saveSession factory
└── tests/
    └── unit/
        ├── sceneThumbnailBuffer.test.ts       # NEW — buffer add/remove/flush/clear semantics
        ├── sceneThumbnailService.test.ts      # MIGRATED — assertions move from "item.json rewritten" to "PNGs written; entries returned"
        ├── captureScene.test.ts               # MIGRATED — assert capture enqueues into buffer, item.json untouched
        └── saveSession.test.ts                # EXTENDED — assert buffer flushes into item.json on save; preserved on save failure
```

**Structure Decision**: Single project (existing monorepo). All changes live inside `apps/vscode/`. No shared package, schema, or service surface is touched. The new buffer service is a peer of `sceneThumbnailService` rather than a method on it, because (a) it has independent lifecycle (singleton, state), (b) its tests benefit from being able to construct it without filesystem deps, and (c) it is consumed by both the capture path and the save path — co-locating with either side would force the other to import across an unnatural seam.

## Media Components

None — backend/infrastructure feature. No new visual components, no Storybook stories, no user-facing UI. The Storyboard panel and any other thumbnail consumer continue to render via the existing path-based resolver, with zero awareness of the buffering change.

## Storybook E2E Testing

None — no interactive UI components.

## Web-Shell E2E Testing

None — no extension workflow change is observable to the user. The behavioural change is bounded by the persistence boundary (when does `item.json` get written), which is verified at the unit level. Existing capture/save end-to-end coverage already exercises the user-visible flow; those tests will be updated in-place where they make on-disk assertions about `item.json`.

## Complexity Tracking

No constitutional violations. No complexity to justify.
