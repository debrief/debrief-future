A towed sonar array trails hundreds of metres behind a vessel. Every bearing line from that sensor should originate from the array's position, not the ship's -- and getting this wrong shifts the entire tactical picture.

This week we're building three calculation modes for array centre positioning in Future Debrief: simple heading backtrack, track-path tracing through manoeuvres ("worm in hole"), and interpolation from real measured positions. Pure functions, no external dependencies, implemented in both TypeScript and Python with cross-language golden tests for parity.

Phase 4 of 7 in the sensor data pipeline.

https://debrief.github.io/2026/04/10/planning-array-offset-calculations

#FutureDebrief #MaritimeAnalysis #TowedArray
