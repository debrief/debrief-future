Sensor data without bearing lines on the map is like a spreadsheet of coordinates -- technically complete, practically useless.

We're adding a custom Leaflet canvas layer to Debrief Future that renders bearing lines from sensor contacts directly on the map. Each line extends from the host platform's interpolated position outward along the observed bearing, with ambiguous bearings shown in a darker shade. Snail mode fading gives temporal context -- newer contacts in full colour, older ones fading to black.

The rendering handles hundreds of contacts per sensor using canvas rather than individual DOM elements. No new dependencies, just geodesic geometry on existing Leaflet primitives.

This is Phase 3 of 7 in our sensor data pipeline. Schema done, import done, now making it visible.

[Read the full planning post]

#FutureDebrief #MaritimeAnalysis #OpenSource
