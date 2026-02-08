Most provenance systems answer "what happened." The harder question is "what if I'd done it differently?"

Future Debrief currently stamps each tool result with a simple lineage record -- tool name, version, timestamp. Enough for audit, not enough for replay. We've now mapped the full transition from this flat model to a W3C PROV-inspired logging system where every parameter records whether it's tunable, every operation links its inputs and outputs by feature ID, and the whole analysis chain becomes replayable with different values.

The key architectural decision: Python services stay stateless. They return expanded ToolResults with structured change tracking. A new TypeScript Log Service in the session-state layer wraps those results in PROV-vocabulary entries, stored directly on GeoJSON feature properties. No new server, no network dependency. Seven implementation phases, no circular dependencies, each mapping to an SRD priority targeting the March 2026 demonstration.

[Read the full post](https://debrief.github.io/blog/planning-prov-logging-integration)

#FutureDebrief #MaritimeAnalysis #OpenSource
