🎯 Shipped: natural-language catalogue search now lives inside the Debrief VS Code extension.

Analysts type "UK submarines" or "French frigates on ASW operations" into the Catalog Overview filter bar, hit Enter, and watch filter chips apply — without leaving their editor. Same pipeline we shipped for the browser demo last month, now wired to the place people actually work.

The interesting bits:
• API key lives in VS Code SecretStorage, never the webview. Host-only, host-forever.
• Opt-in default off. Zero behaviour change for anyone who doesn't flip the switch.
• Seven failure classes, each with distinct copy + a matched recovery button — "Open settings", "Retry", "Rephrase", "Reload window". Existing chips survive every banner.
• One canonical `LLMClient` shape across browser + VS Code. The browser demo and the extension both consume `createPostMessageLLMClient` / `createLiveLLMClient` over the same `providerCall` core.
• Per-session call ceiling enforced in the extension host so a runaway webview can't burn a budget.

Spec, tests, and the shipped-feature walkthrough are all in the PR. Next up: non-Anthropic providers and an opt-in per-prompt audit trail.

#VSCode #DefenceTech #NaturalLanguage #AnalystTools #Debrief
