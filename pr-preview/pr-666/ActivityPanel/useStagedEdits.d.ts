import { DebriefFeature, TrackProperties, VertexMetadata } from '../../../schemas/src/generated/typescript/index.ts';

/**
 * Mutable per-vertex slots — derived from the generated VertexMetadata.
 * `path` is the identity slot, not editable.
 */
export type VertexEditableProperties = Pick<VertexMetadata, 'label' | 'tags' | 'note'>;
/**
 * Analyst-editable slots on a feature. Derived from `TrackProperties`
 * (the richest concrete subclass) using `Pick<>` per Article IV.5 — never
 * re-list field names. The six override slots are documented in
 * `tasks.md` T061 and `contracts/revert-action.md`; `tags` is the
 * inherited `BaseFeatureProperties.tags` slot, also analyst-editable.
 *
 * If a future slot is added to TrackProperties and should be editable,
 * extend the `Pick<>` set here — do NOT duplicate the field list elsewhere.
 */
export type FeatureEditableProperties = Pick<TrackProperties, 'display_name' | 'nationality' | 'vessel_class' | 'vessel_type' | 'vessel_role' | 'domain' | 'tags'>;
export type FieldKey = keyof FeatureEditableProperties;
/**
 * TODO: tighten to derived type when STAC item properties are typed
 * (spec #192 T019). For now, the staging hook holds the partial in
 * untyped form — this hook does not own plot persistence.
 */
export type PlotEditableProperties = Record<string, unknown>;
export interface StagedEdits {
    plot?: Partial<PlotEditableProperties>;
    byFeature: Record<string, Partial<FeatureEditableProperties>>;
    byVertex: Record<string, Record<string, Partial<VertexEditableProperties>>>;
    revertedFields: Record<string, Set<FieldKey>>;
}
export interface ProvenancePath {
    path: string;
    op: 'set' | 'revert';
}
/**
 * The flush function operates on the schema-generated DebriefFeature
 * union (TrackFeature | ReferenceLocation | MultiPointFeature | …).
 * Re-exported as `FeatureForEdit` for clarity at call sites; this is
 * deliberately not a re-typed local alias.
 */
export type FeatureForEdit = DebriefFeature;
export interface UseStagedEditsApi {
    state: StagedEdits;
    isDirty: () => boolean;
    setFeatureField: (featureId: string, slot: FieldKey, next: unknown, current: unknown) => void;
    setVertexField: (featureId: string, path: string, slot: keyof VertexEditableProperties, next: unknown, current: unknown) => void;
    revertField: (featureId: string, slot: FieldKey) => void;
    unrevertField: (featureId: string, slot: FieldKey) => void;
    applyEditsToFeatures: (features: FeatureForEdit[]) => {
        nextFeatures: FeatureForEdit[];
        editedPaths: ProvenancePath[];
    };
    clearAll: () => void;
}
export declare function useStagedEdits(): UseStagedEditsApi;
//# sourceMappingURL=useStagedEdits.d.ts.map