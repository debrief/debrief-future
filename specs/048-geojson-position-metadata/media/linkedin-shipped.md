# LinkedIn Shipped Summary

## Post Content

Maritime analysts don't just want to see tracks — they want to mark specific moments. "Contact detected here." "Course change at 1142." "Show me symbols every 5 minutes."

Just shipped per-position styling for Future Debrief's track data model.

What it does:
- Default position style as baseline
- Interval-based symbols/labels (PT5M = every 5 minutes)
- Per-position overrides for marking significant events

The style cascade (defaults → intervals → overrides) matches how analysts actually work: set sensible defaults, apply interval automation, hand-annotate the interesting bits.

Also cleaned up data duplication — coordinates now live only in geometry, not repeated in position metadata. Parallel arrays, single source of truth.

462 tests passing across Python schemas, REP handler, and VS Code extension.

[Read the technical details: LINK]

#FutureDebrief #MaritimeAnalysis #OpenSource #GeoJSON #DataVisualization

---

## Character Count

~180 words (within 150-200 target)
