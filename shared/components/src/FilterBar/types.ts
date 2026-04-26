/**
 * Type definitions for the Filter Bar (#127).
 *
 * Extended in #186 to carry a discriminated-union LozengeItem that supports
 * a new compound 'platform' chip alongside the existing simple chips.
 */

import type {
  FilterType,
  FilterExpression,
  PlatformField,
  StacBrowserItem,
  VesselTaxonomyNode,
} from '../filter-engine';
import type { LLMClient, EnumBundle } from '../nl-cql2';

/** Input method used by a filter type's value editor */
export type InputMethod =
  | 'hierarchical'
  | 'flat-dropdown'
  | 'free-text'
  | 'bucket'
  | 'typeahead'
  | 'compound';

/** Metadata for a filter type option in the add menu */
export interface FilterTypeOption {
  readonly type: FilterType;
  readonly label: string;
  readonly inputMethod: InputMethod;
}

/**
 * Map of platform attributes selected on a platform chip.
 *
 * A populated platform lozenge has at least one entry; each value is a
 * non-empty string. Producers MUST enforce this invariant before dispatch;
 * consumers MAY rely on it.
 */
export type PlatformAttributes = Partial<Record<PlatformField, string>>;

/** A simple, single-value filter lozenge (existing shape from #127) */
export interface SimpleLozengeItem {
  readonly kind: 'lozenge';
  readonly shape: 'simple';
  readonly id: string;
  readonly filterType: Exclude<FilterType, 'platform'>;
  readonly value: string;
  readonly negated?: boolean;
}

/** A compound, same-platform filter lozenge (new in #186) */
export interface PlatformLozengeItem {
  readonly kind: 'lozenge';
  readonly shape: 'platform';
  readonly id: string;
  readonly filterType: 'platform';
  readonly attributes: PlatformAttributes;
  readonly negated?: boolean;
}

/** A single filter lozenge */
export type LozengeItem = SimpleLozengeItem | PlatformLozengeItem;

/** An OR container grouping child lozenges with OR logic */
export interface OrContainerItem {
  readonly kind: 'or-container';
  readonly id: string;
  readonly children: readonly LozengeItem[];
}

/** A top-level item in the filter bar */
export type FilterBarItem = LozengeItem | OrContainerItem;

/** The complete filter bar state */
export interface FilterBarState {
  readonly items: readonly FilterBarItem[];
}

/** Actions for the filter bar reducer */
export type FilterBarAction =
  | { type: 'ADD_LOZENGE'; filterType: Exclude<FilterType, 'platform'>; value: string }
  | { type: 'REMOVE_LOZENGE'; id: string }
  | { type: 'EDIT_LOZENGE'; id: string; value: string }
  | { type: 'ADD_OR_CONTAINER' }
  | { type: 'REMOVE_OR_CONTAINER'; id: string }
  | {
      type: 'ADD_CHILD_LOZENGE';
      containerId: string;
      filterType: Exclude<FilterType, 'platform'>;
      value: string;
    }
  | { type: 'MOVE_TO_CONTAINER'; lozengeId: string; containerId: string }
  | { type: 'MOVE_TO_TOP_LEVEL'; lozengeId: string; fromContainerId: string }
  | { type: 'TOGGLE_NEGATE'; id: string }
  | { type: 'SET_STATE'; state: FilterBarState }
  | { type: 'ADD_PLATFORM_LOZENGE'; attributes: PlatformAttributes }
  | { type: 'EDIT_PLATFORM_LOZENGE'; id: string; attributes: PlatformAttributes }
  | {
      type: 'ADD_CHILD_PLATFORM_LOZENGE';
      containerId: string;
      attributes: PlatformAttributes;
    };

/** A named, persisted filter configuration (#128) */
export interface SavedFilterConfiguration {
  readonly id: string;
  readonly name: string;
  readonly filterBarState: FilterBarState;
  readonly cql2Json: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** The persisted collection of saved filter configurations (#128) */
export interface SavedFiltersCollection {
  readonly version: number;
  readonly configurations: readonly SavedFilterConfiguration[];
}

/** Platform-agnostic persistence interface for saved filters (#128) */
export interface SavedFiltersStorage {
  load(): SavedFiltersCollection;
  save(collection: SavedFiltersCollection): void;
}

/** Props for the FilterBar component */
export interface FilterBarProps {
  readonly items: readonly StacBrowserItem[];
  readonly taxonomy: readonly VesselTaxonomyNode[];
  readonly onFilteredItems: (items: StacBrowserItem[]) => void;
  readonly onExpressionChange?: (expression: FilterExpression) => void;
  readonly initialFilterState?: FilterBarState;
  readonly savedFiltersStorage?: SavedFiltersStorage;

  /**
   * Optional NL-search client (#191). When both `llmClient` and `nlEnums` are
   * provided, hitting Enter in QuickSearch routes through the NL → CQL2
   * pipeline (`buildPrompt → client.generate → parseResponse → dispatch
   * chips`) instead of graduating the literal text as a title lozenge.
   *
   * Absence of these props is the default behaviour — #191 explicitly
   * preserves today's literal path when the prop is omitted (review
   * Decision 12).
   */
  readonly llmClient?: LLMClient;
  readonly nlEnums?: EnumBundle;
  /** Display label for the live-mode indicator (e.g. "Live · Anthropic · claude-haiku-4-5-20251001"). */
  readonly liveModeLabel?: string;
  /**
   * Invoked when the user presses a recovery button inside the NL failure
   * banner. Hosts (e.g. VS Code's Catalog Overview) map the action to the
   * right command — e.g. `open-settings` → `workbench.action.openSettings`,
   * `retry` → re-submit the phrase.
   */
  readonly onBannerAction?: (action: 'open-settings' | 'retry' | 'reload') => void;
}

/** Distinct-value collection for platform-chip pickers (#186) */
export interface PlatformDistinctValues {
  readonly nationality: readonly string[];
  readonly domain: readonly string[];
  readonly vessel_role: readonly string[];
  readonly vessel_type: readonly string[];
}
