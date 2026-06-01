/**
 * Single source of truth for which `item.properties` fields are auto-derived
 * by `stacService.updateTemporalMetadata` (and any future #135 derivation).
 *
 * Imported by both the extension-side service (skip logic) and the webview
 * form (chip logic) to keep the two halves in sync.
 */
export declare const AUTO_DERIVED_FIELDS: readonly ["start_datetime", "end_datetime", "datetime"];
export type AutoDerivedField = (typeof AUTO_DERIVED_FIELDS)[number];
export declare function isAutoDerivedField(key: string): key is AutoDerivedField;
//# sourceMappingURL=autoDerivedFields.d.ts.map