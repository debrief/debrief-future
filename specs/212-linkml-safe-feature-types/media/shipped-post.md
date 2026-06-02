---
layout: future-post
title: "Building Schema-Derived GeoJSON Feature Types"
date: 2026-06-01
track: [credibility]
author: Ian
reading_time: 4
tags: [linkml, schema, typescript, type-safety, tech-debt]
excerpt: "Replacing three hand-written GeoJSON feature types with a single schema-derived equivalent, closing the last hand-maintained gap at every parse and message boundary."
---

Before — a permissive GeoJSON feature type, hand-written in `@debrief/utils`, sitting at every parse, MCP, and disk boundary:

```ts
interface SafeGeometry { type: string; coordinates: unknown }
interface SafeFeature {
  type: 'Feature';
  id?: string | number;
  geometry: SafeGeometry | null;            // nullable — for "unlocated" features
  properties: Record<string, unknown> | null;
}
interface SafeFeatureCollection { type: 'FeatureCollection'; features: SafeFeature[] }
```

After — the same permissive shape, now *derived* from the LinkML-generated type instead of written by hand:

```ts
export type IngressFeature =
  Omit<RawGeoJSONFeature, 'geometry'> & { geometry: RawGeoJSONFeature['geometry'] | null };
```

One line. When the schema grows a field, the boundary type gains it automatically — there is nothing left to forget to update.

## What We're Building

For a while, three TypeScript types — `SafeFeature`, `SafeGeometry`, `SafeFeatureCollection` — lived in `@debrief/utils` as the permissive shape we used wherever GeoJSON enters the system: REP import, MCP tool results, GeoJSON read off disk, the session-state-to-STAC adapter, and the messages we post from the VS Code extension host into its webview. They were deliberately loose — `geometry` could be `null` (for the "unlocated" features RFC 7946 allows, like system records and storyboard entries), and `coordinates` were `unknown`. They worked. But they were hand-written, and our constitution says data structures are derived from the LinkML master schema, never hand-written. So they were a tripwire waiting to trip.

This feature removes them. The 29 sites that carry well-formed results now use the generated `RawGeoJSONFeature` directly. The genuinely permissive boundaries — the ones that legitimately need `geometry: null` — use a new `IngressFeature` that is *structurally derived* from `RawGeoJSONFeature`, widening only its geometry to admit `null`. No hand-written feature type survives, and a lint guard now fails CI if anyone reintroduces one.

## How It Fits

Everything in Future Debrief flows from a single LinkML master schema: it generates the Pydantic models the Python services validate against, the JSON Schema, and the TypeScript types the frontends speak. A hand-written type that *mirrors* part of that schema is a second source of truth — and second sources of truth drift silently. The constitution names the failure mode directly (Article IV.5): a boundary type that re-lists a source type's fields by name will quietly drop data the day the source type grows a field. This change brings the last permissive feature type back under the schema, where it belongs, so the parse and message boundaries can't fall out of step with the data model they describe.

## Key Decisions

- **We audited before we touched anything.** The backlog item said "replace with the LinkML-generated equivalent," but the obvious candidate, `RawGeoJSONFeature`, is not a drop-in: it *requires* geometry and uses typed coordinate unions, where the hand-written type allowed `null` geometry and `unknown` coordinates. So rather than guess, we classified all 43 usage sites first — 21 clean swaps, 8 needing a redundant null-guard removed, and 14 genuine gaps. That evidence, not an assumption, drove the plan.

- **Derive the permissive type; don't add a schema class.** The 14 gaps split into two kinds: local coordinate-readers, and a shared "geometry may be null" shape recurring across four packages and a host-to-webview message contract. We could have added a second, looser feature class to the LinkML schema — but that means new fixtures, regeneration, and a possible version bump, and an earlier decision (ADR-021) had already cautioned against a second loose-feature class. Instead we expressed the permissive type as `Omit<RawGeoJSONFeature, 'geometry'> & { geometry: … | null }` — the constitution's own derive-don't-rewrite idiom. No new schema class, no new fixtures, and the generated artefacts are untouched.

- **Keep nullable geometry at the boundaries, not in the common type.** ADR-021 had deliberately kept `RawGeoJSONFeature.geometry` *required* to avoid spreading defensive `if (!feature.geometry)` checks through every consumer. We honoured that: the nullability lives only in the derived `IngressFeature`, exactly at the ingress points where unlocated features actually arrive.

- **A type-only refactor that changes behaviour is a failure.** No new runtime dependency, no schema change, no new validation. The existing null-geometry fixtures and the web-shell Playwright suites stand as the regression check that a `geometry: null` feature still survives every migrated boundary intact.

- **We fixed a latent bug we found on the way.** One "gap" site — the STAC service's bounding-box computation — was hand-rolling coordinate extraction with casts *and* silently skipping `MultiPoint`, `MultiLineString`, and `MultiPolygon` geometries, so its bounding boxes were quietly wrong for those. Replacing it with the existing `calculateBounds` utility removed the casts, dropped the dependency on the old type, and corrected the bounds for all seven geometry kinds.

## By the Numbers

| | |
|---|---|
| Usage sites audited and classified | 43 (21 clean-swap, 8 needs-narrowing, 14 genuine-gap) |
| Hand-written types removed | 3 (`SafeFeature`, `SafeGeometry`, `SafeFeatureCollection`) |
| Hand-written GeoJSON feature types remaining | 0 |
| New schema-derived types added | 1 (`IngressFeature` + its collection, one `Omit … & { … }` line) |
| Schema changes | 0 (generated artefacts untouched) |
| TypeScript packages typechecking green | 16/16 |
| ESLint errors | 0 |
| `@debrief/schemas` tests | 23 |
| `@debrief/utils` tests | 301 |
| `debrief-vscode` tests | 828 |
| Web-shell unit tests | 128 |
| Python tests | 2162 |
| Web-shell E2E `plot-load` | 6/6 |
| Web-shell E2E `tool-execution` | 6/6 |
| Latent bugs fixed | 1 (Multi* geometry bbox, silently wrong for MultiPoint/MultiLineString/MultiPolygon) |

## Lessons Learned

Audit-first paid off. The obvious replacement (`RawGeoJSONFeature`) was not a drop-in, and only the per-site classification revealed that the permissive boundary genuinely needed a *derived* type, not the generated one. Skipping the audit and guessing would have broken either the `geometry: null` channel or the coordinate typing at multiple sites.

"Derive, don't rewrite" (Article IV.5) closed the debt with one line and no new schema class or fixtures. The structural derivation means the boundary type can't drift from the schema: the `expectTypeOf` type-test pins the invariant at compile time, so a future schema addition surfaces immediately rather than silently dropping data.

The whole tool-result pipeline — MCP parse, `ToolExecutionResult`, `ResultLayer`, host-to-webview message DTOs — now converges on the schema-derived `IngressFeatureCollection`. Cast-free and null-honest end-to-end.

A type-only refactor must not change behaviour. The pre-existing flaky `styling-tools` E2E spec was rigorously ruled out as a regression by running it against the pre-implementation baseline commit — it failed identically there, for the same assertions, with the same non-determinism. The migrated runtime paths are covered green by `plot-load` and `tool-execution`.

## What's Next

A repo-wide inline-object-cast cleanup is tracked separately (BACKLOG #277); this feature opportunistically cleared one such cast during a rename but deliberately did not expand into that scope.

→ [See the code](https://github.com/debrief/debrief-future/pull/212)
