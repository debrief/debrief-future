/**
 * Core types for the storyboard CRUD module (Feature 215).
 *
 * Branded string types narrow IDs so a Scene id cannot accidentally be passed
 * where a Storyboard id is expected. All public input surfaces accept plain
 * `string`; branding is internal to the module.
 *
 * `Plot` is defined structurally rather than aliased from geojson's
 * `FeatureCollection` because the generated `@debrief/schemas` types use
 * `type: string` (not a string literal) — widening the schema-generated
 * Features to a geojson.Feature would need a cast at every boundary.
 */

import type {
  SceneFeature,
  StoryboardFeature,
  SceneProperties,
  TimeRange,
  Viewport,
} from "@debrief/schemas";

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type Ulid = Brand<string, "Ulid">;
export type StoryboardId = Brand<string, "StoryboardId">;
export type SceneId = Brand<string, "SceneId">;

/**
 * A plot FeatureCollection. Features are typed loosely to allow pass-through
 * of non-Storyboard Features (Tracks, Annotations, etc.) without dragging
 * every kind into this module's type graph.
 */
export interface PlotFeature {
  type: "Feature";
  id?: string | number;
  geometry: unknown;
  properties: { kind?: string; [k: string]: unknown } | null;
  [k: string]: unknown;
}

export interface Plot {
  type: "FeatureCollection";
  features: PlotFeature[];
  [k: string]: unknown;
}

/**
 * Canonical identity of a plot feature: its **top-level GeoJSON `id`**.
 *
 * Per the LinkML schema, `id` is `required: true` on every feature class
 * (TrackFeature, ReferenceLocation, MultiPoint/MultiPolygon, SystemState,
 * Scene, Storyboard) and lives at the *feature* level. REP import, feature
 * selection, the `hiddenFeatureIds` set, `scopeStoryboard`, and the briefing
 * renderer all key on it. `properties.id` exists ONLY on Scene/Storyboard
 * features (a domain ULID that happens to mirror the top-level id); it is
 * **absent** on data features (Tracks etc.), whose properties derive from
 * `BaseFeatureProperties` and carry no `id`.
 *
 * Reading `properties.id` to identify a *data* feature is the defect fixed
 * in ADR-038: it silently dropped every Track from captured Scenes'
 * `visible_feature_ids`, so the exported / previewed briefing rendered an
 * empty map. Identity MUST be read from the top level via this accessor —
 * never an ad-hoc `feature.properties as { id }` cast (an unchecked
 * assertion that fabricates a field the schema does not define; banned by
 * the `no-restricted-syntax` inline-object-cast rule, Constitution XV.7).
 */
export function getPlotFeatureId(feature: {
  readonly id?: string | number | null;
}): string | undefined {
  const { id } = feature;
  if (typeof id === "string") return id.length > 0 ? id : undefined;
  if (typeof id === "number") return String(id);
  return undefined;
}

export type { SceneFeature, StoryboardFeature, TimeRange, Viewport };

/* ── Scene flavour discriminated union (#263) ──────────────────────────
 *
 * A Scene is either the instant flavour (both `time_range` and
 * `viewport_end` absent) or the time-range flavour (both present). The XOR
 * is enforced at the schema layer (LinkML rules + JSON Schema if/then) and
 * at the runtime application layer (`flavourCheck` in validate.ts) — the
 * types below trust that enforcement and surface a narrowed shape to
 * consumers.
 *
 * Application code MUST NOT read `time_range` or `viewport_end` directly
 * off a `SceneFeature` — it MUST narrow via `isTimeRangeScene` first. The
 * `Omit<SceneProperties, ...>` pattern complies with constitution Article
 * IV.5 (boundary types derived from the canonical source, not re-listed).
 */

/** Properties narrowed to the instant flavour — both coupling slots absent. */
export interface InstantSceneProperties
  extends Omit<SceneProperties, "time_range" | "viewport_end"> {
  readonly time_range?: undefined;
  readonly viewport_end?: undefined;
}

/** Properties narrowed to the time-range flavour — both coupling slots present. */
export interface TimeRangeSceneProperties
  extends Omit<SceneProperties, "time_range" | "viewport_end"> {
  readonly time_range: TimeRange;
  readonly viewport_end: Viewport;
}

/** A Scene whose properties guarantee both flavour-coupling slots are absent. */
export interface InstantSceneFeature extends SceneFeature {
  readonly properties: InstantSceneProperties;
}

/** A Scene whose properties guarantee both flavour-coupling slots are present. */
export interface TimeRangeSceneFeature extends SceneFeature {
  readonly properties: TimeRangeSceneProperties;
}

/** Compile-time exhaustiveness guard — flags any future SceneProperties slot
 *  that the discriminated split forgot. Per CLAUDE.md "Boundary types are
 *  derived, not rewritten" (Article IV.5). */
type _Exhaustive = Exclude<
  keyof SceneProperties,
  keyof InstantSceneProperties | keyof TimeRangeSceneProperties
> extends never
  ? true
  : never;
const _exhaustive: _Exhaustive = true;
void _exhaustive;

/**
 * The ONLY narrowing site for Scene flavour. All application code obtains
 * the narrowed type via this predicate. The schema-layer XOR check
 * guarantees that a Scene with `time_range` set also has `viewport_end`
 * set; the predicate trusts that and only checks `time_range`.
 */
export function isTimeRangeScene(
  scene: SceneFeature,
): scene is TimeRangeSceneFeature {
  return (
    scene.properties.time_range !== undefined &&
    scene.properties.time_range !== null
  );
}

/** Internal helper — cast a raw string into a branded ULID. */
export function asUlid(id: string): Ulid {
  return id as Ulid;
}

export function asStoryboardId(id: string): StoryboardId {
  return id as StoryboardId;
}

export function asSceneId(id: string): SceneId {
  return id as SceneId;
}

/** Type guard — Feature is a Storyboard. */
export function isStoryboardFeature(
  feature: PlotFeature | null | undefined,
): feature is StoryboardFeature & PlotFeature {
  return feature?.properties?.kind === "STORYBOARD";
}

/** Type guard — Feature is a Scene. */
export function isSceneFeature(
  feature: PlotFeature | null | undefined,
): feature is SceneFeature & PlotFeature {
  return feature?.properties?.kind === "STORYBOARD_SCENE";
}
