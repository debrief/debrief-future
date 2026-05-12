# Usage Example: Extract Backlog Navigator

Two worked examples covering (a) the Phase 1 configuration seam and
(b) the Phase 2 extraction kit.

---

## Example A — Build for a foreign repo without source edits (Phase 1)

After landing the Phase 1 configuration seam, the same source tree
builds for any `<org>/<repo>` by setting two environment variables.

### Default (debrief) build

```sh
$ pnpm --filter @debrief/backlog-navigator build
vite v5.4.21 building for production...
✓ 245 modules transformed.
✓ built in 2.43s
```

The resulting `dist/assets/index-*.js` bundle contains `debrief` and
`debrief-future` as the default repo, unchanged from before Phase 1.

### Foreign-repo build (no source edits)

```sh
$ cd apps/backlog-navigator
$ VITE_DEFAULT_OWNER=octocat VITE_DEFAULT_REPO=hello-world pnpm build
vite v5.4.21 building for production...
✓ 245 modules transformed.
dist/assets/index-CBJNSZbv.css                    13.98 kB │ gzip:   3.40 kB
dist/assets/index-BrBSP1iu.js                    415.25 kB │ gzip: 126.11 kB
✓ built in 2.43s

PWA v0.20.5
mode      generateSW
precache  18 entries (456.57 KiB)
```

```sh
$ grep -l "octocat" apps/backlog-navigator/dist/assets/*.js
apps/backlog-navigator/dist/assets/index-BrBSP1iu.js

$ grep -l "hello-world" apps/backlog-navigator/dist/assets/*.js
apps/backlog-navigator/dist/assets/index-BrBSP1iu.js
```

The bundle now defaults to `octocat/hello-world`. Open the resulting
build in a browser and it renders that repo's `BACKLOG.md` (assuming
the repo has one). No source-code changes were required.

### Reverting

Drop the env vars and rebuild — the bundle reverts to debrief defaults:

```sh
$ unset VITE_DEFAULT_OWNER VITE_DEFAULT_REPO
$ pnpm build
$ grep -l "octocat" apps/backlog-navigator/dist/assets/*.js
# (no output — slug back to debrief)
```

---

## Example B — Run the extraction kit end-to-end (Phase 2)

The kit ships under `specs/249-extract-backlog-navigator/extraction-kit/`.
This example uses `--dry-run` against a stub destination so no remote
repo is created.

### Step 1: extract

```sh
$ ./specs/249-extract-backlog-navigator/extraction-kit/scripts/extract.sh \
    --destination test-org/test-repo --dry-run

==> extract.sh
    Source:      debrief/debrief-future (prefix: apps/backlog-navigator)
    Destination: test-org/test-repo
    Mode:        DRY RUN

==> Step 1: cloning debrief/debrief-future into /tmp/backlog-nav-extract-2h1QDQ
==> Step 2: git subtree split --prefix=apps/backlog-navigator -b extracted
Created branch 'extracted'
==> Step 3: sed-replace vite.config.ts base default → /test-repo/
    OK — base default now /test-repo/
==> Step 4: pnpm install --lockfile-only
==> Step 5: validate lockfile
    OK — lockfile parseable, deps resolve

==> extract.sh complete
    Working tree:  /tmp/backlog-nav-extract-2h1QDQ/repo
    Branch:        extracted
    Mode:          DRY RUN — tree preserved for inspection; no push performed.
```

The subtree split preserved every commit since the app's inception
(275 commits across the whole monorepo, with `--prefix=apps/backlog-navigator`
yielding the backlog-navigator-only subset).

### Step 2: bootstrap

```sh
$ ./specs/249-extract-backlog-navigator/extraction-kit/scripts/bootstrap-new-repo.sh \
    --destination acme/foo --host acme.github.io --dry-run

==> Step 2: copy templates with {{ORG}}, {{REPO}}, {{HOST}} substitution
    -> README.md
    -> CONFIGURATION.md
    -> SECURITY.md
    -> .eslintrc.cjs
    -> tsconfig.json
    -> tsconfig.node.json
    -> .gitignore
    -> BACKLOG.md
==> Step 3: copy workflows into .github/workflows/
    -> .github/workflows/ci.yml
    -> .github/workflows/deploy.yml
    -> .github/workflows/lighthouse.yml
    -> .github/workflows/pr-preview-cleanup.yml
    -> .github/workflows/pr-preview.yml
    -> .github/workflows-optional/live.yml (NOT enabled by default)
==> Step 4: copy bundled dummy spec dirs
    -> specs/ populated from templates/specs-dummy/

==> Dry-run substitution complete. Staged files (not committed):
 (17 files staged, totalling 910 insertions)

==> Placeholder leakage check:
    OK — no remaining {{ORG}}/{{REPO}}/{{HOST}} markers

==> Dry run complete. Working tree: /tmp/bootstrap-dryrun-Yaacto
```

The bootstrap substitutes every `{{ORG}}` → `acme`, `{{REPO}}` → `foo`,
`{{HOST}}` → `acme.github.io`. The post-substitution check confirms
zero leakage — every template placeholder is replaced.

### What `extract.sh` and `bootstrap-new-repo.sh` do, side by side

| Step | extract.sh | bootstrap-new-repo.sh |
|---|---|---|
| 1 | Clone source into temp dir | Probe destination repo (empty? non-empty?) |
| 2 | `git subtree split --prefix=apps/backlog-navigator` | Copy templates with placeholder substitution |
| 3 | sed-replace `vite.config.ts` base default | Copy workflows into `.github/workflows/` |
| 4 | Regenerate `pnpm-lock.yaml` + commit | Copy bundled dummy `BACKLOG.md` + spec dirs |
| 5 | Validate lockfile via `--frozen-lockfile --ignore-scripts` | Full smoke (`pnpm install + test + build`) — abort on failure |
| 6 | (DRY) leave tree for inspection; (live) write `.last-extract-path` | (live) Commit + push to `<destination>:main` |

### Real-world execution

Outside `--dry-run`, the final live `bootstrap-new-repo.sh` step is:

```
==> Step 5: push to git@github.com:<org>/<repo>.git
==> bootstrap-new-repo.sh complete
    Pushed to:     git@github.com:<org>/<repo>.git (main)
    Next steps:
      1. Settings → Pages → Source: 'Deploy from a branch' → gh-pages → /
         (wait for the first deploy to create the branch first)
      2. Open a small test PR and watch pr-preview.yml deploy a preview.
      3. Hold for ≥7 days of green CI before starting Phase 3 (cutover).
```

The kit aborts with explicit guidance on the two most common
operator-side failures: 403 push (GitHub App not authorised — see
R-011 / #248 Lesson 9) and non-empty target repo (init checkboxes left
on — see R-011 / #248 Lesson 10). Both gotchas are documented in the
runbook's prereq section as Step 0a / Step 0b / Step 0c.
