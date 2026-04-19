/**
 * Contract types for the Rich Card UX redesign.
 *
 * These are the NEW or MODIFIED types introduced by Feature 176.
 * Existing types (TimelineEntry, ParameterValue, etc.) are not repeated here.
 *
 * Feature: 176-log-panel-ux
 */

// ─── Tool Category ──────────────────────────────────────────────────────

/** Visual tool family classification. Declared in tool manifest. */
export type ToolCategory = 'import' | 'style' | 'calc' | 'filter' | 'snapshot';

/**
 * Visual configuration for a tool category icon.
 *
 * `category` is nullable to represent the neutral-grey fallback for tools
 * that have no manifest entry.
 */
export interface ToolCategoryConfig {
  readonly category: ToolCategory | null;
  /** CSS background colour for the icon square. */
  readonly background: string;
  /** Emoji or codicon glyph displayed in the icon square. */
  readonly glyph: string;
  /** Localised display name for the category. */
  readonly label: string;
}

/** Complete category configuration map. */
export type ToolCategoryMap = Record<ToolCategory, ToolCategoryConfig>;

// ─── Parameter Chip Types ───────────────────────────────────────────────

/** Inferred or declared parameter display type. */
export type ParamType = 'colour' | 'number' | 'boolean' | 'range' | 'enum';

/** Resolved parameter display information for a single chip. */
export interface ParamChipData {
  /** Parameter name used as chip label. */
  readonly label: string;
  /** Raw parameter value. */
  readonly value: unknown;
  /** Resolved display type (null = fallback to plain text). */
  readonly paramType: ParamType | null;
  /** Whether the value is non-default (shows red dot marker). */
  readonly isNonDefault: boolean;
  /** Formatted display string for the chip value. */
  readonly displayValue: string;
  /** Icon prefix character(s) for the chip. Empty string if no icon. */
  readonly iconPrefix: string;
}

// ─── View Mode (replaces ViewMode + PresentationMode) ───────────────────

/** Unified view mode for the 4-tab interface. */
export type RichViewMode = 'timeline' | 'by-feature' | 'compact' | 'detailed';

// ─── Component Props (new sub-components) ───────────────────────────────

/** Props for the ToolCategoryIcon sub-component. */
export interface ToolCategoryIconProps {
  /** Tool category from manifest lookup. Null = neutral grey fallback. */
  readonly category: ToolCategory | null;
  /** Size in pixels (width and height). Default: 18. */
  readonly size?: number;
}

/** Props for a single ParameterChip sub-component. */
export interface ParameterChipProps {
  readonly chip: ParamChipData;
}

/** Props for the TrackBadge sub-component. */
export interface TrackBadgeProps {
  /** Platform name to display. */
  readonly name: string;
}

// ─── Type Inference Contract ────────────────────────────────────────────

/**
 * Infer parameter display type from a raw value.
 *
 * Priority:
 * 1. Tool schema (ParameterSchemaEntry.type) — handled externally
 * 2. Heuristic rules (this function)
 * 3. Fallback (returns null)
 */
export type InferParamTypeFn = (value: unknown) => ParamType | null;
