A lot of the analysts we're building Future Debrief for can't use Claude. Not because they don't want to — because their network can't reach it, or their procurement list doesn't include it, or their site simply doesn't do commercial cloud APIs at all.

So the next piece of work on our natural-language catalogue search is letting analysts pick their own backend: Claude, OpenAI, or a locally-hosted Ollama model. One VS Code setting, same filter bar, same CQL2 output. The Ollama path is the one that actually matters for defence — it unblocks air-gapped and classified deployments where no commercial API is reachable.

The approach we're taking is deliberately boring. Three pure functions per provider (compose, parse, map-error) behind a stable client contract, no new SDKs, no new error taxonomy, and CI parity tests against a recorded corpus so no provider silently drifts from the baseline. Adding a fourth should take under a day.

Planning post with the full set of decisions, and the things we'd like feedback on before we build it: [link placeholder]

#FutureDebrief #DefenceTech #OpenSource
