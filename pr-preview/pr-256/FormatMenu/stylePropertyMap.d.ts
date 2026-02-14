import { StylePropertyDescriptor } from './formatMenuItems';

/**
 * Returns the editable style properties for a given feature kind.
 */
export declare function getPropertiesForKind(featureKind: string): readonly StylePropertyDescriptor[];
/**
 * Resolves an array of feature kinds into a unified list of style property descriptors.
 * For mixed-kind selections, returns the union of all properties.
 */
export declare function resolvePropertiesForKinds(featureKinds: readonly string[]): readonly StylePropertyDescriptor[];
//# sourceMappingURL=stylePropertyMap.d.ts.map