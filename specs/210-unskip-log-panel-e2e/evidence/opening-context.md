## What We're Building

We're un-skipping a small Playwright suite — `tests/e2e/test-log-panel.spec.ts` — that has been sitting dormant under `test.describe.fixme(...)` since we shipped the LogPanel UX work in #176. Reactivating it closes a specific testing gap: Storybook exercises the LogPanel component in isolation, and the web-shell Playwright suite exercises the same behaviours in a standalone browser, but neither of them crosses the boundary that matters for the VS Code extension — the openvscode-server process, the sidebar webview iframe, and the extension-host message bus that stitches them together. If the LogPanel renders perfectly in Storybook but messages never make it across the iframe boundary, users see nothing. A code-server-based test is the only place we catch that.

The suite keeps its three existing scenarios (empty state, entry created when a tool runs, entries ordered most-recent-first) and gains two more to match what the web-shell suite already asserts — click-to-select and click-to-deselect on a log entry. That parity matters: we run the LogPanel on two host surfaces, and if behaviour drifts between them we want a test to tell us, not a bug report.

## How It Fits

This is the follow-through on two earlier pieces of work. #143 stabilised the webview iframe probing helpers in `code-server-page.ts` so that suites like this one can actually resolve the frame they want to assert against. #176 shipped the LogPanel component with the `data-testid` hooks and focus command the suite was written to expect. The suite was promoted from `skip` to `fixme` under #176 as a deliberate staging step — a signal that it was the designated front-runner for reactivation once the webview-iframe work landed. Reactivating it now puts the real integration path under CI, and serves as the canary for four sibling suites that remain `.skip` with the same blocker comment.

## Key Decisions

- **Scope stayed narrow to one file.** We considered reactivating all five `blocked: webview iframe (#143)` suites at once, but each carries its own independent risk — `test-analysis-tool` still needs debrief-calc in the E2E environment, `test-log-edit-face` has its own stability history, `test-event-log-propagation` has cross-scenario state coupling concerns. The log-panel suite was already promoted to `fixme` as the front-runner, so we honour that staging decision and let it prove the webview-iframe path before the others follow.

- **Class-based selection assertion, not `aria-selected`.** The two new parity scenarios assert against `log-panel__entry--selected` to match the web-shell suite's `toHaveClass(/selected/)` pattern. The LogPanel also sets `aria-selected`, but accessibility-attribute coverage has its own backlog item (#209) and keeping the concerns separate avoids gating a11y work behind E2E work.

- **No bespoke test helpers.** Everything uses the shared `code-server-page.ts` page model and the existing `fixtures/base.ts`. A convenience like `getFirstLogEntry()` would shave a line per scenario but set a precedent that erodes the shared page model — every suite adding its own helpers is how that abstraction stops being shared.

- **No config overrides.** The suite inherits `timeout: 60_000`, `retries: 0 in CI / 1 local`, and `trace: 'on-first-retry'` from `playwright.config.ts`. The deliberate consequence: locally, a spike regression triggers the retry and captures a trace; in CI, a first-fail surfaces via assertion messages and the HTML report, without a trace. That's fine for the contrived-regression verification ritual described in SC-003 — it's a local activity by design.

- **Known risk called out, not papered over.** Four sibling suites still sit at `.skip` with the same `#143` blocker comment even though #143 is marked complete. If reactivating this suite reveals latent webview-iframe flakiness in CI, the mitigation is honest: revert to `fixme`, open a new bug capturing the specific failure mode, and reopen #210 against the new blocker. We'd rather ship with monitoring than with blind confidence.
