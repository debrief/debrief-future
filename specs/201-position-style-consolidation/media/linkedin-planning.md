Two TypeScript interfaces in the Debrief codebase, both called `ResolvedPositionStyle`, quietly drifted apart. One listed three marker shapes, the other five. One called a field `label`, the other `labelText`. Both were hand-typed next to the rendering code, independent of the LinkML schema that already defines the canonical list.

Next up: collapse them into one interface, anchored to the schema-generated enum via a template literal union. Callers keep passing shape names as plain strings. The set of legal values stays locked to the schema and extends automatically whenever a new shape is added.

Zero rendering-change: markers on the map and timeline look identical before and after. The value is defensive — one less place where a hand-typed list can silently fall out of step with the source of truth.

Open question for the wider audit: how many other rendering-side types still parallel a LinkML enum by hand?

[LINK]

#FutureDebrief #MaritimeAnalysis #OpenSource
