/**
 * Compile-time exhaustiveness guard over `SystemStateTypeEnum` (feature 261,
 * Article IV.5). If a new SystemState variant is added to the LinkML schema,
 * `tsc` fails here until the helper handles it — the build is the enforcement.
 */
import type { SystemStateTypeEnum } from '@debrief/schemas';
import type { SystemStateType } from './types.js';

// Every permissible value of the generated enum must be one the helper handles.
type _AllVariantsHandled = [Exclude<`${SystemStateTypeEnum}`, SystemStateType>] extends [never]
  ? true
  : never;

// ...and every handled variant must be a real permissible value (no typos).
type _NoExtraVariants = [Exclude<SystemStateType, `${SystemStateTypeEnum}`>] extends [never]
  ? true
  : never;

const _assertAllHandled: _AllVariantsHandled = true;
const _assertNoExtra: _NoExtraVariants = true;

// Reference the assertions so `noUnusedLocals` doesn't flag them.
export const SYSTEM_STATE_EXHAUSTIVE: boolean = _assertAllHandled && _assertNoExtra;
