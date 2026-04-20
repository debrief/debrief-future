Storyboarding in Future Debrief — an analyst narrating a plot, Scene by Scene, then replaying it as a briefing — is a four-spec epic. I'm starting with the one that ships no UI at all.

Spec #215 is the headless foundation: LinkML schema for Storyboard and Scene Features, plus a shared TypeScript CRUD module that enforces every invariant (ordering, duplicate-timestamp rejection, hash canonicalisation, provenance) at the module boundary. That unblocks the three follow-up specs (capture, panel and playback, edit suite) to build in parallel against a schema that round-trips cleanly.

A few design choices worth naming:

- Storyboard and Scene use the existing `kind` enum discriminator (STORYBOARD, STORYBOARD_SCENE), not a new `debrief:type` property. Consistency with TRACK, POINT, CIRCLE matters more than novelty.
- Single-surface provenance: every mutation appends one LogEntry to the existing `provenance[]` slot. No parallel `history[]`. The Analysis Log reads it for free.
- The API is async-first because Web Crypto's SHA-256 is async. Structural sharing via immer means unmodified Features stay reference-equal across mutations — a real property for downstream Zustand memoisation.
- The Py to JSON to TS to JSON to Py round-trip harness lands in this spec, not later. So does a Vitest benchmark with a concrete target: p95 under 10 ms at 100k positions.

Full planning post: [LINK]

#FutureDebrief #MaritimeAnalysis #OpenSource
