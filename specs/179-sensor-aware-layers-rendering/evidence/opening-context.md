## What We're Building

When an analyst imports a legacy REP file containing sensor records — bearings from a towed array, contacts from a hull array — today's Layers panel gives no visible proof the sensor data actually loaded. The track turns up with its positions, and that's it. If you want to know whether `TOWED_ARRAY` contacts made it through the importer, you open the raw JSON. For a workflow whose first question is "did my data load correctly?", that's a silent failure in the place analysts look first.

This feature extends the `FeatureList` component in `@debrief/components` so that expanding a sensor-bearing track reveals new grouping rows: `Positions (1023)`, `Sensors (3)`, and — for compound tracks — `Track Segments (5)`. Expanding `Sensors` shows each named sensor with its contact count. Expanding a sensor shows individual contact rows with zero-padded bearings (`045°`, `225°`, `359°`) and formatted times. The track itself now visibly carries the thing you imported.

## How It Fits

This is part of Epic E07 — the sensor data pipeline — and it sits on top of schema work already landed in #116 (`SensorData`, `SensorContact`, `TrackProperties.sensors` generated from LinkML into `@debrief/schemas`). It's a pure in-memory rendering change: no schema edits, no new runtime dependencies, a single directory touched (`shared/components/src/FeatureList/`). The path-scheme we're introducing for sensor selection (`${featureId}/sensors/${sensorName}/contacts/${index}`) is designed so the existing `hasChildSelected` prefix-matching extends for free, which means downstream map and chart integrations (#118) can pick up sensor selection without any wiring changes in `FeatureList.tsx` itself — that file stays untouched.

## Key Decisions

A few calls we've made after the clarify pass, each with a trade-off worth naming:

- **Group rows are selectable as a unit.** Clicking `Sensors (3)` adds a single path ID (`${trackId}/sensors`) to the selection, not three child IDs. Downstream views interpret this as "highlight the whole collection." Simpler semantics, no fan-out, but it does push interpretation work onto map and chart consumers.
- **Contact rows trust input order.** We don't sort at render time — the importer (#117) is responsible for producing time-ordered contacts. This protects the virtualisation budget for tracks with 10,000+ contacts, at the cost of trusting upstream ordering.
- **Info icon wired to contact rows only.** Contacts surface optional fields (`range`, `frequency`, `label`, `comment`) through the existing `onChildInfoClick` hook. A sensor-metadata popover is deferred to a follow-up. One-line change to `FeatureRow.tsx`.
- **Group-row labels include counts in parentheses.** `Sensors (3)` instead of just `Sensors`. Analyst sees the summary without expanding anything.
- **Bearings and courses both zero-padded to 3 digits.** Matching nautical convention — `045°` / `225°` / `359°`. This means `getPositionSublabel` gets updated too, which refreshes every existing position row in every existing track. Widely visible, but we think consistency wins.

Four rendering cases cover the space: simple track no-sensors (unchanged), compound track no-sensors (new `Track Segments` wrapper), simple track with sensors (`Positions` + `Sensors`), compound track with sensors (`Track Segments` + `Sensors`). `flattenFeatures.ts` gains a four-case dispatcher and three new `DisplayItem.type` values (`group`, `sensor`, `contact`). We've written 17 contract assertions for `contracts/flatten-features.md` and Case A has a byte-for-byte regression guard (accepting only the course-padding change).
