## Hook

| Before | After |
|---|---|
| Arm the polygon tool in the VS Code map. Hide and re-show the panel, or run "Developer: Reload Webviews". The toolbar silently snaps back to "no tool selected" and you have to re-click. | Arm the polygon tool. Trigger the same rebuild. The toolbar comes back armed on the same tool, with the same palette colour, and you can keep drawing without breaking stride. |

## What We're Building

When you arm a drawing tool in the VS Code map panel today, the armed state lives in a React `useState` hook inside the webview. The moment that webview rebuilds — hide/show the panel, "Developer: Reload Webviews", or any layout change that forces a remount — the local state is thrown away and the tool silently disarms. You're left looking at a toolbar that has helpfully reset itself to "no tool" without telling you.

This change moves the drawing mode and palette index out of component-local state and onto the existing `session-state` spatial slice, so they survive a webview rebuild. The architectural rule is simple: anything that's part of the user's session — the armed tool, the colour they picked, the time slider, the display mode — belongs in the store, not in a transient React hook. Drawing mode was the last hold-out, and it's the one users actually notice when it breaks.

## How It Fits

This closes findings F-3.1 and F-3.2 from the architectural-consistency review (Epic E06). Most of the wiring already exists from PR #559: the web-shell reads drawing values from the store, the VS Code host subscribes to the spatial slice and forwards changes across the message bridge, and the webview round-trips toolbar clicks back as `drawingModeChanged`. The one remaining gap is the bootstrap path — when a new webview comes up and sends `webviewReady`, the host seeds it with current time and display mode but not with current drawing mode or palette index. So the store keeps the right value across a rebuild; the webview just never asks for it on the way back in. Two `postMessage` calls in the existing `webviewReady` handler close the loop.

## Key Decisions

- **Gap-fill, not rewrite.** The architectural review predates PR #559's session-state work. Rather than re-plumb anything, we add the two missing seed messages and leave the rest of the bridge alone. About 30–60 lines of production change.
- **Reuse the existing `setDrawingMode` and `setDrawingPaletteIndex` messages** rather than inventing a new "initial state" envelope. The host already knows how to send these and the webview already knows how to receive them; bootstrap is just another instance of "host pushes a value to the webview".
- **Always post both messages on `webviewReady`, even when the values equal the defaults.** Unconditional behaviour is easier to test and removes a class of "did it post or not?" ambiguity from the regression suite.
- **Keep the webview's `useState` mirror.** The webview is an isolated iframe and can't import the host-side Zustand store, so it needs some local state to render against. That mirror is host-driven — the host is the authority, the mirror is a read-cache. FR-011 ("no remaining call site uses component-local React state as the authoritative source") is honoured because authority lives in the store, not in the webview.
- **Cover the VS Code regression with a Vitest unit test on the message boundary, not Playwright.** Driving VS Code chrome under xvfb has been flaky enough (see issue #142) that pinning the contract at the message-bridge boundary is the more honest test. The web-shell regression stays on Playwright, where the browser path is well-supported.
