# Security Policy

## Supported versions

The latest release on `main` is the only supported version. Older
versions are not patched; pin to a tag if you need a stable release
window.

---

## Reporting a vulnerability

Email security@{{HOST}} (or your project's preferred channel) with a
description, reproduction steps, and the affected version/commit.
Do **not** open a public issue for security-sensitive reports.

We aim to acknowledge within 72 hours and ship a fix within 14 days
for high-severity issues. Low-severity issues are batched into the
next release.

---

## GitHub Personal Access Token (PAT) handling

The app accepts the user's own GitHub PAT to enable write operations
(create branch, commit, open PR). PAT handling rules:

1. **Stored in `localStorage` only.** Never sent to any server other
   than `https://api.github.com`. No telemetry, no third-party
   storage.
2. **Never logged.** PATs do not appear in console output, network
   inspector previews, or thrown error messages.
3. **User-revocable.** The Settings panel shows whether a token is
   stored and offers a "Clear token" action that removes it from
   `localStorage` immediately.
4. **Scope guidance.** The app requires `repo` scope (classic PAT) or
   fine-grained `contents: read+write` + `pull requests: read+write`
   on the target repo. The Settings panel links to GitHub's PAT
   creation page with the recommended scope pre-selected.

If a user accidentally pastes a token into a shared browser, they should
revoke it on github.com immediately — the app cannot revoke tokens on
the user's behalf.

---

## CI secrets

This repo uses the following Actions secrets:

| Secret | Required? | Scope | Used by |
|---|---|---|---|
| `GITHUB_TOKEN` | Auto-provided | Default permissions | `deploy.yml`, `pr-preview.yml`, `pr-preview-cleanup.yml` |
| `LHCI_GITHUB_APP_TOKEN` | Optional | PR status checks | `lighthouse.yml` |
| `LIVE_GITHUB_TOKEN` | Optional (opt-in) | Read-only on target repo | `live.yml` (if enabled) |

### Rotation policy

- `GITHUB_TOKEN`: auto-rotated per workflow run; no manual rotation.
- `LHCI_GITHUB_APP_TOKEN`: rotate annually, or immediately on staff
  departure / suspected compromise. Update via
  `Settings → Secrets and variables → Actions`.
- `LIVE_GITHUB_TOKEN`: fine-grained PAT — rotate per the issuing org's
  policy. Use a service identity rather than an individual's account
  where possible.

### Leak response

If a secret is suspected leaked:

1. **Revoke immediately** on github.com (`Settings → Developer
   settings → Personal access tokens` for PATs; `Settings → Apps`
   for GitHub Apps).
2. Rotate the secret in `Settings → Secrets and variables → Actions`.
3. Audit recent workflow runs for unexpected activity.
4. Open a follow-up issue tracking the rotation and any policy
   changes the incident reveals.

---

## Branch protection

`main` should be protected with these settings:

- Require pull request reviews before merging (1 approving review).
- Require status checks to pass before merging:
  - `ci.yml / lint-typecheck-test`
  - `ci.yml / e2e`
  - `lighthouse.yml / lighthouse`
- Require branches to be up to date before merging.
- Restrict who can push to `main` (deploy automation only).

`pr-preview.yml` is **not** a required gate — preview deploys are
nice-to-have, not merge blockers.

---

## Bundled dummy dataset

This repo ships a small dummy `BACKLOG.md` and a sample `specs/`
directory at the root, used to render meaningful content on the
default URL (and on per-PR previews). The dummy dataset is
intentionally generic — no production credentials, no internal links,
no business-confidential strings. If you fork this repo for adopter
use, you may replace the dummy with your own sample content.
