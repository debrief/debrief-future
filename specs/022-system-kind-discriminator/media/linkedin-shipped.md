# LinkedIn Shipped Post: SYSTEM Kind Discriminator

**Character count target**: 150-200 words

---

Your analysis context matters. When examining a maritime scenario in Debrief, you've zoomed to a specific area, selected particular tracks for comparison, and narrowed the time window to the critical period.

Until now, reopening a saved plot meant losing that context. You'd need to re-navigate, re-select, re-filter.

We've extended our GeoJSON schema to persist application state alongside spatial data. SYSTEM features store your viewport configuration using GeoJSON's valid `geometry: null` pattern. Reserved `state.*` IDs enable instant lookup — no scanning, no filtering.

The implementation adds ~60 lines to the LinkML master schema, generating validated Pydantic models, TypeScript interfaces, and JSON Schema automatically. All 53 tests pass.

This is infrastructure for user-facing viewport persistence in the loader app. Schema-first development means the data contract is solid before the UI work begins.

Details in the spec: [link]

#maritime #geojson #schemas #python #typescript
