---
layout: future-post
title: "Building E2E Test Fixture Decoupling for Backlog Navigator"
date: 2026-05-06
track: [credibility]
author: Ian
reading_time: 4
tags: ["test-infra", "playwright", "backlog-navigator"]
excerpt: "Decoupling Backlog Navigator E2E tests from live data — 14 specs now use a curated fixture instead of reading production."
status: shipped
---

| Before | After |
|---|---|
| 14 Playwright specs each read the live `BACKLOG.md` at test time | All 14 specs serve a small, hand-curated fixture — same content every run |
| `mockGithubBacklogFetch` copy-pasted in 11 files | Single shared helper in `e2e/helpers/mock-github.ts` |
| Two mobile specs use a defensive conditional to avoid a no-op status change | Both use `selectOption('approved')` — fixture row 001 is always `proposed` |
| CI broke on 2026-05-02 when live file content drifted | Fixture content is committed; it only changes when you change it |

## What We're Building

The Backlog Navigator E2E suite broke on 2026-05-02 because 14 Playwright specs were reading the live `BACKLOG.md` directly — via a mocked GitHub API that served the real file content. When the file changed (as it does, constantly), assertions against specific row states or parser edge cases started failing. The fix is to stop treating production data as test data.

A hand-curated fixture at `e2e/fixtures/backlog-fixture.md` replaces the live file in all 14 specs. It covers 12 rows across all 8 workflow states, all 7 category categories, 2 epics, and one deliberate parser edge-case row (escaped pipe, Markdown link, and epic tag combined). A shared helper module — `e2e/helpers/mock-github.ts` — replaces the 11 copies of `mockGithubBacklogFetch` scattered across the spec files. The one test that genuinely needs to read the live file, `liveBacklog.roundtrip.test.ts`, is left untouched.

## How It Fits

This is maintenance work on the Backlog Navigator's test infrastructure, introduced in feature 242. The navigator app itself is unchanged — no production code is touched. The fix closes the gap between what the E2E suite is supposed to test (stable, deterministic UI behaviour) and what it was actually testing (whatever the live backlog happened to contain that day). The fixture pattern is now the established convention for any future spec that needs to mock the GitHub API response.

## Key Decisions

- **Scope expanded from 4–5 to 14 files** — inspection revealed 9 mobile specs with the same live-file coupling as the 5 desktop specs. Fixing only the desktop specs would have left CI fragile on mobile runs.
- **Shared helper over per-file updates** — extracting `mockGithubBacklogFetch` to a single module means the fixture path changes in one place. The `e2e/helpers/` directory already had this pattern (`viewports.ts`), so no new convention was introduced.
- **Fixture covers all 8 workflow states** — each state gets its own row so any test can select a row in the exact starting state it needs, without reading live data or guessing.
- **Defensive conditional removed in two mobile specs** — `interaction.mobile.spec.ts` and `push.mobile.spec.ts` were computing a target status dynamically to avoid a no-op. With the fixture guaranteeing row 001 is `proposed`, both tests simply call `selectOption('approved')`.
- **`liveBacklog.roundtrip.test.ts` deliberately excluded** — that test's purpose is to catch parser drift against production data. Pointing it at the fixture would turn it into a tautology.

## By the Numbers

| Metric | Value |
|---|---|
| Spec files updated | 14 (5 desktop + 9 mobile) |
| Tests passing | 174 (49 Playwright + 125 Vitest) |
| Tests skipped | 41 (viewport gates, unchanged from before) |
| Tests failed | 0 |
| E2E suite runtime | 32.6s (60s SC-002 budget) |
| Boilerplate removed | ~217 LoC |
| Fixture rows | 12 (covering 9 workflow states, 7 categories, 2 epics, 1 parser edge case) |

The headline outcome: `grep -r "readFileSync.*BACKLOG" apps/backlog-navigator/e2e/` returns zero matches. Live file references in E2E specs are gone.

## What's Next

The fixture pattern established here — commit a small, curated mock response; serve it to all specs that need a stable GitHub API mock — is now the convention for any new Playwright spec that hits GitHub. The companion `liveBacklog.roundtrip.test.ts` Vitest gate continues to read the live `BACKLOG.md` file, intentionally. That test catches parser drift; the E2E suite tests UI behavior against a known-good state.

→ [See the code](https://github.com/debrief/debrief-future/compare/main...245-navigator-e2e-fixture)
