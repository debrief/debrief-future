## What We're Building

Legacy Debrief users have spent years building analysis workflows around a specific capability: marking individual positions along a track. "Contact first detected here." "Course change at 1142." "Show symbols every 5 minutes so I can see progress." This isn't a nice-to-have — it's fundamental to how maritime analysts communicate and document their work.

Our current GeoJSON model doesn't support this. Every position on a track gets the same styling, and that's not how real analysis works. This feature adds three things: default styling for all positions, interval-based rules ("show a symbol every 5 minutes"), and explicit overrides for marking specific moments.

## How It Fits

This builds directly on the schema-first architecture we've been developing. The changes happen in LinkML (our source of truth), then propagate automatically to Pydantic models, TypeScript types, and JSON Schema. We're also fixing a data hygiene issue while we're in there — coordinates were being stored in two places, which is asking for trouble.

The pattern we're using here — defaults, then interval rules, then sparse overrides — is deliberate. It matches how legacy users actually work: set up a track with sensible defaults, apply some interval-based automation, then hand-annotate the interesting bits.

## Key Decisions

- **Coordinates live in geometry only.** Each position's coordinates come from `geometry.coordinates[i]`, not duplicated in the positions array. The two arrays are parallel and must stay in sync.

- **ISO 8601 durations for intervals.** `"PT5M"` means five minutes. It's a standard format that works across Python and TypeScript without ambiguity.

- **"Nearest position" for interval alignment.** Real track data rarely lands exactly on round intervals. When you ask for symbols every 5 minutes, you get them at the positions closest to each 5-minute mark.

- **Overrides are sparse.** Most positions don't need custom styling. The `position_style_overrides` array only contains entries for positions that differ from the defaults.
