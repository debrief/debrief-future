Built the machinery connecting calculation tools to storage in Future Debrief. When a tool smooths a track or computes a closest point of approach, the system now classifies the result (mutation, addition, deletion, or artifact), persists it to the STAC catalog, and updates the display incrementally.

The architecture separates concerns cleanly: tools produce MCP-compliant responses with typed content, the orchestrator interprets result types and calls atomic storage operations, and a diff utility computes what changed for incremental rendering. Multi-result responses (like trimming outliers, updating the track, and producing a diagnostic plot) are processed sequentially as separate content items.

Result types use a hierarchical path system (e.g., artifact/report/ssa_assessment) that degrades gracefully. Contrib organisations can introduce deep sub-types without colliding with core types. 88 tests passing across Python and TypeScript.

Read more: [link to blog post]

#FutureDebrief #MaritimeAnalysis #OpenSource
