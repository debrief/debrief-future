# Quickstart: NL Search in VS Code Catalog Overview

**Audience**: An analyst or reviewer who has built the extension from this branch and wants to exercise the happy path + every failure class.

**Prerequisites**:
- The extension is running (either the Extension Development Host via F5 in VS Code, or installed into a regular VS Code build).
- An Anthropic API key with credit available (Haiku 4.5 costs ~$0.001 per call with this prompt, so a few dollars is plenty).
- A workspace containing a STAC catalogue the Catalog Overview can load (any demo store from `preview/workspace/samples/` works).

---

## 1. Confirm the feature is off by default

Fresh install, no config changes:

1. Open the Catalog Overview (Command Palette → *Debrief: Open Catalog Overview*).
2. Observe the filter bar at the top — there is NO `Live · Anthropic · …` indicator.
3. Type `UK submarines` and press Enter. A literal-substring chip appears matching the current behaviour (not an NL lozenge).
4. Open DevTools (Help → Toggle Developer Tools), Network tab. Zero requests to `api.anthropic.com`.

This verifies US2 acceptance 2.1 (disabled default) and spec SC-002 (zero outbound with feature off).

## 2. Enable NL search

1. Command Palette → *Debrief: Set Anthropic API Key*. Paste your key (password input — won't echo).
2. Settings (⌘,) → search `Debrief › Nl Search`. Toggle `Enabled` on.
3. Confirm the remaining settings:
   - `Model`: leave as `claude-haiku-4-5-20251001`
   - `Call Ceiling`: `50` (per-session limit)
   - `Timeout Ms`: `12000`
4. Reload the Catalog Overview (close/reopen the panel). The header now shows `Live · Anthropic · claude-haiku-4-5-20251001` next to the filter bar.

## 3. Happy path

1. Type `UK submarines` and press Enter.
2. Within ~2 s, chips appear: `UK`, `Submarine`. Plot list narrows to UK-flagged submarine plots. A count like `14 of 73 plots` appears above the grid.
3. Click the × on the `Submarine` chip. Count rises (e.g. `30 of 73`) — the `UK` chip is still applied.
4. DevTools → Network: exactly one POST appears per submission, directed at the webview URL (`vscode-webview://…`) — no direct requests to `api.anthropic.com` from the webview. Looking at the *extension host* output panel, `[nl-search/live]` log lines show `outcome: success`, `durationMs`, `responseBytes`, `model`.

This verifies US1 acceptance 1.1, 1.3 and spec SC-001, SC-003.

## 4. Failure matrix

Use the extension's built-in stub phrases (same canon as #190 — wired through a dev-only test command, `Debrief: NL Search — Stub Mode`, which swaps the real Anthropic call for a deterministic stub):

| Phrase | Expected banner | Reason tag |
|---|---|---|
| `auth-failure phrase` | "Provider rejected the credential…" | `auth-failure` |
| `rate-limit phrase` | "Provider rate limit reached…" | `rate-limit` |
| `provider-error phrase` | "Provider returned an error…" | `provider-error` |
| `timeout phrase` | "Request timed out…" | `timeout` |
| `malformed phrase` | "Response could not be parsed…" | `malformed-response` (nested `reason: "non-json"`) |
| *(no key set, enabled on)* | "NL search is enabled but no API key is set…" | `not-configured` |
| *(ceiling=1, second submission)* | "Per-session call ceiling reached…" | `ceiling-reached` |

For each phrase:
1. Submit. Banner appears above the plot list.
2. Check: any previously applied chips REMAIN (filter state preserved per spec FR-006).
3. Click *Retry*. Same banner reappears (stub is deterministic). Click *Open Settings* — the extension settings page opens on `debrief.nlSearch`.

This verifies US3 and spec SC-004, SC-005.

## 5. Ceiling and cancellation

1. Lower `Call Ceiling` in settings to `3` and reload the panel.
2. Submit 3 distinct phrases. On the 4th, a `Ceiling reached` banner appears explaining that a reload resets the counter.
3. Reload the panel (command: *Developer: Reload Webviews*). Counter resets; next submission succeeds.
4. In a separate test: submit a phrase, then immediately submit a second — the first call is cancelled cleanly (no banner for the first, only the second's outcome shows). Extension-host log shows `outcome: transport-error, reason: cancelled` for the first request.

## 6. Revert

To return to today's behaviour on reload:

- Toggle `Debrief › Nl Search: Enabled` off, OR
- Command Palette → *Debrief: Clear Anthropic API Key*

Either path makes the indicator disappear and restores the literal-substring QuickSearch.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Indicator never appears after toggling enabled | Panel didn't refresh config | Reload webview (*Developer: Reload Webviews*) |
| `not-configured` banner on submit | Key empty or cleared | Run *Debrief: Set Anthropic API Key* |
| `provider-error` on every phrase | Credit balance low or workspace spend limit $0 | Check [console.anthropic.com/settings/billing](https://console.anthropic.com/settings/billing) and [Limits](https://console.anthropic.com/settings/limits) |
| `malformed-response` on every phrase against a specific model | That model ignores the prompt's JSON directive | Switch `Model` setting back to `claude-haiku-4-5-20251001` |

## What's deliberately NOT covered by this quickstart

- Other VS Code surfaces (Layers Panel, Tools Panel). Out of scope for v1 — see spec Assumptions.
- Non-Anthropic providers. Out of scope for v1 — see research Decision 7.
- Workspace-level (shared) configuration. By design only user settings + SecretStorage. See research Decision 2.
