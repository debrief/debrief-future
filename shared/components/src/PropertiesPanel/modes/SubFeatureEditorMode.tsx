/**
 * SubFeatureEditorMode — body for editing a single vertex / sub-feature.
 *
 * Phase 4 (T033) shipped track-point support (`positions/N`).
 * Phase 9 (T067-T070, US-7) generalises this component to the four
 * annotation-geometry path shapes:
 *
 *   - Polygon    `rings/R/vertices/V`
 *   - LineString `vertices/V`
 *   - MultiPoint `vertices/V`
 *   - Point      `vertex/0`
 *
 * Per spec FR-026 the form body is identical across geometries — only
 * the header label format changes (the geometry-aware label formatter
 * lives in `formatVertexHeader`). The structured `path` string is always
 * present on the mode container via `data-path` so downstream provenance
 * never needs to reparse the header to discover the saved vertex address.
 *
 * Responsibilities:
 *   1. Parse the supplied path via `parsePath` to extract the vertex
 *      address (geometry kind + index).
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
 * Article IV.5 (boundary types are derived, not rewritten): props re-use
 * the schema-generated `DebriefFeature`, `VertexMetadata`, and the
 * `useStagedEdits` hook's exported callback shape. The hook itself
 * exports `VertexEditableProperties = Pick<VertexMetadata, 'label' |
 * 'tags' | 'note'>` — we never re-list the editable field names.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { DebriefFeature, VertexMetadata } from '@debrief/schemas';
import { parsePath } from '@debrief/session-state/browser';
import type {
  UseStagedEditsApi,
  VertexEditableProperties,
} from '../../ActivityPanel/useStagedEdits';
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
  /**
   * Staged (uncommitted) vertex edits for this (featureId, path) cell,
   * overlaid on top of the resolved `vertex_metadata` entry for display
   * purposes (US-3 AS-3 hydration on re-selection). Sparse — only slots
   * the analyst has touched are present.
   */
  stagedVertexEdits?: Partial<VertexEditableProperties>;
}

// ─── Path → vertex index parsing ──────────────────────────────────────

interface ParsedVertexAddress {
  /** Where in the feature's geometry the vertex lives — used for the
   *  out-of-range bounds check. Track-point paths set kind === 'positions'. */
  kind: 'positions' | 'vertices' | 'rings' | 'vertex' | 'unknown';
  /** The leaf vertex index (e.g. the `N` in `positions/N`). For
   *  `rings/R/vertices/V` this is `V`; for `vertex/0` this is `0`. */
  vertexIndex: number | null;
  /** The ring index for `rings/R/vertices/V`. `null` for other shapes. */
  ringIndex: number | null;
}

function parseVertexAddress(path: string): ParsedVertexAddress {
  try {
    const parsed = parsePath(`anchor/${path}`);
    // We synthesise a fake root so `parsePath` accepts the leading
    // level/address pair. The real root is the feature.id supplied
    // elsewhere; this parser only cares about the level breakdown.
    const head = parsed.levels[0];
    if (!head) return { kind: 'unknown', vertexIndex: null, ringIndex: null };
    if (head.levelName === 'positions') {
      const n = Number.parseInt(head.address, 10);
      return {
        kind: 'positions',
        vertexIndex: Number.isInteger(n) && n >= 0 ? n : null,
        ringIndex: null,
      };
    }
    if (head.levelName === 'rings') {
      const r = Number.parseInt(head.address, 10);
      const next = parsed.levels[1];
      if (!next || next.levelName !== 'vertices') {
        return {
          kind: 'rings',
          vertexIndex: null,
          ringIndex: Number.isInteger(r) && r >= 0 ? r : null,
        };
      }
      const n = Number.parseInt(next.address, 10);
      return {
        kind: 'rings',
        vertexIndex: Number.isInteger(n) && n >= 0 ? n : null,
        ringIndex: Number.isInteger(r) && r >= 0 ? r : null,
      };
    }
    if (head.levelName === 'vertices') {
      const n = Number.parseInt(head.address, 10);
      return {
        kind: 'vertices',
        vertexIndex: Number.isInteger(n) && n >= 0 ? n : null,
        ringIndex: null,
      };
    }
    if (head.levelName === 'vertex') {
      const n = Number.parseInt(head.address, 10);
      return {
        kind: 'vertex',
        vertexIndex: Number.isInteger(n) && n >= 0 ? n : null,
        ringIndex: null,
      };
    }
    return { kind: 'unknown', vertexIndex: null, ringIndex: null };
  } catch {
    return { kind: 'unknown', vertexIndex: null, ringIndex: null };
  }
}

// ─── Geometry-aware header label formatter (US-7) ─────────────────────

/**
 * Build the human-readable vertex identifier rendered in the sub-feature
 * mode header per the spec UI Flow "Sub-feature State":
 *
 *   - Track       (`positions/N`)             → "positions/N"     ← Phase 4 backwards-compat
 *   - Polygon     (`rings/R/vertices/V`)      → "Ring R, Vertex V"
 *   - LineString  (`vertices/V`)              → "Vertex V"
 *   - MultiPoint  (`vertices/V`)              → "Vertex V"
 *   - Point       (`vertex/0`)                → "Vertex"          (single-vertex; no index)
 *
 * Track keeps the raw `positions/N` literal so the Phase 4 contract
 * (and the existing Vitest assertions on that header) is undisturbed.
 * The structured path itself is always present on the mode container's
 * `data-path` attribute regardless of the rendered label.
 */
function formatVertexHeader(parsed: ParsedVertexAddress, rawPath: string): string {
  switch (parsed.kind) {
    case 'positions':
      // Phase 4 backwards-compat: keep the literal path form. The spec
      // UI Flow allows "Point N" too; the Vitest-asserted format is the
      // literal, and changing it would break the existing track tests.
      return rawPath;
    case 'rings':
      if (parsed.ringIndex !== null && parsed.vertexIndex !== null) {
        return `Ring ${parsed.ringIndex}, Vertex ${parsed.vertexIndex}`;
      }
      return rawPath;
    case 'vertices':
      if (parsed.vertexIndex !== null) {
        return `Vertex ${parsed.vertexIndex}`;
      }
      return rawPath;
    case 'vertex':
      // Single-vertex geometry (Point). Per FR-028, the editor's behaviour
      // is consistent with multi-vertex features but the header omits the
      // index since there's only ever one vertex to address.
      return 'Vertex';
    case 'unknown':
    default:
      return rawPath;
  }
}

// ─── In-range check (per-geometry; Phase 9 generalisation) ────────────

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

interface MinimalGeometry {
  type?: unknown;
  coordinates?: unknown;
}

function getGeometry(feature: DebriefFeature): MinimalGeometry | null {
  // eslint-disable-next-line no-restricted-syntax
  const geom = (feature as { geometry?: unknown }).geometry;
  if (geom === undefined || geom === null) return null;
  if (typeof geom !== 'object') return null;
  return geom as MinimalGeometry;
}

/**
 * Geometry-aware bounds check.
 *
 *   - Track:     `properties.positions[index]` must exist
 *   - Polygon:   `geometry.coordinates[ringIndex][vertexIndex]` must exist
 *   - LineString / MultiPoint: `geometry.coordinates[vertexIndex]` must exist
 *   - Point:     `geometry.coordinates` must be a non-empty tuple AND
 *                vertexIndex must be 0
 *
 * Mirrors the resolver's `checkVertexPathInRange` (`selectionMode.ts`).
 * The resolver vets paths before the dispatcher routes them here, so in
 * production this defensive check rarely fires — it exists for Vitest
 * (which renders the component directly with synthetic paths) and for
 * any future surface that bypasses the resolver.
 */
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
  if (parsed.kind === 'vertices') {
    const geom = getGeometry(feature);
    if (geom === null) return false;
    const coords = geom.coordinates;
    if (!Array.isArray(coords)) return false;
    return parsed.vertexIndex < coords.length;
  }
  if (parsed.kind === 'vertex') {
    // Point: only `vertex/0` is valid, and the geometry must be a Point
    // with a non-empty coordinates tuple.
    if (parsed.vertexIndex !== 0) return false;
    const geom = getGeometry(feature);
    if (geom === null) return false;
    const coords = geom.coordinates;
    return Array.isArray(coords) && coords.length > 0;
  }
  if (parsed.kind === 'rings') {
    if (parsed.ringIndex === null) return false;
    const geom = getGeometry(feature);
    if (geom === null) return false;
    const rings = geom.coordinates;
    if (!Array.isArray(rings)) return false;
    if (parsed.ringIndex >= rings.length) return false;
    const ring = rings[parsed.ringIndex];
    if (!Array.isArray(ring)) return false;
    return parsed.vertexIndex < ring.length;
  }
  return false;
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
  const { feature, path, readOnly, setVertexField, stagedVertexEdits } = props;
  const parentName = getFeatureLabel(feature);
  const featureId = String(feature.id);

  // Memoised O(1) lookup — built once per feature reference change.
  const byPath = useVertexMetadataLookup(feature);
  const existing = byPath.get(path);

  // Bounds check — geometry-aware (Phase 9 generalisation). Track points,
  // polygon ring vertices, linestring/multipoint vertices, and a Point's
  // single vertex all funnel through `isInRange`.
  const parsed = useMemo(() => parseVertexAddress(path), [path]);
  const inRange = useMemo(() => isInRange(feature, parsed), [feature, parsed]);
  const headerLabel = useMemo(() => formatVertexHeader(parsed, path), [parsed, path]);

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
          {parentName} — {headerLabel}
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
      headerLabel={headerLabel}
      readOnly={readOnly}
      setVertexField={setVertexField}
      existing={existing}
      stagedVertexEdits={stagedVertexEdits}
    />
  );
}

interface BodyProps {
  feature: DebriefFeature;
  featureId: string;
  parentName: string;
  path: string;
  headerLabel: string;
  readOnly: boolean;
  setVertexField: UseStagedEditsApi['setVertexField'];
  existing: VertexMetadata | undefined;
  stagedVertexEdits: Partial<VertexEditableProperties> | undefined;
}

function SubFeatureEditorBody(p: BodyProps): React.ReactElement {
  const {
    featureId,
    parentName,
    path,
    headerLabel,
    readOnly,
    setVertexField,
    existing,
    stagedVertexEdits,
  } = p;

  // Local edit-state — drives the input visuals between commits. The
  // staging hook owns the *committed* value; the form's local state
  // gives the analyst a typing experience that doesn't ping-pong through
  // the dispatch on every keystroke.
  //
  // US-3 AS-3 hydration: prefer the staged (uncommitted) value over the
  // resolved `vertex_metadata` entry so that re-selecting the same
  // (featureId, path) cell after typing — without saving — shows the
  // in-flight value in the inputs. `stagedVertexEdits` is sparse: only
  // touched slots are present.
  const stagedLabel =
    stagedVertexEdits && 'label' in stagedVertexEdits
      ? (stagedVertexEdits.label as string | undefined)
      : undefined;
  const stagedNote =
    stagedVertexEdits && 'note' in stagedVertexEdits
      ? (stagedVertexEdits.note as string | undefined)
      : undefined;
  const stagedTags =
    stagedVertexEdits && 'tags' in stagedVertexEdits
      ? (stagedVertexEdits.tags as readonly string[] | undefined)
      : undefined;

  const initialLabel = stagedLabel ?? existing?.label ?? '';
  const initialNote = stagedNote ?? existing?.note ?? '';
  const initialTags = stagedTags ?? existing?.tags ?? [];

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
        {parentName} — {headerLabel}
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
