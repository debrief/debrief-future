## What We're Building

An analyst typing "UK submarines" into the filter bar wants plots where a single platform is both British *and* a submarine. Today, the closest they can express is two independent chips — `nationality=GB` and `domain=sub` — which happily match a plot containing, say, a British frigate cruising next to a Chinese submarine. Both chips pass. The plot is a false positive. The analyst doesn't know.

We're adding a new chip type to the Filter Bar: a platform chip that carries a compound set of attributes (nationality, domain, vessel role, vessel type, vessel class) tied to the *same* platform record. One chip, one platform, multiple constraints — evaluated together.

## How It Fits

Most of this capability already exists. Item metadata now carries a per-platform records array (`debrief:platforms`), shipped under #181. The CQL2 filter engine learned `array_filter` in #185, which is exactly the primitive we need: "return plots where at least one entry in `debrief:platforms` satisfies all of these comparisons."

What's missing is the UI. Analysts can't reach `array_filter` through the Filter Bar today — the Lozenge model only knows how to represent a single attribute-value pair. This ticket closes that gap. It's a small piece, but it's the moment the E10 work (NL-Assisted Catalog Discovery) starts paying rent for end users rather than sitting in the schema layer.

## Key Decisions

- **Discriminated union on Lozenge**: the existing "simple" chip shape stays untouched; a new "platform" variant carries a compound attributes map. Nothing downstream of existing chips needs to change.
- **One chip, one `array_filter` node**: each platform chip serialises to exactly one `array_filter(debrief:platforms, p -> AND of comparisons)` in CQL2. No new engine primitives.
- **Popover editor with per-attribute pickers**: nationality, domain, vessel role, vessel type, vessel class. Confirm stays disabled until at least one attribute is chosen — an empty platform chip is meaningless.
- **Strict restore**: only UI-representable shapes round-trip into chips. When #188 lands (NL→CQL2), analysts may produce `array_filter` expressions richer than the UI can draw — those show a visible restore error rather than being silently truncated back to something lossy.
