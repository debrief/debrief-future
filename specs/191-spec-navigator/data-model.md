# Phase 1 Data Model: Spec Navigator & Review Tool

**Branch**: `191-spec-navigator`
**Date**: 2026-04-17

All types below are **in-memory / localStorage only**. Nothing is persisted server-side. The only data that leaves the device is the serialised `Submission` POSTed as a single PR comment (see `contracts/spec-review-feedback-v1.schema.json`).

---

## Entities

### `FeatureScope`

The thing the reviewer is currently reviewing. Derived once from the URL at page load.

| Field | Type | Notes |
|-------|------|-------|
| `prNumber` | `number` (positive integer) | From `?pr=<n>` query param. Required. |
| `repoOwner` | `string` | Derived — defaults to `"debrief"` (config-time constant; not user-editable for v1). |
| `repoName` | `string` | Derived — defaults to `"debrief-future"`. |
| `headSha` | `string` (SHA-1 hex, 40 chars) | Resolved from GitHub `GET /pulls/:num` at load. Every content fetch pins to this SHA. |
| `featureFolder` | `string` | e.g. `specs/186-filter-chips`. Derived from the PR's changed files (the single `specs/NNN-*/` folder touched). |

**State transitions**:
- `idle` → `loading` (on mount) → `loaded` (on success) | `error` (on failure).
- A `FeatureScope` is immutable once `loaded`. Re-navigating to a different `?pr=` remounts the app with a fresh scope.

**Validation**:
- `prNumber` must parse as a positive integer.
- `featureFolder` must match `/^specs\/\d{3,}-[a-z0-9-]+$/`; if no such folder is touched by the PR, the app errors with "No feature folder found in this PR" (spec edge case).

---

### `Artefact`

One file inside the feature folder.

| Field | Type | Notes |
|-------|------|-------|
| `path` | `string` | Repo-relative, e.g. `specs/186-filter-chips/plan.md`. Primary key within a `FeatureScope`. |
| `kind` | `'spec' \| 'plan' \| 'tasks' \| 'research' \| 'data-model' \| 'quickstart' \| 'contract' \| 'evidence-image' \| 'evidence-doc' \| 'other'` | Derived from filename + location via `classifyArtefact(path)`. |
| `mimeType` | `'text/markdown' \| 'application/json' \| 'application/yaml' \| 'image/png' \| 'image/jpeg' \| 'image/gif' \| 'application/octet-stream'` | Derived from file extension. |
| `size` | `number` (bytes) | From the Contents API response. Used to warn on unusually large files. |
| `content` | `string \| Blob \| null` | `null` until fetched. Fetched lazily on first selection. Strings for text kinds; `Blob` for images. |
| `fetchedAt` | `string` (ISO-8601) \| `null` | Set when content is first materialised. Used by `selectionAnchor` to record the source-at-fetch-time. |

**State transitions**:
- `unfetched` → `fetching` → `loaded` | `fetch-failed`.
- An artefact that `fetch-failed` can be retried; no exponential backoff needed at these volumes.

**Validation**:
- `path` must start with `featureFolder` + `/`.
- Images over 5 MB are shown with a "this file is unusually large" notice but still rendered.

---

### `Comment`

A single feedback item. The **same** TypeScript type serves both in-memory drafting and the submitted wire payload: there is one discriminated union over `level`, with draft-only timestamp fields declared optional so they are simply carried through on submit (reviewer decision 7C).

```ts
type CommentTag =
  | 'question'
  | 'scope-concern'
  | 'test-gap'
  | 'nit'
  | 'blocker';                         // 5-value closed vocabulary, matches spec.md FR-015

interface CommentBase {
  id: string;                          // ULID; never reused
  body: string;                        // Reviewer's free text; required, non-empty, trimmed, ≤10000 chars
  tag?: CommentTag;
  // Draft-only fields — optional on the wire, present while drafting:
  createdAt?: string;                  // ISO-8601 UTC
  updatedAt?: string;                  // ISO-8601 UTC; === createdAt on first save
}

interface FeatureLevelComment extends CommentBase {
  level: 'feature';
}

interface DocumentLevelComment extends CommentBase {
  level: 'document';
  path: string;                        // Must reference a known Artefact.path
}

interface SelectionLevelComment extends CommentBase {
  level: 'selection';
  path: string;                        // Must reference a known Artefact.path
  snippet: string;                     // Verbatim selection, 1–2000 chars
  contextBefore: string;               // Up to ~60 chars of source immediately before `snippet`
  contextAfter: string;                // Up to ~60 chars of source immediately after `snippet`
  anchorHash: string;                  // Pinned format: <first20>\x1F<last20>\x1F<offset>
                                       //   where first20/last20 are chars of `snippet`, \x1F is
                                       //   ASCII US, and offset is the char index of the snippet's
                                       //   first char in the raw source at fetch time.
                                       //   See research.md §2.
}

type Comment = FeatureLevelComment | DocumentLevelComment | SelectionLevelComment;
```

**Invariants**:
- `id` is stable across edits (used as the React key and the anchor key in the submitted payload).
- `snippet` is never truncated during storage; if the reviewer selected 1900 chars, 1900 chars are kept. Above 2000 we refuse and ask the reviewer to narrow the selection (guard against accidental whole-document selection).
- `contextBefore` and `contextAfter` are trimmed so they end/start on a word boundary where possible; they are **never** empty strings — if the snippet starts at offset 0, `contextBefore === ''` is allowed (and only then). Same principle at end-of-file for `contextAfter`.
- `body` cannot be empty; the UI prevents saving an empty comment.
- `level === 'document' | 'selection'` implies `path` exists in the current `Artefact[]`. A draft referencing a vanished path (e.g. file deleted between sessions) surfaces a "stale comment" badge and blocks submission until the reviewer resolves it.
- The same `Comment` shape is written to `localStorage` and sent on the wire. Draft-only `createdAt` / `updatedAt` travel with the payload; the wire receiver ignores them.

---

### `DraftCommentSet`

The unit of `localStorage` persistence.

```ts
interface DraftCommentSet {
  schemaVersion: 1;                    // Bumped on any breaking shape change
  prNumber: number;                    // Redundant with localStorage key, but guards against key collisions
  featureFolder: string;               // For the stale-comment check on reload
  originalHeadSha: string;             // The PR head commit at load time. Pinned once; used on
                                       //   Submit to detect force-pushes and to populate the
                                       //   `originalHeadSha` field of the wire payload.
  comments: Comment[];
  lastModified: string;                // ISO-8601 UTC
}
```

**Storage contract**:
- Key: `spec-navigator:drafts:pr-<n>`
- Value: JSON-serialised `DraftCommentSet`
- On load: if `schemaVersion !== 1`, run migration; on failure, quarantine the payload into `spec-navigator:quarantine:<timestamp>` and start fresh with an empty set (never silently discard).
- On every mutation to `comments`: rewrite the value synchronously. On `QuotaExceededError`: surface banner per `research.md §6`.

---

### `Credential`

Just the PAT string and its metadata.

```ts
interface Credential {
  pat: string;                         // Opaque GitHub token
  savedAt: string;                     // ISO-8601
  // Never stored: a cached "username" or "scopes" fingerprint — those can leak identity
  //                if the token ever appears in a screenshot / shared browser.
}
```

**Storage contract**:
- Key: `spec-navigator:github-pat`
- Value: JSON-serialised `Credential`
- Cleared on explicit user action; not cleared on any automatic trigger (app-level errors do not wipe the token).

**Security invariants**:
- Never rendered to the DOM as text.
- Never included in a log line, an error message, or a thrown `Error`.
- Only used in `Authorization: Bearer <pat>` headers to origins `api.github.com` and `raw.githubusercontent.com`.

---

### `Submission`

The artefact produced by Submit. The on-the-wire form is a single PR-comment POST body; the in-memory form is the pre-serialisation object. Per decision 7C, `Submission.comments` is the **same** `Comment[]` that was used in-memory — no separate `SubmittedComment` type.

```ts
interface Submission {
  schemaVersion: 'spec-review-feedback-v1';
  feature: string;                     // e.g. "186-filter-chips"
  pr: number;
  originalHeadSha: string;             // 40-char hex — PR head at load time
  submittedAtHeadSha: string;          // 40-char hex — PR head at POST time (may equal originalHeadSha)
  submittedAt: string;                 // ISO-8601 UTC — set at POST time
  comments: Comment[];                 // Unified Comment type — see above
}
```

**Invariants**:
- `schemaVersion` is a literal and MUST match the fenced-block tag (`json spec-review-feedback-v1`).
- `submittedAt` is set at POST time, not at draft time.
- `originalHeadSha` is captured at load time and stored in the `DraftCommentSet`; it is not computed at submit time.
- `submittedAtHeadSha` is re-fetched immediately before POST. If `submittedAtHeadSha !== originalHeadSha`, the reviewer has been shown the `StaleHeadModal` and chosen to submit anyway (see research.md §12).
- The `Comment[]` is passed through as-is. Optional `createdAt` / `updatedAt` fields on each comment are carried over; the wire reader ignores them but they are valid under the schema.

---

## Relationships

```
FeatureScope 1 ── * Artefact            (artefacts belong to a scope)
DraftCommentSet 1 ── * Comment          (a submission's worth of drafts)
Comment (level in {document, selection}) ─→ Artefact.path (non-enforced ref; stale refs flagged)
DraftCommentSet → Submission            (pure projection at POST time; one-to-one — the
                                         Comment[] passes through unchanged, Submission only
                                         adds schemaVersion, feature, pr, submittedAt, and the
                                         two head-SHA fields)
Credential      (standalone, not tied to a scope — a reviewer uses one PAT across all PRs)
```

---

## Validation rules (compiled from spec FRs)

| Rule | Source FR | Enforcement point |
|------|-----------|-------------------|
| `comments.length > 0` before Submit | FR-027 | `SubmitButton` disables when empty; reducer also rejects |
| Submit is single-flight | FR-028 | `SubmitButton` sets `submitting` flag; button disabled; any re-trigger no-ops |
| Drafts scoped per PR | FR-020 | Per-PR localStorage key |
| No PAT transmitted except to GitHub | FR-032 + CSP | `github/api.ts` is the *only* module that reads the PAT, and the CSP `connect-src` allowlist prevents any other origin being contacted even by a compromised dep |
| Drafts cleared after success | FR-022 | Reducer emits `SUBMIT_OK`; persistence layer clears the key |
| Source view === rendered view data | FR-010 | `ArtifactView` renders from the same `content` string for both modes |
| Stale head detected on Submit | FR-029a | `SubmitButton` re-fetches `GET /pulls/:n` and compares `head.sha` with `DraftCommentSet.originalHeadSha`; shows `StaleHeadModal` if they differ |
| Both SHAs in payload when stale | FR-029b | `renderFeedbackComment` emits both `originalHeadSha` and `submittedAtHeadSha` unconditionally (they are equal in the common case) |
| 5-value tag vocabulary closed | FR-015 | `CommentTag` is a TS literal union; JSON Schema enum matches; UI pickers render all 5 |
| Anchor format is pinned | FR-016 | `selectionAnchor.ts` produces `<first20>\x1F<last20>\x1F<offset>`; golden fixture diffed on every test run |
| Bundle size ≤ 400 KB gzipped | SC-005 | `__tests__/bundleSize.test.ts` reads built `dist/` after `vite build` |
| CSP present with correct allowlist | Article X | `__tests__/cspPresence.test.ts` parses `dist/index.html` meta tag |

---

## Out-of-scope (not modelled in v1)

- Multi-user merging of drafts (single-device only).
- A `resolved` flag on submitted comments (handled downstream by the PR watcher).
- A history / audit of past submissions (no server-side state).
- Diff-aware comments (tied to PR diff, not to spec content).
