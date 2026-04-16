---
post_type: linkedin
feature: 189-stakeholder-demo-ui
date: 2026-04-16
status: ready
---

A stakeholder can now open a browser, type "UK submarines", and see a filtered grid of matching plots — with no internet connection, no API key, and no build step. That is what shipped this week as part of the E10 NL-assisted catalog discovery epic.

The demo is a single HTML page: React and Babel run in the browser, all dependencies are vendored locally, and every NL query resolves against a hand-authored fixture corpus rather than a live LLM. The interesting implementation detail is how we handle case sensitivity in recorded-fixture transports — the corpus lookup canonicalises user input, resolves it back to the original-case phrase, and passes that to the transport so the SHA-256 prompt-hash check passes. It is a small pattern but it is the difference between a demo that silently breaks on "uk submarines" versus one that handles any casing correctly.

Full write-up with screenshots and the case-sensitivity explanation on the blog.

- Read the post: https://debrief.github.io/2026/04/16/shipped-nl-demo-ui
- See the spec: https://github.com/debrief/debrief-future/blob/main/specs/189-stakeholder-demo-ui/spec.md

#FutureDebrief #MaritimeAnalysis #OpenSource
