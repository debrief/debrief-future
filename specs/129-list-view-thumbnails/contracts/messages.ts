/**
 * Message protocol contracts for List View with Spatial Thumbnails (#129)
 *
 * These types extend the existing webview message protocol
 * (apps/vscode/src/webview/messages.ts) with list-view-specific messages.
 */

// ─── Extension → Webview ────────────────────────────────────────────

/** Sent when the list view webview is ready; provides the full exercise list. */
export interface LoadExerciseListMessage {
  readonly type: 'loadExerciseList';
  readonly items: ExerciseListItem[];
}

/** Sent on initial load and after any exercise is opened; provides recent items. */
export interface LoadRecentPlotsMessage {
  readonly type: 'loadRecentPlots';
  readonly recentPlots: RecentlyOpenedEntry[];
}

/** Sent when filter state changes externally (from filter bar, map, or timeline). */
export interface UpdateFilterStateMessage {
  readonly type: 'updateFilterState';
  readonly filteredItemIds: readonly string[];
}

// ─── Webview → Extension ────────────────────────────────────────────

/** Sent when the analyst clicks an exercise to open it. */
export interface OpenExerciseMessage {
  readonly type: 'openExercise';
  readonly itemPath: string;
  readonly storePath: string;
}

/** Sent when the list view webview has finished initialising. */
export interface ExerciseListReadyMessage {
  readonly type: 'exerciseListReady';
}

// ─── Shared Types ───────────────────────────────────────────────────

/** Exercise data for list view display. Extends CatalogOverviewItem with metadata. */
export interface ExerciseListItem {
  readonly id: string;
  readonly title: string;
  readonly itemPath: string;
  readonly bbox: readonly [number, number, number, number] | null;
  readonly datetime: string | null;
  readonly startDatetime: string | null;
  readonly endDatetime: string | null;
  readonly vesselClasses: readonly string[];
  readonly tags: readonly string[];
  readonly author: string | null;
  readonly nationalities: readonly string[];
  readonly trackNames: readonly string[];
  readonly trackDataHref: string | null;
}

/** Recently opened exercise entry, provided by RecentPlotsService. */
export interface RecentlyOpenedEntry {
  readonly plotId: string;
  readonly title: string;
  readonly storeId: string;
  readonly lastOpened: string;
  readonly uri: string;
}

/** Sort dimension options. */
export type SortDimension = 'recency' | 'title' | 'duration';

/** Sort direction options. */
export type SortDirection = 'asc' | 'desc';

/** Sort configuration state. */
export interface SortConfiguration {
  readonly dimension: SortDimension;
  readonly direction: SortDirection;
}
