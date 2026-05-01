# Research: Web-shell STAC write path (IndexedDB-only)

**Feature**: `236-web-shell-stac-writes`
**Date**: 2026-05-01

This document captures Phase 0 design decisions. Each section follows the Decision / Rationale / Alternatives format.

> **Note** — supersedes the earlier draft that proposed a Vite middleware POST/PUT/PATCH/DELETE write path. R-001 captures the pivot rationale.

---

## R-001 — Why IndexedDB instead of Vite middleware writes (the pivot)

**Decision**: The web-shell remains a pure static site. Persistence moves entirely into IndexedDB. The `/stac-store/` Vite middleware retains its current GET-only role, untouched.

**Rationale**:
- The web-shell ships to GitHub Pages. A Vite-middleware-based write path only exists during local dev and per-PR Heroku review apps. In production (GitHub Pages, static hosting, no Node runtime), captures would silently revert to session-only — exactly the bug we're fixing. The original Phase 1 was incoherent for production.
- IndexedDB is browser-stdlib. No backend, no review-app-only behaviour, no production-vs-dev split.
- The host-agnostic writer concept survives — it just becomes a TypeScript *interface* implemented by each host with its native backend, rather than a single Node module both hosts call into.
- VS Code's existing Node-fs writes are unchanged in observable behaviour; they're only refactored to satisfy the new interface.

**Alternatives considered (and rejected by the pivot decision)**:
- **Vite middleware write path** — rejected. Doesn't survive in static-hosted production. Was the previous draft of this plan; superseded.
- **Server-backed catalog** — rejected. Violates Article I (offline-first) and the static-deployment constraint.
- **Service worker that intercepts `PUT /stac-store/`** — rejected. Heavyweight (service-worker lifecycle complications, registration timing); ceremony for a problem IndexedDB solves directly.
- **OPFS (File System Access API)** — rejected for Phase 1. Newer browser API, less universal support (Safari coverage particularly), no clean test stub. May be a Phase 2 opt-in for users who want a real file tree the OS can see.

**Cost of the pivot**: the original plan's Vite middleware factoring is wrong. Three artifacts (this file, plan.md, contracts/) needed rewriting. No code was committed — pure planning churn. Caught at Phase 0 review, which is where it should be caught.

---

## R-002 — Where to host the writer interface and adaptors

**Decision**: TypeScript interface lives in a new `shared/stac-writer/` workspace package (browser-safe, no Node imports). Each host implements the interface in its own service file:
- VS Code: `apps/vscode/src/services/stacWriterFs.ts` (extracted from existing `sceneThumbnailService.ts` write methods + `stacService.updateItemMetadataSync`).
- Web-shell: `apps/web-shell/src/services/stacWriterIdb.ts` (new IndexedDB implementation).

**Rationale**:
- The interface must be importable by both hosts. `shared/` is the only package layer that can be imported by both `apps/vscode` and `apps/web-shell` without crossing workspace boundaries.
- The interface is browser-safe by design — it uses `Uint8Array` for asset bytes (not Node `Buffer`), `string` for paths, and discriminated-union errors. Nothing prevents the web-shell from importing it.
- Each adaptor lives in its host because each is backend-specific: Node fs ↔ IndexedDB. There's no shared implementation to extract — the implementations are entirely different. What's shared is the *contract*, not the *code*.
- Article IV.4 (the new amendment): "the writer abstraction is the persistence boundary". The interface is that boundary. The adaptors are the host-side implementation of that boundary.

**Alternatives considered**:
- **Single `services/stac-writer/` Node module** (the previous draft) — rejected. Was tied to the Vite middleware approach; obsolete after R-001.
- **Interface inside `shared/components/`** — rejected. `shared/components/` is a UI-component package; mixing in domain-write contracts is mis-classification. Also makes the dependency graph unclear (`@debrief/components` should be the leaf, not the spine).
- **Interface inside `apps/vscode/src/services/`, web-shell imports cross-app** — rejected. Workspace conventions forbid app→app imports.
- **Duplicate interface definitions in each host** — rejected. DRY violation; types drift over time.

---

## R-003 — IndexedDB schema design

**Decision**: One IndexedDB database `debrief-stac-writer-v1` with four object stores. Keys are stable, indexes minimal, version explicit.

| Store | Key path | Value | Index |
|---|---|---|---|
| `items` | `itemPath` (string, e.g. `exercise-alpha/item.json`) | `{ kind: 'overlay' \| 'standalone', record: StacItem, baseRevision?: string, mtimeMs: number }` | none |
| `assets` | `[itemPath, assetKey]` (compound) | `{ blob: Blob, mediaType: string, byteLength: number, mtimeMs: number }` | by `itemPath` (for `deleteItem` cleanup) |
| `payloads` | `itemPath` (string) | `{ payload: string, mediaType: string, byteLength: number, mtimeMs: number }` (UTF-8 GeoJSON serialised; large items go through compression in a Phase 2 follow-up) | none |
| `meta` | `key` (string, e.g. `schemaVersion`, `firstWriteAt`, `persistGranted`) | `{ value: unknown }` | none |

Compound operations (capture, GeoJSON write + metadata patch) span all four stores in a single read-write transaction. IndexedDB's per-transaction atomicity is the load-bearing primitive.

**Rationale**:
- Four stores keep concerns separated: item records (small, frequently read), asset blobs (large, rarely re-read), GeoJSON payloads (medium, sometimes large), and a small key-value bag for capability/persistence flags.
- `[itemPath, assetKey]` compound keys give us O(1) asset lookup and an `itemPath` index for "delete all assets for this item" without scanning.
- Storing `kind: 'overlay' | 'standalone'` on items lets the overlay-merge code path branch cheaply. `baseRevision` is reserved for future use (R-004 says we don't track it explicitly in Phase 1, but the field is in the schema so we can backfill it later without a migration).
- Single database for the whole writer means single capability check and single transaction scope.
- Version `v1` baked into the database name (`debrief-stac-writer-v1`) so the next breaking change is a fresh database, not a schema migration. Pre-release freedom (Article XIV) lets us favour clean breaks over migration logic.

**Alternatives considered**:
- **One store with composite keys** — rejected. Mixing 5 KB item records with 200 KB blobs in one store wastes memory on `getAll` calls and slows index builds.
- **OPFS for assets, IndexedDB for metadata** — rejected for Phase 1 (mentioned in R-001). OPFS support inconsistency and test-stub immaturity rule it out for now.
- **`Cache API` for asset blobs** — rejected. Cache API is request/response shaped, not blob-shaped. Awkward fit; partial browser support for `cache.put` with arbitrary blobs.
- **Per-item databases** (e.g. `debrief-stac-item-exercise-alpha`) — rejected. Browsers limit number of databases per origin; transaction coordination across databases is impossible. Would be unworkable for cross-item operations.

---

## R-004 — Bundled-catalog overlay merge semantics

**Decision**: Locked by Q1=A, Q2=A.

- **Q1**: Bundled items are read-only demo content. The writer rejects `deleteItem` on a bundled `itemPath` with a `bundled-item-read-only` error. Patch operations against a bundled item land as **shallow-merge overlays** in the `items` IndexedDB store with `kind: 'overlay'`. New items the user creates are stored with `kind: 'standalone'` and have no bundled counterpart.
- **Q2**: Catalog read view computes `mergedItem = { ...bundledItem, properties: { ...bundledItem.properties, ...overlayItem.record.properties }, assets: { ...bundledItem.assets, ...overlayItem.record.assets } }` (shallow merge at top level for `properties` and `assets`; no field-level diff tracking). When the bundled item is updated upstream, the user's overlay still applies — fields the user touched continue to win, fields the user didn't touch pick up the upstream changes via the spread. Silent.

**Rationale**:
- Q1=A: bundled items are demo content, not user data. Treating them as read-only matches the analyst's mental model ("I can edit my work; the samples are fixed scaffolding"). No tombstone semantics keeps the merge layer simple.
- Q2=A: silent overlay-wins is the simplest mental model. The shallow-merge pattern means a user who only edited `description` automatically picks up upstream `debrief:platforms` changes — surprising in a good way for the common case.
- Shallow merge at the `properties` object means user-edited fields win wholesale (e.g. user-edited `debrief:platforms` shadows bundled `debrief:platforms` entirely; no array merging). This matches the existing `updateItemMetadata` semantics in #193 and is what users expect.
- The provenance log (`debrief:provenance_log`) merges as: bundled entries first, then overlay entries appended. New entries from subsequent patches append to the overlay's log — the bundled portion is treated as immutable history.

**Alternatives considered**:
- **Field-level merge** (Q2=B) — rejected. Doubles the IndexedDB schema (track which fields the user touched per item), adds merge UI complexity, premature for Phase 1.
- **Conflict prompt** (Q2=C) — rejected. Highest UX cost; rare event in practice (sample catalog rarely changes).
- **Bundled wins on update** (Q2=D) — rejected by user as punitive.
- **Tombstone deletes for bundled items** (Q1=B) — rejected. Shifts the conversation to "what happens when a bundled item is undeleted upstream after I tombstoned it", which is a rabbit-hole. Bundled-as-immutable side-steps the whole class.
- **Logically separate bundled from user items** (Q1=C) — rejected. Strongest mental model but kills the "edit a sample's description" flow that the Properties Panel was built for.

---

## R-005 — Cross-tab coordination

**Decision**: `BroadcastChannel('debrief-stac-writer-v1')` carries lightweight notifications:
```ts
type WriterBroadcast =
  | { kind: 'item-changed'; itemPath: string; mtimeMs: number }
  | { kind: 'item-deleted'; itemPath: string }
  | { kind: 'capability-changed' };  // e.g. user just granted persist permission
```
Each tab's `catalogReadView` subscribes; on receipt, it re-reads the affected item from IndexedDB and notifies its UI subscribers. Best-effort — if the receiving tab is hidden, browsers throttle or pause delivery; the next visibility-change triggers a full re-read.

**Rationale**:
- `BroadcastChannel` is browser-stdlib. No new dependency.
- Notifications are intentionally minimal: we tell tabs *what* changed, not *what the change was*. Each tab re-reads from IndexedDB to get the authoritative new state. Means the bus carries no payload-size risk and no schema-version coupling.
- `mtimeMs` lets a tab cheaply ignore notifications about state it already has (e.g. echoes of its own writes).
- Best-effort delivery aligns with last-write-wins (FR-015): there's no transactional coordination to lose.

**Alternatives considered**:
- **No coordination, manual reload** — rejected. Sibling-tab divergence becomes invisible and stale; bad UX.
- **`StorageEvent` on `localStorage`** — rejected. Limited payload, fires on storage *write* not on intent, no cross-process throttling control.
- **Web Locks API for cross-tab coordination** — rejected for Phase 1. We don't need locks; LWW is the agreed conflict model.

---

## R-006 — Article IV constitutional amendment wording (revised for IndexedDB)

**Decision**: Insert the following clause as Article IV.4:

> **IV.4 Persistence-host abstraction.** Frontends may persist data only via the unified writer abstraction. Browser-native stores (IndexedDB, OPFS, File System Access API) qualify as a persistence backend **only** when accessed through this abstraction — frontends never own a divergent write code path. The writer abstraction is the persistence boundary; both Node-side hosts and browser-side hosts route their writes through it. Each host implements the abstraction once, against its native backend; the rest of the system depends only on the interface.

Update the constitution's **Sync Impact Report** comment:
- Version change: 1.2.0 → 1.3.0 (MINOR — new principle, no breaking semantic change to existing clauses)
- Modified principles: IV (added IV.4)
- Templates requiring updates: none (IV.4 restricts implementation patterns; existing templates don't reference IV by clause)
- Follow-up TODOs: none

**Rationale (revised since the pivot)**:
- The earlier draft framed the amendment as "frontends may persist via Node-side host adaptors". The IndexedDB pivot makes that framing wrong: frontends *do* persist directly into a browser-native store. The amendment must own that.
- The load-bearing claim in IV.4 is that the **interface** is the boundary, not the host. A browser implementing IndexedDB writes behind the same `StacWriter` interface as VS Code's Node-fs writes is *not* a frontend persisting in violation of IV.2 — it's the abstraction extending into the browser, with the same operation surface and the same atomicity guarantees (scoped to whatever each backend supports).
- Pre-authorises future host implementations (mobile native, OPFS, server-backed) by establishing the principle once.

**Alternatives considered**:
- **Strike Article IV.2 entirely** — rejected. The principle (frontends don't own a divergent write path) is sound; only the absolute reading was wrong.
- **Re-word IV.2 in place** — rejected. Adding IV.4 is the smaller, more reviewable diff and preserves the original IV.2 wording for historical context.
- **Per-feature exception in Complexity Tracking** — rejected. Three features now lean on the host-adaptor pattern (#174, #215/#235, this one); the next will too. Constitution is the right home.

---

## R-007 — Third-party dependencies (`idb`, `fake-indexeddb`)

**Decision**: Add `idb` (≈ 5 KB minified gzipped, by Jake Archibald, Google) as a runtime dependency in `apps/web-shell` and `shared/stac-writer/` (peer). Add `fake-indexeddb` (≈ 30 KB) as a vitest-only dev dependency.

**Article IX justification**:
- **`idb`**: IndexedDB's native API is event-callback-based and verbose — every operation is `request.onsuccess = ...; request.onerror = ...;`. Wrapping in Promises by hand adds ≈ 200 LOC per operation file with non-trivial error semantics (request errors vs. transaction errors vs. version-change rejections). `idb` is the de-facto standard wrapper, in continuous maintenance for 8 years (last commit < 6 months), MIT-licensed, single-author by an authoritative source (Google web standards lead), zero transitive dependencies. The cost of *not* taking it is significantly higher than the cost of taking it.
- **`fake-indexeddb`**: in-memory IndexedDB implementation that lets vitest unit tests exercise the IndexedDB code path without a browser. The only mature option in the ecosystem (alternative `memory-pouchdb` is unmaintained, `IDBmock` last touched 2018). Tests-only, never ships to production.

**Pinned versions** (per Article IX.2): `idb@^8.0.0`, `fake-indexeddb@^6.0.0`. Pinned to current major; minor/patch upgrades go through normal `pnpm update` flow.

**Vendor lock-in concern (Article IX.3)**: `idb` is a thin Promise wrapper, not a framework. Its API surface mirrors IndexedDB's almost 1:1. Removing `idb` later would be a mechanical replacement — every `db.put(...)` becomes `request.onsuccess = ...`. No lock-in risk.

**Alternatives considered**:
- **No `idb`** — rejected. Adds substantial boilerplate, increases review surface, hurts reading speed.
- **`Dexie.js`** — rejected. Heavier (≈ 30 KB minified), opinionated query API we don't need (we have ≈ 6 operations and don't want a query DSL).
- **`localForage`** — rejected. Wraps IndexedDB but flattens it to a key-value API, losing the per-store schema and transactions we explicitly need.
- **No `fake-indexeddb`, run unit tests in real browsers** — rejected. Slows the test cycle by 10×, breaks the parametrised cross-adaptor suite, and means no IndexedDB tests run in vitest's `node` mode (where the rest of the writer's tests run).

---

## R-008 — Migration approach

**Decision**: Strangler-fig migration in three commits (revised for IndexedDB):

1. Land `shared/stac-writer/` (interface + types + errors + overlay-merge functions) and `apps/vscode/src/services/stacWriterFs.ts` (Node-fs adaptor — extracted from existing scene-thumbnail and update-metadata code paths). Both hosts still use their existing inline implementations. The new package and adaptor are tested but unused in production paths.
2. Switch VS Code's `sceneThumbnailService.writeSceneThumbnail` and `stacService.updateItemMetadataSync` to delegate to `stacWriterFs`. **In the same commit**, both `apps/vscode/src/services/stacService.ts` and `apps/web-shell/src/mocks/stacService.ts` delete their local `StacItem` and `PropertiesProvenanceEntry` declarations and import them from `@debrief/stac-writer` (review 2A — single source of truth). Existing test suites (`apps/vscode/tests/unit/`) continue to pass against the same observable behaviour. **Web-shell still session-only.**
3. Ship `apps/web-shell/src/services/stacWriterIdb.ts`, the catalog read view's overlay merge, the capability check, and the `BroadcastChannel` listener. Switch `webSceneThumbnailAdapter` and `mocks/stacService.ts` to call them. Add Playwright reload-survival tests against the static build. Constitution amendment IV.4 lands in this commit.

**Rationale**:
- Each commit is independently revertable. Commit 1 has zero behaviour change. Commit 2's regression risk is contained to VS Code and is detected by ≈ 1700 lines of existing test coverage. Only commit 3 introduces externally-observable behaviour change, and only on the web-shell.
- Bias toward atomic commits (Article XIII.1).

**Alternatives considered**:
- **Big-bang switch** — rejected. Higher review surface, harder to bisect.
- **Land web-shell first** — rejected. VS Code's existing test corpus is the safer first cut-over; web-shell is the higher-risk surface (newer test coverage, persistence behaviour previously untested).

---

## R-009 — ESLint enforcement of Article IV.4 (review 3A)

**Decision**: Add a custom rule to `shared/eslint-rules/` (the project's existing custom-ESLint home) named `no-direct-persistence-in-frontend.js`. Wire it into the existing ESLint config so it runs as part of `task lint`.

The rule enforces two checks:

1. **`no-restricted-imports`** — `node:fs` and `fs` imports are forbidden under `apps/web-shell/**`. Catches the obvious "developer accidentally imports Node fs into browser code" failure mode.
2. **`no-restricted-globals`** — `indexedDB`, `localStorage`, `sessionStorage`, and `caches` are forbidden outside the explicit host-adaptor files: `apps/web-shell/src/services/stacWriterIdb.ts` and `apps/web-shell/src/services/stacWriterCapability.ts`. The capability probe legitimately needs `globalThis.indexedDB` for feature detection; everywhere else routes through the writer interface.

**Rationale**:
- Article IV.4 codifies "the writer abstraction is the persistence boundary". Without enforcement, the principle is theatrical — a future PR can add direct `localStorage.setItem(...)` and the constitution provides no guard. ESLint catches it at lint time, before it ships.
- The project already has `shared/eslint-rules/`; cost is one new rule file (~30 LOC) plus three lines in the root ESLint config to wire it in. Article IX is satisfied — no new dependency, just an additional rule using the existing ESLint plumbing.
- "PR review only" (Issue #3 Option C) was rejected: Article XIII requires PR review *as well as* CI checks, not as a substitute. Article VI ("untested code is broken code") extends to "unenforced principles are theatrical principles".

**Alternatives considered**:
- **CI-only grep script** (Issue #3 Option B) — rejected. Brittle (false positives on string literals containing `localStorage`), slower feedback (CI vs editor), no IDE integration.
- **Trust PR review** (Issue #3 Option C) — rejected, see above.

**Future maintenance**: when a new host adaptor is added (e.g. OPFS, mobile), its file path joins the `no-restricted-globals` allow-list. One-line change. Same for any new browser-native store the rule should police (`localFile?`, future `Storage Buckets API`).

---

## Open questions

None remaining. All design decisions either fixed by the spec, locked by Q1/Q2/Q3 user decisions, or resolved above. Review 1A/2A/3A/4A folded back into the artefacts.
