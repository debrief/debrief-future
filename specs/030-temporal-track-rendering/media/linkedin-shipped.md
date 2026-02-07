Tracks on the map now respond to time. Two modes: full-track shows the complete path with a position marker that follows the scrubber, snail-trail draws the path progressively as time advances.

The core algorithm is a binary search for the nearest recorded position to any given time — O(log n) instead of scanning every point. Each track gets its own render layer with memoized geometry, so switching between 20 tracks during playback stays responsive.

Features without timestamps render normally. No migration needed, no breaking changes.

[Read the full post](LINK_PLACEHOLDER)

#FutureDebrief #MaritimeAnalysis #OpenSource
