Load a legacy maritime exercise file containing a platform called AMBUSH. The platform registry has no entry for it. Your next query for "UK submarines" silently omits it. Nobody knows.

This week I'm adding import-time validation to Future Debrief that checks every extracted platform identifier against the registry and surfaces advisory warnings for anything unregistered. The import always succeeds -- data gets in regardless -- but the analyst gets a clear to-do list of platforms needing registry entries.

The check sits at the single entry point for all format handlers, so every file type gets validated automatically. Warnings are deduplicated (one per platform per file, not per track position) and the registry load itself is graceful -- if it fails, you get one warning that validation was skipped, not a blocked import.

It's a quality ratchet for the catalog discovery features we're building. Small piece of plumbing, but it's how the registry stays comprehensive as new data arrives.

Planning post with full details: [link to full post]

#FutureDebrief #MaritimeAnalysis #OpenSource
