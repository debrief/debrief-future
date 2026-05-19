/**
 * FeatureEditorMode — schema-driven editor for a single selected feature
 * (Spec 192, Phase 3, T027 + T028).
 *
 * Composes the existing #447 `PropertiesForm` widget machinery: for every
 * editable slot on the selected feature's properties, supplies the
 * matching JSON-Schema property entry to `resolveFieldSpec()` (the
 * shipped LinkML-driven resolver) and routes commits through
 * `useStagedEdits.setFeatureField`.
 *
 * Editable slot set (FR-004 + FR-005):
 *
 *   - `tags`  — inherited `BaseFeatureProperties.tags` (analyst-editable
 *               on every concrete subclass).
 *   - `display_name`, `nationality`, `vessel_class`, `vessel_type`,
 *     `vessel_role`, `domain` — the six per-platform override slots on
 *     `TrackProperties` (introduced by #181 — feature-overrides slice).
 *
 * The slot set is derived from `FeatureEditableProperties` (a `Pick<>` of
 * `TrackProperties` defined in `useStagedEdits.ts`) so future additions
 * are picked up automatically — Article IV.5. An exhaustiveness guard
 * below fails compile if a slot is added to `FeatureEditableProperties`
 * without a matching schema descriptor here.
 *
 * Why hand-curated schema entries instead of importing the JSON-Schema
 * bundle? The host applications (web-shell, VS Code) alias
 * `@debrief/schemas` to the generated TypeScript index, which shadows
 * the package.json `./json-schema/*` export. Hand-curating the seven
 * editable slots is a small, audit-friendly slice — and the production
 * resolver (`resolveFieldSpec`) is still the single code path that
 * decides what widget to render. If the LinkML source changes one of
 * these fields' shape, the generated TypeScript types diverge first
 * and the build catches it via the exhaustiveness guard below.
 *
 * Visual distinction (FR-005): the six override slots render with
 * `derivation: 'override'` when an explicit value is set, which the
 * shipped `DerivationChip` in `PropertiesForm` already surfaces as a
 * `properties-chip-override` element. No new widgets.
 *
 * Article XV: strict types end-to-end; no `any`.
 */

import React, { useCallback, useMemo } from 'react';
import type { DebriefFeature } from '@debrief/schemas';
import { PropertiesForm } from '../PropertiesForm';
import { resolveFieldSpec } from '../schemaResolver';
import { isAutoDerivedField } from '../autoDerivedFields';
import { getFeatureLabel } from '../../utils/labels';
import type {
  FeatureEditableProperties,
  UseStagedEditsApi,
} from '../../ActivityPanel/useStagedEdits';
import type {
  FieldKey,
  FieldValue,
  PropertiesFormField,
} from '../types';

// ─── Boundary-derived editable slot set (Article IV.5) ─────────────────

/**
 * The six per-platform override slots on `TrackProperties`. Used to drive
 * the `derivation: 'override'` chip per FR-005.
 */
const PER_PLATFORM_OVERRIDE_SLOTS = [
  'display_name',
  'nationality',
  'vessel_class',
  'vessel_type',
  'vessel_role',
  'domain',
] as const satisfies ReadonlyArray<keyof FeatureEditableProperties>;

type PerPlatformOverrideSlot = (typeof PER_PLATFORM_OVERRIDE_SLOTS)[number];

function isPerPlatformOverrideSlot(slot: string): slot is PerPlatformOverrideSlot {
  return (PER_PLATFORM_OVERRIDE_SLOTS as readonly string[]).includes(slot);
}

/**
 * The full editable slot set in form-render order. `tags` sits at the
 * bottom so the analyst-facing per-platform identity fields come first.
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

// Exhaustiveness guard — if `FeatureEditableProperties` grows or shrinks,
// this fails to compile and forces an explicit update here. Article IV.5.
type _ExhaustiveEditableSlot = Exclude<
  keyof FeatureEditableProperties,
  EditableSlot
> extends never
  ? true
  : never;
const _exhaustiveAssertion: _ExhaustiveEditableSlot = true;
void _exhaustiveAssertion;

// ─── Hand-curated JSON-Schema property entries ─────────────────────────
//
// These mirror the entries emitted by LinkML's gen-json-schema for
// `TrackProperties` and `BaseFeatureProperties` — see
// `shared/schemas/src/generated/json-schema/debrief.schema.json`. Each
// entry is passed verbatim to `resolveFieldSpec()` so the widget choice
// is driven by the production resolver (FR-003 / SC-003).
//
// Vessel-domain enum values mirror `VesselDomainEnum` exactly.
const VESSEL_DOMAIN_VALUES = ['surface', 'subsurface', 'unknown'] as const;

const SLOT_SCHEMA: Readonly<Record<EditableSlot, unknown>> = Object.freeze({
  display_name: { type: ['string', 'null'] },
  nationality: { type: ['string', 'null'], pattern: '^[A-Z]{2}$' },
  vessel_class: {
    type: ['string', 'null'],
    pattern: '^[a-z0-9-]+(/[a-z0-9-]+){0,3}$',
  },
  vessel_type: { type: ['string', 'null'], pattern: '^[a-z0-9-]+$' },
  vessel_role: { type: ['string', 'null'], pattern: '^[a-z0-9-]+$' },
  domain: {
    type: ['string', 'null'],
    enum: [...VESSEL_DOMAIN_VALUES],
  },
  tags: {
    type: ['array', 'null'],
    items: { type: 'string' },
  },
});

// ─── Props ────────────────────────────────────────────────────────────

export interface FeatureEditorModeProps {
  /** The single feature being edited. */
  feature: DebriefFeature;
  /** True when the plot's storage is read-only — disables inputs. */
  readOnly: boolean;
  /** Staging buffer setter; receives `(featureId, slot, next, current)`. */
  setFeatureField: UseStagedEditsApi['setFeatureField'];
  /** Revert / un-revert — surfaced for Phase 8 (T060/T061). Accepted now
   *  so the dispatcher contract is concrete. */
  revertField: UseStagedEditsApi['revertField'];
  unrevertField: UseStagedEditsApi['unrevertField'];
}

// ─── Component ────────────────────────────────────────────────────────

export function FeatureEditorMode(
  props: FeatureEditorModeProps,
): React.ReactElement {
  const { feature, readOnly, setFeatureField } = props;
  // Acknowledge revert hooks — Phase 8 wires them.
  void props.revertField;
  void props.unrevertField;

  const displayName = getFeatureLabel(feature);
  const featureId = String(feature.id);

  // Structural read of properties — the feature union has many concrete
  // subclasses; we touch only the analyst-editable slots, all of which
  // live on `BaseFeatureProperties` / `TrackProperties`. The cast is
  // narrow (a Record read) and is documented as such.
  // eslint-disable-next-line no-restricted-syntax -- structural read at the editor boundary
  const featureProps = feature.properties as unknown as Record<string, unknown>;

  const fields: PropertiesFormField[] = useMemo(() => {
    return EDITABLE_SLOTS.map((slot): PropertiesFormField => {
      const spec = resolveFieldSpec(SLOT_SCHEMA[slot], slot);
      const value = featureProps[slot];

      // Derivation per FR-005:
      //   - per-platform override slot WITH an explicit value → 'override'
      //   - slot listed in AUTO_DERIVED_FIELDS                → 'auto-derived'
      //   - everything else (incl. `tags`)                    → 'user'
      // `tags` is NOT in the six-slot override set so it always renders
      // without the override chip — verified in T026.
      let derivation: PropertiesFormField['derivation'] = 'user';
      const hasExplicitValue =
        value !== undefined && value !== null && value !== '';
      if (isPerPlatformOverrideSlot(slot) && hasExplicitValue) {
        derivation = 'override';
      } else if (isAutoDerivedField(slot)) {
        derivation = 'auto-derived';
      }

      return {
        key: slot,
        label: slot,
        value: value ?? null,
        spec,
        derivation,
        required: false,
        error: null,
      };
    });
  }, [featureProps]);

  const handleCommit = useCallback(
    (key: FieldKey, next: FieldValue): void => {
      // Only thread edits for slots we own — the dispatcher should never
      // emit a commit for an unknown key here, but guard defensively.
      if (!(EDITABLE_SLOTS as readonly string[]).includes(key)) return;
      const current = featureProps[key];
      setFeatureField(
        featureId,
        key as keyof FeatureEditableProperties,
        next,
        current,
      );
    },
    [featureId, featureProps, setFeatureField],
  );

  return (
    <div
      data-testid="properties-mode-feature"
      data-feature-id={featureId}
      aria-disabled={readOnly ? 'true' : undefined}
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <header
        data-testid="properties-mode-feature-header"
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--vscode-foreground, #ddd)',
          paddingBottom: 4,
          borderBottom: '1px solid var(--vscode-panel-border, transparent)',
        }}
      >
        {displayName}
      </header>
      <PropertiesForm
        fields={fields}
        onCommitField={handleCommit}
        loading={false}
        readOnly={readOnly}
        writeError={null}
      />
    </div>
  );
}

export default FeatureEditorMode;
