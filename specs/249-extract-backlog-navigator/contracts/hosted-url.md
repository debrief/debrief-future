# Contract: Hosted Backlog Navigator URL Surface

**Feature**: 249-extract-backlog-navigator
**Audience**: Anyone linking to the hosted SPA — `backlog-navigator-comment.yml`
in debrief-future, third-party adopters, documentation authors.

This contract governs the URL shape served by the standalone Backlog Navigator
instance at `https://{{HOST}}/{{REPO}}/` (default:
`https://deepbluecltd.github.io/backlog-navigator/`).

It is identical in *shape* to the corresponding contract for #248
(spec-navigator) — both SPAs are speckit viewers wrapping a different
artefact — but it is reproduced here in full so adopters can read it
standalone.

---

## Accepted query-string parameters

The SPA accepts the following query-string parameters. Unknown parameters
are silently ignored so URLs stay forward-compatible.

| Parameter | Type | Required | Default | Constraint |
|---|---|---|---|---|
| `repo` | `string` | No | bundled default OWNER/REPO | `^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$` |
| `branch` | `string` | No | consumer default (`main` for debrief; adopter-specific in adopter builds) | URL-decoded; any valid Git branch name |
| `pr` | `string` (digits) | No | — | `^[0-9]+$` |
| `dryRun` | `string` ("1", "true", "0", "false") | No | inherits `VITE_BACKLOG_NAV_DRY_RUN` build flag | truthy → mode = "dry-run" (push is a no-op) |

### Validation

- Malformed values fall back to defaults with a non-blocking warning banner
  in the UI. The app never crashes on bad input.
- The URL parser is the **only** untrusted-edge for these parameters; any
  value that crosses the parser is typed thereafter.

---

## Two URL forms (R-014)

Both forms are canonical and supported in perpetuity:

### Legacy form: `?pr=<n>`

```
https://{{HOST}}/{{REPO}}/?pr=512
```

- Emitted by `backlog-navigator-comment.yml` in debrief-future since
  #242 (the original feature spec).
- Resolves through the existing PR-to-branch flow against the **bundled
  default** OWNER/REPO. In the debrief build, that resolves against
  `debrief/debrief-future`. In an adopter's build, against the adopter's
  OWNER/REPO.
- After resolution, processing is identical to having received
  `?repo=<bundled-default>&branch=<resolved-head>`.
- This form is permanent. The comment workflow in debrief-future
  continues to emit it after the cutover; if/when adopters want to
  flip to the new form, the workflow template change is independent of
  the SPA.

### New form: `?repo=<org>/<name>&branch=<branch>`

```
https://{{HOST}}/{{REPO}}/?repo=acme/foo&branch=feat/x
https://{{HOST}}/{{REPO}}/?repo=debrief/debrief-future&branch=main
```

- Designed for non-debrief consumers and for cross-repo linking from
  contexts that don't have a PR number to hand.
- `repo` and `branch` are required as a pair when *either* is present;
  passing one without the other falls back to defaults (with a warning).

### Combined / conflicts

- If `?pr=<n>` is supplied **and** `?repo=<org>/<name>` is also supplied,
  the `?repo=` form wins (it is the more explicit). `?pr=` is interpreted
  against that explicit repo (i.e., the PR is resolved against the supplied
  org/repo, not against the bundled default).
- If both forms are supplied with conflicting orgs (e.g., `?repo=acme/foo`
  + `?pr=999` where PR 999 doesn't exist in `acme/foo`), the SPA shows the
  "no such PR" empty state — there is no fallback to the bundled default
  in the conflicting case.

---

## Dry-run mode

`dryRun` is an **existing** parameter (carried forward unchanged from the
in-monorepo app). When truthy, the **Push Changes** button is a no-op; the
UI behaves identically otherwise. This is used by the standalone repo's
`pr-preview.yml` workflow so reviewers can exercise the UI on previews
without hitting the GitHub write path.

Activation modes (precedence high → low):
1. `?dryRun=1` URL param
2. `VITE_BACKLOG_NAV_DRY_RUN=true` build env var
3. Default: live mode (push is real)

`pr-preview.yml` builds with `VITE_BACKLOG_NAV_DRY_RUN=true` so previews
default to dry-run regardless of `?dryRun=`.

---

## What the SPA does not accept from the URL

- **Vendor strings** (app title, PWA manifest fields, theme colours) —
  these are build-time only (`VITE_*` env vars at vite-config time).
- **Lighthouse / debug flags** — none. Debug logging is controlled by
  console-level `localStorage.debug` keys per existing pattern, not URL
  params.
- **Authentication** — the GitHub PAT lives in `localStorage`; no token
  is ever accepted via URL.

---

## Backwards-compat contract

The following are **frozen** and may not be silently removed:

- The legacy `?pr=<n>` form. Removing it would break every comment posted
  by `backlog-navigator-comment.yml` since #242 (years of PR history).
- The `dryRun` parameter. Removing it would break the preview workflow's
  dry-run guarantee.
- The "unknown parameters silently ignored" rule. Future SPA versions
  may add new parameters; older bookmarks must not break.

A future major version of the SPA may *add* new parameters; it may not
*remove* any of the above without a compat shim and a deprecation period.

---

## Example URLs (smoke-test set)

1. **Default view** (renders bundled dummy `BACKLOG.md`):
   `https://{{HOST}}/{{REPO}}/`
2. **Legacy form** (resolves PR against bundled default):
   `https://{{HOST}}/{{REPO}}/?pr=512`
3. **New form, same repo**:
   `https://{{HOST}}/{{REPO}}/?repo=debrief/debrief-future&branch=main`
4. **New form, third-party adopter**:
   `https://{{HOST}}/{{REPO}}/?repo=acme/foo&branch=feat/x`
5. **Preview build, dry-run**:
   `https://{{HOST}}/{{REPO}}/previews/pr-42/?repo=acme/foo&branch=feat/x`
   (preview is built with `VITE_BACKLOG_NAV_DRY_RUN=true`; push is a
   no-op regardless of `?dryRun=`)

The `pr-preview.yml` sticky comment includes URLs 1–4 (substituting
`{{HOST}}/{{REPO}}/previews/pr-<n>/` for the host portion) as the
reviewer's onboarding set.
