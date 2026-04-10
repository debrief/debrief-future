/**
 * Layout persistence for GoldenLayout configurations.
 *
 * Handles saving/loading layout configurations to/from browser localStorage
 * with version checking and component type validation.
 */
export declare const LAYOUT_STORAGE_KEY = "debrief-panel-layout";
export declare const LAYOUT_VERSION = 2;
/**
 * Recursively validates that all componentType values in the config tree
 * exist in the registeredTypes array.
 *
 * @param config - The layout configuration object to validate
 * @param registeredTypes - Array of valid component type names
 * @returns true if all component types are registered, false otherwise
 */
export declare function validateLayoutTypes(config: unknown, registeredTypes: ReadonlyArray<string>): boolean;
/**
 * Saves a layout configuration to localStorage.
 *
 * Wraps the config with version metadata and persists as JSON.
 * Fails silently if localStorage is unavailable or full.
 *
 * @param config - The GoldenLayout configuration to save
 */
export declare function saveLayout(config: unknown): void;
/**
 * Loads a layout configuration from localStorage.
 *
 * Validates the version and ensures all component types are registered.
 * Returns null if the layout is invalid, corrupted, or incompatible.
 *
 * @param registeredTypes - Array of valid component type names
 * @returns The layout config if valid, null otherwise
 */
export declare function loadLayout(registeredTypes: ReadonlyArray<string>): unknown | null;
/**
 * Clears the saved layout from localStorage.
 *
 * Fails silently if localStorage is unavailable.
 */
export declare function clearLayout(): void;
//# sourceMappingURL=layoutPersistence.d.ts.map