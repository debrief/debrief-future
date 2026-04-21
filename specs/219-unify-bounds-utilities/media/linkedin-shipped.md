Two functions named `calculateBounds`. Same signature. Different expectations. No way to know which to pick from the import path alone.

That kind of silent choice hazard is subtle — nothing breaks loudly. You pick the wrong one, get a runtime failure on an unusual input, or land on a slower code path for large STAC collections, and it takes time to trace back to the source.

This week we eliminated it. Deleted the 215-line duplicate in `shared/components`, consolidated five helpers into the canonical `@debrief/utils` module, and unified the test suite (75 tests, up from ~58). No external import statements changed — barrel re-exports preserved the API surface.

The interesting technical bit: reconciling three GeoJSON feature-type families without casts. A structural-minimum input interface — the narrowest shape all three families satisfy — let TypeScript's structural subtyping do the work. The utils module stays decoupled from generated schema types, so upcoming schema work doesn't touch it.

300/300 utils tests passing. 1647/1647 component tests passing.

Full write-up: {{BLOG_POST_URL}}

#MaritimeTech #TypeScript #DeveloperExperience
