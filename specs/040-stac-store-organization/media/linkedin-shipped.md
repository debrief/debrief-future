Structural changes to file storage usually break things. We just shipped a migration that does the opposite.

We reorganized how Future Debrief stores STAC Items from flat catalogs to per-item folders. This sounds like it should require rewriting references everywhere. It didn't. Relative path resolution meant asset links moved with their items automatically—no changes to TypeScript services, no broken references.

The migration itself is idempotent. Run it twice and the second time is a no-op. Eight test cases cover typical and edge scenarios. It integrates via JSON-RPC CLI, so the Electron loader app can invoke it directly.

What surprised us: we expected this to be disruptive infrastructure work. Instead it was mostly invisible, which revealed something good about the design—the abstraction was already hiding these details. Sometimes the absence of pain signals that things are working.

Read the full post to see how relative hrefs made items portable, and why this unblocks broader schema validation and cross-exercise analysis.

[debrief-future/specs/040-stac-store-organization](https://github.com/debrief/debrief-future/tree/main/specs/040-stac-store-organization)

#FutureDebrief #MaritimeAnalysis #DataArchitecture
