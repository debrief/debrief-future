# Usage Example — Linux Analyst Recovers from Locked Keyring

This is a short transcript of the user-visible difference #198 introduces.
Before this feature, both scenarios below would show the same generic
"set your API key" banner. After #198, the second scenario gets a
distinct, accurate diagnosis.

## Scenario A — never configured (unchanged)

A new analyst opens the Catalog Overview for the first time. They have
*never* run the `Debrief: Set Anthropic API Key` command. They type a
phrase and press Enter.

```
> open Catalog Overview
> type "UK submarines"
> press Enter

[banner]
  data-transport-reason="not-configured"
  "NL search needs an API key — run the
   "Debrief: Set Anthropic API Key" command."
  [Open settings]
```

This is the existing #191 behaviour. **This feature does not change it.**

## Scenario B — keyring locked (NEW behaviour)

A returning analyst on Ubuntu reboots their workstation, opens VS Code,
opens the Catalog Overview, and submits a phrase. The OS keyring
(gnome-keyring) is in its default locked state — so
`context.secrets.get()` rejects with `Error: org.freedesktop.Secret.Error.NoSession`.

### Before this feature

The user saw the **same** banner as Scenario A, advising them to set an
API key. They opened the command palette, ran "Debrief: Set Anthropic
API Key", pasted the key, saw it save successfully, submitted again —
and got the same banner. Confusion ensues.

### After this feature

```
> reboot, open VS Code, open Catalog Overview
> type "UK submarines"
> press Enter

[banner]
  data-transport-reason="keyring-unavailable"
  "Saved API key could not be read — the OS credential
   keyring is unavailable."
  [hint, data-platform-hint="linux"]
  "Unlock your gnome-keyring or KWallet and try again."
  [Help: unlock your keyring]   ← primary action (opens troubleshooting docs)
  [Open settings]               ← secondary action

> alt-tab to seahorse, unlock keyring with login password
> alt-tab back to VS Code
> type "UK submarines"
> press Enter

[chips]  nationality: GB
[exercise list narrows to GB submarines]
[banner cleared]
```

The analyst's actual problem (a locked OS keyring) is now diagnosed in
the first banner. The recovery action (unlocking the keyring) is in
their hands; no Debrief code change, no extension reload, no VS Code
restart. The very next submission after they unlock the keyring
succeeds — the classification is not cached or sticky (FR-007).

## Why this matters

| Failure cause | Pre-#198 banner | Post-#198 banner | Correct remedy |
|---------------|-----------------|------------------|----------------|
| Never configured | "set your API key" | "set your API key" | Set the key |
| Saved but keyring locked | "set your API key" ❌ | "unlock the OS keyring" ✅ | Unlock the keyring |

The analyst's first banner now points at the right cause. They reach the
correct remedy in seconds rather than running in circles re-saving a key
that is already saved.

## Telemetry

The audit/log layer (#191 FR-007) records the new outcome distinctly —
a log reviewer can count `not-configured` and `keyring-unavailable`
occurrences independently without parsing banner strings.

```
> grep '"outcome":"keyring-unavailable"' nl-search.log | wc -l
3
> grep '"outcome":"not-configured"' nl-search.log | wc -l
12
```
