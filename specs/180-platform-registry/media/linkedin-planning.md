"Which exercises involved UK submarines?" — a simple question that was structurally impossible to answer in Debrief because platform metadata was flat and hardcoded.

This week I'm building a platform registry that fixes this by making the data structure do the work. Platforms sit as leaves in a vessel classification tree, so a platform's nationality, domain, and vessel type are derived from its position in the hierarchy — not stored as separate fields that could drift out of sync. Metadata that can't be inconsistent doesn't need to be validated for consistency.

One JSON source file feeds both Python and TypeScript loaders — no extra dependencies, no build step, no format conversion. Consistent with every other data file in the project. Ten real platforms seeded initially, but the tree handles arbitrary depth and hundreds of entries.

This is the foundation piece for NL-assisted catalog discovery in Future Debrief. Every subsequent feature in the epic builds on it.

Planning post with full spec details: [link to full post]

#FutureDebrief #MaritimeAnalysis #OpenSource
