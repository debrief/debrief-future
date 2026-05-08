# Contract: Hosted-instance URL

The hosted spec-navigator at `https://debrief.github.io/spec-navigator/` is a single deployment that serves any consumer. Consumers are selected via URL query-string parameters.

## Accepted parameters

| Parameter | Type | Required | Default | Notes |
|---|---|---|---|---|
| `repo` | `string` | No | bundled debrief default (`debrief/debrief-future`) | Must match `^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$`. Rejected values fall back to default with a warning banner. |
| `branch` | `string` | No | consumer repo's default branch | Plain branch name. Slashes (`feat/x`) URL-encoded or raw both accepted. |

## Explicit non-parameters

The following parameters are **never** accepted, even if present in the URL:

| Parameter | Why not |
|---|---|
| `pat`, `token`, `auth` | PATs travel through `localStorage` only. URL-bound credentials would leak into browser history, server logs, and `Referer` headers. |
| `specsPath`, `featureDirPattern`, `artefactFilenames`, `labels`, `branding.*` | Repository-shape configuration is bake-time, not request-time. Adopters who want different defaults fork the source or use build-time env vars. |

Unknown parameters are silently ignored; this keeps deep-links forward-compatible when future versions add accepted parameters.

## Examples

```
# Default — debrief-future, default branch
https://debrief.github.io/spec-navigator/

# Different consumer
https://debrief.github.io/spec-navigator/?repo=acme/our-platform

# Specific branch (e.g., per-PR review-app comment)
https://debrief.github.io/spec-navigator/?repo=debrief/debrief-future&branch=claude/bold-noether-wWKle

# Deep link to a specific feature within a branch
https://debrief.github.io/spec-navigator/?repo=debrief/debrief-future&branch=main#/specs/248-extract-spec-navigator
```

The hash fragment (`#/specs/...`) is owned by the navigator's internal router and is unchanged by this feature.

## Interaction with the existing `localStorage` PAT envelope

When `repo` differs from the value used the previous time the user authenticated, the navigator **does not** silently send the cached PAT to the new repository's API calls. The user is shown a one-time prompt: "You have a saved PAT for `debrief/debrief-future`. Use it for `acme/our-platform`?" with explicit consent required. Per-repo PAT scoping prevents cross-org credential drift.

## Compatibility with the debrief-future review-app comment

The Heroku review-app comment in debrief-future is updated (in Phase 3) to render this URL form:

```
🚀 Preview Deployments

| Surface       | URL                                                                |
|---------------|--------------------------------------------------------------------|
| spec-navigator | https://debrief.github.io/spec-navigator/?repo=debrief/debrief-future&branch=<pr-branch> |
| Code Server   | https://...                                                        |
| Storybook     | https://...                                                        |
```

The `<pr-branch>` token is filled in by the existing PR-comment workflow at the time of comment generation.
