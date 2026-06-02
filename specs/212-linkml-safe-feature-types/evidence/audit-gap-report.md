---
feature: 212-linkml-safe-feature-types
artefact: usage-site type-compatibility audit (gap report)
captured_at: 2026-06-01
git_sha: (pre-implementation — captured on claude/intelligent-clarke-VdwDj)
purpose: >
  Evidence for BACKLOG #212 User Story 1. Determines, for every semantic usage
  site of the hand-written SafeFeature / SafeGeometry / SafeFeatureCollection
  types, whether the LinkML-generated RawGeoJSONFeature can replace it, and
  where there is a genuine permissiveness gap that it cannot.
---

# #212 Gap Report — `Safe*` feature types → `RawGeoJSONFeature`

## 1. Scope and method

The hand-written types under audit (`shared/utils/src/types.ts`):

```ts
interface SafeGeometry { type: string; coordinates: unknown }              // permissive coordinates
interface SafeFeature {
  type: 'Feature';
  id?: string | number;
  geometry: SafeGeometry | null;                                           // NULLABLE geometry
  properties: Record<string, unknown> | null;
}
interface SafeFeatureCollection { type: 'FeatureCollection'; features: SafeFeature[] }
```

The candidate replacement (LinkML-generated, `@debrief/schemas`, confirmed against
`shared/schemas/src/generated/typescript/types.ts`):

```ts
interface RawGeoJSONFeature {
  type: "Feature";
  id?: string | number;
  geometry: GeoJSONPoint | GeoJSONEmptyPoint | GeoJSONLineString | GeoJSONPolygon
          | GeoJSONMultiPoint | GeoJSONMultiLineString | GeoJSONMultiPolygon;  // REQUIRED, typed coords
  properties?: Record<string, unknown> | null;
  bbox?: number[];
}
interface RawGeoJSONFeatureCollection { type: "FeatureCollection"; features: RawGeoJSONFeature[]; bbox?: number[] }
```

**Three differences that matter:**
1. **Geometry nullability** — `SafeFeature.geometry` may be `null`; `RawGeoJSONFeature.geometry` is required.
2. **Coordinate typing** — `SafeGeometry.coordinates` is `unknown`; the generated geometry classes carry typed coordinates (`number[]`, `number[][]`, …). Note: every generated geometry's `type` is the wide `type: string`, **not** a discriminating literal, so `geometry.type === 'Point'` does **not** narrow the coordinate union.
3. **Properties optionality** — `SafeFeature.properties` is a required (nullable) key; `RawGeoJSONFeature.properties` is optional. Benign in the swap direction; flagged at no site.

**Classification:** each semantic site is **CLEAN-SWAP** (RawGeoJSONFeature type-checks, zero behaviour change), **NEEDS-NARROWING** (feasible after removing/adjusting an `if (!f.geometry)` guard), or **GENUINE-GAP** (RawGeoJSONFeature is the wrong contract — a swap forces an unsafe cast or loses correctness).

**Important context (`shared/schemas`):** no generated type models `geometry: null`. `GeoJSONEmptyPoint` models *non-spatial* features (SYSTEM records) but is a present, typed geometry, not null. The `RawGeoJSONFeature` docstring itself acknowledges this and points callers handling possibly-null geometry to narrow at the parse boundary.

## 2. Results

| Classification | Count | Meaning |
|----------------|-------|---------|
| **CLEAN-SWAP** | 21 | RawGeoJSONFeature drops in with no behaviour change (result-carrying / serialisation surfaces). |
| **NEEDS-NARROWING** | 8 | Feasible; remove a now-redundant null-guard (geometry becomes required). |
| **GENUINE-GAP** | 14 | RawGeoJSONFeature is the wrong contract — needs the permissive shape. |
| **Total semantic sites** | **43** | (definition / re-export / comment lines excluded) |

### GENUINE-GAP sites (headline)

1. `apps/web-shell/src/mocks/calcService.ts:247-256` — `toSafeFeatures()` **constructs `geometry: null`** for geometry-less input features; required-geometry target cannot represent it.
2. `apps/vscode/src/commands/openPlot.ts:59` — `toSafeFC()` adapts session-state collections that include **null-geometry SYSTEM / storyboard features** (`geometry: f.geometry as SafeGeometry | null`).
3. `apps/vscode/src/services/stacService.ts:1763-1789` — `extractCoordinates(geometry: SafeGeometry)` reads `coordinates: unknown` and casts per `type`. The union is *not* discriminated by `type: string`, so the casts are unavoidable; permissive input is load-bearing.
4. `apps/vscode/src/services/stacService.ts:835` (+ return types `:828`, `:1014`) — `JSON.parse(content) as SafeFeatureCollection`, **disk-GeoJSON parse boundary**, no shape validation.
5. `apps/vscode/src/services/calcService.ts:786,797,923,939,1018,1033` — `JSON.parse(item.resource.text) as SafeFeatureCollection['features'][number]`, **MCP tool-result parse boundary** (accumulators / return types at `:761,824,852,978,993`).
6. `apps/vscode/src/services/ioService.ts:90-91` — `result.features as SafeFeature[]`, **`debrief-io` subprocess JSON boundary**.
7. `apps/vscode/src/types/import.ts:72` — `ParseResult.features: SafeFeature[]`, the **REP-parse boundary contract** (consumers null-guard its geometry).
8. `apps/web-shell/src/services/toolService.ts:317` — `type ToolExecuteFn = (features: SafeFeature[]) => SafeFeature[]`, the **universal tool signature** whose registered tools rely on `coordinates: unknown` to bridge structural differences via `as unknown as` casts.

### NEEDS-NARROWING sites

`importRep.ts:244`, `importRep.ts:409`, `mapPanel.ts:1582` (null-guard + `coordinates as …` cast — guard becomes redundant, coordinate cast persists); `stacService.ts:1733` (`calculateBboxFromFeatures`, `if (!feature.geometry) continue`); `openPlot.ts:373` (geometry assignment in a gap-sourced collection); `pointInZoneClassifier.ts:89/117` (`execute` + null-guards); `bufferZoneGenerator.test.ts:59-68` (test helper).

### CLEAN-SWAP sites (21)

All result-carrying / serialisation / id-or-properties-only surfaces, including: `bufferZoneGenerator.ts:289/363` (well-formed MultiPolygon output), `toolService.ts:176/199/462`, `mapPanel.ts:1157`, `extension.ts:505`, `tool.ts:293/362`, `messages.ts:75/83` (message DTO payloads — but see §4), `openPlot.ts:44/327/344/385`, `stacService.ts:1040/1061/1526/1544/1549/1554/1620/1627/1635`, `pointInZoneClassifier.ts:93/149/190`.

## 3. The two gap categories

The 14 GENUINE-GAP sites split cleanly:

**(a) Coordinate-read gaps — coverable by a MODULE-PRIVATE structural minimum.**
`stacService.extractCoordinates` (#3) needs only its `SafeGeometry` parameter replaced by a private `{ type: string; coordinates: unknown }` — identical to the existing `bounds.ts:51` `BoundsInputFeature`. The coordinate casts in `importRep` / `mapPanel` / `pointInZoneClassifier` already cast and depend on no *named shared* type. **None of these need to be exported; no schema change.**

**(b) Null-geometry / parse-boundary gaps — a SHARED shape spanning multiple packages.**
The genuinely cross-module gaps (#1, #2, #4, #5, #6, #7, #8) all need the same thing: a feature whose `geometry` may be `null` and whose `coordinates` are unvalidated — i.e. exactly today's `SafeFeature`. They span **four packages** (`apps/vscode`, `apps/web-shell`, plus the shape travels through `apps/vscode/src/webview/messages.ts` to the **webview message contract**, and originates in `services/session-state` collections):
- REP / IO boundary — `ioService.ts`, `types/import.ts` (`ParseResult`)
- MCP-result boundary — `calcService.ts` (vscode), `mocks/calcService.ts` + `toolService.ts` (web-shell)
- disk-GeoJSON boundary — `stacService.ts`
- session-state → stac adapter — `openPlot.ts` (`toSafeFC`)

Re-deriving a private `{ type:'Feature'; geometry: …|null; properties: …|null }` in each of these 4-5 modules would duplicate the exact shape — the field re-listing **Constitution Article IV.5 / ADR-033** explicitly forbids (silent-drop on source growth).

## 4. Assessment & constitutional context

- **`RawGeoJSONFeature` cleanly serves 29 of 43 sites** (21 CLEAN-SWAP + 8 NEEDS-NARROWING) — do this regardless of the chosen strategy for the remainder.
- **Category (a)** → module-private structural minimums, exactly as `bounds.ts` already does. No export, no schema change.
- **Category (b)** is the real decision. It is a genuine *shared* permissive-boundary concern, and it cannot be reduced to a purely local private type because the same shape crosses package boundaries and a webview message DTO.

**ADR-021 (2026-04-21)** is directly relevant: it deliberately **kept `RawGeoJSONFeature.geometry` required** ("Make `RawGeoJSONFeature.geometry` nullable — rejected. Would propagate the nullable type through every consumer … reintroduces the silent-drop pattern") and **retained `SafeFeature`** as the separate permissive boundary type. So #212 is not about changing where nullable geometry flows (it flows at exactly these boundaries today) — it is about making the permissive boundary type **schema-rooted instead of hand-written**.

**ADR-033 / Article IV.5** governs the `messages.ts` usages directly: `SafeFeatureCollection` there is a host→webview **message DTO**, which must be **structurally derived** from a typed source (`Pick` / `Omit` / `Partial` / generated export), not hand-listed.

**Conclusion.** The permissive category-(b) shape must come from somewhere schema-rooted. The strategy options are recorded in `spec.md` (§ Strategy Options) for decision.
