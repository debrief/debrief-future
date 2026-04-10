---
type: linkedin
variant: shipped
feature: 179
---

Sensor contacts were loading correctly. You just couldn't tell.

After importing a REP file with towed-array bearings, the Layers panel showed a track — but nothing indicating whether the contacts were there. You had to open the raw JSON to check. Not a good first look for an analyst who needs confidence in their data.

Feature 179 fixes that. Tracks with embedded sensor data now expand into grouped rows: Positions, Sensors, and Track Segments, each with a count. Sensors expand further to individual contact rows with zero-padded bearings in nautical convention. 10,000 contacts expand in under 200 milliseconds.

Zero new dependencies. 27 new tests. One component library touched.

This is part of Epic E07 — Sensor Data Pipeline — in Future Debrief, the open-source rebuild of the maritime tactical analysis platform.

[BLOG_POST_URL]

#FutureDebrief #MaritimeAnalysis #OpenSource #TypeScript
