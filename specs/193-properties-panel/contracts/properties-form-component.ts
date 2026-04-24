/**
 * Contract: the schema-driven <PropertiesForm> React component that both
 * surfaces (ActivityPanel and StacBrowser) render, plus the new
 * BrowserSelectionContext used to wire the StacBrowser surface.
 *
 * Implementation locations:
 *   shared/components/src/PropertiesPanel/PropertiesForm.tsx
 *   shared/components/src/PropertiesPanel/schemaResolver.ts
 *   shared/components/src/PropertiesPanel/ArrayWidget.tsx
 *   shared/components/src/PropertiesPanel/DateTimeWidget.tsx
 *   shared/components/src/PropertiesPanel/BboxWidget.tsx
 *   shared/components/src/PropertiesPanel/PlatformArrayWidget.tsx
 *   shared/components/src/StacBrowser/BrowserSelectionContext.tsx
 *
 * Existing widget reused (scalars only): ParameterEditor.
 *
 * Decision references:
 *   - Decision 5:  schema-driven render; sibling widgets for non-scalar types
 *   - Decision 6:  commit on blur or Enter (scalar), explicit add/remove (array)
 *   - Decision 4a: BrowserSelection is a surface-local React context
 */

import type { ReactNode } from 'react';

export type FieldKey = string;
export type FieldValue = unknown;

/** What chip (if any) to render next to a field's label. */
export type FieldDerivationState = 'auto-derived' | 'override' | 'user';

export interface PropertiesFormField {
  key: FieldKey;
  /** Human-readable label — derived from LinkML `title` annotation or falls back to the key. */
  label: string;
  /** Current value read from item.json (hydrated on mount and after each successful commit). */
  value: FieldValue;
  /** Widget-shaping spec derived from the LinkML-generated JSON Schema entry for this field. */
  spec: FieldSpec;
  /** Which chip to render. Derived from AUTO_DERIVED_FIELDS and item.properties["debrief:overrides"]. */
  derivation: FieldDerivationState;
  /** Whether the field is required by the schema (inline asterisk + blocks commit). */
  required: boolean;
  /** Inline validation error to render next to the widget, or null when valid. */
  error: string | null;
}

export type FieldSpec =
  | { kind: 'string'; maxLength?: number; pattern?: string }
  | { kind: 'number'; min?: number; max?: number; integer?: boolean }
  | { kind: 'boolean' }
  | { kind: 'enum'; allowedValues: string[] }
  | { kind: 'duration' }
  | { kind: 'datetime' }
  | { kind: 'bbox' /* array[4] of number */ }
  | { kind: 'string-array'; itemEnum?: string[]; maxItems?: number }
  | { kind: 'platform-array' }
  /** Fallback for unknown schema shapes — rendered as disabled + tooltip. */
  | { kind: 'unsupported'; reason: string };

export interface PropertiesFormProps {
  /** Fields to render, in display order. Caller precomputes from the JSON Schema. */
  fields: PropertiesFormField[];
  /**
   * Called when the user commits an edit to a single field (blur/Enter for
   * scalars; explicit add/remove for arrays).
   *
   * For both surfaces this posts a `properties:commit` message to the
   * extension. The component does NOT wait for the disk write to complete
   * before rendering the new value optimistically — but MUST roll back if the
   * extension replies with an error (schema validation, stale-edit, etc.).
   */
  onCommitField: (key: FieldKey, value: FieldValue) => void;
  /** Whether the form is in the Loading State (schema or current values still loading). */
  loading: boolean;
  /** Whether the item.json is read-only (disables all inputs, shows banner). */
  readOnly: boolean;
  /**
   * Optional error banner surfacing a write failure after a commit (stale-edit,
   * schema violation at merge time, read-only disk). Renders above the field
   * list. Cleared on next successful commit.
   */
  writeError: string | null;
}

/**
 * Schema-to-spec resolver contract. Given a LinkML-generated JSON Schema
 * entry for a single property, produce a FieldSpec.
 *
 * This is the extension point referenced by FR-003 and SC-003 — adding a new
 * LinkML type MUST NOT require changes to PropertiesForm.tsx itself, only
 * to this resolver and (if a new widget is needed) a sibling widget file.
 */
export interface SchemaResolverContract {
  resolveFieldSpec(jsonSchemaProperty: unknown, key: FieldKey): FieldSpec;
}

// ============================================================================
// BrowserSelection context (StacBrowser surface only)
// ============================================================================

export interface BrowserSelection {
  /** Relative path (from storePath) of the currently highlighted item, or null. */
  selectedItemPath: string | null;
  setSelectedItemPath: (path: string | null) => void;
}

export interface BrowserSelectionProviderProps {
  children: ReactNode;
  /** Optional initial selection (e.g. restored from session/workspace state). */
  initialSelectedItemPath?: string | null;
}

/**
 * MUST be a React.createContext<BrowserSelection | null>(null) at
 * implementation time. Consumers use a small useBrowserSelection() hook that
 * throws if the context is missing (caller forgot the provider). Context
 * lives inside the StacBrowser component tree — NOT in the global Zustand
 * store. That distinction is the whole point of FR-007.
 */
export interface BrowserSelectionContextModule {
  Provider: React.ComponentType<BrowserSelectionProviderProps>;
  useBrowserSelection(): BrowserSelection;
}
