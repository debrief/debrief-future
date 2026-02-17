Measuring range and bearing between two whole tracks is useful. Measuring between a specific position on one track and the closest-in-time position on another is what analysts actually need most of the time.

We're specifying a position-level range/bearing tool for Future Debrief. It takes a selected track position (using the nested child selection paths from our recent #053 work), finds the temporally nearest position on a second track -- no interpolation, just snap to the closest recorded point -- and returns Haversine range in nautical miles and forward-azimuth bearing in degrees. One measurement, two real positions, full provenance metadata.

The interesting design choice: no minimum temporal proximity. If the closest match is four hours away, the tool still returns a result. Real data has gaps, and arbitrary thresholds create more confusion than they prevent.

[Read the full planning post](https://debrief.github.io/future/2026/02/17/planning-track-position-range-bearing.html)

#FutureDebrief #MaritimeAnalysis #OpenSource
