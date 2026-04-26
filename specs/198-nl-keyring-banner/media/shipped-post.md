---
layout: post
title: "Building a Distinct Keyring-Unavailable Banner for NL Search"
date: 2026-04-26
categories: [nl-search, vscode-extension]
tags: [keyring, diagnostic-accuracy, linux, macos, windows]
excerpt: "Stop sending analysts in circles — distinguish 'key not set' from 'key can't be read' when the OS keyring is locked."
---

## What We're Building

The NL search feature in the VS Code extension lets analysts phrase queries in natural language — "UK submarines" becomes a CQL2 filter — without learning filter syntax. But users on Linux frequently hit a gotcha: they've already saved their Anthropic API key, but when the OS credential keyring (gnome-keyring, KWallet) is locked or unavailable, the extension showed a generic banner saying "set your API key." Analysts would open settings, save the key again, submit the same phrase, and see the identical banner. Confusion and frustration.

This feature splits that one failure mode into two. When `context.secrets.get()` throws — meaning the saved key exists but cannot be read — the banner now says so explicitly. The diagnosis is OS keyring unavailability, not a missing API key. The recovery action is "unlock your keyring," not "re-enter your key."

## How It Fits

The parent NL-search feature (#191) introduced a classification step in `llmProxy.ts` (extension-host service layer) that maps observable outcomes to a `LiveOutcome` discriminated union: `proceed-with-key`, `not-configured`, `auth-failure`, `provider-error`, etc. This feature adds one new discriminant — `keyring-unavailable` — and wraps the secret-read calls in try/catch. A rejection or throw now resolves to a distinct outcome; the banner-rendering layer in `FilterBar.tsx` consumes that discriminant and renders OS-aware copy. No transport changes, no pipeline changes, no storage changes. Pure classification refinement.

## Key Decisions

- **Detection rule is "was the Promise rejected?"** — no error-shape inspection. Any rejection (Error, string, undefined, DOMException) classifies as `keyring-unavailable`. This avoids the fragility of trying to recognize specific keyring error codes that vary across libsecret versions, KWallet versions, and Keychain implementations.

- **Cache-refresh throws preserve a previously-working cached key** (FR-008). The cache-refresh re-read is wrapped in its own try/catch that leaves `cachedKey` untouched on throw. A transient keyring hiccup mid-session does not silently invalidate a working credential.

- **Recovery without restart** (FR-007). Classification is not cached or sticky. A user who unlocks their keyring mid-session and submits again will succeed on the very next attempt — no extension reload, no VS Code restart.

- **Platform-neutral headline, optional per-platform hint** (FR-010). The banner headline never embeds Linux-only language like "gnome-keyring." An optional secondary hint paragraph adapts per OS: "Unlock your gnome-keyring or KWallet and try again" on Linux, "Unlock Keychain Access" on macOS, "Check Credential Manager" on Windows. Unknown platforms suppress the hint.

## Screenshots

The three platform variants of the new `keyring-unavailable` banner:

**Linux (gnome-keyring locked)**
![Keyring-unavailable banner on Linux](assets/198-nl-keyring-banner/screenshots/banner-keyring-unavailable-linux.png)

**macOS (Keychain locked)**
![Keyring-unavailable banner on macOS](assets/198-nl-keyring-banner/screenshots/banner-keyring-unavailable-macos.png)

**Windows (Credential Manager)**
![Keyring-unavailable banner on Windows](assets/198-nl-keyring-banner/screenshots/banner-keyring-unavailable-windows.png)

Each variant shows:
- Headline: "Saved API key could not be read — the OS credential keyring is unavailable." (same across all platforms)
- Optional hint paragraph: platform-specific recovery guidance
- Primary action: "Help: unlock your keyring" (opens troubleshooting docs via `vscode.env.openExternal`)
- Secondary action: "Open settings" (available but not the primary call-to-action, to avoid misdirecting users into re-saving a key that is already saved)

## By the Numbers

| Metric | Value |
|--------|-------|
| Unit tests added | 10 |
| Storybook E2E tests | 6 |
| VS Code E2E tests | 4 (skipped pending #191 harness) |
| Code coverage (additive) | n/a |
| All unit + Storybook E2E | 12 pass, 0 fail |

The test suite covers:
- Distinct classification: a rejected `secrets.get()` produces `keyring-unavailable` outcome
- No regression: resolved `undefined` still produces `not-configured`
- Cache safety: a throw during refresh leaves the cached key intact
- Recovery: classification re-evaluates on every submission (not sticky)
- OS-aware rendering: headline is platform-neutral; hint adapts to `platformHint`
- Misdirection avoided: "Open settings" is secondary, not primary

## Lessons Learned

**Detection simplicity is resilience.** We initially considered inspecting error messages to classify "locked" vs "corrupt" vs "daemon missing." But keyring error codes vary wildly: libsecret uses DBus error names, KWallet uses different strings, Keychain uses yet others. By settling on "was the promise rejected?", we get reliable classification that works across all three OS keyrings without a version-compatibility matrix.

**Cache-refresh safety matters.** A transient keyring failure during the `onDidChange` invalidation handler could silently drop a working key if we didn't guard it. Now the refresh throw leaves the cache intact, so the user's session stays usable even if the keyring hiccups. Only explicit user actions (clear the key, or a delivered `onDidChange` resolving to `undefined`) evict the cache.

**Telemetry discrimination is powerful.** The structured log record now carries `outcome: "keyring-unavailable"` distinctly from `outcome: "not-configured"`. A log reviewer can count each class independently without parsing banner strings. That separation will let us track whether analysts are more likely to recover (unlock keyring) or give up, and whether the help docs actually resolve the issue.

## What's Next

The VS Code E2E tests (`T040–T043`) are currently skipped pending #191's harness adding a hook for stubbing `context.secrets.get` rejections. Once that hook lands, removing the `.skip` wrapper is a one-line change. The test code paths and selectors are ready.

Longer-term, if telemetry shows fine-grained error classification is useful (distinguishing "locked" from "corrupt" from "daemon missing"), we can add a second refinement pass that inspects non-sensitive error fields. But for now, the sledgehammer approach — any rejection is `keyring-unavailable` — has proven reliable in validation.

→ [See the code](https://github.com/debrief/debrief-future/pull/198)
→ [Storybook: NlModeKeyringUnavailable variant](https://debrief.github.io/debrief-future/storybook/?path=/story/filterbar--nlmodekeyringunavailable)
