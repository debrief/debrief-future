# Usage Example: Configuring spec-navigator for a non-default repo

This example demonstrates the Phase 1 deliverable: spec-navigator will render any GitHub repository's specs once an adopter configures the build-time env vars. No source-code changes required.

## Default deployment (this branch's behaviour, unchanged)

With no env vars set, `apps/spec-navigator/src/defaults.ts` falls back to:

```ts
DEFAULT_OWNER       = 'debrief'
DEFAULT_REPO        = 'debrief-future'
DEFAULT_REPO_LABEL  = 'debrief/debrief-future'
```

The hosted instance and all visible UI strings are byte-for-byte identical to pre-Phase-1 behaviour, including the PAT scope guidance, the SpecBrowserModal title, and the OpenPrList empty message.

## Retargeting via env vars (the standalone-repo case)

A maintainer building spec-navigator for a different consumer sets:

```sh
VITE_DEFAULT_OWNER=acme \
VITE_DEFAULT_REPO=our-platform \
pnpm --filter @debrief/spec-navigator build
```

The bundled SPA now defaults to `acme/our-platform`, and every user-facing string interpolates the new label:

| Source string | Default render | Render with `acme/our-platform` |
|---|---|---|
| `strings.settings.patHelp` | "Generate a fine-grained personal access token scoped to debrief/debrief-future …" | "Generate a fine-grained personal access token scoped to acme/our-platform …" |
| `strings.openPrList.empty` | "No open pull requests on debrief/debrief-future." | "No open pull requests on acme/our-platform." |
| `strings.specBrowser.modalTitle` | "Open pull requests on debrief/debrief-future" | "Open pull requests on acme/our-platform" |

Plus, every GitHub API call (`fetchPullRequest`, `fetchOpenPullRequests`, `fetchContentsListing`, `fetchChangedFiles`, `fetchRawText`, `fetchRawBlob`, `createIssueComment`) targets the new repo by default — no URL parameter required.

## Verification: zero debrief literals in `src/` outside fallbacks

```sh
$ grep -rEn "'debrief'|\"debrief\"|debrief-future|debrief\\.github\\.io" apps/spec-navigator/src/
apps/spec-navigator/src/defaults.ts:9: * The literal `'debrief'` / `'debrief-future'` strings appear here, and only here,
apps/spec-navigator/src/defaults.ts:23:export const DEFAULT_OWNER: string = importMetaEnv.VITE_DEFAULT_OWNER ?? 'debrief';
apps/spec-navigator/src/defaults.ts:24:export const DEFAULT_REPO: string = importMetaEnv.VITE_DEFAULT_REPO ?? 'debrief-future';
apps/spec-navigator/src/defaults.ts:28: * Used by user-facing strings that previously inlined `debrief/debrief-future`
```

All four matches are in the single fallback module. Two are TSDoc comments; two are `??` fallback expressions. The Phase 1 acceptance criterion ("no debrief literal remains in `src/` after Phase 1, outside default-fallback expressions") is met.

## What this enables

- **Phase 2** (extraction kit, committed under `extraction-kit/`): the maintainer subtree-splits the app, sets `VITE_DEFAULT_OWNER=debrief` + `VITE_DEFAULT_REPO=debrief-future` on the new repo's deploy job, and the build behaves exactly as today. Adopters who fork override these two env vars and they're done.
- **Phase 3** (cutover): debrief-future deletes `apps/spec-navigator/`; the hosted instance at `https://debrief.github.io/spec-navigator/` continues to render debrief-future specs by default. See `extraction-kit/PHASE3-RUNBOOK.md`.

## Why this is sufficient (no `Configuration` entity needed)

`/speckit.review` decision **2A** rejected the proposed `Configuration` entity / `src/config/` module / JSON Schema / Zod boundary in favour of:

1. The existing `ApiOptions` typed seam in `src/github/api.ts` (per-call override).
2. Two env-var constants in `src/defaults.ts` (build-time defaults).
3. Three named constants in `src/strings.ts` (vendor string interpolation).

Three seams for three different concerns, no duplication. The code added by Phase 1 is ~25 lines of TypeScript in one new file plus light edits in four existing ones.
