/**
 * Single source of truth for which `item.properties` fields are auto-derived
 * by `stacService.updateTemporalMetadata` (and any future #135 derivation).
 *
 * Imported by both the extension-side service (skip logic) and the webview
 * form (chip logic) to keep the two halves in sync.
 */

export const AUTO_DERIVED_FIELDS = Object.freeze([
  'start_datetime',
  'end_datetime',
  'datetime',
] as const);

export type AutoDerivedField = (typeof AUTO_DERIVED_FIELDS)[number];

export function isAutoDerivedField(key: string): key is AutoDerivedField {
  return (AUTO_DERIVED_FIELDS as readonly string[]).includes(key);
}
