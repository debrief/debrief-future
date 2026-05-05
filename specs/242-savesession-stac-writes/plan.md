# Implementation Plan: saveSession Thumbnail Writes — STAC Service Migration

**Branch**: `242-savesession-stac-writes` | **Date**: 2026-05-05 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/242-savesession-stac-writes/spec.md`

## Summary

Remove the `plotThumbnailWriter.ts` shim from the VS Code extension — a bypass of the `StacWriter` unified persistence boundary introduced as a half-step in Spec 241 — and route all plot thumbnail asset writes through the `StacWriter` interface by adding a `writePlotThumbnailPair()` method. The extension command (`saveSession.ts`) is updated to call the interface method; both host adaptors (`stacWriterFs` for VS Code, `stacWriterIdb` for web-shell) implement the contract. The shim file is deleted. Observable behaviour of "Save Session" is unchanged; catalog shape is byte-identical.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)  
**Primary Dependencies**: `@debrief/stac-writer` (writer interface/types), Node.js `node:crypto` + `node:fs/promises` (stacWriterFs adaptor)  
**Storage**: Local STAC catalog (JSON + PNG files at `STAC_STORE_PATH`)  
**Testing**: Vitest (unit), existing golden-fixture suite  
**Target Platform**: VS Code extension host (Node.js 20.x) + web-shell (browser — stub only)  
**Performance Goals**: Save session wall-clock time unchanged (sub-second thumbnail write is already the baseline)  
**Constraints**: No new npm dependencies; strict TypeScript; no `any`; atomic file writes  
**Scale/Scope**: Single command (`saveSession.ts`) + three file edits + one deletion + one new interface method

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Clause | Assessment |
|---------|--------|------------|
| IV.1 | Frontends never persist | **This feature enforces it** — moves thumbnail write out of `saveSession.ts` (frontend) into `stacWriterFs.ts` (service adaptor) |
| IV.2 | Frontends orchestrate calls to services | `saveSession.ts` will call `writer.writePlotThumbnailPair()` — pure orchestration ✓ |
| IV.4 | Persistence-host abstraction | New method added to `StacWriter` interface; both hosts implement it; no divergent write code path ✓ |
| VI.2 | Services require unit tests | New `stacWriterFs.writePlotThumbnailPair.test.ts` + `stacWriterIdb.writePlotThumbnailPair.test.ts` ✓ |
| IX.1 | Minimal, vetted dependencies | No new dependencies ✓ |
| XV.1–6 | Strict type safety | TypeScript strict mode; no `any`; explicit types on all new signatures ✓ |
| VIII.1 | Specs before code | This plan precedes implementation ✓ |

**Post-design re-check**: All gates pass. No violations or complexity tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/242-savesession-stac-writes/
├── plan.md              # This file
├── research.md          # Design decisions and architecture findings
├── data-model.md        # Entity model and interface contracts
├── quickstart.md        # Step-by-step implementation guide
├── contracts/
│   └── stac-writer-plot-thumbnail.ts  # Normative TypeScript contract
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # /speckit.tasks output (not yet created)
```

### Source Code (repository root)

This feature touches the existing monorepo layout without adding new packages:

```text
shared/
└── stac-writer/
    └── src/
        └── interface.ts        ← ADD WritePlotThumbnailPairInput/Result + method

apps/
├── vscode/
│   └── src/
│       ├── commands/
│       │   └── saveSession.ts  ← UPDATE (inject StacWriter, replace shim call)
│       └── services/
│           ├── stacWriterFs.ts ← UPDATE (implement writePlotThumbnailPair)
│           └── plotThumbnailWriter.ts  ← DELETE
└── web-shell/
    └── src/
        └── services/
            └── stacWriterIdb.ts ← UPDATE (stub writePlotThumbnailPair)

# Tests
apps/vscode/tests/unit/
├── stacWriterFs.writePlotThumbnailPair.test.ts  ← NEW
└── saveSession.storeFeatureCollection.test.ts    ← UPDATE

apps/web-shell/src/services/__tests__/
└── stacWriterIdb.writePlotThumbnailPair.test.ts ← NEW
```

**Structure Decision**: Single-project monorepo. Changes span `shared/stac-writer` (interface) and `apps/vscode` + `apps/web-shell` (adaptors). No new workspace packages.

## Implementation Phases

### Phase 1 — Interface Extension

**Deliverable**: `WritePlotThumbnailPairInput`, `WritePlotThumbnailPairResult` added to `shared/stac-writer/src/interface.ts`; `writePlotThumbnailPair()` added to `StacWriter`.

**Key decisions** (from research.md §3–4):
- New method is distinct from `writeSceneThumbnailPair` (no `sceneId`; fixed asset keys `thumbnail` / `overview`)
- Input mirrors the existing base64 convention already in the call chain
- `ctx.kind === 'idb'` implementations throw `StacWriterError('validation-failed')` — not a silent no-op

**Acceptance**: `pnpm --filter @debrief/stac-writer typecheck` passes.

---

### Phase 2 — VS Code Adaptor Implementation

**Deliverable**: `stacWriterFs.ts:writePlotThumbnailPair()` implemented with the logic moved verbatim from `plotThumbnailWriter.ts`.

**Key logic** (identical to shim, per research.md §8):
1. `pathGuard('writePlotThumbnailPair.stacItemPath', input.stacItemPath)`
2. Decode base64 → `Buffer`; throw `'empty-png'` if zero-length
3. Write `thumbnail.png` (small) + `overview.png` (large) atomically
4. Read `item.json`; drop `thumbnail-sm` key; update `thumbnail` + `overview` asset entries with spec-241 shape
5. Update `properties.updated`; write `item.json`
6. Return `{ thumbnailPath, overviewPath }`

**Multihash**: reuse existing `multihashSha256` helper already present in `stacWriterFs.ts`.

**Acceptance**: `pnpm --filter @debrief/vscode test` passes (new unit test + existing tests).

---

### Phase 3 — Web-Shell Adaptor Stub

**Deliverable**: `stacWriterIdb.ts:writePlotThumbnailPair()` throws `StacWriterError('validation-failed', 'not supported in web-shell')`.

**Acceptance**: `pnpm --filter @debrief/web-shell test` passes (new unit test asserting the throw).

---

### Phase 4 — saveSession.ts Migration

**Deliverable**: `saveSession.ts` calls `writer.writePlotThumbnailPair()` instead of `writePlotThumbnails()`. `plotThumbnailWriter.ts` deleted.

**Injection pattern**: `createSaveSessionCommand()` receives `stacWriter: StacWriter` alongside existing params. The extension activation code (which already constructs `stacWriterFs`) passes it in.

**Error handling**: `StacWriterError` caught → `vscode.window.showErrorMessage()` with the error message (same pattern as other writer-call failures in the extension).

**Acceptance**:
- `pnpm -r typecheck` passes
- `grep -r 'plotThumbnailWriter' apps/` returns no matches
- Updated `saveSession.storeFeatureCollection.test.ts` passes

---

### Phase 5 — CI Gate

**Deliverable**: `task verify` passes end-to-end.

**Checked**:
- `ruff check .` (Python — no Python changes, but lint must stay green)
- `pnpm lint` (TypeScript ESLint)
- `pnpm -r typecheck` (tsc --noEmit)
- `pnpm --filter '!@debrief/web-shell' test` (Vitest unit)
- Existing golden-fixture suite (unchanged)

## Media Components

None — backend/infrastructure feature. No visual components added or modified.

## Storybook E2E Testing

None — no interactive UI components.

## Web-Shell E2E Testing

None — no extension workflow changes visible in the web-shell. The web-shell `stacWriterIdb` stub is exercised only by the unit test added in Phase 3.

## Complexity Tracking

No constitution violations. No entries required.
