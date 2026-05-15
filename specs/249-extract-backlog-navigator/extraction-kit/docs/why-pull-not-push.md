# Why this kit pulls from source rather than pushing to destination

The original spec for #249 (and the kit shipped through to early
2026-05) imagined an operator running the kit from a clone of
`debrief/debrief-future` on their local machine: clone source, run
`extract.sh` + `bootstrap-new-repo.sh`, and the second script would
`git push` to the destination repo.

That model worked for a human operator with their own SSH key, but
broke for the realistic operator path: a **Claude Code session driving
the extraction**. CC sessions are scoped to one repo at a time by the
GitHub App authorisation; a session opened in `debrief/debrief-future`
can read from anywhere but can only push back to `debrief/debrief-future`.
Pushing to `<org>/backlog-navigator` from a debrief-future session
would 403 — not a kit bug, an architectural constraint of how the
sandbox grants write access.

The fix is the inversion. The kit's single script — `import-from-source.sh`
— runs in the **destination repo's** working tree (i.e., from a CC
session opened in `<org>/<repo>`). It:

1. Clones `debrief/debrief-future` into `/tmp` (public repo, no
   credentials needed — read access doesn't require any GitHub App
   authorisation).
2. Does the `git subtree split` inside that temp clone.
3. Merges the extracted branch into the destination repo's working
   tree (`git fetch backlog-source-tmp extracted` + checkout or merge).
4. Applies the kit's templates and workflows from the temp clone.
5. Smoke-builds.
6. Pushes to `origin/main` — which **is** the destination repo, so the
   push is in-scope for the CC session.

The push the script makes never crosses repo boundaries: the script
only writes to `origin` of the repo it runs in.

## What we gave up

- **Single-folder kit.** The old design had a checkout-and-go feel:
  `cd extraction-kit/ && ./scripts/extract.sh && ./scripts/bootstrap-new-repo.sh`.
  The new design is conceptually "two repos talking to each other"
  rather than "one folder I copy somewhere". Templates and workflows
  still live here in debrief-future; the *runner* runs there in the
  destination. A bit more spread out, but the script is one file the
  operator pastes into their shell.

- **The notion that the kit could be run by an arbitrary downstream
  fork.** It can — debrief-future is public — but the original kit
  could be used to extract apps from *any* monorepo by copying the
  scripts there and running them locally. The new kit is now
  specifically targeting "extract from debrief-future" (the script
  has the source repo baked into a default flag; you can override it
  via `SOURCE_REPO` env var). If a third-party adopter wanted to
  extract their own app from their own monorepo, they'd fork this
  kit and edit the defaults. That's a reasonable trade.

## What we gained

- **Works inside a Claude Code session.** Operator's complete journey
  is now: create empty repo on github.com → open a CC session in it
  → paste one command → wait for green. No local-machine
  bash, no key juggling, no "did the agent install on the
  destination?" debugging.

- **Simpler script surface.** One script (`import-from-source.sh`)
  replaces two (`extract.sh` + `bootstrap-new-repo.sh`). All the
  state that used to flow between them through a `.last-extract-path`
  marker file is now in-process.

- **Push 403 detection is the same.** The script still detects 403 on
  push and prints the GitHub App auth steps inline — except now the
  failure mode is "agent not authorised on `<org>/<repo>`" (which is
  what the operator can actually fix), not "agent not authorised on
  some other org's repo we just tried to push to" (which was harder
  to diagnose under the old model).

- **`origin` auto-detection.** The script reads the destination from
  `git config --get remote.origin.url`. No `--destination` flag
  needed in the common case. The flag is still there for forks /
  unusual setups.

## What stays the same

- Twelve lessons from #248. Lockfile regeneration (Lesson 1),
  `packageManager` field (Lesson 2), `gh-pages` over
  `actions/deploy-pages` (Lesson 4), drop-in templates (Lesson 5),
  vite base sed (Lesson 6), placeholder substitution (Lesson 7),
  PR-preview pipeline (Lesson 8), GitHub App auth gotcha (Lesson 9),
  non-empty target repo (Lesson 10), and the patch-03 drop (Lesson
  12) all carry forward unchanged. Only the *machinery* moved.

- The JSON report, the OK/FAIL status-line convention, the
  placeholder leakage check, the `.env*` guard, the
  `--merge-unrelated-histories` fallback, and the workflow security
  baseline are all preserved.

- The cutover runbook (`PHASE3-RUNBOOK.md`) is unchanged. Phase 3
  doesn't care how the new repo was stood up; it only cares that
  it's been live and green for ≥7 days.
