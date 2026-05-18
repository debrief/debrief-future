# Why this kit drops patch 03

#248's extraction kit included a `patches/03-bundled-fixtures.md`
proposing that the standalone repo replace its in-process Playwright
route mock (`e2e/mock-github.ts`) with a fixture corpus on disk plus
a recorder script. This kit deliberately drops that path.

## What patch 03 proposed

A workflow shaped roughly:

1. A `scripts/record-fixtures.ts` recorder runs Playwright against the
   real GitHub API (using a maintainer's fine-grained PAT) and dumps
   every response into `e2e/fixtures/*.json`.
2. The Playwright suite has a `beforeEach(async ({ page }) => { ... })`
   block in every spec that intercepts every GitHub request and replies
   from the dumped fixtures.
3. A separate `LIVE_GITHUB=1` mode runs the same suite *without*
   intercepts, to detect upstream API drift.

The rationale at the time: "Mocks could drift from real GitHub
responses; recorded fixtures prove the test data is realistic."

## Why the in-process route mock is sufficient

`e2e/mock-github.ts` (already present in `apps/backlog-navigator/`,
travels with the subtree split) does a more focused job: it intercepts
`api.github.com` requests via Playwright's `page.route(...)` API and
returns response shapes hand-tuned to exercise the SPA's behaviour —
including error paths the recorder could never reach (rate limits,
malformed responses, slow loads, stale-base race conditions).

The in-process mock:

- Runs in seconds.
- Requires no credentials — any contributor produces a green build.
- Lives in the test code, so changes ride with the PR that exercises
  them.
- Covers the negative paths that a recorder can't capture.

The fixture-corpus approach:

- Requires a recorder script that demands a PAT.
- Requires `beforeEach` wiring in every spec.
- Couples test data to a particular GitHub state — when GitHub adds a
  new field to a response, fixtures go stale silently.
- Adds maintenance every time the SPA's API surface widens.

In #248's hand-off, the in-process route mock already provided full
offline coverage. The fixture path was 90% maintainer-tooling overhead
with zero test-quality dividend.

## When to opt into `live.yml`

If, **at some point in the future**, drift detection against the real
GitHub API becomes desirable, the kit ships
`workflows/live.yml.template` as an opt-in. Adopters who want it copy
the file to `.github/workflows/live.yml`, add a `LIVE_GITHUB_TOKEN`
secret, and the workflow runs nightly.

This is *additive* — the in-process mock continues to drive PR-time
CI; `live.yml` only catches drift between mock and reality. The
workflow does not gate PR merges; failures emit artifacts and
optionally open issues.

Adopters most likely to want this:

- Maintainers of forks who deviate the SPA's API surface and want a
  diff against upstream.
- Teams who've been bitten by a real-world drift bug and want CI to
  catch the next one.

Default adopters do **not** need this. The kit ships it commented-out
in the workflows directory so it's discoverable when wanted but
doesn't add noise when not.

## TL;DR

- Patch 03 added complexity for no testing gain.
- The in-process route mock is the right tool for offline CI.
- `live.yml` is shipped as opt-in tooling for the maintainers who
  actually need drift detection.
- Spec ref: FR-019, R-006, R-015.
