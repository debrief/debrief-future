---
title: "Colour Scheme Engine shipped"
date: 2026-03-07
feature: 134-colour-scheme-engine
type: linkedin-shipped
---

Shipped: Colour Scheme Engine for the Debrief Discovery UI.

Analysts can now colour-code exercises by Age, Vessel Class, or Tag across the map and timeline views. A shared legend explains the encoding — gradient bars for continuous dimensions, discrete swatches for categorical ones.

Key points:
- Consistent colours across map and timeline views (same exercise = same colour everywhere)
- 12-colour perceptually distinct palette with graceful recycling beyond 12 categories
- Extensible — new dimensions register without touching existing code
- Zero external dependencies, fully offline-capable

48 unit tests, TypeScript strict, Storybook stories for visual verification.

Part of Epic E08: STAC Stack Browser Discovery UI.

#maritime #typescript #react #datavisualization #debrief
