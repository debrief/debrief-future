/**
 * Built-in colour dimension registry (#134).
 *
 * New dimensions are added by appending to this array.
 * The selector and legend components read from this registry.
 */

import type { ColourDimension } from './types';
import { ageDimension } from './dimensions/age';
import { tagDimension } from './dimensions/tag';

/** The built-in colour dimensions (Age, Tag). */
export const builtInDimensions: readonly ColourDimension[] = [
  ageDimension,
  tagDimension,
];
