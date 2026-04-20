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

export type { SceneFeature, StoryboardFeature };

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
