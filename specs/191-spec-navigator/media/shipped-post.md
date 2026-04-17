---
layout: future-post
title: "Shipped: Spec Navigator & Review Tool"
date: 2026-04-17
track: [credibility]
author: Ian
reading_time: 6
tags: [tracer-bullet, spec-navigator, review-tooling, speckit]
excerpt: "A browser-based review surface for spec PRs: walk the artefact tree, comment at three granularities, submit as one structured PR comment."
---

Reviewing a spec PR on GitHub is lossy. The artefacts — `spec.md`, `plan.md`, `tasks.md`, contracts, evidence — sit in a folder tree that the diff view flattens into a wall of additions. A reviewer wanting to flag "this requirement is ambiguous" on a specific sentence, plus "the whole plan leans too hard on option X", plus "this is out of scope for the epic", ends up scattering three different kinds of feedback across three different comment threads. Downstream automation then has to guess what applies where.

The Spec Navigator is a static single-page app that fixes that. A reviewer opens `…/spec-navigator/?pr=456` on a phone, tablet, or laptop, walks the feature's artefact tree in a two-pane reader, captures comments at feature / document / selection granularity, and hits Submit. One structured PR comment lands on the PR. The existing `/speckit.apply-feedback <pr> <comment-id>` command parses the fenced payload and routes each comment into a follow-up review cycle — no hand-copying, no manual triage.

## What We Built

A Vite + React 18 SPA under `apps/spec-navigator/`, published to GitHub Pages. No backend. No proxy. No serverless function. The reviewer's fine-grained PAT sits only in their browser's `localStorage` and goes only to `api.github.com` — enforced by a CSP `<meta>` tag that whitelists exactly two outbound origins. Drafts persist across reloads (per feature, keyed by PR number) so an accidental tab close doesn't erase ten minutes of review notes.

The wire format is the interop story worth telling. Every submission is a single PR comment containing a trigger line, a fenced `json spec-review-feedback-v1` block, and a human-readable rendering of the same data. The JSON validates against [`spec-review-feedback-v1.schema.json`](https://github.com/debrief/debrief-future/blob/main/specs/191-spec-navigator/contracts/spec-review-feedback-v1.schema.json) — a versioned contract the PR watcher can rely on without ad-hoc parsing.

## Screenshots

![Landing view — artefact tree on the left, primary spec rendered on the right](./evidence/screenshots/landing.png)
*Landing view. Tree grouped by kind (spec / plan / tasks / research / contracts / evidence), primary spec rendered by default.*

![Interaction GIF — selecting a passage, adding a comment, opening the drawer](./evidence/interaction.gif)
*Select a passage, the "Add comment" chip floats in under the selection, the composer pre-populates with the quoted snippet.*

![Drawer open showing three drafted comments grouped by target](./evidence/screenshots/drawer-open.png)
*The drawer. Drafts grouped by target, editable in place, persisted in `localStorage`.*

![Stale-head modal warning that the PR was force-pushed between load and submit](./evidence/screenshots/stale-head-modal.png)
*Stale-head modal. The reviewer chose explicitly whether to submit against a commit they didn't read.*

![Settings panel with PAT entry and on-screen scope documentation](./evidence/screenshots/settings-panel.png)
*Settings. Required scope documented inline; Clear credential is one click.*

![Navigator on a mobile viewport, two-pane collapsed to single column](./evidence/screenshots/mobile.png)
*Mobile — the whole flow works on a phone, including selection-level comments.*

## By the Numbers

| | |
|---|---|
| Vitest tests passing | 138 |
| Playwright E2E passing | 24 |
| Axe-core a11y sweeps | 6 (3 states × 2 viewports) |
| WCAG 2.1 AA violations | 0 |
| Bundle size (gzipped) | 176 KB / 400 KB budget |
| Markdown render, 150 KB fixture | ~230 ms |
| XSS adversarial payloads neutralised | 10 / 10 |

## Three Design Choices Worth Naming

**One Comment shape, three homes.** The same discriminated-union type — `FeatureComment | DocumentComment | SelectionComment` — lives in React state, in `localStorage`, and in the wire payload. There is no serialisation boundary between drafting and submission. Drafts carry optional `createdAt` / `updatedAt` fields that the schema accepts and the PR watcher ignores. That decision kept the reducer small, made the golden-markdown test possible against real in-flight drafts, and closed a whole category of "the shape I stored is not the shape I submit" bugs before they could exist.

**The anchor format survives whitespace churn.** Selection comments quote the passage verbatim, but that's not enough — the same phrase can appear more than once in a long spec. Each selection also carries `<first20-of-snippet>\x1F<last20-of-snippet>\x1F<char-offset>`, using ASCII US (0x1F) as the delimiter. US cannot appear in source markdown, so the round-trip is unambiguous. If the raw offset drifts after an edit, the downstream reader can still relocate by prefix search over the first 20 characters. The verbatim snippet is the ground truth; the anchor is the disambiguator.

**Stale-head is a modal, not a silent retry.** If the PR is force-pushed between the moment the reviewer loaded the navigator and the moment they press Submit, the tool does not quietly re-fetch and carry on. It pauses, shows both short SHAs, and makes the reviewer choose. Submit-anyway posts with `originalHeadSha !== submittedAtHeadSha` plus an admonition in the human-readable section, so the downstream reader can see the submission was against a commit the reviewer hadn't fully reviewed. Cancel preserves drafts and POSTs nothing. Silence is not a safe default when the artefacts under review may have moved.

## Lessons Learned

Keeping the drafting shape and the wire shape identical was the single biggest simplification — every time we nearly introduced a separate `DraftComment` type during implementation, we stopped and reverted. The payload schema was worth writing by hand rather than generating from LinkML; this is transport between a dev tool and a prompt-consuming watcher, not part of the master maritime data model, and LinkML generation for a 15-field schema with one emitter and one consumer would have been ceremony without benefit. We flagged that as a documented Article II caveat in the plan rather than hiding it.

The CSP meta tag earned its keep. A reviewer's PAT is the credential with the most blast radius the navigator ever touches; pinning `connect-src` to exactly `api.github.com` and `raw.githubusercontent.com` means that even if a transitive dependency were compromised tomorrow, the PAT has nowhere to be exfiltrated to. We assert CSP presence byte-for-byte in CI, so regressions fail the build rather than shipping.

## What's Next

The first 20 real submissions are the interesting dataset. SC-003 asks for 95% of submitted comments to parse without manual cleanup by the PR watcher; we'll learn from the misses whether the schema needs fields we didn't anticipate, or whether reviewers reach for tags the closed vocabulary doesn't cover. Either way, the next version bump is `spec-review-feedback-v2` — explicit, versioned, breaking.

→ [Feature spec](https://github.com/debrief/debrief-future/blob/main/specs/191-spec-navigator/spec.md)
→ [Wire contract](https://github.com/debrief/debrief-future/blob/main/specs/191-spec-navigator/contracts/spec-review-feedback-v1.schema.json)
→ [Navigator](https://debrief.github.io/debrief-future/spec-navigator/)
