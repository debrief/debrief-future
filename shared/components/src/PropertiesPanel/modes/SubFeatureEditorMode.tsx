/**
 * SubFeatureEditorMode — body for editing a single vertex / sub-feature
 * (Spec 192, Phase 4, T033 — track-point paths only).
 *
 * Responsibilities (track-point — `positions/N`):
 *   1. Parse the supplied path via `parsePath` to extract the vertex index.
 *   2. Resolve the matching `VertexMetadata` entry on the parent feature
 *      via a memoised `Map<path, VertexMetadata>` built once per feature
 *      change (data-model.md § 2.3 invariant 5 — O(1) lookup on read).
 *   3. Render `label` / `tags` / `note` inputs hydrated from that entry.
 *   4. Route every commit through `useStagedEdits.setVertexField(featureId,
 *      path, slot, next, current)` — the hook's prune-on-equality rule
 *      decides whether to keep or drop the staged entry.
 *
 * Out-of-range defensive branch:
 *   `resolveEditingMode` returns `{ kind: 'stale' }` for an out-of-range
 *   vertex path (see `contracts/selection-mode.md` row 2), which the
 *   dispatcher routes to plot mode. The form's out-of-range branch is
 *   therefore a defensive surface that fires only when the component is
 *   invoked with an out-of-range path directly (e.g., in tests or
 *   future surfaces that bypass the resolver). It renders an
 *   `properties-mode-subfeature-out-of-range` notice and disables all
 *   inputs so the buffer can't be polluted with a non-resolvable
 *   `(featureId, path)` key.
 *
 * Phase 9 (T067-T070) will extend this component to handle the three
 * annotation-geometry path shapes (Polygon `rings/R/vertices/V`,
 * LineString / MultiPoint `vertices/V`, Point `vertex/0`). The structure
 * here is laid out to make that extension a small additive change.
 *
 * Article IV.5 (boundary types are derived, not rewritten): props re-use
 * the schema-generated `DebriefFeature`, `VertexMetadata`, and the
 * `useStagedEdits` hook's exported callback shape. The hook itself
 * exports `VertexEditableProperties = Pick<VertexMetadata, 'label' |
 * 'tags' | 'note'>` — we never re-list the editable field names.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { DebriefFeature, VertexMetadata } from '@debrief/schemas';
import { parsePath } from '@debrief/session-state';
import type { UseStagedEditsApi } from '../../ActivityPanel/useStagedEdits';
import { getFeatureLabel } from '../../utils/labels';
import { ArrayWidget } from '../ArrayWidget';
import type { FieldSpec } from '../types';

export interface SubFeatureEditorModeProps {
  /** The parent feature carrying the vertex_metadata array. */
  feature: DebriefFeature;
  /** Selection path identifying the vertex (e.g. `positions/4`,
   *  `rings/0/vertices/3`, `vertices/2`, `vertex/0`). */
  path: string;
  /** True when the plot's storage is read-only — disables inputs. */
  readOnly: boolean;
  /** Staging buffer callback for vertex edits. */
  setVertexField: UseStagedEditsApi['setVertexField'];
}

// ─── Path → vertex index parsing ──────────────────────────────────────

interface ParsedVertexAddress {
  /** Where in the feature's geometry the vertex lives — used for the
   *  out-of-range bounds check. Track-point paths set kind === 'positions'. */
  kind: 'positions' | 'vertices' | 'rings' | 'vertex' | 'unknown';
  /** The leaf vertex index (e.g. the `N` in `positions/N`). For
   *  `rings/R/vertices/V` this is `V`; for `vertex/0` this is `0`. */
  vertexIndex: number | null;
}

function parseVertexAddress(path: string): ParsedVertexAddress {
  try {
    const parsed = parsePath(`anchor/${path}`);
    // We synthesise a fake root so `parsePath` accepts the leading
    // level/address pair. The real root is the feature.id supplied
    // elsewhere; this parser only cares about the level breakdown.
    const head = parsed.levels[0];
    if (!head) return { kind: 'unknown', vertexIndex: null };
    if (head.levelName === 'positions') {
      const n = Number.parseInt(head.address, 10);
      return { kind: 'positions', vertexIndex: Number.isInteger(n) && n >= 0 ? n : null };
    }
    if (head.levelName === 'rings') {
      const next = parsed.levels[1];
      if (!next || next.levelName !== 'vertices') {
        return { kind: 'rings', vertexIndex: null };
      }
      const n = Number.parseInt(next.address, 10);
      return { kind: 'rings', vertexIndex: Number.isInteger(n) && n >= 0 ? n : null };
    }
    if (head.levelName === 'vertices') {
      const n = Number.parseInt(head.address, 10);
      return { kind: 'vertices', vertexIndex: Number.isInteger(n) && n >= 0 ? n : null };
    }
    if (head.levelName === 'vertex') {
      const n = Number.parseInt(head.address, 10);
      return { kind: 'vertex', vertexIndex: Number.isInteger(n) && n >= 0 ? n : null };
    }
    return { kind: 'unknown', vertexIndex: null };
  } catch {
    return { kind: 'unknown', vertexIndex: null };
  }
}

// ─── In-range check (track-point only for Phase 4) ────────────────────

function trackPositionCount(feature: DebriefFeature): number | null {
  // eslint-disable-next-line no-restricted-syntax
  const props = (feature as { properties?: unknown }).properties as
    | Record<string, unknown>
    | undefined;
  if (!props) return null;
  const positions = props.positions;
  if (!Array.isArray(positions)) return null;
  return positions.length;
}

function isInRange(
  feature: DebriefFeature,
  parsed: ParsedVertexAddress,
): boolean {
  if (parsed.vertexIndex === null) return false;
  if (parsed.kind === 'positions') {
    const count = trackPositionCount(feature);
    if (count === null) return false;
    return parsed.vertexIndex < count;
  }
  // Phase 9 will extend bounds checks for rings / vertices / vertex.
  // For Phase 4 we accept the path as in-range when it isn't a
  // `positions/*` path — the dispatcher's resolver has already vetted
  // these in production; the form's bounds check exists solely to
  // catch the track-point out-of-range edge.
  return true;
}

// ─── vertex_metadata Map<path, entry> — memoised per feature ──────────

/**
 * Build a `Map<path, VertexMetadata>` lookup from the feature's
 * `vertex_metadata` array. Memoised on the array reference so the same
 * Map instance is reused for every render with the same feature — and
 * a vertex-by-path lookup is O(1) regardless of how many entries the
 * feature carries (data-model.md § 2.3 invariant 5).
 */
function useVertexMetadataLookup(
  feature: DebriefFeature,
): ReadonlyMap<string, VertexMetadata> {
  // eslint-disable-next-line no-restricted-syntax
  const vm = (feature.properties as unknown as { vertex_metadata?: VertexMetadata[] })
    .vertex_metadata;
  return useMemo(() => {
    const map = new Map<string, VertexMetadata>();
    if (Array.isArray(vm)) {
      for (const entry of vm) {
        if (entry && typeof entry.path === 'string') {
          map.set(entry.path, entry);
        }
      }
    }
    return map;
  }, [vm]);
}

// ─── Tags field spec (string-array, no enum, no max) ──────────────────

const TAGS_SPEC: Extract<FieldSpec, { kind: 'string-array' }> = {
  kind: 'string-array',
};

// ─── Component ────────────────────────────────────────────────────────

export function SubFeatureEditorMode(
  props: SubFeatureEditorModeProps,
): React.ReactElement {
  const { feature, path, readOnly, setVertexField } = props;
  const parentName = getFeatureLabel(feature);
  const featureId = String(feature.id);

  // Memoised O(1) lookup — built once per feature reference change.
  const byPath = useVertexMetadataLookup(feature);
  const existing = byPath.get(path);

  // Bounds check — Phase 4 only handles track-point paths; anything
  // else falls through to the "treat as in-range" branch (Phase 9 will
  // extend).
  const parsed = useMemo(() => parseVertexAddress(path), [path]);
  const inRange = useMemo(() => isInRange(feature, parsed), [feature, parsed]);

  // ── Out-of-range defensive branch ──────────────────────────────────
  if (!inRange) {
    return (
      <div
        data-testid="properties-mode-subfeature"
        data-path={path}
        aria-disabled="true"
        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        <header
          data-testid="properties-mode-subfeature-header"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--vscode-foreground, #ddd)',
            paddingBottom: 4,
            borderBottom: '1px solid var(--vscode-panel-border, transparent)',
          }}
        >
          {parentName} — {path}
        </header>
        <div
          data-testid="properties-mode-subfeature-out-of-range"
          role="alert"
          style={{
            fontSize: 11,
            color: 'var(--vscode-errorForeground, #c33)',
            fontStyle: 'italic',
            padding: '4px 0',
          }}
        >
          {`Vertex path "${path}" is out of range for this feature. ` +
            'Save is disabled until a valid vertex is selected.'}
        </div>
        {/* Defensive disabled inputs so the form is still recognisable but
            uneditable; matches the spec's "empty sub-feature form" rendering. */}
        <input
          type="text"
          data-testid="vertex-label-input"
          value=""
          disabled
          readOnly
          aria-label="Label"
          placeholder="Label"
        />
        <textarea
          data-testid="vertex-note-input"
          value=""
          disabled
          readOnly
          aria-label="Note"
          placeholder="Note"
        />
      </div>
    );
  }

  return (
    <SubFeatureEditorBody
      feature={feature}
      featureId={featureId}
      parentName={parentName}
      path={path}
      readOnly={readOnly}
      setVertexField={setVertexField}
      existing={existing}
    />
  );
}

interface BodyProps {
  feature: DebriefFeature;
  featureId: string;
  parentName: string;
  path: string;
  readOnly: boolean;
  setVertexField: UseStagedEditsApi['setVertexField'];
  existing: VertexMetadata | undefined;
}

function SubFeatureEditorBody(p: BodyProps): React.ReactElement {
  const { featureId, parentName, path, readOnly, setVertexField, existing } = p;

  // Local edit-state — drives the input visuals between commits. The
  // staging hook owns the *committed* value; the form's local state
  // gives the analyst a typing experience that doesn't ping-pong through
  // the dispatch on every keystroke.
  const initialLabel = existing?.label ?? '';
  const initialNote = existing?.note ?? '';
  const initialTags = existing?.tags ?? [];

  const [localLabel, setLocalLabel] = useState<string>(initialLabel);
  const [localNote, setLocalNote] = useState<string>(initialNote);

  // Re-hydrate the local edit state when the resolved entry changes
  // (i.e., switching paths on the same feature). React's effect-style
  // sync via key works too, but the cheaper path is to derive the
  // resync via a `useMemo` keyed on path: when path changes, the
  // initial values change, and we reset.
  React.useEffect(() => {
    setLocalLabel(initialLabel);
    setLocalNote(initialNote);
  }, [initialLabel, initialNote]);

  const handleLabelBlur = useCallback(() => {
    setVertexField(featureId, path, 'label', localLabel, initialLabel);
  }, [setVertexField, featureId, path, localLabel, initialLabel]);

  const handleNoteBlur = useCallback(() => {
    setVertexField(featureId, path, 'note', localNote, initialNote);
  }, [setVertexField, featureId, path, localNote, initialNote]);

  const handleTagsCommit = useCallback(
    (_name: string, next: unknown) => {
      setVertexField(featureId, path, 'tags', next, initialTags);
    },
    [setVertexField, featureId, path, initialTags],
  );

  return (
    <div
      data-testid="properties-mode-subfeature"
      data-path={path}
      aria-disabled={readOnly ? 'true' : undefined}
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <header
        data-testid="properties-mode-subfeature-header"
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--vscode-foreground, #ddd)',
          paddingBottom: 4,
          borderBottom: '1px solid var(--vscode-panel-border, transparent)',
        }}
      >
        {parentName} — {path}
      </header>

      <label
        style={{
          fontSize: 11,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <span style={{ color: 'var(--vscode-descriptionForeground, #888)' }}>Label</span>
        <input
          type="text"
          data-testid="vertex-label-input"
          value={localLabel}
          disabled={readOnly}
          onChange={(e) => setLocalLabel(e.target.value)}
          onBlur={handleLabelBlur}
          placeholder="Short label for this vertex"
          className="log-panel__param-editor-input-field"
        />
      </label>

      <div data-testid="vertex-tags-input">
        <span
          style={{
            fontSize: 11,
            color: 'var(--vscode-descriptionForeground, #888)',
            display: 'block',
            marginBottom: 2,
          }}
        >
          Tags
        </span>
        <ArrayWidget
          name="vertex-tags"
          value={initialTags}
          spec={TAGS_SPEC}
          onCommit={handleTagsCommit}
          disabled={readOnly}
        />
      </div>

      <label
        style={{
          fontSize: 11,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <span style={{ color: 'var(--vscode-descriptionForeground, #888)' }}>Note</span>
        <textarea
          data-testid="vertex-note-input"
          value={localNote}
          disabled={readOnly}
          onChange={(e) => setLocalNote(e.target.value)}
          onBlur={handleNoteBlur}
          placeholder="Free-text note"
          rows={3}
          className="log-panel__param-editor-input-field"
        />
      </label>
    </div>
  );
}

export default SubFeatureEditorMode;
