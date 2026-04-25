# Usage Example — NL Search in VS Code Catalog Overview (#191)

## 1. Enable the feature

Open VS Code Settings (⌘, / Ctrl+,) and set:

```jsonc
{
  "debrief.nlSearch.enabled": true
}
```

Default is `false` — you get the same literal QuickSearch as before
until you explicitly opt in.

## 2. Provide an Anthropic API key

Run the command palette (⌘⇧P / Ctrl+Shift+P) and pick:

    Debrief: NL Search — Set Anthropic API Key

Paste your key (starts with `sk-ant-`). The input is password-masked;
the key is stored in VS Code SecretStorage and **never** written to
workspace files, logs, or sent to the webview.

## 3. Submit a phrase

Open any STAC catalog ("Debrief: Open Catalog Overview"), and type a
plain-English phrase into the filter bar:

    UK submarines

Hit Enter. The webview forwards the phrase to the extension host, which
brokers the Anthropic call, parses the response into lozenges + a
filter expression, and updates the plot list / map to match.

You'll see the live-mode indicator above the filter row:

    ● Live · Anthropic · claude-haiku-4-5-20251001

## 4. Turn it off (zero outbound guarantee)

Flip the setting off:

```jsonc
{
  "debrief.nlSearch.enabled": false
}
```

The literal QuickSearch returns instantly; zero network calls leave
the extension host regardless of what the analyst types.

## 5. What a failure looks like

If the provider returns `429 rate limit`, you see:

    [!] The provider rate limit was hit. Try again in a moment.
    [Retry]  ×

Existing chips survive — the only thing the banner changes is the
retry affordance. Clicking **Retry** re-submits your last phrase.

Seven distinct banner variants cover every failure class:

| Banner reason | Recovery |
|---|---|
| `auth-failure` | Open settings |
| `rate-limit` | Retry |
| `provider-error` | Retry |
| `timeout` | Retry |
| `malformed-response` | Rephrase |
| `not-configured` | Open settings |
| `ceiling-reached` | Reload window |

## 6. Rotate / clear the key

    Debrief: NL Search — Clear Anthropic API Key

Confirms with a modal. After the key is cleared, subsequent phrases
short-circuit to the `not-configured` banner pointing to the "Open
settings" recovery.

## 7. Per-session ceiling

`debrief.nlSearch.callCeiling` (default 50) caps the number of NL
calls per VS Code session. Once reached, subsequent phrases return
the `ceiling-reached` banner with a **Reload window** button. The
counter resets on reload.

## 8. Developer workflow — running the stub

The Storybook story `FilterBar → NL Mode — with stub client` drives
the entire user experience against a deterministic in-memory stub
(no provider, no credentials). Run it locally with:

    pnpm --filter @debrief/components storybook

Then navigate to `filterbar--nl-mode-with-stub-client`. Phrases
containing any of `auth-failure`, `rate-limit`, `provider-error`,
`timeout`, `malformed`, `not-configured`, or `ceiling-reached` map to
the matching banner variant.
