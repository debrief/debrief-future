# Tasks: saveSession Thumbnail Writes — STAC Service Migration

**Input**: Design documents from `specs/242-savesession-stac-writes/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓

---

## Evidence Requirements

**Evidence Directory**: `specs/242-savesession-stac-writes/evidence/`
**Media Directory**: `specs/242-savesession-stac-writes/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `test-summary.md` | Vitest unit test results (stacWriterFs + saveSession + stacWriterIdb) | After all tests pass (Phase 5) |
| `usage-example.md` | TypeScript code snippet showing `createSaveSessionCommand()` with `getStacWriter` injection | After Phase 4 complete |
| `integration-flow.md` | End-to-end flow documentation + Mermaid sequence diagram (Before/After) | After Phase 4 complete |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `evidence/opening-context.md` | Cached opener (What We're Building, How It Fits, Key Decisions) | Captured during `/speckit.plan` ✓ |
| `media/shipped-post.md` | Feature post combining cached opener + ship-time evidence | Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task |
| Blog PR | PR in debrief.github.io with post | Triggered by `/speckit.pr` |

---

## Phase 1: Interface Extension

**Goal**: Add `WritePlotThumbnailPairInput`, `WritePlotThumbnailPairResult`, and the `writePlotThumbnailPair()` method signature to `@debrief/stac-writer`. All downstream packages that implement `StacWriter` will fail to typecheck until their adaptors are updated — this is intentional.

**Independent Test**: `pnpm --filter @debrief/stac-writer typecheck` passes; `pnpm -r typecheck` fails (expected — adaptors not yet updated).

- [x] T001 Add `WritePlotThumbnailPairInput` and `WritePlotThumbnailPairResult` types to the interface module `shared/stac-writer/src/interface.ts`
- [x] T002 Add `writePlotThumbnailPair(input: WritePlotThumbnailPairInput): Promise<WritePlotThumbnailPairResult>` method to the `StacWriter` interface `shared/stac-writer/src/interface.ts`
- [x] T003 [test] Confirm `pnpm --filter @debrief/stac-writer typecheck` passes; note expected downstream failures in commit message `shared/stac-writer/`

## Phase 2: VS Code Adaptor Implementation (Story 1 + Story 2)

**Goal**: Implement `writePlotThumbnailPair()` in `stacWriterFs.ts` with full atomic writes, checksum computation, and `item.json` mutation. The method satisfies FR-001 (no direct fs writes from extension), FR-002 (catalog parity), and FR-003 (explicit errors).

**Independent Test**: `pnpm --filter @debrief/vscode test` passes; `stacWriterFs.writePlotThumbnailPair.test.ts` covers all 5 error paths.

- [x] T004 Move `multihashSha256()` private helper from `plotThumbnailWriter.ts` into `stacWriterFs.ts` (module-level, unexported) `apps/vscode/src/services/stacWriterFs.ts`
- [x] T005 [P] Move `isoNowUtc()` private helper from `plotThumbnailWriter.ts` into `stacWriterFs.ts` (module-level, unexported) `apps/vscode/src/services/stacWriterFs.ts`
- [x] T006 Implement `writePlotThumbnailPair()` in the `createStacWriterFs` factory: pathGuard → base64 decode → atomicWriteSync PNGs → read/mutate/write item.json with title + proj:shape + file:size + file:checksum + thumbnail-sm removal + properties.updated `apps/vscode/src/services/stacWriterFs.ts`
- [x] T007 [test] Write happy-path test: files written, item.json assets correct shape (title, proj:shape, file:size, file:checksum), thumbnail-sm removed, properties.updated refreshed `apps/vscode/tests/unit/stacWriterFs.writePlotThumbnailPair.test.ts`
- [x] T008 [P][test] Write `'empty-png'` test: zero-length large or small base64 payload throws `StacWriterError('empty-png')` `apps/vscode/tests/unit/stacWriterFs.writePlotThumbnailPair.test.ts`
- [x] T009 [P][test] Write `'stac-item-not-found'` test: missing `item.json` throws `StacWriterError('stac-item-not-found')` `apps/vscode/tests/unit/stacWriterFs.writePlotThumbnailPair.test.ts`
- [x] T010 [P][test] Write `'item-json-malformed'` test: corrupt `item.json` throws `StacWriterError('item-json-malformed')` `apps/vscode/tests/unit/stacWriterFs.writePlotThumbnailPair.test.ts`
- [x] T011 [P][test] Write `'write-failed'` test: stubbed `atomicWriteSync` throws → `StacWriterError('write-failed')` propagated `apps/vscode/tests/unit/stacWriterFs.writePlotThumbnailPair.test.ts`

## Phase 3: Web-Shell Adaptor Stub (Story 1)

**Goal**: Satisfy the `StacWriter` interface contract in the web-shell adaptor. Plot thumbnail capture requires a Leaflet `MapPanel` that only exists in the VS Code host — the web-shell implementation throws a clear error rather than silently no-oping (Constitution Article I.3).

**Independent Test**: `pnpm --filter @debrief/web-shell test` passes; stub test asserts the throw.

- [x] T012 Add `writePlotThumbnailPair()` to `stacWriterIdb.ts` throwing `StacWriterError('validation-failed', 'writePlotThumbnailPair is not supported in the web-shell host')` `apps/web-shell/src/services/stacWriterIdb.ts`
- [x] T013 [test] Write unit test asserting `writePlotThumbnailPair()` throws `StacWriterError` with kind `'validation-failed'` `apps/web-shell/src/services/__tests__/stacWriterIdb.writePlotThumbnailPair.test.ts`

## Phase 4: saveSession.ts Migration (Story 1 + Story 2)

**Goal**: Replace the shim call in `saveSession.ts` with the `StacWriter` interface call; wire the first live `createStacWriterFs` instance into the command registry; fix the Article I.3 silent-error violation; delete the shim. After this phase, `grep -r 'plotThumbnailWriter' apps/` returns no matches.

**Independent Test**: `pnpm -r typecheck` passes; `saveSession.createSaveSessionCommand.test.ts` passes with mock writer; `grep -r 'plotThumbnailWriter' apps/` is empty.

- [x] T014 Add `getStacWriter?: (storePath: string) => StacWriter` optional parameter to `createSaveSessionCommand()` signature `apps/vscode/src/commands/saveSession.ts`
- [x] T015 Replace `writePlotThumbnails(...)` call inside `storeThumbnails()` with `await getStacWriter(storePath).writePlotThumbnailPair({ ctx, stacItemPath: ..., largePngBase64, smallPngBase64 })` `apps/vscode/src/commands/saveSession.ts`
- [x] T016 Fix `catch` block around thumbnail capture: catch `StacWriterError` → `vscode.window.showErrorMessage(err.message)`; other errors remain `console.warn` (non-blocking capture failures) `apps/vscode/src/commands/saveSession.ts`
- [x] T017 Pass `getStacWriter` factory to `createSaveSessionCommand()` in the command registry: `(storePath) => createStacWriterFs({ storePath, stacService })` (`stacService` already in scope at line ~421) `apps/vscode/src/commands/index.ts`
- [x] T018 Delete `plotThumbnailWriter.ts` shim `apps/vscode/src/services/plotThumbnailWriter.ts`
- [x] T019 [test] Write mock-writer injection test: mock `getStacWriter` returns spy; mock `mapPanel.requestThumbnailCapture()` returns base64 payloads; assert spy called with correct args `apps/vscode/tests/unit/saveSession.createSaveSessionCommand.test.ts`
- [x] T020 [P][test] Write error-surface test: mock writer's `writePlotThumbnailPair` throws `StacWriterError`; assert `vscode.window.showErrorMessage()` called (not swallowed) `apps/vscode/tests/unit/saveSession.createSaveSessionCommand.test.ts`

## Phase 5: CI Gate + Catalog Parity (Story 3)

**Goal**: Verify SC-001 (no direct fs writes from extension), SC-002 (golden-fixture parity), SC-003 (Playwright E2E unchanged), and SC-004 (no save-duration regression) before opening the PR.

**Independent Test**: `task verify` exits 0.

- [x] T021 Run `pnpm -r typecheck` and confirm zero type errors across all packages
- [x] T022 [P] Run `pnpm --filter '!@debrief/web-shell' test` — all Vitest unit tests pass (new stacWriterFs + saveSession + stacWriterIdb test suites included)
- [x] T023 [P] Run existing golden-fixture comparison: confirm SC-002 — no fixture updates required `apps/vscode/tests/`
- [x] T024 Run `task verify` full CI gate (lint + typecheck + test); confirm exit 0

## Phase 6: Polish & Cross-Cutting Concerns

### Evidence Collection

- [x] T025 Capture test results using template (`.specify/templates/evidence/test-summary-template.md`) `specs/242-savesession-stac-writes/evidence/test-summary.md`
- [x] T026 Create usage demonstration: TypeScript snippet showing `createSaveSessionCommand()` receiving the `getStacWriter` factory + annotated call-site in `commands/index.ts` `specs/242-savesession-stac-writes/evidence/usage-example.md`
- [x] T027 [P] Create integration-flow document: Before/After Mermaid sequence diagram (extension → shim → fs vs extension → StacWriter → stacWriterFs → fs) + prose summary of service boundary enforcement `specs/242-savesession-stac-writes/evidence/integration-flow.md`

### Media Content

- [x] T028 Create feature blog post using Content Specialist (reads `evidence/opening-context.md` verbatim for the first three sections; adds By the Numbers, Lessons Learned, What's Next from evidence) `specs/242-savesession-stac-writes/media/shipped-post.md`

### PR Creation

- [x] T029 Create PR and publish blog: run /speckit.pr

**Task T029 must run last. It depends on all evidence and media tasks being complete.**

## Dependencies

Phases must complete in order. Within each phase, tasks marked `[P]` can run in parallel.

| Phase | Blocked by | Reason |
|-------|-----------|--------|
| Phase 1 (Interface) | — | Starting point |
| Phase 2 (VS Code adaptor) | Phase 1 | `StacWriter` interface must exist before `stacWriterFs.ts` can implement the new method |
| Phase 3 (Web-shell stub) | Phase 1 | Same — `StacWriter` interface must have the method declared |
| Phase 4 (saveSession migration) | Phase 2 | `createStacWriterFs()` must expose `writePlotThumbnailPair()` before `saveSession.ts` can call it |
| Phase 5 (CI gate) | Phases 2, 3, 4 | All implementations must be in place for `pnpm -r typecheck` to pass |
| Phase 6 (Polish) | Phase 5 | Evidence captured after all tests are green |

Phases 2 and 3 are independent of each other and can proceed in parallel once Phase 1 is complete.

## Implementation Strategy

This is a pure refactor — observable behaviour of "Save Session" is unchanged. The strategy is incremental: each phase produces a coherent, independently verifiable increment even though `pnpm -r typecheck` will fail between Phases 1 and 4 (expected — adaptors not yet wired).

**Increment 1 (Phases 1–3)**: Interface + both adaptors. At the end of Phase 3, `pnpm -r typecheck` passes because `stacWriterFs.ts` and `stacWriterIdb.ts` implement the new method. `saveSession.ts` still calls the old shim — no behaviour change yet.

**Increment 2 (Phase 4)**: Cut over the call site and delete the shim. This is the only phase that changes observable runtime behaviour. Keeping it isolated makes it easy to bisect if a regression surfaces.

**Increment 3 (Phase 5)**: Green CI. No code changes — just verification.

**Key invariants** (see quickstart.md for full list):
- PNG writes use `atomicWriteSync()`, not `fs.writeFileSync`
- Asset `title` fields: `'Plot thumbnail (200x150)'` / `'Plot overview (800x600)'`
- `thumbnail-sm` key removed from `item.json` if present
- `properties.updated` refreshed on every write
- Web-shell throws `StacWriterError('validation-failed')` — no silent no-ops
