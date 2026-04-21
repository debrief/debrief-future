**Shipped: one schema-rooted type retires three drifted twins.**

Three hand-typed definitions of "a GeoJSON Feature at the parse boundary" — one in `shared/utils`, one in `services/session-state`, one in `services/stac` as `dict[str, Any]` — are gone. Replaced by a single `RawGeoJSONFeature` class in the LinkML master schema, generated once into Pydantic, TypeScript, and JSON Schema.

Before: `rg "interface GeoJSONFeature" shared/ services/` returned 2 matches. After: zero.

3573 tests pass. 22 TypeScript files + 3 Python files migrated. Zero new `any` / `as` casts at migration sites. The drift-prevention guard (`scripts/check-no-geojson-feature.sh`) is tightened — dead-code exclusion removed, diagnostic message points at the new canonical name — and fires in CI if anyone reintroduces a hand-typed copy.

Two review-phase optimisations are explicitly deferred in the ADR: the `designates_type` perf upgrade (blocked by a `gen-pydantic` quirk that emits the class name instead of `equals_string`), and the ingress null-geometry coercion (blocked by `NarrativeEntry`'s existing schema that legitimately allows null geometry). Both are captured as concrete one-line follow-ups rather than vague "someday" items.

This is Article II (Schema Integrity) made concrete. One source of truth for a parse-boundary type. One guard that prevents regression. One ADR that documents what landed and why the rest is scheduled. That's the unit of progress.

🔗 Full write-up: https://debrief.github.io/blog/…/shipped-one-schema-rooted-type-retires-three-drifted-twins/

#TypeScript #LinkML #TechDebt #SchemaIntegrity #Maritime
