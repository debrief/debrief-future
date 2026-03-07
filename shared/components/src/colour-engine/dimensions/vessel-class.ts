/**
 * Vessel Class colour dimension — categorical encoding with one colour
 * per vessel class (FR-006).
 */

import type { ColourDimension } from '../types';

export const vesselClassDimension: ColourDimension = {
  id: 'vessel-class',
  label: 'Vessel Class',
  type: 'categorical',
  resolve: (item) => {
    if (!item.vesselClasses || item.vesselClasses.length === 0) {
      return null;
    }
    const fullPath = item.vesselClasses[0];
    if (!fullPath) return null;
    const segments = fullPath.split('/');
    return segments[segments.length - 1] ?? null;
  },
};
