# Patch 02 — Multi-consumer URL shim (`?repo=&branch=` + legacy `?pr=`)

## What

Extend the URL parser so the SPA accepts:

- `?repo=<org>/<name>&branch=<branch>` — explicit non-debrief consumer (new form), and
- `?pr=<n>` — debrief-future PR number (legacy form, the shape `spec-navigator-comment.yml` has emitted since #191).

Both forms route the rest of the app through the existing `ApiOptions` / `useFeature` flow. The legacy form resolves the PR number → branch via the existing GitHub PR API call (already used by `useFeature`), then proceeds as if `?repo=debrief/debrief-future&branch=<resolved>` had been supplied.

## Why

Decision **1A** in `/speckit.review` made permanent backward compatibility with `?pr=<n>` non-negotiable: every PR comment ever posted by `spec-navigator-comment.yml` since #191 would 404 without this. The shim is small (a few lines in the URL parser) and isolates the legacy form from the rest of the code.

## How

### Step 1 — Rename the parser

The current source has `parsePrNumber()` inline in `App.tsx`. Promote it to a small dedicated module that returns a typed object the rest of the app consumes.

Create `src/state/parseUrlParams.ts`:

```ts
import { DEFAULT_OWNER, DEFAULT_REPO } from '../defaults';

export interface ResolvedUrlParams {
  /** Explicit consumer in <org>/<name> form (after env defaults applied). */
  owner: string;
  repo: string;
  /** Branch on the consumer repo. `null` means "use repo default". */
  branch: string | null;
  /** Legacy PR shortcut. When non-null, branch is derived by resolving this PR. */
  prNumber: number | null;
  /** Non-blocking warnings to surface in the UI. */
  warnings: string[];
}

const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const PR_RE = /^[0-9]+$/;

export function parseUrlParams(search: string): ResolvedUrlParams {
  const params = new URLSearchParams(search);
  const warnings: string[] = [];

  let owner = DEFAULT_OWNER;
  let repo = DEFAULT_REPO;
  let branch: string | null = null;
  let prNumber: number | null = null;

  const repoRaw = params.get('repo');
  const branchRaw = params.get('branch');
  const prRaw = params.get('pr');

  if (repoRaw) {
    if (REPO_RE.test(repoRaw)) {
      const [o, r] = repoRaw.split('/');
      owner = o;
      repo = r;
    } else {
      warnings.push(`Ignoring malformed ?repo= value: "${repoRaw}".`);
    }
  }

  if (branchRaw) {
    branch = branchRaw;
  }

  if (prRaw) {
    if (PR_RE.test(prRaw)) {
      const n = Number.parseInt(prRaw, 10);
      if (Number.isFinite(n) && n > 0) prNumber = n;
    } else {
      warnings.push(`Ignoring malformed ?pr= value: "${prRaw}".`);
    }
  }

  // Precedence: explicit ?repo=/?branch= wins when both forms appear.
  if (prNumber !== null && (repoRaw || branchRaw)) {
    warnings.push('Both ?pr= and ?repo=/?branch= were supplied; using the explicit form.');
    prNumber = null;
  }

  return { owner, repo, branch, prNumber, warnings };
}
```

### Step 2 — Wire it in

Replace `App.tsx`'s inlined `parsePrNumber()` with a call to `parseUrlParams(window.location.search)`. Pass the resulting `{ owner, repo }` through to `useFeature` as `ApiOptions`. When `prNumber` is non-null, resolve it through the existing `fetchPullRequest` call to derive the branch, then proceed.

When `branch` is non-null but `prNumber` is null, skip the PR lookup and load the branch's specs directly. (This requires a second `useFeature` mode that takes a branch sha rather than a PR number — the existing `fetchContentsListing` accepts `ref` so the change is small.)

### Step 3 — Add tests

Create `src/state/__tests__/parseUrlParams.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseUrlParams } from '../parseUrlParams';

describe('parseUrlParams', () => {
  it('returns env defaults for an empty querystring', () => {
    const r = parseUrlParams('');
    expect(r.owner).toBe('debrief'); // assuming defaults env vars unset
    expect(r.repo).toBe('debrief-future');
    expect(r.branch).toBeNull();
    expect(r.prNumber).toBeNull();
  });

  it('parses ?repo=&branch= correctly', () => {
    const r = parseUrlParams('?repo=acme/foo&branch=feat/x');
    expect(r.owner).toBe('acme');
    expect(r.repo).toBe('foo');
    expect(r.branch).toBe('feat/x');
  });

  it('parses legacy ?pr= correctly', () => {
    const r = parseUrlParams('?pr=512');
    expect(r.prNumber).toBe(512);
  });

  it('rejects malformed ?repo=', () => {
    const r = parseUrlParams('?repo=not-a-slug');
    expect(r.owner).toBe('debrief'); // fell back to default
    expect(r.warnings).toContain('Ignoring malformed ?repo= value: "not-a-slug".');
  });

  it('explicit ?repo= wins over ?pr= when both supplied', () => {
    const r = parseUrlParams('?repo=acme/foo&pr=512');
    expect(r.owner).toBe('acme');
    expect(r.prNumber).toBeNull();
    expect(r.warnings.some(w => w.includes('explicit form'))).toBe(true);
  });
});
```

### Step 4 — Add a Playwright test for both shapes

Add `e2e/url-shapes.spec.ts` that exercises:

1. `?pr=<known-PR>` → renders that PR's specs (uses bundled fixtures).
2. `?repo=octocat/hello-world&branch=master` → renders that repo's specs (or a non-error empty state).
3. `?repo=octocat/hello-world&pr=512` → uses `?repo=` form, ignores `?pr=`.

## Verify

```sh
pnpm test src/state/__tests__/parseUrlParams.test.ts
pnpm test:e2e e2e/url-shapes.spec.ts
```

## Commit message

```
feat(url): accept ?repo=&branch= alongside legacy ?pr=

Standalone-repo deployment must serve any consumer; the legacy form
that spec-navigator-comment.yml has emitted since #191 stays
permanently supported. Per /speckit.review decision 1A.
```
