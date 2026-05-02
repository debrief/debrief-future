import { ResolvedVariant, ThemeSource } from './ThemeSource';

/**
 * `ThemeSource` driven by `prefers-color-scheme` + `prefers-contrast`.
 *
 * `subscribe()` listens for changes on both media queries and emits the
 * combined resolution. Identical back-to-back values are de-duplicated.
 */
export declare function mediaQuerySource(): ThemeSource;
/**
 * `ThemeSource` that always reports a fixed variant. Useful for pinned
 * Storybook stories and unit tests that want to force a specific variant
 * regardless of the OS-level signal.
 */
export declare function staticSource(variant: ResolvedVariant): ThemeSource;
//# sourceMappingURL=browserAdapter.d.ts.map