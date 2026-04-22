Three Playwright tests have been silently absent from CI since the blocker they cited closed.

They live at `tests/e2e/test-log-panel.spec.ts` and they cover the one path no unit test or Storybook story can: a real tool running in the VS Code extension host, a `LogEntry` travelling over the postMessage bridge, and the Log Panel rendering it inside the webview iframe. When the blocker shipped, the reactivation paperwork didn't. So Playwright reports the suite as "fixme — pending" and everyone scanning CI summaries for broken tests scrolls right past it.

This is the paperwork. A single-file edit, no production code touched, three consecutive green runs as the stability bar. If the tests fail on reactivation we open a fresh blocker — we do not point `fixme` back at a closed issue. Loud failures beat silent skips, even when the silent skip was once the right call.

Read the plan and the open questions on the blog:

[Link to full post]

#FutureDebrief #MaritimeAnalysis #OpenSource
