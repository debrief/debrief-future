import { SceneFeature, StoryboardFeature, SceneProperties, TimeRange, Viewport } from '../../../schemas/src/generated/typescript/index.ts';

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & {
    readonly [__brand]: B;
};
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
    properties: {
        kind?: string;
        [k: string]: unknown;
    } | null;
    [k: string]: unknown;
}
export interface Plot {
    type: "FeatureCollection";
    features: PlotFeature[];
    [k: string]: unknown;
}
export type { SceneFeature, StoryboardFeature, TimeRange, Viewport };
/** Properties narrowed to the instant flavour — both coupling slots absent. */
export interface InstantSceneProperties extends Omit<SceneProperties, "time_range" | "viewport_end"> {
    readonly time_range?: undefined;
    readonly viewport_end?: undefined;
}
/** Properties narrowed to the time-range flavour — both coupling slots present. */
export interface TimeRangeSceneProperties extends Omit<SceneProperties, "time_range" | "viewport_end"> {
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
/**
 * The ONLY narrowing site for Scene flavour. All application code obtains
 * the narrowed type via this predicate. The schema-layer XOR check
 * guarantees that a Scene with `time_range` set also has `viewport_end`
 * set; the predicate trusts that and only checks `time_range`.
 */
export declare function isTimeRangeScene(scene: SceneFeature): scene is TimeRangeSceneFeature;
/** Internal helper — cast a raw string into a branded ULID. */
export declare function asUlid(id: string): Ulid;
export declare function asStoryboardId(id: string): StoryboardId;
export declare function asSceneId(id: string): SceneId;
/** Type guard — Feature is a Storyboard. */
export declare function isStoryboardFeature(feature: PlotFeature | null | undefined): feature is StoryboardFeature & PlotFeature;
/** Type guard — Feature is a Scene. */
export declare function isSceneFeature(feature: PlotFeature | null | undefined): feature is SceneFeature & PlotFeature;
//# sourceMappingURL=types.d.ts.map