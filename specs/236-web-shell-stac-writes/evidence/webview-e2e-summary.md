# Web-shell E2E Summary

Captures the Playwright run evidence for #236 — the headline before/after
visual contrast of the FR-WEB-029a "Session-only" badge driven by the
StacWriter capability report.

## Run command

```bash
cd apps/web-shell
node run-playwright.mjs stac-writes
```

Uses `@sparticuz/chromium`'s bundled Linux x86-64 binary so the suite
runs in cloud sessions (Claude Code, CI, Lambda) without needing a
Playwright browser CDN download. See
`docs/project_notes/playwright-installation-research.md` for the
rationale.

## Test File

`apps/web-shell/playwright/tests/stac-writes.spec.ts`

## Workflows × outcomes × screenshots

| Workflow | Outcome | Screenshot |
|---|---|---|
| **after — IndexedDB available** | Open plot → click capture → name "Persistence demo" → confirm → assert badge hidden | `evidence/screenshots/after-no-badge.png` |
| **before — IndexedDB unavailable** | Stub `globalThis.indexedDB` to undefined → open plot → click capture → name → confirm → assert badge visible with the reason-specific "Browser persistence unavailable" message | `evidence/screenshots/before-session-only-badge.png` (= `private-mode-badge.png`) |

The two filenames `before-session-only-badge.png` and
`private-mode-badge.png` are bytewise identical — the badge-visible state
under our stub IS the pre-#236 state (always shown when storyboard
content existed). Filenames retained for blog-post + PR clarity.

## Test results (most recent run)

```
Playwright config: useSparticuz=true, chromiumPath=/tmp/chromium
Running 2 tests using 1 worker

  ✓  1 stac-writes.spec.ts › after — IndexedDB available: badge hidden even with content (4.9s)
  ✓  2 stac-writes.spec.ts › before — IndexedDB unavailable: badge visible with reason (3.7s)

  2 passed (12.9s)
```

## What the screenshots show

`after-no-badge.png` — analysis view with the "Persistence demo"
storyboard active in the rail, one captured scene visible (DTG label
`150930Z JAN 24`), and the rail header clean (no warning badge). With
healthy IndexedDB, the writer persists the capture and the badge stays
hidden by FR-005.

`before-session-only-badge.png` — same content, but with the writer's
capability probe forced to fail by stubbing `globalThis.indexedDB` to
undefined. The yellow badge appears at the top of the rail with the
reason-specific message: "⚠ Session-only — captures persist only for
this tab. Browser persistence unavailable." This is exactly the FR-006
behaviour: the badge stays visible (with a sharper message than the
pre-#236 generic warning) when IndexedDB is unavailable, telling the
user persistence is not in play in this browser configuration.

## Per-test setup pattern

Each test calls `openFirstPlot(page)`, which:

1. Navigates to `/`.
2. Wipes the writer's IndexedDB database
   (`indexedDB.deleteDatabase('debrief-stac-writer-v1')`) so previous
   runs don't displace the bundled exercise-alpha first row via the
   standalone-item registration path
   (`loadStandaloneItemsViaWriter` `unshift`).
3. Navigates to `/?storyboardPanel=1` (gates the storyboard panel
   feature flag).
4. Waits for the welcome view, double-clicks the first sample plot row,
   waits for the analysis view + storyboard rail.

## Deferred from this round

- **`capture-survives-reload.gif`** (the < 5s reload-survival GIF). A
  prototype third test was dropped — the URL+GoldenLayout state
  restoration on reload makes re-opening the same plot a moving target
  that doesn't add net evidence beyond the unit-level reload-survival
  proof. Captured as a follow-up in the spec's "What's Next" list.
- **Cross-tab BroadcastChannel test** (FR-023). Same backend (live
  IDB + BroadcastChannel) is exercised by the catalogReadView listener
  module, which has unit coverage; full two-tab Playwright is a
  follow-up.
- **IDB unavailable + capture rejection assertion** beyond just the
  badge-visibility check. The current test stops at "badge appears" —
  a structured-error assertion on the capture reject path is a future
  refinement.

## Reproducibility

```bash
# Cloud (Claude Code, CI, Lambda):
cd apps/web-shell
node run-playwright.mjs stac-writes

# Local (macOS/Windows — first-time setup):
cd apps/web-shell
pnpm exec playwright install chromium
pnpm test stac-writes
```
