---
layout: future-post
title: "Planning: A Distinct Banner for Locked OS Keyrings"
date: 2026-04-18
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, nl-search, vscode, linux]
excerpt: "Today our NL search tells Linux users to re-add an API key they already added. This plan fixes that."
---

## What We're Building

If you work on a Linux workstation and the OS keyring does not auto-unlock in the morning, the first thing our NL-search filter bar tells you is "add your API key in settings". That advice is wrong. The key is already stored — the OS just cannot decrypt it right now. Following the banner's instructions sends you to a settings page that cannot fix the problem.

We are introducing a distinct outcome for this case. When VS Code's `context.secrets.get()` throws, the filter bar will surface a banner that names the real cause ("unlock your keyring") and offers Retry as its primary affordance. The existing "not configured" banner is narrowed to the two cases it genuinely describes: the feature is disabled, or no key has ever been stored.

## How It Fits

This layers on top of the parent VS Code NL-search feature (#191), which established the outcome union, the banner surface, and the structured log. One new member is added to that union, one new case is added to the banner dispatch, and the host-side secrets read is wrapped in a small helper so the try/catch is isolated from the provider-call orchestration. No new runtime dependencies, no new settings, no schema changes beyond the discriminated union. One union splits into two cleaner ones — and that narrowing is the point.

## Key Decisions

- Any throw from the secrets API is classified as `keyring-unavailable`. We do not try to subclassify by OS error code — the messages are brittle across distros and the fix the user needs is the same regardless.
- A successful read returning an empty value is still `not-configured`. The two paths are distinguished by whether the API threw, not by how it failed.
- Banner copy adapts per platform (Linux / macOS / Windows) via three externalised i18n keys plus a fallback, selected host-side and passed on the outcome. The webview never calls `process.platform`.
- The retry button re-runs the full NL path, including a fresh secrets read. A retry that fails again with the same outcome does not consume a call-ceiling slot, because no provider call was ever made.
- The structured log gets one new `kind` value and nothing else. No raw exception message, no stack, no OS path fragments cross any boundary.
- A troubleshooting doc with per-platform sections gets anchored from a "Learn more" link on the banner itself.

## What We'd Love Feedback On

- **Banner copy.** We are writing three short platform-specific variants plus a fallback. Does "unlock your OS keyring" read as actionable to Linux analysts, or do we need to name gnome-keyring / KWallet explicitly? Is "Learn more" on the banner the right affordance, or is an inline one-liner enough?
- **Log shape.** We are deliberately not logging the underlying exception message. Would adding an `osPlatform` field to the structured log be useful for operator triage, or is the new `kind` value sufficient?
- **Scope.** Is there a case we have missed where the secrets API fails in a way that should *not* route to this banner?

→ [Join the discussion](https://github.com/debrief/debrief-future/discussions)
