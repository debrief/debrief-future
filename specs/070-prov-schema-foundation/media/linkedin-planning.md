We track when analysis tools run in Debrief, but not what they changed or why. Two separate provenance implementations write different keys with flat, limited models — no structured parameters, no change deltas, no activity IDs linking operations.

We're replacing this with a unified PROV-aligned schema foundation. Provenance becomes an append-only array of Log entries on each GeoJSON feature, capturing property deltas, created assets, activity UUIDs, and structured parameters. Aligns with W3C PROV vocabulary and sets up six downstream features: Log Service, Log Panel, undo/redo split, snapshots, branching, and replay.

This is Phase 0 of a 7-phase epic. Getting the schema right now means those features can proceed without revisiting the data model.

Planning post: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource
