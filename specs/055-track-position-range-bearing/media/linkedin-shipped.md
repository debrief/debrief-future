Snap-to-nearest temporal matching is simpler than interpolation — and for this use case, it's sufficient.

Spec #055 for Future Debrief defines how to compute range and bearing between two vessel tracks at a given moment in time. The algorithm finds the nearest timestamp on the reference track, runs Haversine for range and forward-azimuth for bearing, and returns nautical miles plus degrees true. Writing eleven edge cases before drafting the pseudocode surfaced a detail that would have caused silent test failures: the tiebreaker rule for equidistant timestamps. Two independent implementations making different choices there would agree 99% of the time and diverge exactly when you're trying to validate behaviour. The spec locks it down — earlier index wins.

This brings the track/measurement tool family to 20 specifications, each written language-neutrally so Python and TypeScript implementations can be developed without coordination. The golden examples (3.57 nm at 32.7°, 35.42 nm at 31.8°) are hand-validated against the pseudocode and included in the spec.

[Read the full post: link]

#FutureDebrief #MaritimeAnalysis #OpenSource
