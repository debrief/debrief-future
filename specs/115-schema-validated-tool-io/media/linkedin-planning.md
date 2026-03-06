A styling tool wrote marker data to one property name. The renderer read from a different one. The features passed through four services without a single complaint — symbols just silently vanished from the map.

The root cause: GeoJSON features flowing through Debrief v4 as untyped dictionaries. We generate Pydantic models and TypeScript interfaces from a shared LinkML schema, but nothing actually validated features against those models at runtime. Producers and consumers could disagree on field names indefinitely.

We are now adding schema validation at every service boundary — parser output, catalog storage and retrieval, tool input and output. Five checkpoints, twelve feature kinds, one shared contract. Each feature is validated against its schema model using the `kind` discriminator, and hardcoded enum sets in individual tools get replaced with imports from the schema. A field mismatch that would have reached an analyst now fails with a clear error at development time, naming the exact field and which boundary caught it.

The post covers our key decisions — keeping strict mode on the Pydantic models, the dispatch mechanism for routing features to validators, and the six-phase implementation plan.

[Read the full post](LINK)

#FutureDebrief #MaritimeAnalysis #OpenSource
