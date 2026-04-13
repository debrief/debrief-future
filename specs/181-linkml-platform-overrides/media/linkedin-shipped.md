"Which exercises involved British submarines?" — a question that, until this week, the data model structurally could not answer.

The problem was flat lists. STAC items stored nationalities as `["GB", "FR"]` and vessel classes as a separate array, with nothing linking which nationality belonged to which vessel. You could filter on one or the other, not both together.

The fix: replace those flat aggregates with a `debrief:platforms` array where each platform carries its own nationality, vessel class, and domain as a unit. A `PlatformRecord` for HMS Nelson looks like `{id: "NELSON", nationality: "GB", vessel_class: "surface/warship/frigate/type23", domain: "surface"}`. Compound predicates just work. All 100 exercise fixtures are regenerated in the new format. The old flat fields are gone.

This is the structural foundation that save-time resolution, CQL2 compound filtering, and eventually natural language search all build against.

Full post: [link to full post]

#FutureDebrief #MaritimeAnalysis #OpenSource
