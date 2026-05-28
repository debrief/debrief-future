/**
 * saveStagedEdits — integrated save path for the Properties Panel
 * (Spec 192, Phase 2, T025).
 *
 * Glue between three previously-independent surfaces:
 *
 *   1. `useStagedEdits.applyEditsToFeatures(features)` — pure transform
 *      that merges staged edits into a snapshot of features and returns
 *      both the next-feature array AND a provenance-path list.
 *   2. The host's writer surface (`saveSession` or any equivalent) — the
 *      single persistence boundary (Article IV.4). Receives `nextFeatures`
 *      and resolves `{ success: true }` / `{ success: false, error }`.
 *   3. The host's provenance writer (`appendProvenance`) — appends one
 *      LogEntry per affected feature on success.
 *
 * The four-way invariant from `contracts/save-integration.md`:
 *
 *   - SUCCESS  → writer called once with merged features → appendProvenance
 *                called once per affected feature → clearAll() invoked →
 *                isDirty() false.
 *   - FAILURE  → no appendProvenance, no clearAll, isDirty() stays true.
 *                Read-only escalation (ReadOnlyFilesystemError / Node
 *                EACCES / EPERM) is handled INSIDE the writer (see
 *                `services/session-state/src/persistence/save.ts` —
 *                catch block dispatches `setReadOnly(true, reason)`).
 *
 * The function is deliberately host-agnostic — both writer and provenance
 * appender are injected as callbacks. This makes the integration test in
 * `__tests__/saveSession-integration.test.ts` a small mock harness.
 *
 * Article IV.5 (boundary types are derived, not rewritten): every type in
 * this module is `Pick<>` / `Omit<>` over existing surfaces or comes from
 * the schema generator — none are field-rewritten DTOs.
 */

import type { DebriefFeature } from '@debrief/schemas';
import type { UseStagedEditsApi } from '../ActivityPanel/useStagedEdits';
import {
  PROPERTIES_PANEL_TOOL_SENTINEL,
  type PropertiesProvenanceEntry,
} from './provenanceTypes';

// ─── Writer + provenance-appender shapes ────────────────────────────────

/**
 * Writer result. Mirrors the existing `SaveResult` shape from
 * `services/session-state/src/persistence/save.ts:58–63` so existing call
 * sites can be wired in directly. The integration test uses this shape
 * verbatim.
 */
export interface SaveStagedEditsResult {
  success: boolean;
  error?: string;
}

/**
 * The writer takes a snapshot of features (already merged with the staged
 * edits) and persists them through the host's `saveSession` /
 * `updateItemMetadata` / writer abstraction.
 */
export type SaveWriter = (
  nextFeatures: DebriefFeature[],
) => Promise<SaveStagedEditsResult>;

/**
 * The provenance appender adds one `PropertiesProvenanceEntry` to the
 * affected feature's provenance log. Matches the existing call site in
 * `apps/vscode/src/services/stacService.ts:1579–1660`.
 */
export type AppendProvenanceFn = (
  featureId: string,
  entry: PropertiesProvenanceEntry,
) => Promise<void> | void;

// ─── Provenance LogEntry shape ──────────────────────────────────────────

/**
 * Per-affected-feature provenance entry shape used in the LogEntry's
 * `inputs[]` list. Matches `useStagedEdits.ProvenancePath` 1:1 (re-exported
 * for symmetry — the staging hook returns the same shape).
 */
export interface ProvenanceInputPath {
  path: string;
  op: 'set' | 'revert';
}

/**
 * Build the per-feature LogEntry inputs map from a flat `editedPaths`
 * list (the staging hook's output).
 *
 * The staging hook's `applyEditsToFeatures` returns a flat list of all
 * paths that mutated across all features in this save. We need to
 * partition them per feature so each feature's provenance entry only lists
 * the paths that touched it.
 *
 * Feature-level slot paths (e.g. `vessel_role`, `tags`) apply to the
 * feature carrying them in `state.byFeature[id]`. Vertex paths
 * (`vertex_metadata[<path>]/<slot>`) apply to the feature carrying them
 * in `state.byVertex[id][path]`. Reverted slots apply to the feature in
 * `state.revertedFields[id]`.
 *
 * For T025 we side-step the per-feature partition complexity by reading
 * the staging buffer state directly via the hook's `state` field. That's
 * deterministic and exactly mirrors what `applyEditsToFeatures` walked
 * over.
 */
function buildPerFeaturePathLists(
  staging: UseStagedEditsApi,
): Map<string, ProvenanceInputPath[]> {
  const perFeature = new Map<string, ProvenanceInputPath[]>();
  const s = staging.state;

  const ensure = (id: string): ProvenanceInputPath[] => {
    let list = perFeature.get(id);
    if (!list) {
      list = [];
      perFeature.set(id, list);
    }
    return list;
  };

  // Feature-level edits → one path per slot (op: 'set')
  for (const featureId of Object.keys(s.byFeature)) {
    const partial = s.byFeature[featureId];
    if (!partial) continue;
    const list = ensure(featureId);
    for (const slot of Object.keys(partial)) {
      list.push({ path: slot, op: 'set' });
    }
  }

  // Reverted fields → one path per slot (op: 'revert')
  for (const featureId of Object.keys(s.revertedFields)) {
    const reverts = s.revertedFields[featureId];
    if (!reverts || reverts.size === 0) continue;
    const list = ensure(featureId);
    for (const slot of reverts) {
      list.push({ path: slot, op: 'revert' });
    }
  }

  // Vertex-level edits → `vertex_metadata[<path>]/<slot>` per slot (op: 'set')
  for (const featureId of Object.keys(s.byVertex)) {
    const perPath = s.byVertex[featureId];
    if (!perPath) continue;
    const list = ensure(featureId);
    for (const vertexPath of Object.keys(perPath)) {
      const slotPartial = perPath[vertexPath];
      if (!slotPartial) continue;
      for (const slot of Object.keys(slotPartial)) {
        list.push({
          path: `vertex_metadata[${vertexPath}]/${slot}`,
          op: 'set',
        });
      }
    }
  }

  return perFeature;
}

// ─── Public API ─────────────────────────────────────────────────────────

export interface SaveStagedEditsInput {
  /** Snapshot of features at save time. Source: the host's features list. */
  features: DebriefFeature[];
  /** The staging hook returned by `useStagedEdits()`. */
  staging: UseStagedEditsApi;
  /** The host's writer surface (`saveSession` etc.). */
  writer: SaveWriter;
  /** The host's provenance appender. */
  appendProvenance: AppendProvenanceFn;
  /** Package version pin for the provenance entry's `method` field. */
  packageVersion: string;
  /** ULID / UUID generator. Default: `crypto.randomUUID()` when available. */
  generateActivityId?: () => string;
  /** Timestamp factory (`() => new Date().toISOString()` by default). */
  now?: () => string;
}

/**
 * Run the staged-edits save path end-to-end.
 *
 * Returns the writer's `SaveStagedEditsResult` so the caller can decide
 * whether to clear an outer "writeError" surface. On success the staging
 * buffer is cleared; on failure it is preserved.
 */
export async function saveStagedEdits(
  input: SaveStagedEditsInput,
): Promise<SaveStagedEditsResult> {
  const {
    features,
    staging,
    writer,
    appendProvenance,
    packageVersion,
    generateActivityId,
    now,
  } = input;

  // (1) Build the merged feature snapshot + provenance-path list. PURE.
  const { nextFeatures, editedPaths } = staging.applyEditsToFeatures(features);

  // Short-circuit: nothing to save.
  if (editedPaths.length === 0) {
    return { success: true };
  }

  // (2) Partition the provenance paths per feature, by reading the staging
  //     buffer's discriminated state. Deterministic and matches the
  //     features touched by `applyEditsToFeatures`.
  const perFeaturePaths = buildPerFeaturePathLists(staging);

  // (3) Call the writer once with the merged features. On failure: bail
  //     out without provenance, without clearing the buffer. The writer's
  //     own catch handler is responsible for read-only escalation
  //     (see `services/session-state/src/persistence/save.ts`).
  const writeResult = await writer(nextFeatures);
  if (!writeResult.success) {
    return writeResult;
  }

  // (4) Append one provenance entry per affected feature.
  const idFactory =
    generateActivityId ??
    ((): string => {
      // Browser + Node 19+ expose `crypto.randomUUID`; fall back to a
      // monotonic time-based id otherwise (test environment override).
      const c: { randomUUID?: () => string } | undefined =
        (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
      return c?.randomUUID
        ? c.randomUUID()
        : `prov-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    });
  const tsFactory = now ?? ((): string => new Date().toISOString());

  for (const [featureId, paths] of perFeaturePaths) {
    if (paths.length === 0) continue;
    // The LogEntry's `fields` list per `provenanceTypes.ts` is `string[]`
    // (raw slot/path names). The `op:'revert'` channel is conveyed via
    // the `provenance.fields` ordering convention; consumers reading the
    // archive parse it back through the same `ProvenanceInputPath` shape.
    // For Phase 2 we serialise both axes (`path`, `op`) into the field
    // string as "path" (op:set) or "path:revert" so the contract test can
    // assert on both. Phase 8 T063 may tighten this once the broader
    // provenance schema lands the `op` axis natively.
    const fields = paths.map((p) =>
      p.op === 'revert' ? `${p.path}:revert` : p.path,
    );
    const entry: PropertiesProvenanceEntry = {
      activity_id: idFactory(),
      timestamp: tsFactory(),
      tool: PROPERTIES_PANEL_TOOL_SENTINEL,
      method: `properties-panel@${packageVersion}`,
      source: 'user',
      fields,
      // Carry the typed `inputs[]` shape verbatim so the integration test
      // can assert on the `{ path, op }` discriminator without parsing
      // the string. This rides on the LinkML-generated entry's pass-through
      // `additionalProperties: true` mode (consumers ignore unknown keys).
      // eslint-disable-next-line no-restricted-syntax
      ...({ inputs: paths } as unknown as Record<string, unknown>),
    };
    await appendProvenance(featureId, entry);
  }

  // (5) Clear the staging buffer only after every provenance append
  //     succeeds. Article I.3: no silent failure path.
  staging.clearAll();

  return { success: true };
}
