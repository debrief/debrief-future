/**
 * Contract: canonical shape of ResolvedPositionStyle after feature 201.
 *
 * This file is specification-only. It is NOT imported by any production code.
 * It exists so that reviewers (and the /speckit.implement phase) can check the
 * actual implementation against the exact shape planned here, and so that any
 * drift between plan and implementation is visible in diff.
 *
 * The canonical implementation target: shared/utils/src/types.ts
 */

// ---------------------------------------------------------------------------
// Upstream (not authored in this feature — consumed from @debrief/schemas)
// ---------------------------------------------------------------------------
//
// Exported from shared/schemas/src/generated/typescript/types.ts (generated
// by LinkML `gen-typescript` from shared/schemas/src/linkml/common.yaml):
//
//   export enum PointShapeEnum {
//     circle = "circle",
//     square = "square",
//     triangle = "triangle",
//     diamond = "diamond",
//     cross = "cross",
//   }

// ---------------------------------------------------------------------------
// Authored by this feature — published from @debrief/utils
// ---------------------------------------------------------------------------

import type { PointShapeEnum } from '@debrief/schemas';

/**
 * String-union view over the schema's point-shape enum. Resolves to:
 *   "circle" | "square" | "triangle" | "diamond" | "cross"
 *
 * Derived via template-literal inference from `PointShapeEnum` so that adding
 * or renaming a permissible value in LinkML causes this union to update
 * automatically after schema regeneration — with zero hand-edits in
 * @debrief/utils.
 *
 * Published alongside ResolvedPositionStyle so consumers (renderer prop
 * types, test fixtures) can name the symbol type explicitly.
 */
export type PointShape = `${PointShapeEnum}`;

/**
 * Rendering-ready style for a single position on a track, computed from the
 * cascade: default_position_style → interval rules → per-position override.
 *
 * Transient; never persisted or serialised. Produced by resolvePositionStyle
 * and computeAllPositionStyles (both in @debrief/utils and re-exported from
 * @debrief/components for backwards-compatible import paths).
 *
 * Field names are stable. `labelText` is deliberately not named `label` to
 * disambiguate from the schema's PositionStyleOverride.label input field
 * (which keeps its LinkML-defined name).
 */
export interface ResolvedPositionStyle {
  /** Whether the renderer should draw a marker at this position. */
  showSymbol: boolean;

  /**
   * Which shape to draw. Value space is the union of LinkML PointShapeEnum
   * permissible values. Must not be a hand-typed string-literal union — the
   * type must derive from the generated enum.
   */
  symbol: PointShape;

  /** Whether the renderer should draw a text label at this position. */
  showLabel: boolean;

  /**
   * Text to draw as the label.
   * - `null` when `showLabel` is false or when no label text is available.
   * - A formatted timestamp (HH:MM:SS) when the resolver fills in a default
   *   because `showLabel` was enabled but no custom text was supplied.
   * - A custom string when the per-position override provided one.
   *
   * Replaces the pre-refactor field `label`. No `label` field exists on this
   * interface after the refactor (enforced by grep and tsc).
   */
  labelText: string | null;
}

// ---------------------------------------------------------------------------
// Conformance checks (compile-time sanity, spec-only)
// ---------------------------------------------------------------------------
//
// These statements are true against the canonical shape and are the kind of
// checks the implementation PR should satisfy. They are illustrative only.

// (1) The canonical interface is assignable from an object literal that uses
//     a plain string for the symbol field — ergonomic for renderers, tests
//     and fixtures that don't want to reach for PointShapeEnum.circle.
const _sampleLiteral: ResolvedPositionStyle = {
  showSymbol: true,
  symbol: 'circle',
  showLabel: true,
  labelText: 'Contact Alpha',
};
void _sampleLiteral;

// (2) The canonical interface is also assignable from an enum-member value
//     for the symbol field — no ambiguity at consumption sites that do use
//     the enum directly.
//
// (Commented out because this file is specification-only and does not import
// the actual enum runtime — uncomment in a scratch TS file to verify.)
//
// import { PointShapeEnum as Enum } from '@debrief/schemas';
// const _sampleEnum: ResolvedPositionStyle = {
//   showSymbol: true,
//   symbol: Enum.diamond,
//   showLabel: false,
//   labelText: null,
// };

// (3) A shape that is NOT in the schema enum is rejected. If LinkML ever
//     grows `star`, this assertion would succeed after regeneration.
//     The assertion is commented because it is intentionally a type error
//     against the current enum:
//
// const _rejected: ResolvedPositionStyle = {
//   showSymbol: true,
//   symbol: 'hexagon', // ts(2322): Type '"hexagon"' is not assignable to type 'PointShape'.
//   showLabel: false,
//   labelText: null,
// };

// (4) A field named `label` is rejected — the interface has no such field.
//
// const _staleReader: ResolvedPositionStyle = {
//   showSymbol: true,
//   symbol: 'circle',
//   showLabel: true,
//   label: 'nope', // ts(2353): 'label' does not exist in type 'ResolvedPositionStyle'.
//   labelText: 'ok',
// };
