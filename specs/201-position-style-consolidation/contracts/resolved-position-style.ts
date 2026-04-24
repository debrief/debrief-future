/**
 * Contract: canonical shapes published from @debrief/utils after feature 201
 * (including the 2026-04-18 scope expansion).
 *
 * This file is specification-only. It is NOT imported by any production code.
 * It exists so that reviewers (and the /speckit.implement phase) can check the
 * actual implementation against the exact shapes planned here, and so that any
 * drift between plan and implementation is visible in diff.
 *
 * Canonical implementation targets:
 *   - shared/utils/src/types.ts    — ResolvedPositionStyle, PointShape
 *   - shared/utils/src/errors.ts   — InvalidPointShapeError (new; exact path TBD)
 *   - shared/utils/src/assert.ts   — assertNever (new or existing; check first)
 *   - shared/utils/src/interval.ts — resolvePositionStyle + guard + Set cache
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

// ---------------------------------------------------------------------------
// Expanded scope (2026-04-18): additional published contracts
// ---------------------------------------------------------------------------

/**
 * Typed error thrown by `resolvePositionStyle` when a runtime override's
 * symbol field is not in the PointShape union. Callers (specifically
 * `PositionSymbolsLayer.tsx`) catch this and surface it via LogService — they
 * must NOT silently substitute a default shape for the offending position.
 *
 * See FR-015 and FR-018.
 */
export class InvalidPointShapeError extends Error {
  constructor(
    public readonly offendingValue: string,
    public readonly validShapes: readonly string[],
  ) {
    super(
      `Invalid point shape: "${offendingValue}". Must be one of: ${validShapes.join(', ')}.`,
    );
    this.name = 'InvalidPointShapeError';
  }
}

/**
 * Standard TypeScript exhaustiveness helper. Used as the default branch of
 * every `switch (symbol)` in the map renderer so that adding a new value to
 * PointShape causes tsc to fail until every renderer handles the new value.
 *
 * See FR-016.
 *
 * If @debrief/utils already exports this (check first — it may exist as part
 * of constitution Article XV compliance in another feature), this file's
 * implementation target is deleted and the existing one is reused.
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}

// ---------------------------------------------------------------------------
// Resolver signature (unchanged — for reference only)
// ---------------------------------------------------------------------------

// The consolidated resolver's SIGNATURE matches the existing one in
// shared/utils/src/interval.ts. Only its INTERNAL semantics change:
//
//   (a) Override-null filtering — R-007 / FR-013: applies an override field
//       only when it is neither `undefined` nor `null`.
//
//   (b) Invalid-symbol guard — R-008 / FR-015: before assigning an override's
//       symbol to the output, checks it against a module-level
//       `Set<string>(Object.values(PointShapeEnum))` (R-009) and throws
//       InvalidPointShapeError if absent.
//
//   (c) Output field rename `label` → `labelText` — FR-004 / FR-005.
//
// export function resolvePositionStyle(
//   index: number,
//   defaultStyle: PositionStyle,
//   symbolIntervalPositions: Set<number>,
//   labelIntervalPositions: Set<number>,
//   override: PositionStyleOverride | null | undefined,
//   positionTime: string,
// ): ResolvedPositionStyle; // throws InvalidPointShapeError

// ---------------------------------------------------------------------------
// Schema-generator output narrowing (FR-014 / R-011)
// ---------------------------------------------------------------------------

// After this feature, the generated TypeScript in
// shared/schemas/src/generated/typescript/types.ts MUST emit:
//
//   export interface PositionStyle {
//     show_symbol: boolean,
//     symbol: PointShape,      // was: string
//     show_label: boolean,
//   }
//
//   export interface PositionStyleOverride {
//     show_symbol?: boolean,
//     symbol?: PointShape,     // was: string
//     show_label?: boolean,
//     label?: string,
//   }
//
// Delivery mechanism: post-process step in the schemas build (R-011). If that
// mechanism proves intractable, FR-014 is renegotiated before tasks.md; the
// fallback leaves these fields as `string` and keeps all other FRs as-is.
