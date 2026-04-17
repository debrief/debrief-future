Reviewing a spec PR in GitHub's diff view scatters your feedback across three different comment threads — one for the wording nit, one for the whole plan, one for the "is this even in scope" question. Downstream automation then has to guess what applies where.

The Spec Navigator is a static browser page that opens against any open PR. A reviewer walks the feature's artefact tree in a two-pane reader, selects a passage and adds a comment, or comments at document or whole-feature level, and hits Submit. One structured PR comment lands — a versioned JSON payload plus a human-readable rendering — and `/speckit.apply-feedback <pr> <comment-id>` routes each comment into the next review cycle.

Shipped numbers: 138 unit tests, 24 Playwright E2E, zero WCAG AA violations, 176 KB gzipped bundle. No backend. The reviewer's credential never leaves their browser — CSP pins outbound traffic to the GitHub API only.

The interop story is the `spec-review-feedback-v1` contract. Versioned, hand-auditable, and the handoff point for everything that happens after Submit.

[Read the full post: LINK]

#FutureDebrief #MaritimeAnalysis #OpenSource
