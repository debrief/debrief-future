/**
 * Tag colour dimension — categorical encoding with one colour
 * per unique tag value (FR-007).
 */

import type { ColourDimension } from '../types';

export const tagDimension: ColourDimension = {
  id: 'tag',
  label: 'Tag',
  type: 'categorical',
  resolve: (item) => {
    if (!item.tags || item.tags.length === 0) {
      return null;
    }
    return item.tags[0] ?? null;
  },
};
