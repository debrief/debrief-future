/**
 * MultiSelectSummaryMode — read-only summary for ≥ 2 features selected
 * (Spec 192, Phase 7, T054 + T055).
 *
 * Renders, per the seven editable slots Phase 3 settled on
 * (FR-011), one of:
 *
 *   - the **shared value** — when every resolved feature has the same value
 *     for that slot (deep-equal across primitives and arrays of strings).
 *   - a **`(differs)`** token — when any two values diverge.
 *
 * The whole surface is non-interactive (FR-011): the container carries
 * `aria-disabled="true"`, and every input we render is `disabled` so
 * screen readers and keyboard navigation honour the read-only contract.
 *
 * `readOnly` is threaded uniformly for dispatcher symmetry; the summary
 * is unconditionally non-interactive so the prop has no behavioural
 * effect here. It's accepted so a future bulk-edit affordance (out of
 * scope for v1) can disable any new control it adds.
 *
 * Memoisation: the derivation is `useMemo`-ed on `(featureIds, featuresById)`
 * — re-renders that change neither key get the cached result. Performance
 * budget per the task brief: well under 16 ms for 200 features × 7 slots.
 *
 * Article IV.5 (boundary types are derived, not rewritten): the editable
 * slot set is `Pick<TrackProperties, …>` re-exported by `useStagedEdits`
 * as `FeatureEditableProperties`, and the same `EDITABLE_SLOTS` constant
 * `FeatureEditorMode` uses drives the row list here. If the Pick is
 * extended, the exhaustiveness guard in `FeatureEditorMode` flags the
 * missing slot — the constant here MUST be kept in sync (single source
 * of truth lives in the Pick).
 *
 * Article XV: strict types end-to-end; no `any`.
 */

import React, { useMemo } from 'react';
import type { DebriefFeature } from '@debrief/schemas';
import type { FeatureEditableProperties } from '../../ActivityPanel/useStagedEdits';

// ─── Editable slot set (Article IV.5) ──────────────────────────────────

/**
 * The seven editable slots in summary-render order. Kept in lockstep
 * with `FeatureEditorMode.EDITABLE_SLOTS` — both must derive from
 * `FeatureEditableProperties` via the exhaustiveness guard below.
 */
const EDITABLE_SLOTS = [
  'display_name',
  'nationality',
  'vessel_class',
  'vessel_type',
  'vessel_role',
  'domain',
  'tags',
] as const satisfies ReadonlyArray<keyof FeatureEditableProperties>;

type EditableSlot = (typeof EDITABLE_SLOTS)[number];

// Exhaustiveness guard — adding a slot to FeatureEditableProperties must
// be reflected here or this fails to compile.
type _ExhaustiveEditableSlot = Exclude<
  keyof FeatureEditableProperties,
  EditableSlot
> extends never
  ? true
  : never;
const _exhaustiveAssertion: _ExhaustiveEditableSlot = true;
void _exhaustiveAssertion;

// ─── Derivation ────────────────────────────────────────────────────────

/**
 * `(differs)` is the singleton sentinel for the diverging-values cell.
 * Discriminating on object identity keeps the derived state union tidy
 * without inventing a new flag field.
 */
const DIFFERS: unique symbol = Symbol('multiselect-differs');
type DiffersToken = typeof DIFFERS;

/** Per-slot derivation result: `DiffersToken` when values diverge across
 *  the resolved features; otherwise the shared value (which may be null /
 *  undefined when absent on every resolved feature). */
type SlotValue = DiffersToken | unknown;

/** Slot → derivation result lookup. Backed by a `Map` so we never need
 *  the `{} as Record<>` cast pattern flagged by the boundary lint rule
 *  (ADR-011); the slot list (`EDITABLE_SLOTS`) stays the single source of
 *  truth per Article IV.5. */
type PerSlotLookup = ReadonlyMap<EditableSlot, SlotValue>;

interface DerivationResult {
  /** Map of slot → shared value or DIFFERS. */
  perSlot: PerSlotLookup;
  /** Count of resolved (i.e. present-in-map) features. May be less than
   *  `featureIds.length` if any id was unresolvable. */
  resolvedCount: number;
}

/** Strict deep equality for the value shapes this surface carries:
 *  primitives, null/undefined, and arrays-of-strings (tags). Anything
 *  else falls back to strict equality. Mirrors the `deepEqual` shape
 *  used by `useStagedEdits` so the prune-on-equality semantics match. */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) {
    return a === b;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  return false;
}

function deriveSummary(
  featureIds: ReadonlyArray<string>,
  featuresById: ReadonlyMap<string, DebriefFeature>,
): DerivationResult {
  // Resolve features — silently skip ids the map can't satisfy. The
  // dispatcher's defensive code above us already downgrades unresolvable
  // selections, so this is belt-and-braces.
  const resolved: DebriefFeature[] = [];
  for (const id of featureIds) {
    const f = featuresById.get(id);
    if (f) resolved.push(f);
  }

  // Build the per-slot result into a Map (avoids the `{} as Record<>`
  // cast pattern flagged by the boundary lint rule; `EDITABLE_SLOTS`
  // remains the single source of truth — Article IV.5).
  const perSlot = new Map<EditableSlot, SlotValue>();
  for (const slot of EDITABLE_SLOTS) {
    if (resolved.length === 0) {
      perSlot.set(slot, undefined);
      continue;
    }
    // Structural read at the editor boundary — analyst-editable slots
    // live on BaseFeatureProperties / TrackProperties, all of which sit
    // in the DebriefFeature union via `properties`. The cast is narrow
    // (Record read) and documented as such.
    // eslint-disable-next-line no-restricted-syntax -- structural read at the editor boundary
    const first = (resolved[0]!.properties as unknown as Record<string, unknown>)[slot];
    let isShared = true;
    for (let i = 1; i < resolved.length; i += 1) {
      // eslint-disable-next-line no-restricted-syntax -- structural read at the editor boundary
      const v = (resolved[i]!.properties as unknown as Record<string, unknown>)[slot];
      if (!deepEqual(first, v)) {
        isShared = false;
        break;
      }
    }
    perSlot.set(slot, isShared ? first : DIFFERS);
  }

  return { perSlot, resolvedCount: resolved.length };
}

// ─── Value rendering ──────────────────────────────────────────────────

/** Render a shared scalar/array as its display string for the summary.
 *  Absent values render an em-dash placeholder so the row never appears
 *  silently empty. */
function renderSharedValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    return value.map((v) => String(v)).join(', ');
  }
  return String(value);
}

// ─── Props ────────────────────────────────────────────────────────────

export interface MultiSelectSummaryModeProps {
  /** Feature ids in the multi-select (length ≥ 2 in production; the
   *  component degrades gracefully for length 1 / 0). */
  featureIds: string[];
  /** Resolved feature map — driven by `useFeaturesById` upstream. */
  featuresById: ReadonlyMap<string, DebriefFeature>;
  /** Threaded for dispatcher symmetry. The summary is unconditionally
   *  non-interactive (FR-011) regardless of this value. */
  readOnly?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────

export function MultiSelectSummaryMode(
  props: MultiSelectSummaryModeProps,
): React.ReactElement {
  const { featureIds, featuresById } = props;
  // Accepted for dispatcher symmetry — see comment block at top of file.
  void props.readOnly;

  const derivation = useMemo(
    () => deriveSummary(featureIds, featuresById),
    [featureIds, featuresById],
  );

  const count = featureIds.length;

  return (
    <div
      data-testid="properties-mode-multiselect"
      aria-disabled="true"
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <header
        data-testid="properties-mode-multiselect-header"
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--vscode-foreground, #ddd)',
          paddingBottom: 4,
          borderBottom: '1px solid var(--vscode-panel-border, transparent)',
        }}
      >
        {count} feature{count === 1 ? '' : 's'} selected
      </header>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {EDITABLE_SLOTS.map((slot) => {
          const value = derivation.perSlot.get(slot);
          const differs = value === DIFFERS;
          return (
            <div
              key={slot}
              data-testid={`multiselect-row-${slot}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                padding: '4px 0',
              }}
            >
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--vscode-descriptionForeground, #888)',
                  textTransform: 'lowercase',
                }}
                htmlFor={`multiselect-value-${slot}`}
              >
                {slot}
              </label>
              {differs ? (
                <span
                  data-testid={`multiselect-differs-${slot}`}
                  aria-disabled="true"
                  style={{
                    fontSize: 12,
                    fontStyle: 'italic',
                    color: 'var(--vscode-editorWarning-foreground, #cca700)',
                  }}
                >
                  (differs)
                </span>
              ) : (
                // Render the shared value as text — FR-011 forbids an
                // enabled control here, and a non-interactive span keeps
                // the surface keyboard-skippable + screen-reader-friendly.
                // We still expose a stable testid so the assertions can
                // address the value cell.
                <span
                  id={`multiselect-value-${slot}`}
                  data-testid={`multiselect-value-${slot}`}
                  aria-disabled="true"
                  style={{
                    fontSize: 12,
                    color: 'var(--vscode-foreground, #ddd)',
                    padding: '2px 0',
                    width: '100%',
                    display: 'inline-block',
                    borderBottom: '1px solid var(--vscode-panel-border, #555)',
                  }}
                >
                  {renderSharedValue(value)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div
        data-testid="properties-mode-multiselect-note"
        style={{
          marginTop: 4,
          fontSize: 11,
          color: 'var(--vscode-descriptionForeground, #888)',
          fontStyle: 'italic',
        }}
      >
        Bulk edit is not supported in this version
      </div>
    </div>
  );
}

export default MultiSelectSummaryMode;
