# Contract — GitHub REST API surface

The navigator uses a small, fixed set of GitHub REST endpoints. All responses are validated by Zod schemas at the boundary (`src/github/schemas.ts`); domain code never sees raw JSON.

## Authentication

- All write endpoints require a Personal Access Token (classic) with `repo` scope, sent as `Authorization: Bearer <token>`.
- Read endpoints work with or without a token; without one, public-repo read is permitted but rate-limited.
- Token storage: `localStorage` key `backlog-navigator:github-pat` (envelope shape per `localstorage-schema.md`).
- Article X compliance: token is never logged, never interpolated into thrown error messages, never sent to any host other than `api.github.com`.

## Endpoints

### 1. Read `BACKLOG.md` from a ref

```
GET /repos/{owner}/{repo}/contents/BACKLOG.md?ref={ref}
Accept: application/vnd.github.v3+json
Authorization: Bearer {pat}    (optional for public repos)
```

**Response** (validated):
```ts
{
  type: 'file';
  encoding: 'base64';
  content: string;             // base64-encoded BACKLOG.md
  sha: string;                 // file SHA — used as baselineSha
  path: 'BACKLOG.md';
}
```

**Used by**:
- Initial load (live mode: `ref=main`; pr mode: `ref={pr.head.ref}`).
- Staleness detection at push time (re-fetch, compare `sha` to cached `baselineSha`).

**Errors handled**:
- 404 — repo or file not found; surfaces "Cannot find BACKLOG.md on `{ref}`".
- 401 — invalid PAT; clears stored PAT and re-prompts.
- 403 + `X-RateLimit-Remaining: 0` — surfaces "Rate-limited by GitHub; sign in with a PAT to raise the limit".

---

### 2. Get pull request metadata

```
GET /repos/{owner}/{repo}/pulls/{number}
Accept: application/vnd.github.v3+json
Authorization: Bearer {pat}    (optional for public PRs)
```

**Response** (validated):
```ts
{
  number: number;
  state: 'open' | 'closed';
  title: string;
  head: { ref: string; sha: string };
  html_url: string;
}
```

**Used by**:
- PR mode (`?pr=NNN`): resolve target branch and SHA; cache for the session.

**Errors handled**:
- 404 — PR not found; surfaces "PR #{NNN} does not exist in this repo".
- `state === 'closed'` — surfaces a banner ("PR #{NNN} is closed; switching to read-only mode").

---

### 3. Get a ref's current SHA (live mode push baseline)

```
GET /repos/{owner}/{repo}/git/ref/heads/{branch}
Accept: application/vnd.github.v3+json
Authorization: Bearer {pat}
```

**Response** (validated):
```ts
{
  ref: string;                 // "refs/heads/{branch}"
  object: { sha: string };
}
```

**Used by**:
- Live-mode push: read `main`'s current commit SHA to base the new branch on.

---

### 4. Create a new branch (live mode only)

```
POST /repos/{owner}/{repo}/git/refs
Authorization: Bearer {pat}
Content-Type: application/json

{
  "ref": "refs/heads/backlog-navigator/{slug}-{shortDate}",
  "sha": "{sha-of-main-tip}"
}
```

**Response** (validated): same shape as endpoint #3.

**Branch naming**: `backlog-navigator/{slug}-{shortDate}` where `{slug}` is a 6-char base36 hash of the user's chosen PR title (deterministic; collisions on same minute resolved by adding a sequence suffix). Example: `backlog-navigator/triage-batch-20260502`.

**Errors handled**:
- 422 (already exists) — append `-2`, `-3`, etc. and retry up to 5 times.

---

### 5. Commit `BACKLOG.md` change

```
PUT /repos/{owner}/{repo}/contents/BACKLOG.md
Authorization: Bearer {pat}
Content-Type: application/json

{
  "message": "{commit-message-from-PR-title-or-default}",
  "content": "{base64-encoded-new-BACKLOG.md}",
  "sha": "{baselineSha}",
  "branch": "{target-branch}"
}
```

**Response** (validated): standard Contents API write response (file + commit metadata). The navigator uses the new file `sha` to update its baseline (so subsequent pushes within the same session in PR mode work).

**The `sha` field is critical**: it is the staleness detector. If `BACKLOG.md` on `target-branch` has moved since the navigator loaded `baselineSha`, GitHub returns **409 Conflict** and the navigator triggers FR-025 (refuse, preserve, prompt reload).

**Used by**:
- Live mode: target = newly-created branch.
- PR mode: target = PR head ref (existing branch).
- Dry-run mode: this endpoint is **not called** (FR-029 — no GitHub side-effects).

**Errors handled**:
- 409 — "Backlog has moved since you loaded it; reload and re-apply your edits."
- 401 — see endpoint #1.
- 403 (scope) — "Your PAT lacks `repo` scope; update it in settings."
- 422 — defensive parse of the body for "already exists" / size errors.

---

### 6. Open pull request (live mode only)

```
POST /repos/{owner}/{repo}/pulls
Authorization: Bearer {pat}
Content-Type: application/json

{
  "title": "{user-supplied-pr-title}",
  "body": "{user-supplied-pr-body}",
  "head": "{branch-from-#4}",
  "base": "main"
}
```

**Response** (validated):
```ts
{
  number: number;
  html_url: string;
  state: 'open' | 'closed';
}
```

**Used by**:
- Live mode only. PR mode appends a commit (#5) and stops.

---

## Sequence — live-mode push

```
1. GET ref/heads/main          → currentMainSha
2. POST git/refs               → branch backlog-navigator/{slug}
3. PUT contents/BACKLOG.md     → commit (sha = baselineSha)  // 409 here = stale base
4. POST pulls                  → PR opened
5. clear staging               → success
```

## Sequence — PR-mode push

```
1. GET pulls/{N} (cached at load)   → head.ref, head.sha
2. PUT contents/BACKLOG.md           → commit (sha = baselineSha)  // 409 here = stale base
3. clear staging                     → success
```

## Sequence — dry-run

```
1. (nothing — no API calls beyond the initial read)
2. show "preview submission" banner
3. preserve staging (FR-031)
```

## Rate-limit posture

The navigator holds at most **6 API calls per push** in live mode (1 + 1 + 1 + 1 = 4 writes; plus the initial read; plus the staleness re-check folded into #5's PUT). PR mode is 2. Authenticated rate limit is 5000/hour, so even pessimistic usage is far below the cap.

## What the navigator does NOT do

- Does not use the **Git Data API** for blob/tree/commit construction. The Contents API is sufficient for single-file edits and produces identical results with simpler error handling.
- Does not call any non-`api.github.com` host.
- Does not store any credentials beyond the PAT envelope. No OAuth tokens, no installation tokens, no refresh tokens.
- Does not poll. All read calls are user-driven (initial load + push-time staleness re-check).
