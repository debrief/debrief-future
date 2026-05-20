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
import { RevertControl, type RevertControlSlot } from '../revertControl';
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
 * Narrow a generic FieldKey set down to only per-platform override slots —
 * the set local state stores. Reverts on `tags` (the non-override slot)
 * are not visible through the override chip and are ignored here.
 */
function filterToPerPlatform(
  set: ReadonlySet<string> | undefined,
): ReadonlySet<PerPlatformOverrideSlot> {
  if (!set || set.size === 0) return new Set();
  const out = new Set<PerPlatformOverrideSlot>();
  for (const slot of set) {
    if (isPerPlatformOverrideSlot(slot)) out.add(slot);
  }
  return out;
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

// ─── Inline platform-registry mirror (Phase 8 / T061) ──────────────────
//
// The browser-side editor needs an auto-derived-value lookup keyed by
// `platform_id`. `@debrief/data` would be the canonical source but it
// reads the registry via `node:fs` and is not browser-safe. We mirror the
// authoritative `shared/data/platform-registry.json` here as a frozen
// const so the lookup works in every host (web-shell, VS Code webview,
// Vitest jsdom). The schema-adherence test that proves these two stay
// aligned lives in `shared/data/__tests__/registry-mirror-adherence.test.ts`
// (added in a future phase); until then, this is the single source of truth
// for the Properties Panel's revert affordance.
interface PlatformRegistryLeaf {
  readonly name: string;
  readonly short_name?: string;
  readonly nationality: string;
}

interface PlatformRegistryNode {
  readonly [key: string]: PlatformRegistryNode | PlatformRegistryLeaf | undefined;
}

// Frozen mirror of `shared/data/platform-registry.json` (current revision).
// Keep this in sync with that file — the leaf shape is `{ name, short_name?,
// nationality }`; non-leaf nodes carry an `_class` annotation that is
// ignored by the walker below. This is a small enough surface that we
// accept the duplication for browser portability (vs. dragging `@debrief/data`
// + node:fs into the component bundle).
const PLATFORM_REGISTRY_MIRROR: PlatformRegistryNode = Object.freeze({
  surface: {
    warship: {
      frigate: {
        type23: {
          NELSON: { name: 'HMS Nelson', short_name: 'NLSN', nationality: 'GB' },
          FRIGATE: { name: 'HMS Argyll', short_name: 'ARGL', nationality: 'GB' },
          SENSOR: { name: 'HMS Richmond', short_name: 'RCHM', nationality: 'GB' },
          OWNSHIP_A: { name: 'HMS Lancaster', short_name: 'LNCS', nationality: 'GB' },
        },
      },
      destroyer: {
        type45: {
          COLLINGWOOD: { name: 'HMS Collingwood', short_name: 'CLNG', nationality: 'GB' },
          OWNSHIP: { name: 'HMS Defender', short_name: 'DFNR', nationality: 'GB' },
        },
        'arleigh-burke': {
          OWNSHIP_B: { name: 'USS Mason', short_name: 'MSN', nationality: 'US' },
        },
      },
    },
  },
  subsurface: {
    submarine: {
      ssn: {
        astute: {
          SUBJECT: { name: 'Contact Alpha', short_name: 'ALFA', nationality: 'GB' },
        },
        trafalgar: {
          TMA_TRACK: { name: 'TMA Solution Track', short_name: 'TMA', nationality: 'GB' },
        },
      },
      ssk: {
        type212: {
          TARGET: { name: 'Contact Bravo', short_name: 'BRVO', nationality: 'GB' },
        },
      },
    },
  },
});

function isLeaf(node: PlatformRegistryNode | PlatformRegistryLeaf): node is PlatformRegistryLeaf {
  return typeof (node as PlatformRegistryLeaf).name === 'string'
      && typeof (node as PlatformRegistryLeaf).nationality === 'string';
}

interface ResolvedPlatform {
  readonly display_name: string;
  readonly nationality: string;
  readonly vessel_class: string;
  readonly vessel_type: string;
  readonly vessel_role: string;
  readonly domain: string;
}

/**
 * Walk the inline registry tree to find a platform by id. Returns the full
 * resolved attribute bag (auto-derived from the path) or `null` if the id
 * is not present (the FR-024 edge case the revert widget renders as
 * "disabled + tooltip").
 */
function resolvePlatform(platformId: string | undefined): ResolvedPlatform | null {
  if (!platformId) return null;
  // BFS with the path captured per node — pre-order, depth-bounded by tree
  // structure (max depth in mirror: domain/role/type/sub-class/leaf = 4).
  const stack: Array<{ node: PlatformRegistryNode; path: string[] }> = [
    { node: PLATFORM_REGISTRY_MIRROR, path: [] },
  ];
  while (stack.length > 0) {
    const { node, path } = stack.pop()!;
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('_') || child === undefined) continue;
      if (isLeaf(child)) {
        if (key === platformId) {
          const fullPath = [...path, key];
          // Vessel-class path is everything *between* the domain and the
          // leaf id (matches `walkTree` in `shared/data/src/ts/registry.ts:77-90`).
          const classPath = path.join('/');
          const domain = path[0] ?? '';
          const vesselType = path[path.length - 1] ?? '';
          const vesselRole = path.length >= 2 ? (path[path.length - 2] ?? '') : '';
          void fullPath;
          return {
            display_name: child.name,
            nationality: child.nationality,
            vessel_class: classPath,
            vessel_type: vesselType,
            vessel_role: vesselRole,
            domain,
          };
        }
      } else {
        stack.push({ node: child, path: [...path, key] });
      }
    }
  }
  return null;
}

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
  /** Revert / un-revert — wired to staging buffer (Phase 8 / T060–T061). */
  revertField: UseStagedEditsApi['revertField'];
  unrevertField: UseStagedEditsApi['unrevertField'];
  /**
   * Staged (uncommitted) field edits for this feature, overlaid on top of
   * `feature.properties` for display purposes (US-3 AS-3 hydration on
   * re-selection). When the analyst re-selects a feature that has
   * unsaved edits, the form must show the staged value — not the saved
   * one — so the in-flight edit is visible. Keyed by slot.
   */
  stagedFeatureEdits?: Partial<FeatureEditableProperties>;
  /**
   * Slots the analyst has clicked Revert on but not yet saved. Reverted
   * slots render as if the override were absent (auto-derived chip) even
   * if `feature.properties[slot]` still carries the value — US-3 AS-3.
   */
  stagedRevertedFields?: ReadonlySet<FieldKey>;
  /**
   * Optional override of the platform-registry resolver used to compute
   * each slot's `autoDerivedValue`. Defaults to the inline mirror walker
   * (`resolvePlatform`). Hosts that need to swap the registry source
   * (test fixtures, organisational extension registries) can inject one.
   * Returning `null` from this function for a given slot tells the revert
   * widget to render in the disabled "no auto-derived value" state (FR-024).
   */
  resolveAutoDerivedValue?: (
    feature: DebriefFeature,
    slot: PerPlatformOverrideSlot,
  ) => string | null;
}

// ─── Component ────────────────────────────────────────────────────────

export function FeatureEditorMode(
  props: FeatureEditorModeProps,
): React.ReactElement {
  const {
    feature,
    readOnly,
    setFeatureField,
    revertField,
    unrevertField,
    stagedFeatureEdits,
    stagedRevertedFields,
  } = props;
  const resolveAutoDerived = props.resolveAutoDerivedValue ?? defaultResolveAutoDerivedValue;

  const displayName = getFeatureLabel(feature);
  const featureId = String(feature.id);

  // Structural read of properties — the feature union has many concrete
  // subclasses; we touch only the analyst-editable slots, all of which
  // live on `BaseFeatureProperties` / `TrackProperties`. The cast is
  // narrow (a Record read) and is documented as such.
  // eslint-disable-next-line no-restricted-syntax -- structural read at the editor boundary
  const featureProps = feature.properties as unknown as Record<string, unknown>;

  // ── Local revert UI state (Phase 8 / T061) ─────────────────────────
  //
  // The authoritative `revertedFields` set lives on `useStagedEdits`.
  // Phase 10 (US-3 AS-3 hydration fix) — the dispatcher now forwards the
  // authoritative set via `stagedRevertedFields`. We still hold a local
  // mirror so the in-session click → chip flip is responsive even before
  // the parent re-renders (the same call path that flushed it through
  // useStagedEdits). When the host re-mounts the mode for the same
  // featureId, the prop drives the initial set so revert state survives
  // selection cycling.
  const [revertedSlots, setRevertedSlots] = React.useState<
    ReadonlySet<PerPlatformOverrideSlot>
  >(() => filterToPerPlatform(stagedRevertedFields));

  // If the selected feature changes, re-seed from the staged set — the
  // analyst is now editing a different feature and the per-feature buffer
  // entries belong to the previous id, not this one.
  React.useEffect(() => {
    setRevertedSlots(filterToPerPlatform(stagedRevertedFields));
    // Re-seed only when featureId changes; the host-supplied
    // `stagedRevertedFields` reference also changes when the analyst
    // toggles revert via this very component, so reading it once on
    // remount avoids overwriting local optimistic state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featureId]);

  const fields: PropertiesFormField[] = useMemo(() => {
    return EDITABLE_SLOTS.map((slot): PropertiesFormField => {
      const spec = resolveFieldSpec(SLOT_SCHEMA[slot], slot);
      // US-3 AS-3 hydration: prefer the staged (uncommitted) value over
      // the saved value, so re-selecting a feature with unsaved edits
      // shows the in-flight value in the form. `stagedFeatureEdits` is
      // sparse — only slots the analyst has touched are present.
      const stagedValue =
        stagedFeatureEdits !== undefined && slot in stagedFeatureEdits
          ? (stagedFeatureEdits as Record<string, unknown>)[slot]
          : undefined;
      const hasStaged =
        stagedFeatureEdits !== undefined && slot in stagedFeatureEdits;
      const value = hasStaged ? stagedValue : featureProps[slot];

      // Derivation per FR-005 (override → revert flips back to auto-derived):
      //   - per-platform override slot WITH an explicit value AND NOT reverted → 'override'
      //   - slot listed in AUTO_DERIVED_FIELDS                                 → 'auto-derived'
      //   - everything else (incl. `tags`)                                     → 'user'
      // `tags` is NOT in the six-slot override set so it always renders
      // without the override chip — verified in T026.
      let derivation: PropertiesFormField['derivation'] = 'user';
      const hasExplicitValue =
        value !== undefined && value !== null && value !== '';
      const isPerPlatform = isPerPlatformOverrideSlot(slot);
      const isStagedRevert = isPerPlatform && revertedSlots.has(slot);
      if (isPerPlatform && hasExplicitValue && !isStagedRevert) {
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
  }, [featureProps, revertedSlots, stagedFeatureEdits]);

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

  const handleRevert = useCallback(
    (slot: PerPlatformOverrideSlot): void => {
      revertField(featureId, slot);
      setRevertedSlots((prev) => {
        const next = new Set(prev);
        next.add(slot);
        return next;
      });
    },
    [featureId, revertField],
  );

  const handleUnrevert = useCallback(
    (slot: PerPlatformOverrideSlot): void => {
      unrevertField(featureId, slot);
      setRevertedSlots((prev) => {
        if (!prev.has(slot)) return prev;
        const next = new Set(prev);
        next.delete(slot);
        return next;
      });
    },
    [featureId, unrevertField],
  );

  // ── Revert affordances (Phase 8 / T061) ────────────────────────────
  // One control per override slot. Hidden when there's no override; the
  // widget enforces its own four-row state matrix internally.
  //
  // Staged edits overlay: prefer the staged value (US-3 AS-3) so that
  // when the analyst types a new override and then re-selects the same
  // feature, the revert button reflects the unsaved override they're
  // still in the middle of editing.
  const revertControls = useMemo(() => {
    return PER_PLATFORM_OVERRIDE_SLOTS.map((slot) => {
      const hasStaged =
        stagedFeatureEdits !== undefined && slot in stagedFeatureEdits;
      const stagedRaw = hasStaged
        ? (stagedFeatureEdits as Record<string, unknown>)[slot]
        : undefined;
      const raw = hasStaged ? stagedRaw : featureProps[slot];
      const effectiveValue =
        typeof raw === 'string' && raw.length > 0 ? raw : null;
      const hasOverride = effectiveValue !== null;
      const autoDerivedValue = resolveAutoDerived(feature, slot);
      const isReverted = revertedSlots.has(slot);
      return {
        slot,
        effectiveValue,
        autoDerivedValue,
        hasOverride,
        isReverted,
      };
    });
  }, [feature, featureProps, resolveAutoDerived, revertedSlots, stagedFeatureEdits]);

  // Any override slot is currently overridden? If not we don't render the
  // section header at all (keeps the editor compact when the feature has
  // no overrides yet).
  const anyOverride = revertControls.some((c) => c.hasOverride);

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
      {anyOverride && (
        <section
          data-testid="properties-mode-feature-reverts"
          aria-label="Revert overrides"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            paddingTop: 6,
            borderTop: '1px solid var(--vscode-panel-border, transparent)',
          }}
        >
          {revertControls.map((c) =>
            c.hasOverride ? (
              <div
                key={c.slot}
                data-testid={`properties-revert-row-${c.slot}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  color: 'var(--vscode-descriptionForeground, #bbb)',
                }}
              >
                <span>{c.slot}</span>
                <RevertControl
                  slot={c.slot satisfies RevertControlSlot}
                  effectiveValue={c.effectiveValue}
                  autoDerivedValue={c.autoDerivedValue}
                  hasOverride={c.hasOverride}
                  isReverted={c.isReverted}
                  onRevert={() => handleRevert(c.slot)}
                  onUnrevert={() => handleUnrevert(c.slot)}
                />
              </div>
            ) : null,
          )}
        </section>
      )}
    </div>
  );
}

// ─── Default platform-registry resolver ────────────────────────────────
//
// Reads `feature.properties.platform_id` and resolves the auto-derived
// value for the given slot via the inline registry mirror. Returns null
// when the platform id is unknown, missing, or when the resolved record
// has no value for the requested slot.
function defaultResolveAutoDerivedValue(
  feature: DebriefFeature,
  slot: PerPlatformOverrideSlot,
): string | null {
  // eslint-disable-next-line no-restricted-syntax -- structural read at the editor boundary
  const props = feature.properties as unknown as Record<string, unknown>;
  const platformId =
    typeof props['platform_id'] === 'string'
      ? (props['platform_id'] as string)
      : undefined;
  const resolved = resolvePlatform(platformId);
  if (!resolved) return null;
  const value = resolved[slot];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export default FeatureEditorMode;
