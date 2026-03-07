/**
 * Built-in colour dimension registry (#134).
 *
 * New dimensions are added by appending to this array.
 * The selector and legend components read from this registry.
 */

import type { ColourDimension } from './types';
import { ageDimension } from './dimensions/age';
import { vesselClassDimension } from './dimensions/vessel-class';
import { tagDimension } from './dimensions/tag';

/** The built-in colour dimensions (Age, Vessel Class, Tag). */
export const builtInDimensions: readonly ColourDimension[] = [
  ageDimension,
  vesselClassDimension,
  tagDimension,
];
