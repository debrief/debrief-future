---

description: "Task list for 236-web-shell-stac-writes (IndexedDB-only persistence + unified StacWriter interface)"
---

# Tasks: Web-shell STAC write path (IndexedDB-only)

**Input**: Design documents from `/specs/236-web-shell-stac-writes/`
**Prerequisites**: spec.md, plan.md, research.md, data-model.md, contracts/stac-writer.ts, contracts/indexeddb-schema.md, quickstart.md

**Tests**: Unit tests + parametrised cross-adaptor suite + Playwright E2E are mandatory per Article VI and plan.md's testing strategy. The plan explicitly demands a parametrised cross-adaptor suite (vitest + `fake-indexeddb`) plus static-build Playwright reload-survival.

**Organization**: Tasks are grouped by user story (P1, P2, P3) so each story can be implemented and tested independently. Foundation (Phase 2) lands the writer interface, the VS Code delegation, the ESLint rule, and the constitutional amendment — gated behind the existing VS Code test corpus to confirm zero behavioural regression.

**Strangler-fig commits** (research.md R-008):
1. **Commit 1** = end of Phase 2 (writer module + stacWriterFs + parametrised tests; both hosts still use existing inline impls)
2. **Commit 2** = end of Phase 2.5 (VS Code delegates to writer; web-shell still session-only)
3. **Commit 3** = end of Phase 5 (web-shell adaptor + ESLint rule + amendment shipped together)

---

## Evidence Requirements

> **Purpose**: Capture artifacts that prove the feature works as expected. These ride into the PR description and the blog post.

**Evidence Directory**: `specs/236-web-shell-stac-writes/evidence/`
**Media Directory**: `specs/236-web-shell-stac-writes/media/`

### Planned Artifacts

This is an Infrastructure feature with VS-Code/Web-shell workflow surfaces. Per the Evidence Quality Rubric, both the **Infrastructure** and the **VS Code Extension Workflow** evidence types apply.

| Artifact | Description | Captured When |
|---|---|---|
| `evidence/test-summary.md` | YAML-front-matter test summary — vitest unit + parametrised cross-adaptor + Playwright E2E counts, coverage % | After all tests pass |
| `evidence/usage-example.md` | Code-level walkthrough: capture a scene → reload → assert surviving via the new writer interface | After Phase 3 (US1) lands |
| `evidence/screenshots/before-session-only-badge.png` | Pre-feature: web-shell with the "Session-only" badge visible | Before commit 3 |
| `evidence/screenshots/after-no-badge.png` | Post-feature: badge gone after a successful capture | During US1 Playwright run |
| `evidence/screenshots/capture-survives-reload.gif` | < 5s GIF: capture → reload → scene re-appears (the headline P1 promise) | During US1 Playwright run |
| `evidence/screenshots/private-mode-badge.png` | IndexedDB-unavailable case: badge stays + structured error visible | During US1 Playwright run |
| `evidence/webview-e2e-summary.md` | Playwright run summary: workflows × outcomes × screenshots captured | After all Playwright phases pass |
| `evidence/round-trip-evidence.md` | Cross-adaptor proof: same operation matrix passes against fs (Node) and idb (`fake-indexeddb`) | After Phase 2 cross-adaptor suite passes |
| `evidence/eslint-enforcement-output.txt` | `task lint` output showing the new IV.4 rule rejecting a deliberate violation in a sandbox file (then reverted) | After Phase 2 ESLint rule lands |
| `evidence/idb-schema-dump.json` | A real IndexedDB database state after capture+edit+create — proof the schema in `contracts/indexeddb-schema.md` matches reality | After Phase 5 (US3) lands |
| `evidence/constitution-diff.md` | The Article IV.4 amendment as a unified diff with the Sync Impact Report bumped 1.2.0 → 1.3.0 | When CONSTITUTION.md is amended |

### Media Content

| Artifact | Description | Created When |
|---|---|---|
| `evidence/opening-context.md` | Cached opener — Hook (mermaid before/after), What We're Building, How It Fits, Key Decisions | Already cached during /speckit.plan |
| `media/shipped-post.md` | Final feature blog post combining the cached opener with ship-time evidence | Phase 6 (Polish) |

### PR Creation

| Action | Description | Created When |
|---|---|---|
| Feature PR | PR in `debrief-future` with all evidence linked | Final task in Phase 6 |
| Blog PR | PR in `debrief.github.io` publishing the feature post | Triggered by /speckit.pr |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the new `shared/stac-writer/` workspace package and add the new dependencies.

- [ ] T001 Create the new workspace package directory `shared/stac-writer/`
- [ ] T002 [P] Add `shared/stac-writer/package.json` (`@debrief/stac-writer`, browser-safe, no Node imports — see plan.md project structure) `shared/stac-writer/package.json`
- [ ] T003 [P] Add `shared/stac-writer/tsconfig.json` extending the root strict-mode config `shared/stac-writer/tsconfig.json`
- [ ] T004 [P] Add `shared/stac-writer/tsup.config.ts` for ESM + CJS output (mirror `services/session-state/tsup.config.ts`) `shared/stac-writer/tsup.config.ts`
- [ ] T005 [P] Add `shared/stac-writer/vitest.config.ts` (node env for type tests + jsdom env for the IDB cross-adaptor suite) `shared/stac-writer/vitest.config.ts`
- [ ] T006 Wire `@debrief/stac-writer` into the pnpm workspace (root `pnpm-workspace.yaml`) `pnpm-workspace.yaml`
- [ ] T007 Add `idb@^8.0.0` and `fake-indexeddb@^6.0.0` to `apps/web-shell/package.json`; add `@debrief/stac-writer` workspace dep to `apps/web-shell/package.json` and `apps/vscode/package.json` `apps/web-shell/package.json`
- [ ] T008 Run `pnpm install` from repo root and verify the new workspace resolves; commit `pnpm-lock.yaml`

**Checkpoint**: Empty package builds (`pnpm --filter @debrief/stac-writer build` produces an empty `dist/`); both hosts can import from `@debrief/stac-writer` without compile errors.

---

## Phase 2: Foundation (Writer Interface + VS Code Delegation + Enforcement)

**Purpose**: Land the writer interface, the Node-fs adaptor, the parametrised cross-adaptor test harness, the constitutional amendment, and the ESLint enforcement rule. Have VS Code delegate to the new writer module — verified by the existing 1700+ LOC test corpus. **No web-shell user-visible behaviour changes here.**

**⚠️ CRITICAL**: No user story (Phases 3+) can begin until Phase 2 is complete and existing VS Code tests are still green.

### Interface, types, errors, and pure helpers (commit 1)

- [ ] T009 Translate `contracts/stac-writer.ts` into the implementation source — interface, I/O types, `StacWriterError`, `CapabilityReport`, `StoredItem` `shared/stac-writer/src/interface.ts`
- [ ] T010 [P] Implement `StacWriterError` class with `kind`, `message`, `path?`, `cause?` (matches data-model.md Layer 1) `shared/stac-writer/src/errors.ts`
- [ ] T011 [P] Implement the pure `mergeOverlay(bundled, stored)` function per data-model.md Layer 4 — four cases, shallow merge at properties + assets, link-replace `shared/stac-writer/src/overlay.ts`
- [ ] T012 [P] Add path-validation helpers: `pathGuard(ctx, candidate)` (rules 1–4 from data-model.md "Path validation") and `validateSceneId` (ULID regex) `shared/stac-writer/src/core/pathGuard.ts`
- [ ] T013 [P] Add the atomic-write helper signature (Node-fs-only — used by `stacWriterFs` only) `shared/stac-writer/src/core/atomicWrite.ts`
- [ ] T014 Re-export the public surface from `shared/stac-writer/src/index.ts` (interface, types, errors, `mergeOverlay`) — DO NOT export Node-only helpers `shared/stac-writer/src/index.ts`

### Tests for interface, types, and overlay merge (cross-adaptor harness)

- [ ] T015 [P][test] Define the cross-adaptor test harness factory: `setupAdaptor(): Promise<{ writer, readSeed, cleanup }>` with two concrete impls — one Node-fs-tmpdir backed, one `fake-indexeddb` backed `shared/stac-writer/tests/harness.ts`
- [ ] T016 [P][test] Parametrised: `pathGuard` rejects relative `..`, absolute, symlink-escape; `validateSceneId` rejects non-ULID `shared/stac-writer/tests/unit/pathGuard.test.ts`
- [ ] T017 [P][test] Parametrised: `mergeOverlay` truth-table — `(bundled,null) | (null,standalone) | (bundled,overlay) | (null,null) | invalid` `shared/stac-writer/tests/unit/overlay.test.ts`
- [ ] T018 [P][test] Parametrised: `StacWriterError` `kind` discrimination round-trips through `JSON.stringify` cleanly (used by future serde) `shared/stac-writer/tests/unit/errors.test.ts`

### Node-fs adaptor (extracted from existing VS Code services)

- [ ] T019 Extract `writeAtomic(deps, target, data)` from `apps/vscode/src/services/sceneThumbnailService.ts:75-103` into `stacWriterFs` (preserve fsync best-effort + temp cleanup semantics) `apps/vscode/src/services/stacWriterFs.ts`
- [ ] T020 Implement `stacWriterFs.writeSceneThumbnailPair` — extract from `sceneThumbnailService.writeSceneThumbnail` lines 198–279, preserving the 4-step atomicity contract (mkdir → large PNG → small PNG → item.json patch) `apps/vscode/src/services/stacWriterFs.ts`
- [ ] T021 Implement `stacWriterFs.patchItem` — extract from `stacService.updateItemMetadataSync` lines 1262–1404, preserving all 11 steps (mtime fingerprint, provenance log, archive rotation, atomic write) `apps/vscode/src/services/stacWriterFs.ts`
- [ ] T022 Implement `stacWriterFs.writeItem` (create + replace modes; replace requires existing item; create requires existing parent dir) `apps/vscode/src/services/stacWriterFs.ts`
- [ ] T023 Implement `stacWriterFs.writeAsset` — bytes-first, then item.json patch; preserves the orphan-asset-on-failure contract from data-model.md Layer 2 `apps/vscode/src/services/stacWriterFs.ts`
- [ ] T024 Implement `stacWriterFs.deleteItem` and `stacWriterFs.deleteAsset` — extracted from `sceneThumbnailService.deleteSceneThumbnail` (generalised), plus `fs.rm({recursive: true})` for whole-item delete `apps/vscode/src/services/stacWriterFs.ts`
- [ ] T025 Implement `stacWriterFs.capability()` — VS Code is always `{ available: true, persistent: true }` unless `fs.stat` of `storePath` reveals read-only; map `EROFS` to `read-only-fs` error kind `apps/vscode/src/services/stacWriterFs.ts`
- [ ] T026 Add the inline ASCII state-transition diagram comment at the top of `stacWriterFs.ts` (mirrors data-model.md Layer 4 state diagram — review-recommended diagram placement) `apps/vscode/src/services/stacWriterFs.ts`

### Tests for the Node-fs adaptor

- [ ] T027 [P][test] Cross-adaptor parametrised: `writeSceneThumbnailPair` writes both PNGs and patches item.json atomically; failure between PNG2 and item.json patch leaves orphan PNGs but DOES NOT mutate item.assets `shared/stac-writer/tests/integration/writeSceneThumbnailPair.test.ts`
- [ ] T028 [P][test] Cross-adaptor parametrised: `patchItem` preserves provenance log; appends new entry; rotates oldest when cap exceeded; archives to `provenance_log_archive.jsonl` (fs) / `provenance-archive` blob (idb) `shared/stac-writer/tests/integration/patchItem.test.ts`
- [ ] T029 [P][test] Cross-adaptor parametrised: `patchItem` rejects with `stale-fingerprint` when mtime changed between read and write `shared/stac-writer/tests/integration/staleFingerprint.test.ts`
- [ ] T030 [P][test] Cross-adaptor parametrised: every operation rejects `path-rejected` for `..`, absolute, and (fs only) symlink-escape `shared/stac-writer/tests/integration/pathRejection.test.ts`
- [ ] T031 [P][test] Node-fs only: `EROFS` mapped to `read-only-fs` `shared/stac-writer/tests/integration/readOnlyFs.test.ts`

### Strangler-fig commit 2: VS Code delegates to the writer

- [ ] T032 Switch `apps/vscode/src/services/sceneThumbnailService.ts:writeSceneThumbnail` body to delegate to `stacWriterFs.writeSceneThumbnailPair` (export shape unchanged) `apps/vscode/src/services/sceneThumbnailService.ts`
- [ ] T033 Switch `apps/vscode/src/services/sceneThumbnailService.ts:deleteSceneThumbnail` body to delegate to `stacWriterFs.deleteAsset` (×2 — large + small) `apps/vscode/src/services/sceneThumbnailService.ts`
- [ ] T034 Switch `apps/vscode/src/services/stacService.ts:updateItemMetadataSync` body to delegate to `stacWriterFs.patchItem` (callable surface and `Promise<UpdateItemMetadataResult>` shape unchanged) `apps/vscode/src/services/stacService.ts`
- [ ] T035 [P] Delete the local `StacItem` interface declaration in `apps/vscode/src/services/stacService.ts`; import from `@debrief/stac-writer` (review 2A — single source of truth) `apps/vscode/src/services/stacService.ts`
- [ ] T036 [P] Delete the local `PropertiesProvenanceEntry` interface declaration in `apps/vscode/src/services/stacService.ts`; import from `@debrief/stac-writer` (review 2A) `apps/vscode/src/services/stacService.ts`
- [ ] T037 [P] Delete the local `StacItem` interface declaration in `apps/web-shell/src/mocks/stacService.ts`; import from `@debrief/stac-writer` (review 2A — even though web-shell uses a different field-set, the canonical contract type is what flows through the writer) `apps/web-shell/src/mocks/stacService.ts`

### Regression gate (this is the load-bearing test for commit 2)

- [ ] T038 [test] Run the existing VS Code unit suite — `pnpm --filter @debrief/vscode test stacService.atomicWrite stacService.updateItemMetadata stacService.provenanceRotation sceneThumbnailService` — and confirm zero behavioural regression (1700+ LOC of coverage). If anything fails, the delegation isn't equivalent; fix in `stacWriterFs` until the existing tests pass `apps/vscode/tests/unit/`

### ESLint rule for Article IV.4 (review 3A — FR-025)

- [ ] T039 Implement the `no-direct-persistence-in-frontend` rule per research.md R-009: `no-restricted-imports` for `node:fs`/`fs` under `apps/web-shell/**`; `no-restricted-globals` for `indexedDB`/`localStorage`/`sessionStorage`/`caches` outside the explicit host-adaptor allow-list (`apps/web-shell/src/services/stacWriterIdb.ts`, `apps/web-shell/src/services/stacWriterCapability.ts`) `shared/eslint-rules/no-direct-persistence-in-frontend.js`
- [ ] T040 [P] Wire the new rule into the root ESLint config `eslint.config.js`
- [ ] T041 [P] Document the rule's intent (anchored to Article IV.4) in `shared/eslint-rules/README.md` `shared/eslint-rules/README.md`
- [ ] T042 [test] Verify enforcement: add a deliberate `import('fs')` to a sandbox file under `apps/web-shell/src/`, run `task lint`, confirm rejection, capture the output, then revert. Save the captured output for evidence `evidence/eslint-enforcement-output.txt`

### Constitutional amendment (FR-024 — IV.4)

- [ ] T043 Amend `CONSTITUTION.md` — add Article IV.4 verbatim from research.md R-006 `CONSTITUTION.md`
- [ ] T044 Sync `.specify/memory/constitution.md` — update Sync Impact Report comment block: 1.2.0 → 1.3.0 (MINOR), modified principle IV (added IV.4); record body identical to `CONSTITUTION.md` `.specify/memory/constitution.md`
- [ ] T045 Add an ADR recording the writer interface extraction + IndexedDB choice + ESLint enforcement decision in `docs/project_notes/decisions.md` (next ADR number) `docs/project_notes/decisions.md`

**Checkpoint**: 
- `pnpm --filter @debrief/stac-writer test` green (interface + cross-adaptor unit suite)
- `pnpm --filter @debrief/vscode test ...` (T038 regression gate) green — VS Code behaviour unchanged
- `task lint` rejects the deliberate violation (T042); reverted before commit
- Commits: **strangler-fig commit 1** (T001–T031, T039–T045) and **strangler-fig commit 2** (T032–T038) land here

---

## Phase 3: User Story 1 — Storyboard captures persist across reloads (Priority: P1)

**Goal**: Capture a Storyboard scene in the static-built web-shell, hard-reload, observe the scene re-appear with thumbnail and viewport intact. The "Session-only" badge disappears.

**Independent Test**: `pnpm --filter @debrief/web-shell build && pnpm --filter @debrief/web-shell preview` → open `exercise-alpha` → click capture → confirm thumbnail in rail + badge gone → hard-reload → scene still there. No VS Code involvement.

### IndexedDB adaptor implementation

- [ ] T046 Implement `stacWriterIdb.capability()` per data-model.md Layer 2 — feature-detect `globalThis.indexedDB`, attempt to open `debrief-stac-writer-v1`, return structured `CapabilityReport`. Map private-mode `OpenDBRequest.onerror` to `unavailable`; map `QuotaExceededError` to `quota`; map `NotAllowedError` to `denied` `apps/web-shell/src/services/stacWriterIdb.ts`
- [ ] T047 Initialise the IndexedDB schema via `idb`'s `openDB` with `upgrade` callback creating four object stores per `contracts/indexeddb-schema.md` (`items`, `assets` with `byItem` index, `payloads`, `meta`). Version `1` `apps/web-shell/src/services/stacWriterIdb.ts`
- [ ] T048 Implement `stacWriterIdb.writeSceneThumbnailPair` — single `readwrite` transaction across `assets` + `items` + `meta`; decode base64 PNGs to `Uint8Array`/`Blob`; merge two asset entries into the overlay's `assets`; bump `mtimeMs` `apps/web-shell/src/services/stacWriterIdb.ts`
- [ ] T049 Implement `stacWriterIdb.patchItem` — preserves the 11-step semantics from `stacWriterFs.patchItem` (mtime fingerprint via `mtimeMs`, provenance log append + cap + archive blob). For bundled-only items: read bundled `item.json` from `/stac-store/<itemPath>`, create new `kind: 'overlay'` record with patched `properties` and the bundled provenance log copied in. For overlay-existing items: mutate the existing record `apps/web-shell/src/services/stacWriterIdb.ts`
- [ ] T050 Implement `stacWriterIdb.writeItem` — `create` writes a new `kind: 'standalone'` record under `user/<id>/item.json`; `replace` rejects with `bundled-item-read-only` for any path that exists in the bundled catalog but not as a standalone record `apps/web-shell/src/services/stacWriterIdb.ts`
- [ ] T051 Implement `stacWriterIdb.writeAsset` — discriminated by `mediaType`: `application/geo+json` → `payloads` store; everything else → `assets` store. Single transaction across the asset store + `items` + `meta`. Synthesises `idb:<itemPath>::<assetKey>` href on the asset entry `apps/web-shell/src/services/stacWriterIdb.ts`
- [ ] T052 Implement `stacWriterIdb.deleteItem` and `stacWriterIdb.deleteAsset` — reject `bundled-item-read-only` for bundled paths (FR-007 / FR-014); cascade-delete via `byItem` index for standalone item delete `apps/web-shell/src/services/stacWriterIdb.ts`
- [ ] T053 Implement `stacWriterIdb`'s post-commit `BroadcastChannel` notification — every successful op posts `{ kind, itemPath, mtimeMs }` to `BroadcastChannel('debrief-stac-writer-v1')` after the transaction commits (review 1A — channel is host-side, off the writer interface) `apps/web-shell/src/services/stacWriterIdb.ts`
- [ ] T054 Implement `requestPersistAfterFirstWrite()` — on first successful write (detected via `meta.firstWriteAt`), call `navigator.storage.persist()`; record the response in `meta.persistGranted`; never retry `apps/web-shell/src/services/stacWriterIdb.ts`
- [ ] T055 [P] Add the inline ASCII transaction-shapes table comment at the top of `stacWriterIdb.ts` (mirrors `contracts/indexeddb-schema.md` "Transaction shapes" — review-recommended diagram placement) `apps/web-shell/src/services/stacWriterIdb.ts`
- [ ] T056 Implement the dedicated `stacWriterCapability.ts` module (the only OTHER file allowed to read `globalThis.indexedDB` per the ESLint allow-list) — used by web-shell App boot before instantiating the writer `apps/web-shell/src/services/stacWriterCapability.ts`

### Catalog read view (bundled + IndexedDB merge) and asset-href resolution

- [ ] T057 Implement `apps/web-shell/src/services/catalogReadView.ts` — `getItem(itemPath)` and `listItems()` that fetch bundled catalog GETs in parallel with IDB `getAll(items)` and merge via `mergeOverlay`. Sort: bundled order preserved, standalone items appended descending by `mtimeMs` `apps/web-shell/src/services/catalogReadView.ts`
- [ ] T058 Wire the `BroadcastChannel('debrief-stac-writer-v1')` listener into `catalogReadView` — on receipt, re-read the affected itemPath from IDB, fire UI subscribers; coalesce duplicate notifications within 50 ms (review 1A — the channel is the read-view's concern, not the writer's) `apps/web-shell/src/services/catalogReadView.ts`
- [ ] T059 Add the inline ASCII bundled-overlay-merge flow diagram comment to `catalogReadView.ts` (mirrors data-model.md Layer 4 — review-recommended) `apps/web-shell/src/services/catalogReadView.ts`
- [ ] T060 [P] Implement the `useResolvedAssetHref(href)` React hook (review 4A) — module-level LRU (cap 200) of `URL.createObjectURL(blob)` results; reference-counted via React effect cleanup; revokes on eviction; returns `idb:` hrefs unresolved on first render then re-renders with the resolved URL `apps/web-shell/src/services/useResolvedAssetHref.ts`
- [ ] T061 [P] Add the truth-table comment block to the `mergeOverlay` JSDoc in `shared/stac-writer/src/overlay.ts` (review-recommended diagram placement — already covered by T011's tests but the comment makes the contract reviewable in-place) `shared/stac-writer/src/overlay.ts`

### Wire the capture flow to IndexedDB

- [ ] T062 Replace `apps/web-shell/src/services/webSceneThumbnailAdapter.ts`'s in-memory `Map` with calls into `stacWriterIdb.writeSceneThumbnailPair`. Keep the `WriteSceneThumbnailResult` export shape (callers in `captureSceneWeb.ts` are unchanged). Remove the `WebSceneThumbnailStore` class entirely `apps/web-shell/src/services/webSceneThumbnailAdapter.ts`
- [ ] T063 Re-wire the FR-WEB-029a "Session-only" badge — gate visibility on `stacWriterCapability` `available: false` rather than "any capture has happened". Subscribe at App boot, re-render the badge on capability changes `apps/web-shell/src/StoryboardPanelMount.tsx`
- [ ] T064 Wire `mocks/stacService.ts:updateItemMetadata` to call `stacWriterIdb.patchItem`; `getItems` and `getItem` route through `catalogReadView`. Remove the in-memory mutation path; emit `onItemsChanged` only on confirmed writer success `apps/web-shell/src/mocks/stacService.ts`
- [ ] T065 Wire the `<img>` consumers of asset hrefs in `StoryboardPanel` and the catalog overview to use `useResolvedAssetHref` for any href starting `idb:` (review 4A) `apps/web-shell/src/StoryboardPanelMount.tsx`

### Tests for User Story 1

- [ ] T066 [P][test] vitest: `stacWriterIdb.capability()` returns `{ available: false, reason: 'unavailable' }` when `globalThis.indexedDB` is undefined; `{ available: true, persistent: <bool> }` against `fake-indexeddb` `apps/web-shell/src/services/stacWriterIdb.capability.test.ts`
- [ ] T067 [P][test] vitest: `stacWriterIdb.writeSceneThumbnailPair` against `fake-indexeddb` writes both blobs + the items overlay in one transaction; on synthesised mid-transaction abort, no partial commit visible to a subsequent read `apps/web-shell/src/services/stacWriterIdb.capture.test.ts`
- [ ] T068 [P][test] vitest: `useResolvedAssetHref` LRU eviction lifecycle — fill above cap 200, observe `URL.revokeObjectURL` called on eviction; React state update fires after revoke so subscribers re-render `apps/web-shell/src/services/useResolvedAssetHref.test.tsx`
- [ ] T069 [P][test] vitest: `catalogReadView` merge behaviour — a bundled item plus an IDB overlay produces the right merged shape per `mergeOverlay`; a standalone item appears in `listItems` after bundled items `apps/web-shell/src/services/catalogReadView.test.ts`

### Web-Shell E2E Tests for User Story 1 🖥️

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — `apps/web-shell/run-playwright.mjs` extracts the bundled `@sparticuz/chromium` binary and configures Playwright to use it. Standard browser CDN downloads are blocked (403), but this bundled binary works fully. See `docs/project_notes/playwright-installation-research.md`.

- [ ] T070 [P] [US1] Update page objects in `apps/web-shell/playwright/pages/StoryboardPage.ts` with capture-button + scene-list selectors (reuse existing pattern from `properties-screenshots.spec.ts`) `apps/web-shell/playwright/pages/StoryboardPage.ts`
- [ ] T071 [US1] Run the suite against the **static build** (`pnpm --filter @debrief/web-shell build && vite preview`), not the dev server — proves SC-006: capture-and-reload survives without any Vite middleware in the loop `apps/web-shell/playwright/tests/stac-writes.spec.ts`
- [ ] T072 [P] [US1] Playwright scenario: capture scene → hard-reload → assert scene visible + thumbnail loads + "Session-only" badge absent `apps/web-shell/playwright/tests/stac-writes.spec.ts`
- [ ] T073 [P] [US1] Playwright scenario: stub `indexedDB` to `undefined` via `page.addInitScript` → attempt capture → assert structured error visible + badge stays `apps/web-shell/playwright/tests/stac-writes.spec.ts`
- [ ] T074 [P] [US1] Playwright scenario: open same plot in two tabs → capture in tab A → assert tab B's panel updates within 1000 ms via the BroadcastChannel listener `apps/web-shell/playwright/tests/stac-writes.spec.ts`
- [ ] T075 [P] [US1] Capture the headline interaction GIF (capture → reload → scene survives) via `page.video()` recording, convert to GIF < 5 s < 2 MB, write to `evidence/screenshots/capture-survives-reload.gif` `evidence/screenshots/capture-survives-reload.gif`
- [ ] T076 [P] [US1] Capture before/after screenshots: badge-visible (`evidence/screenshots/before-session-only-badge.png`) and badge-absent (`evidence/screenshots/after-no-badge.png`) `evidence/screenshots/`
- [ ] T077 [P] [US1] Capture private-mode badge screenshot (`evidence/screenshots/private-mode-badge.png`) under the stubbed-IDB scenario `evidence/screenshots/private-mode-badge.png`
- [ ] T078 [US1] Run web-shell e2e: `cd apps/web-shell && node run-playwright.mjs stac-writes` — all four scenarios green `apps/web-shell/playwright/tests/stac-writes.spec.ts`

**Checkpoint**: User Story 1 fully functional — captures persist across reload in a static-built web-shell. P1 acceptance scenarios 1.1, 1.2, 1.3, 1.4 all pass.

---

## Phase 4: User Story 2 — Item metadata edits persist across reloads (Priority: P2)

**Goal**: Open the Properties Panel against a STAC item (bundled or IndexedDB-only), edit metadata (description, platforms, time bounds), save, hard-reload — the edited metadata is still there. For bundled items, the edit is an IndexedDB overlay; for standalone items, in-place.

**Independent Test**: Open `exercise-alpha` (bundled), edit description in Properties Panel, save, hard-reload, observe the new description in the panel and in the catalog overview tile. No VS Code involvement.

### Implementation for User Story 2

> Most of US2's plumbing already lands in Phase 3 (the writer's `patchItem`, the catalog read view's `mergeOverlay`, the `BroadcastChannel` listener). Phase 4 wires the Properties Panel save flow to the new path and verifies the overlay → bundle drift behaviour.

- [ ] T079 [US2] Wire the Properties Panel save flow to call `stacService.updateItemMetadata` (which now routes through `stacWriterIdb.patchItem` per T064). Surface structured errors (`stale-fingerprint` → "Someone else changed this item, please refresh"; `quota-exceeded` → "Browser storage full"; `bundled-item-read-only` → not reachable, all bundled patches land as overlays) `apps/web-shell/src/PropertiesPanelMount.tsx`
- [ ] T080 [US2] Confirm `mocks/stacService.ts:onItemsChanged` fires after a successful patch via the `catalogReadView` BroadcastChannel listener (already wired in T058) — adjust the subscriber path in PropertiesPanel if needed `apps/web-shell/src/mocks/stacService.ts`

### Tests for User Story 2

- [ ] T081 [P][test] vitest: `stacWriterIdb.patchItem` against a bundled item creates a new `kind: 'overlay'` record with the bundled provenance log copied in + the new entry appended `apps/web-shell/src/services/stacWriterIdb.patch-bundled.test.ts`
- [ ] T082 [P][test] vitest: `stacWriterIdb.patchItem` against an existing overlay mutates it in place (no record duplication, mtimeMs bumped) `apps/web-shell/src/services/stacWriterIdb.patch-overlay.test.ts`
- [ ] T083 [P][test] vitest: bundle drift simulation — overlay against `exercise-alpha`, then synthesise an "upstream bundled update" by mutating the bundled JSON in-test, then re-read via `catalogReadView` — assert overlay-touched fields win, untouched fields pick up upstream changes (FR-009) `apps/web-shell/src/services/catalogReadView.bundle-drift.test.ts`

### Web-Shell E2E Tests for User Story 2 🖥️

- [ ] T084 [P] [US2] Playwright scenario: open `exercise-alpha` Properties Panel → edit description → save → hard-reload → assert new description visible in panel AND in catalog overview tile (the merged read view) `apps/web-shell/playwright/tests/stac-writes.spec.ts`
- [ ] T085 [P] [US2] Playwright scenario: same as T084 but the second tab open in parallel — assert tab B's PropertiesPanel updates within 1000 ms via BroadcastChannel `apps/web-shell/playwright/tests/stac-writes.spec.ts`
- [ ] T086 [P] [US2] Capture metadata-edit-survives screenshot pair (before edit + after reload) into `evidence/screenshots/metadata-edit-survives.png` `evidence/screenshots/metadata-edit-survives.png`

**Checkpoint**: User Story 2 fully functional. P2 acceptance scenarios 2.1, 2.2, 2.3 all pass.

---

## Phase 5: User Story 3 — GeoJSON writes & new item creation persist (Priority: P3)

**Goal**: Draw a new track on the map, save it, hard-reload — the new STAC item appears in the catalog with its GeoJSON payload. Equivalently, edit an existing track's geometry, save, reload — the new geometry is shown.

**Independent Test**: Open a plot, draw a new track via the drawing toolbar, name it, save, hard-reload — observe the new item alongside bundled items, with the drawn geometry rendering on the map.

### Implementation for User Story 3

- [ ] T087 [US3] Wire the drawing toolbar's "save new track" flow to call `stacWriterIdb.writeItem({ mode: 'create', ... })` followed by `stacWriterIdb.writeAsset` for the GeoJSON payload (single logical operation surfaced to the user, two writer ops underneath; both atomic per their own transactions) `apps/web-shell/src/App.tsx`
- [ ] T088 [US3] Wire the "edit geometry of existing track" flow to call `stacWriterIdb.writeAsset` against the GeoJSON `payload` asset, with a `patchItem` for any updated metadata (e.g. time bounds). Order: payload first, then metadata patch — the writer guarantees within-op atomicity but cross-op consistency is the caller's job; the worst case under crash is "geometry updated, metadata stale" which is detectable on next read `apps/web-shell/src/App.tsx`
- [ ] T089 [US3] Standalone-item path conventions per `contracts/indexeddb-schema.md` — generate `user/<ULID>/item.json` paths for new items; ensure the `user/` prefix is reserved (bundled items never use it) `apps/web-shell/src/services/stacWriterIdb.ts`

### Tests for User Story 3

- [ ] T090 [P][test] vitest: `stacWriterIdb.writeItem({ mode: 'create' })` writes a `kind: 'standalone'` record under `user/<ULID>/item.json`; `listItems()` includes it after bundled items, sorted by `mtimeMs` desc `apps/web-shell/src/services/stacWriterIdb.create-item.test.ts`
- [ ] T091 [P][test] vitest: `stacWriterIdb.writeAsset(mediaType: 'application/geo+json')` writes to the `payloads` store, not `assets`. The `byteLength` field reflects the UTF-8 length of the serialised FeatureCollection `apps/web-shell/src/services/stacWriterIdb.payload-write.test.ts`
- [ ] T092 [P][test] vitest: `stacWriterIdb.deleteItem` against a standalone item cascades — items + assets (via `byItem` index) + payloads + meta — all gone in one transaction `apps/web-shell/src/services/stacWriterIdb.cascade-delete.test.ts`
- [ ] T093 [P][test] vitest: `stacWriterIdb.deleteItem` against a bundled itemPath rejects `bundled-item-read-only` (FR-007) `apps/web-shell/src/services/stacWriterIdb.bundled-protected.test.ts`

### Web-Shell E2E Tests for User Story 3 🖥️

- [ ] T094 [P] [US3] Playwright scenario: draw new track → save with name → hard-reload → assert new item visible in catalog list AND its geometry renders on the map `apps/web-shell/playwright/tests/stac-writes.spec.ts`
- [ ] T095 [P] [US3] Playwright scenario: edit existing track's geometry → save → hard-reload → assert updated geometry is what renders, not the bundled original `apps/web-shell/playwright/tests/stac-writes.spec.ts`
- [ ] T096 [P] [US3] Capture new-item-survives screenshot pair into `evidence/screenshots/new-item-survives.png` `evidence/screenshots/new-item-survives.png`

**Checkpoint**: User Story 3 fully functional. P3 acceptance scenarios 3.1, 3.2 all pass. **Strangler-fig commit 3 lands here** — web-shell goes from session-only to IndexedDB-persistent in a single user-visible commit.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Capture evidence, verify the static-deployment promise, write the feature post, open the PR.

### Static-deployment verification (load-bearing for SC-006)

- [ ] T097 [test] Build the web-shell as a production bundle: `pnpm --filter @debrief/web-shell build` — confirm zero Vite-middleware dependencies in the build output (no `vite/connect` references) `apps/web-shell/dist/`
- [ ] T098 [test] Serve the bundle without dev tooling: `pnpm --filter @debrief/web-shell preview` — re-run the full Playwright suite (`node run-playwright.mjs stac-writes`) against `vite preview`. All scenarios must pass against the static output, proving captures persist on a static-hosted deployment `apps/web-shell/playwright/tests/stac-writes.spec.ts`

### Cross-host regression sweep

- [ ] T099 [test] Re-run the full VS Code unit suite — `pnpm --filter @debrief/vscode test` — confirm no regression after Phase 2's strangler-fig delegation `apps/vscode/tests/`
- [ ] T100 [test] Run the cross-adaptor parametrised suite — `pnpm --filter @debrief/stac-writer test` — confirm both fs and idb backends pass identical scenarios `shared/stac-writer/tests/`
- [ ] T101 [test] Run `task verify` (lint + typecheck + tests) end-to-end — must pass clean before evidence collection `task verify`

### Evidence Collection (REQUIRED)

- [ ] T102 Capture test summary using template `.specify/templates/evidence/test-summary-template.md` with YAML front matter (`feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`) `specs/236-web-shell-stac-writes/evidence/test-summary.md`
- [ ] T103 Create usage demonstration: a TypeScript snippet showing `await stacWriter.writeSceneThumbnailPair(...)` + reading via `catalogReadView.getItem(...)` with the resolved thumbnail href, plus expected output `specs/236-web-shell-stac-writes/evidence/usage-example.md`
- [ ] T104 [P] Capture cross-adaptor round-trip evidence — same operation matrix passes against fs (Node) and idb (`fake-indexeddb`); summarise the test counts and key invariants verified `specs/236-web-shell-stac-writes/evidence/round-trip-evidence.md`
- [ ] T105 [P] Capture an IndexedDB schema dump after a real session (capture + edit + create) — proves the schema in `contracts/indexeddb-schema.md` matches reality `specs/236-web-shell-stac-writes/evidence/idb-schema-dump.json`
- [ ] T106 [P] Capture the constitutional amendment as a unified diff with the Sync Impact Report bumped 1.2.0 → 1.3.0 `specs/236-web-shell-stac-writes/evidence/constitution-diff.md`
- [ ] T107 [P] Document the web-shell E2E run summary (workflows × outcomes × screenshots captured) `specs/236-web-shell-stac-writes/evidence/webview-e2e-summary.md`
- [ ] T108 Verify the deliberate-violation ESLint output captured by T042 is still in place under `evidence/eslint-enforcement-output.txt`; if not, re-capture via the same recipe `specs/236-web-shell-stac-writes/evidence/eslint-enforcement-output.txt`

### Media Content

- [ ] T109 Create the feature blog post at `media/shipped-post.md`. Reads the cached opener from `evidence/opening-context.md` (cached during /speckit.plan — first three sections copied verbatim under a `Building Web-shell STAC write path` title) and adds Screenshots, By the Numbers, Lessons Learned, What's Next sections. Spawn the Content Specialist agent (`.claude/agents/media/content.md`) for the writing pass `specs/236-web-shell-stac-writes/media/shipped-post.md`

### PR Creation

- [ ] T110 Create PR and publish blog: run `/speckit.pr` — opens the feature PR in `debrief-future` (with all evidence linked) and the blog PR in `debrief.github.io` (publishing the feature post) `specs/236-web-shell-stac-writes/`

**Task T110 must run last. It depends on every other task being complete.**

---

## Dependencies

### Phase order (sequential)

```text
Phase 1 (Setup)  ──►  Phase 2 (Foundation: writer + VS Code delegate + ESLint + amendment)
                                          │
                                          ▼
                          [Foundation gate — VS Code regression suite green]
                                          │
                                          ▼
                ┌─────────────────────────┼─────────────────────────┐
                ▼                         ▼                         ▼
   Phase 3 (US1, P1)          Phase 4 (US2, P2)          Phase 5 (US3, P3)
   capture+reload             metadata edit overlay      new item + GeoJSON
                ▲                         ▲                         ▲
                │                         │                         │
                └─────────────────────────┼─────────────────────────┘
                                          ▼
                              Phase 6 (Polish + PR)
                                          │
                                          ▼
                                       T110 /speckit.pr
```

### Story-level rules

- **US1 (P1)** must complete first — it lands the IndexedDB adaptor, capability check, catalog read view, `useResolvedAssetHref`, and the BroadcastChannel listener. Every other story depends on those.
- **US2 (P2)** depends on US1's `patchItem` wiring + `catalogReadView` overlay merge. Phase 4 is small because the heavy lifting is in Phase 3.
- **US3 (P3)** depends on US1's `writeItem` and `writeAsset` plumbing. Standalone-item path conventions are added here (T089).
- Within each phase: tests can run in parallel ([P] tasks); implementation tasks against the same file are sequential.

### Strangler-fig commit boundaries

| Commit | Tasks | Behaviour change |
|---|---|---|
| 1 | T001–T031, T039–T045 | Writer module + tests + ESLint + amendment exist. **Both hosts still use existing inline implementations.** Zero observable change. |
| 2 | T032–T038 | VS Code delegates to `stacWriterFs`. **Web-shell still session-only.** Zero observable change to web-shell. VS Code regression test (T038) is the gate. |
| 3 | T046–T096 | Web-shell flips from session-only to IndexedDB-persistent. User-visible: badge gone, captures survive reload. |

### Parallel opportunities

- All Phase 1 [P] tasks (T002, T003, T004, T005) can run together — distinct config files.
- Phase 2 cross-adaptor unit tests (T015–T018, T027–T031) can all run concurrently — distinct test files.
- Phase 3 IDB op implementations (T046–T056) write into the same file (`stacWriterIdb.ts`) — must be sequential. The vitest tests for them (T066–T069) are [P].
- All Playwright scenarios within a phase ([P]) can run as separate test cases in the same suite file.
- Evidence-capture tasks in Phase 6 (T104–T108) are [P] — distinct output files.

---

## Implementation Strategy

### Incremental delivery (recommended path)

1. **Land Phase 1 + Phase 2 as one PR section** — three commits (Phase 1 setup; strangler-fig commit 1; strangler-fig commit 2). Zero user-visible change. The VS Code regression gate (T038) is the only behavioural assertion; if it passes, the foundation is sound. Lowest-risk substantive change.
2. **Land Phase 3 (US1)** — the headline user-visible win. Captures persist. Badge gone in writeable browsers. Single commit (strangler-fig commit 3 starts here, but the canonical "ships the badge fix" event is when this phase's last task lands). Stop here and the feature has shipped its primary promise.
3. **Add Phase 4 (US2)** — most of US2 is plumbing already in place; this phase mostly wires the Properties Panel save flow and adds verification tests. Low risk after US1.
4. **Add Phase 5 (US3)** — slightly more involved (new-item creation + payload writes), but riding on the same writer interface. Strangler-fig commit 3 closes here; web-shell is fully on IndexedDB.
5. **Phase 6 polish** — evidence capture, blog post, PR. Run `/speckit.pr` last.

### Parallelisable (with multiple developers)

Once Phase 2 is green:

- Developer A: Phase 3 (US1) — biggest scope, owns the IDB adaptor.
- Developer B: Phase 4 (US2) — can start in parallel after Phase 3's `patchItem` and `catalogReadView` wiring (T064 / T058) lands. US2 wires the Properties Panel save path; small surface.
- Developer C: Phase 5 (US3) — can start in parallel after Phase 3's `writeItem` and `writeAsset` (T050 / T051) land. US3 owns the drawing-toolbar save flow; small surface.

### Verification cadence

- Run `task verify` after each phase. Articles VI + XV require it. The cross-adaptor parametrised suite (T015–T031) is the spine — if it stays green, the writer interface is sound across hosts.
- Run the Playwright suite against the **static build** (`vite preview`) at every phase boundary, not just at Polish. SC-006's promise — "captures persist on a static deploy" — is load-bearing for the entire feature; checking only at the end risks discovering at Phase 6 that some service-worker-or-similar regression broke the static-only path.

### Risk notes

- **Phase 2 commit 2** (T032–T038) is the highest-regression-risk single commit. The 1700+ LOC of existing VS Code tests is the gate. If T038 fails, do not paper over — diagnose the equivalence gap in `stacWriterFs` and fix the writer until the existing tests pass without modification.
- **Phase 3 capability check** (T046, T056) determines whether the badge ever disappears in a user's browser. Test it under: normal Chrome, private Chrome, normal Firefox, Safari (manually if no CI lane). Stub-tested in T066, but real-browser smoke is essential.
- **Cross-tab BroadcastChannel** (T053, T058, T074, T085) — best-effort by design. If a Playwright run flakes on the 1000 ms timeout, raise the threshold rather than reaching for synchronisation primitives. The semantics are intentional (FR-023, R-005).
- **The constitutional amendment (T043, T044)** must be reviewed by hand — automated tooling won't catch a wording slip. Hold the PR for explicit human sign-off on the IV.4 text.
