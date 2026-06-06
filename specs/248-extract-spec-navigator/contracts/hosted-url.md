# Contract: Hosted-instance URL

The hosted spec-navigator at `https://debrief.github.io/spec-navigator/` is a single deployment that serves any consumer. Consumers are selected via URL query-string parameters.

`/speckit.review` decision **1A** mandates that the hosted SPA accept **both** the legacy `?pr=<n>` form (the shape `spec-navigator-comment.yml` has emitted on every PR comment since #191) and the new `?repo=&branch=` form (added by this feature for non-debrief consumers). The legacy form is permanent — the comment template can be flipped to the new form independently and at leisure, but the SPA never stops accepting `?pr=`.

## Accepted parameters

| Parameter | Type | Required | Default | Notes |
|---|---|---|---|---|
| `repo` | `string` | No | bundled debrief default (`debrief/debrief-future`) | Must match `^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$`. Rejected values fall back to default with a warning banner. |
| `branch` | `string` | No | consumer repo's default branch | Plain branch name. Slashes (`feat/x`) URL-encoded or raw both accepted. |
| `pr` | `string` (digits) | No | — | **Legacy form.** Must match `^[0-9]+$`. Resolves the PR number against `debrief/debrief-future` via the existing GitHub API call (the same flow #191 has used since launch), then proceeds as if `?repo=debrief/debrief-future&branch=<resolved-branch>` had been supplied. Bad values fall back to default with a warning banner. |

## Resolution precedence (when multiple forms are present in the same URL)

If both `?pr=` and `?repo=`/`?branch=` are supplied in the same URL, the explicit `?repo=`/`?branch=` form wins and `?pr=` is ignored (with a non-blocking note in the page footer that mixed forms were detected). This keeps deep-links to non-debrief repos unambiguous.

## Explicit non-parameters

The following parameters are **never** accepted, even if present in the URL:

| Parameter | Why not |
|---|---|
| `pat`, `token`, `auth` | PATs travel through `localStorage` only. URL-bound credentials would leak into browser history, server logs, and `Referer` headers. |
| `specsPath`, `featureDirPattern`, `artefactFilenames`, `labels`, `branding.*` | Repository-shape configuration is bake-time, not request-time. Adopters who want different defaults fork the source or use build-time `VITE_*` env vars. |

Unknown parameters are silently ignored; this keeps deep-links forward-compatible when future versions add accepted parameters.

## Examples

```
# Default — debrief-future, default branch
https://debrief.github.io/spec-navigator/

# Legacy form (current spec-navigator-comment.yml output) — PR number resolves to its branch on debrief/debrief-future
https://debrief.github.io/spec-navigator/?pr=512

# New form — non-debrief consumer
https://debrief.github.io/spec-navigator/?repo=acme/our-platform

# New form — specific branch on debrief-future (post-comment-template-flip)
https://debrief.github.io/spec-navigator/?repo=debrief/debrief-future&branch=claude/bold-noether-wWKle

# Deep link to a specific feature within a branch
https://debrief.github.io/spec-navigator/?repo=debrief/debrief-future&branch=main#/specs/248-extract-spec-navigator
```

The hash fragment (`#/specs/...`) is owned by the navigator's internal router and is unchanged by this feature.

## Interaction with the existing `localStorage` PAT envelope

When the resolved `repo` differs from the value used the previous time the user authenticated, the navigator **does not** silently send the cached PAT to the new repository's API calls. The user is shown a one-time prompt: "You have a saved PAT for `debrief/debrief-future`. Use it for `acme/our-platform`?" with explicit consent required. Per-repo PAT scoping prevents cross-org credential drift.

## Compatibility with the debrief-future review-app comment

In Phase 3, `spec-navigator-comment.yml` is updated to swap the URL host to `https://debrief.github.io/spec-navigator/` while continuing to emit the `?pr=<n>` form it has always used:

```
🚀 Preview Deployments

| Surface         | URL                                                  |
|-----------------|------------------------------------------------------|
| spec-navigator  | https://debrief.github.io/spec-navigator/?pr=<n>     |
| Code Server     | https://...                                          |
| Storybook       | https://...                                          |
```

The `<n>` token is filled in by the existing PR-comment workflow at the time of comment generation. The shim in the SPA resolves the PR number to its branch and renders the right specs.

When the team decides to flip the comment template to the new explicit form (`?repo=debrief/debrief-future&branch=<pr-branch>`), that change can land independently — the SPA accepts both forms permanently, so there is no deadline.
