/**
 * Format Service Contract — Feature 097: Feature Format Menu
 *
 * Defines the interface for applying style changes to features
 * and recording them in the provenance log.
 */

// ─── Style Property Descriptors ────────────────────────────────────

export type ValueType = 'color' | 'number' | 'shape' | 'dashPattern';
export type PropertyCategory = 'line' | 'fill' | 'point' | 'stroke';

export interface PresetValue {
  /** Unique identifier within the property */
  readonly id: string;
  /** Display label (I18N key) */
  readonly label: string;
  /** The actual style value to apply */
  readonly value: string | number;
  /** CSS colour for visual indicator (colour presets only) */
  readonly swatch?: string;
}

export interface StylePropertyDescriptor {
  /** Dot-path to property within properties.style (e.g., "line.color") */
  readonly id: string;
  /** I18N key for display label */
  readonly label: string;
  /** Grouping category */
  readonly category: PropertyCategory;
  /** Value type determines which preset list and menu rendering */
  readonly valueType: ValueType;
  /** Ordered list of selectable values */
  readonly presets: readonly PresetValue[];
}

// ─── Cascading Menu Items ──────────────────────────────────────────

export interface CascadingMenuItem {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  /** Colour swatch for colour items */
  readonly swatch?: string;
  /** Greyed out when inapplicable in batch mode */
  readonly disabled?: boolean;
  /** Tooltip explaining why disabled */
  readonly disabledReason?: string;
  /** Child items (undefined = leaf / selectable item) */
  readonly submenu?: readonly CascadingMenuItem[];
}

// ─── Format Service Interface ──────────────────────────────────────

export interface FormatChangeRequest {
  /** Feature IDs to apply the change to */
  readonly featureIds: readonly string[];
  /** Dot-path of the style property being changed */
  readonly property: string;
  /** The new value to apply */
  readonly newValue: string | number | boolean;
  /** Whether this targets a position override (not track-level) */
  readonly isPointOverride?: boolean;
  /** If isPointOverride, the position array index */
  readonly positionIndex?: number;
}

export interface FormatChangeResult {
  /** Provenance activity ID (shared across batch) */
  readonly activityId: string;
  /** Number of features updated */
  readonly featuresUpdated: number;
  /** Previous values per feature ID */
  readonly previousValues: Record<string, unknown>;
}

export interface FormatService {
  /**
   * Apply a style change to one or more features.
   * Mutates in-memory feature styles, records provenance, and persists to STAC.
   */
  applyStyleChange(request: FormatChangeRequest): Promise<FormatChangeResult>;

  /**
   * Get the list of editable style properties for a given feature kind.
   * Returns an ordered list of property descriptors with presets.
   */
  getEditableProperties(featureKind: string): readonly StylePropertyDescriptor[];

  /**
   * Build cascading menu items for a set of feature kinds.
   * When multiple kinds are provided (batch mode), inapplicable
   * properties are included but marked as disabled.
   */
  buildMenuItems(featureKinds: readonly string[]): readonly CascadingMenuItem[];

  /**
   * Read the current value of a style property from a feature.
   * Used to highlight the current value in the menu.
   */
  getCurrentValue(featureId: string, property: string): unknown;
}

// ─── Cascading Menu Component Props ────────────────────────────────

export interface CascadingMenuProps {
  /** Top-level menu items (may contain submenus) */
  readonly items: readonly CascadingMenuItem[];
  /** Anchor position for the menu */
  readonly anchorPosition: { x: number; y: number };
  /** Optional header text */
  readonly header?: string;
  /** Called when a leaf item is selected */
  readonly onSelect: (itemId: string) => void;
  /** Called when the menu is dismissed (click outside or Escape) */
  readonly onDismiss: () => void;
}

// ─── Format Menu Component Props ───────────────────────────────────

export interface FormatMenuProps {
  /** IDs of features being formatted */
  readonly featureIds: readonly string[];
  /** Kinds of features in the selection (for property mapping) */
  readonly featureKinds: readonly string[];
  /** Anchor position for the menu popup */
  readonly anchorPosition: { x: number; y: number };
  /** Called when a format change is applied */
  readonly onFormatApplied: (result: FormatChangeResult) => void;
  /** Called when the menu is dismissed */
  readonly onDismiss: () => void;
}
