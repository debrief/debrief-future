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

The kit ships under `specs/249-extract-backlog-navigator/extraction-kit/`
as a single `import-from-source.sh` script. It runs **inside the
destination repo** (CC session opened in `<org>/<repo>`, or a local
clone of the destination) and pulls everything from debrief-future
itself. The script's only push target is the current repo's `origin`
— it never tries to push across repo boundaries.

This example uses `--dry-run` against a stub destination so no commit
or push actually lands.

```sh
# In a Claude Code session opened on the destination repo,
# or a local clone of it:

$ git clone --depth 100 https://github.com/debrief/debrief-future.git /tmp/debrief-source
$ bash /tmp/debrief-source/specs/249-extract-backlog-navigator/extraction-kit/scripts/import-from-source.sh --dry-run

==> import-from-source.sh
    Destination:   acme/foo-navigator (origin)
    Host:          acme.github.io
    Source repo:   debrief/debrief-future
    Mode:          DRY RUN — no push

==> Step 1: use existing source clone at /tmp/debrief-source
    OK — source path verified
==> Step 2: subtree split apps/backlog-navigator/ in source clone
    OK — extracted branch produced in source clone
==> Step 3: scan extracted tree for stray .env* files
    OK — no .env* files in extracted tree
==> Step 4: merge extracted history into destination
    OK — main created from extracted (empty destination)
==> Step 5: rewrite vite.config.ts base default → /foo-navigator/
    OK — base default now /foo-navigator/
==> Step 6: apply templates with {{ORG}}/{{REPO}}/{{HOST}} substitution
    -> README.md, CONFIGURATION.md, SECURITY.md, .eslintrc.cjs,
       tsconfig.json, tsconfig.node.json, .gitignore, BACKLOG.md
    OK — 8 template files rendered
==> Step 7: install workflows into .github/workflows/
    -> ci.yml, deploy.yml, lighthouse.yml, pr-preview-cleanup.yml, pr-preview.yml
    -> .github/workflows-optional/live.yml (NOT enabled by default)
    OK — 5 workflows installed
==> Step 8: copy bundled dummy spec dirs
    OK — bundled dummy dataset in place
==> Step 9: regenerate pnpm-lock.yaml
    OK — pnpm-lock.yaml generated
==> Step 10: smoke (pnpm install && pnpm test && pnpm build)
    OK — smoke green
==> Placeholder leakage check:  OK — no remaining {{ORG}}/{{REPO}}/{{HOST}} markers

==> Dry-run complete. Staged files (not committed):
    Working tree:  /tmp/test-dest-empty-pBthtZ
    Report:        /tmp/test-dest-empty-pBthtZ/import-report.json
```

The script substitutes every `{{ORG}}` → `acme`, `{{REPO}}` →
`foo-navigator`, `{{HOST}}` → `acme.github.io`. The post-substitution
placeholder-leakage check confirms zero unsubstituted `{{...}}`
markers remain. The destination is auto-detected from the current
repo's `origin` remote; pass `--destination <org>/<repo>` to override
(useful when `origin` isn't configured yet).

### Step boundaries and the JSON report

Every step closes with a single-line `OK —` or `FAIL —` trailer so an
AI-driven runbook can branch on grep rather than exit-code parsing.
`import-report.json` is written at every script exit (success or
failure) for machine-readable evidence:

```json
{
  "destination": "acme/foo-navigator",
  "host": "acme.github.io",
  "mode": "dry-run",
  "filesRendered": 13,
  "tokensReplaced": 33,
  "placeholderCheck": "ok",
  "smokeTestExitCode": 0,
  "sourceRepo": "debrief/debrief-future"
}
```

### Real-world execution

Outside `--dry-run`, the final step is `git push -u origin HEAD:main`.
That push targets the destination repo's own `origin` — the same repo
the script is running in. No cross-repo push, no GitHub App
authorisation needed for *other* repos (only for the repo the CC
session is opened in).

The script aborts with explicit guidance on the three operator-side
failure modes:
- **`.env*` files found in extracted tree** → rotate any secrets, remove
  from source, re-run.
- **Destination non-empty without `--merge-unrelated-histories`** →
  either recreate the repo empty, or re-run with the flag.
- **403 on push** → the CC session's GitHub App isn't authorised on
  the destination; install it via the web UI and re-run.
