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
export type { FieldKey, FieldValue, FieldSpec, FieldDerivationState, PropertiesFormField, PropertiesFormProps, } from './types';
export { AUTO_DERIVED_FIELDS, isAutoDerivedField } from './autoDerivedFields';
export type { AutoDerivedField } from './autoDerivedFields';
export type { PropertiesCommitMessage, PropertiesCommittedMessage, PropertiesErrorMessage, PropertiesPanelMessage, } from './messageTypes';
export { PROPERTIES_PANEL_TOOL_SENTINEL, PROVENANCE_LOG_CAP, PROVENANCE_LOG_ARCHIVE_FILENAME, isValidPropertiesProvenanceEntry, } from './provenanceTypes';
export type { PropertiesProvenanceEntry } from './provenanceTypes';
//# sourceMappingURL=index.d.ts.map