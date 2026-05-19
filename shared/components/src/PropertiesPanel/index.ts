/**
 * PropertiesPanel — schema-driven metadata editor for STAC items.
 *
 * Barrel: exports the form, sibling widgets, schema resolver, and the
 * canonical contract types.
 */

export { PropertiesForm } from './PropertiesForm';
export { default as PropertiesFormDefault } from './PropertiesForm';
export { resolveFieldSpec } from './schemaResolver';
export { ArrayWidget } from './ArrayWidget';
export { BboxWidget } from './BboxWidget';
export { DateTimeWidget } from './DateTimeWidget';
export { PlatformArrayWidget } from './PlatformArrayWidget';
export { RevertControl } from './revertControl';
export type { RevertControlProps, RevertControlSlot } from './revertControl';

// Spec 192 — Phase 2: dispatcher + shells + banner + save-path glue.
export { PropertiesPanelDispatch } from './PropertiesPanelDispatch';
export type { PropertiesPanelDispatchProps } from './PropertiesPanelDispatch';
export { ReadOnlyBanner } from './readOnlyBanner';
export type { ReadOnlyBannerProps } from './readOnlyBanner';
export { FeatureEditorMode } from './modes/FeatureEditorMode';
export type { FeatureEditorModeProps } from './modes/FeatureEditorMode';
export { SubFeatureEditorMode } from './modes/SubFeatureEditorMode';
export type { SubFeatureEditorModeProps } from './modes/SubFeatureEditorMode';
export { MultiSelectSummaryMode } from './modes/MultiSelectSummaryMode';
export type { MultiSelectSummaryModeProps } from './modes/MultiSelectSummaryMode';
export { resolveEditingMode } from './selectionMode';
export type { EditingMode, Feature as EditingModeFeature } from './selectionMode';
export {
  saveStagedEdits,
} from './saveStagedEdits';
export type {
  SaveStagedEditsInput,
  SaveStagedEditsResult,
  SaveWriter,
  AppendProvenanceFn,
  ProvenanceInputPath,
} from './saveStagedEdits';

export type {
  FieldKey,
  FieldValue,
  FieldSpec,
  FieldDerivationState,
  PropertiesFormField,
  PropertiesFormProps,
} from './types';

export { AUTO_DERIVED_FIELDS, isAutoDerivedField } from './autoDerivedFields';
export type { AutoDerivedField } from './autoDerivedFields';
export type {
  PropertiesCommitMessage,
  PropertiesCommittedMessage,
  PropertiesErrorMessage,
  PropertiesPanelMessage,
} from './messageTypes';
export {
  PROPERTIES_PANEL_TOOL_SENTINEL,
  PROVENANCE_LOG_CAP,
  PROVENANCE_LOG_ARCHIVE_FILENAME,
  isValidPropertiesProvenanceEntry,
} from './provenanceTypes';
export type { PropertiesProvenanceEntry } from './provenanceTypes';
