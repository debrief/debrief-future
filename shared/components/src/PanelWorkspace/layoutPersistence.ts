/**
 * Layout persistence for GoldenLayout configurations.
 *
 * Handles saving/loading layout configurations to/from browser localStorage
 * with version checking and component type validation.
 */

export const LAYOUT_STORAGE_KEY = 'debrief-panel-layout';
/**
 * Layout format version.
 *
 * Bump history:
 *   1 → initial
 *   2 → added essential-panel validation
 *   3 → responsive sidebar width (spec 281 US3 T016): legacy v2 layouts
 *       persist a fixed 25% sidebar; bumping to 3 causes the version-mismatch
 *       path in loadLayout to return null so the responsive default is applied.
 */
export const LAYOUT_VERSION = 3;

interface PersistedLayout {
  version: number;
  config: unknown; // GoldenLayout ResolvedLayoutConfig as JSON
}

/**
 * Checks if localStorage is available and writable.
 * Some browsers disable localStorage in private mode or when storage is full.
 */
function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__ls_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Recursively collects all componentType values from the config tree.
 */
function collectComponentTypes(config: unknown): string[] {
  if (config === null || config === undefined || typeof config !== 'object') return [];
  const types: string[] = [];
  if ('componentType' in config) {
    const ct = (config as { componentType: unknown }).componentType;
    if (typeof ct === 'string') types.push(ct);
  }
  if (Array.isArray(config)) {
    for (const item of config) types.push(...collectComponentTypes(item));
  } else {
    for (const value of Object.values(config)) {
      types.push(...collectComponentTypes(value));
    }
  }
  return types;
}

/**
 * Recursively validates that all componentType values in the config tree
 * exist in the registeredTypes array.
 *
 * @param config - The layout configuration object to validate
 * @param registeredTypes - Array of valid component type names
 * @returns true if all component types are registered, false otherwise
 */
export function validateLayoutTypes(
  config: unknown,
  registeredTypes: ReadonlyArray<string>
): boolean {
  if (config === null || config === undefined) {
    return true;
  }

  if (typeof config !== 'object') {
    return true;
  }

  // Check if this object has a componentType field
  if ('componentType' in config) {
    const componentType = (config as { componentType: unknown }).componentType;
    if (typeof componentType === 'string') {
      if (!registeredTypes.includes(componentType)) {
        console.warn(
          `Layout validation failed: unknown component type "${componentType}". ` +
          `Registered types: ${registeredTypes.join(', ')}`
        );
        return false;
      }
    }
  }

  // Recursively check all object properties
  if (Array.isArray(config)) {
    return config.every((item) => validateLayoutTypes(item, registeredTypes));
  }

  // Check all properties of the object
  for (const value of Object.values(config)) {
    if (!validateLayoutTypes(value, registeredTypes)) {
      return false;
    }
  }

  return true;
}

/**
 * Saves a layout configuration to localStorage.
 *
 * Wraps the config with version metadata and persists as JSON.
 * Fails silently if localStorage is unavailable or full.
 *
 * @param config - The GoldenLayout configuration to save
 */
export function saveLayout(config: unknown): void {
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage is not available, cannot save layout');
    return;
  }

  try {
    const persisted: PersistedLayout = {
      version: LAYOUT_VERSION,
      config,
    };
    const serialized = JSON.stringify(persisted);
    localStorage.setItem(LAYOUT_STORAGE_KEY, serialized);
  } catch (error) {
    console.warn('Failed to save layout to localStorage:', error);
  }
}

/**
 * Loads a layout configuration from localStorage.
 *
 * Validates the version and ensures all component types are registered.
 * Returns null if the layout is invalid, corrupted, or incompatible.
 *
 * @param registeredTypes - Array of valid component type names
 * @returns The layout config if valid, null otherwise
 */
export function loadLayout(
  registeredTypes: ReadonlyArray<string>
): unknown | null {
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage is not available, cannot load layout');
    return null;
  }

  try {
    const serialized = localStorage.getItem(LAYOUT_STORAGE_KEY);

    if (serialized === null) {
      // No saved layout exists
      return null;
    }

    // eslint-disable-next-line no-restricted-syntax
    const persisted = JSON.parse(serialized) as unknown;

    // Validate structure
    if (
      persisted === null ||
      typeof persisted !== 'object' ||
      !('version' in persisted) ||
      !('config' in persisted)
    ) {
      console.warn('Invalid layout structure in localStorage, ignoring');
      return null;
    }

    const layout = persisted as PersistedLayout;

    // Check version compatibility
    if (layout.version !== LAYOUT_VERSION) {
      console.warn(
        `Layout version mismatch: stored=${layout.version}, expected=${LAYOUT_VERSION}. ` +
        'Ignoring saved layout.'
      );
      return null;
    }

    // Validate component types
    if (!validateLayoutTypes(layout.config, registeredTypes)) {
      console.warn('Layout contains unregistered component types, ignoring');
      return null;
    }

    // Verify essential panels are present (reject corrupted layouts that
    // pass type validation but are structurally broken — e.g., empty sidebar).
    const presentTypes = new Set(collectComponentTypes(layout.config));
    const essentialTypes = registeredTypes.filter(t => t !== 'chart'); // chart is dynamic
    const missingTypes = essentialTypes.filter(t => !presentTypes.has(t));
    if (missingTypes.length > 0) {
      console.warn(
        `Layout is missing essential panels: ${missingTypes.join(', ')}. ` +
        'Falling back to default layout.'
      );
      return null;
    }

    return layout.config;
  } catch (error) {
    console.warn('Failed to load layout from localStorage:', error);
    return null;
  }
}

/**
 * Clears the saved layout from localStorage.
 *
 * Fails silently if localStorage is unavailable.
 */
export function clearLayout(): void {
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage is not available, cannot clear layout');
    return;
  }

  try {
    localStorage.removeItem(LAYOUT_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear layout from localStorage:', error);
  }
}
