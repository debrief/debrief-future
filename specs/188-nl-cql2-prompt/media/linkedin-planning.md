"UK submarines in the 1990s." "German frigates on Exercise Dragonfire." These are the phrases a maritime analyst actually types — and the next piece of Future Debrief turns them into CQL2 filter expressions that run against the local STAC catalog.

Starting work on item #188 this week. A few decisions worth flagging early:

The prompt does not contain catalog items. Only the CQL2 schema and an extracted enum bundle — nationalities, vessel class taxonomy, exercises, tags. Prompt size stays bounded as the catalog grows.

The LLM returns CQL2-JSON directly, not CQL2 text, so hallucinated fields fail at the validation boundary instead of during evaluation.

The generator takes an injectable LLM client. CI runs against recorded response fixtures — fully offline, deterministic, constitutionally compliant. Transport and auth live in a separate item.

Nine analyst phrases from the prototype are the regression gate: UK submarines = 18 hits, Type 23 frigates = 25 hits, and seven more. Comparison is by evaluated catalog outcome, not by CQL2 string equality — semantically-equivalent outputs pass.

Looking for feedback on the phrase corpus, particularly compound exercise + vessel type + date queries from real analysis work.

[Read the planning post] — <link>

#FutureDebrief #MaritimeAnalysis #OpenSource
