Shipped #208 this week: a schema-rooted `kind` discriminator on Debrief's LogPanel timeline entries. The planning post framed it as a tech-debt refactor to unblock three upcoming features (snapshot button, tune markers, rationale entries). Turns out it also quietly fixed a bug we'd been shipping for weeks.

Pre-change, the LogPanel decided whether an entry was a manual checkpoint by asking the rendering layer what colour chip to draw — `resolveToolCategory(toolName).category === 'snapshot'`. `export-png`, `export-csv`, `export-geojson` happen to sit in that visual category (same blue-camera icon), so every export row rendered with a greyed-out "Manual checkpoint" placeholder and a hidden duration. Conversely, a record whose `toolName` was literally `manual-checkpoint` didn't match the map and rendered as a regular tool row. Both directions were inverted. Nobody had filed a bug.

The fix: add an optional `activity_type` enum on the LinkML `LogEntry` schema, regenerate Pydantic / TypeScript / JSON Schema, project onto a closed `'snapshot' | 'tool' | 'tune'` union on the UI, gate rendering on `entry.kind === 'snapshot'`. Schema becomes the contract; `toolName` never enters the decision. Optional field + backward-compatible fallback means zero data migration.

Two Claude sessions planned this in parallel and reached different architectures — one kept the coupling in the populator, the other moved it onto the schema. The schema-rooted path won for three reasons: it aligns with Article II of our Constitution (LinkML as the single source of truth), it fixes the export-row bug instead of preserving it as "visual parity", and it matches the recent #206 Type Audit's finding that hand-typed cross-domain discriminators are schema-promotion candidates. Drift tests now lock the pattern in place as a CI regression guard.

Shipped post: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource #Provenance
