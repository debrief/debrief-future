# LinkedIn — Shipped

---

**Hook**: Two near-identical copies of `calculateBounds` had drifted — one carried a null-guard the other didn't, and a fix had landed in one place but not the other. Classic "exactly one implementation" failure mode.

One canonical utility now. No `as`-casts at the call sites. A single reviewable narrowing gate handles the one untyped edge the widened parameter admits — no `any`, no double-cast, anchored in source to our strict-typing constitution article.

The review gate earned its keep on this one. It caught (1) a scope overclaim — the spec originally claimed "exactly one `calculateBounds` in the monorepo" when a legitimately separate LinkML-typed copy exists elsewhere; and (2) a silent-miss bug one function away. The map's "zoom to selection" had been skipping every `Polygon` / `MultiPolygon` / `Multi*` feature in the selection for years. Fixed in the same PR because separating it would have cost a follow-up that might never close.

Six new per-geometry-type tests now lock in the "no silent miss" property. Three small TDD commits tell the widen → test-fails → guard-fixes story in the commit graph. And four tidy follow-ups are captured in the backlog — including a drift-prevention rule that stops this from happening again.

Read the shipped post: *[link placeholder]*

#DefenceTech #TypeScript #TechnicalDebt
