## What We're Building

The natural-language search work in Epic E10 has a scaling problem we already saw coming. The throwaway prototype that proved analysts can ask "UK submarines in the 1990s" and get sensible results worked by stuffing the entire 70-item catalog into the LLM prompt. At 700 items it would not fit, and at 7000 it would not be affordable.

The fix is to send the LLM a much smaller artefact: every controlled vocabulary the catalog actually uses. The vessel-class taxonomy. Every nationality code we have data for. Every exercise name. Every tag, every feature tag. With that in hand the LLM does not need to see the catalog at all — it just writes a CQL2 filter that the existing client-side filter engine evaluates locally.

This planning item is the producer for that artefact. A single Python script that walks the platform registry and the regenerated sample catalog and emits one compact, deterministic JSON file. The LLM prompt design (item #188) reads it and templates it into the system prompt; the catalog never crosses the network.

## How It Fits

This sits in Phase 3 of Epic E10, between the platform registry (#180) and catalog regeneration (#184) on one side and the prompt design (#188) on the other. It is the smallest possible bridge — a build-time extract of vocabulary the rest of the work already produced.

It also closes the loop on a small but consequential architectural commitment from the prototype: the LLM should never be sent operational data. It can be sent the *shape* of operational data — the words analysts use to talk about it — and that's enough to write a filter.

## Key Decisions

- **The bundle is committed to the repo.** Every PR that changes the registry, the catalog, or the script will show the resulting diff to the LLM prompt. That review surface matters, because changes here directly alter the LLM's worldview.
- **Reuse the existing `debrief-data` registry loader.** No second tree parser, no parallel validation. The bundle is a projection of the loader's output minus the platform-instance leaves; the LLM reasons about classes, not specific ships.
- **Exercise names are parsed from item titles using a deliberately conservative rule** — substring before the first `": "`. If a future schema change adds a discrete `debrief:exercise` field, the parser swaps for a direct lookup.
- **Determinism is mandatory.** Sorted iteration, sorted keys, trailing newline. Two runs on identical inputs must produce a byte-identical file, so the committed artefact is safe to diff.
