An audit of every type declaration in the codebase sounds dull. Here is why we need one.

Future Debrief's architectural rule is that any type crossing the Python ↔ TypeScript boundary is defined once in LinkML and generated into both languages. Hand-writing those shapes is where drift lives. A recent code-quality pass surfaced around 35 places where we parse untrusted data as `Record<string, unknown>` at a service edge, plus several concepts (`Coordinate`, `DisplayMode`, `PlaybackState`, tool-result envelopes) that had quietly grown two or three slightly different declarations.

Feature 206 is the catalogue. A committed Markdown report will enumerate every hand-written `interface`, `type`, and `enum` in the codebase, classify each into one of five buckets (schema-rooted, boundary, single-domain, cross-domain, or drift candidate), and open backlog items for every actionable finding in the same PR as the report. A small TypeScript-compiler-API scanner auto-tags the cheap signals; humans make the judgement calls.

The point is not the audit itself. It is giving Epic E11 — our schema-first boundary-typing programme — a concrete target list instead of a guess.

Read the full post: [link pending publication]

#FutureDebrief #TypeSafety #OpenSource
