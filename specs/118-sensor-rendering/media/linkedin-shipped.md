---
platform: linkedin
feature: 118-sensor-rendering
post_type: shipped
word_count: 198
---

Shipped: passive sonar bearing lines rendering on the map in Future Debrief.

Phase 3 of the Sensor Data Pipeline epic. Phases 1 and 2 gave us the schema and the REP parser. Now the contacts actually appear on the map as bearing lines drawn from the host platform's interpolated position outward along the reported bearing.

The interesting part is the canvas renderer. Leaflet's built-in vector layers start struggling above a few hundred features. This uses a custom L.Canvas layer that draws bearing lines, ambiguous bearings, arcs, and labels in a single paint pass. 1,000+ simultaneous bearings at interactive frame rates, no DOM nodes created.

Ambiguous bearings -- the port/starboard uncertainty from towed arrays -- render as a second line in a darker shade of the contact colour, matching the convention analysts already know from legacy Debrief. Snail mode fades bearing history from current colour to black over a configurable time trail, so you can see how the contact picture evolved.

Colour inheritance cascades through four levels: contact, sensor, track style, application default. Line styles (solid, dashed, dot, dash-dot) and label placement (start, middle, end of the bearing line) round out the visual fidelity.

81 new tests, all passing. 1,259 total across the project.

[BLOG_POST_URL]

#FutureDebrief #MaritimeAnalysis #OpenSource
