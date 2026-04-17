# GitHub REST Contracts (narrowed subsets we rely on)

The navigator is the only consumer of these responses and touches only a small fraction of each. The subsets below are what `github/schemas.ts` parses with `zod`; everything else is discarded at the boundary. This keeps our type surface honest per Constitution Article XV (no `any`).

All endpoints are called with `Authorization: Bearer <pat>` and `Accept: application/vnd.github+json` (except raw content — see below).

---

## 1. Get Pull Request

**GET** `https://api.github.com/repos/{owner}/{repo}/pulls/{pull_number}`

**We read** (subset):

```ts
{
  number: number;                // echoes the request
  state: 'open' | 'closed';
  title: string;
  head: {
    sha: string;                 // 40-char hex — pinned for all content reads
    ref: string;                 // branch name
  };
}
```

**We ignore**: user, labels, assignees, milestones, review metadata, diff stats, body, merge metadata, reactions, links, *.* (everything else).

**Errors**: 404 → "PR not found or credential cannot see it." 401 → "Credential rejected by GitHub." 403 with `X-RateLimit-Remaining: 0` → "GitHub rate limit hit — try again later."

---

## 2. Get Repository Contents (folder listing)

**GET** `https://api.github.com/repos/{owner}/{repo}/contents/{path}?ref={sha}`

When `path` is a directory, the response is an **array** of file/subfolder entries:

```ts
Array<{
  name: string;
  path: string;                  // repo-relative
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  size: number;                  // bytes (0 for dirs)
  sha: string;
  download_url: string | null;   // raw.githubusercontent.com URL for files
}>
```

**We read**: `name`, `path`, `type`, `size`, `download_url`.
**We ignore**: `sha` at the file level (we only need it at the PR level for pinning), `_links`, `html_url`, `git_url`, `encoding`, `content` (we don't base64-decode inline; we fetch from `download_url` instead — cleaner and larger-file-tolerant).

**Traversal rule**: the navigator recursively lists the `{featureFolder}` directory only. Subdirectories: `contracts/`, `evidence/`, `checklists/`, and any `*-data/` folder are descended; everything else is presented flat with its computed `kind` badge.

---

## 3. Get Raw File Content

**GET** `https://raw.githubusercontent.com/{owner}/{repo}/{sha}/{path}`

No JSON; the body **is** the file.

- Text MIME types: parsed as UTF-8 string.
- Image MIME types: stored as a `Blob` and rendered via `URL.createObjectURL`.
- Unknown MIME: refused, with a "Cannot preview this file type" state in the artefact view.

We pin every raw fetch to the PR's `head.sha`, so reviewers always see the commit under review.

---

## 4. Create an Issue Comment (Submit)

**POST** `https://api.github.com/repos/{owner}/{repo}/issues/{pr_number}/comments`

Body:

```json
{ "body": "<the rendered PR comment, including the spec-review-feedback-v1 fenced block>" }
```

Response subset:

```ts
{
  id: number;                    // numeric comment id
  html_url: string;              // link we show the reviewer on success
  created_at: string;            // ISO-8601
}
```

We ignore user, node_id, issue_url, reactions, author_association, body (we already have what we sent).

**Errors**:
- 401 / 403 → "Credential cannot post comments on this PR. Check scope (pull-requests: write)."
- 404 → "PR no longer exists or has become private."
- 422 → surfaced verbatim in an error banner (GitHub validation failed — shouldn't happen given schema validation, but defended).
- Network error → "Failed to submit — local draft kept. Retry when connection returns."

---

## Rate-limit posture

For an authenticated reviewer, GitHub's REST rate limit is 5000 req/hour — more than enough for this tool. Each review session makes:
- 1 × PR fetch
- 1 × folder listing
- N × raw content fetches (N = count of artefacts actually *opened*, not total)
- 1 × Submit

Typical worst-case: ~15–25 requests per review. No pagination handling required for sensible spec folders; if a folder exceeds 100 entries we surface a "this folder is unusually large" banner and add pagination handling in a follow-up.

---

## What we do NOT call

Explicitly out-of-scope for v1:

- **GraphQL v4** — REST is sufficient and the `zod` parser set is already small.
- **Reviews API** (`/pulls/:num/reviews`) — we post a single issue comment, not a review.
- **Line-comment API** (`/pulls/:num/comments`) — out-of-scope per spec.
- **User / viewer / identity endpoints** — we do not cache identity; the PAT itself is the only credential material we touch.
