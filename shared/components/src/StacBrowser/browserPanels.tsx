/**
 * GoldenLayout panel wrappers for StacBrowser's 3 views.
 *
 * Each panel reads filter state from BrowserPanelContext and renders
 * the appropriate child component (or placeholder for future phases).
 */

import { useBrowserPanelContext } from './BrowserPanelContext';
import { ExerciseListView } from '../ExerciseListView';

/**
 * Exercise list panel — wraps ExerciseListView.
 */
export function BrowserListPanel(): JSX.Element {
  const { listItems, onItemSelect } = useBrowserPanelContext();
  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <ExerciseListView items={listItems} onItemSelect={onItemSelect} />
    </div>
  );
}

/**
 * Map panel — placeholder until Phase 4 (spatial filtering).
 */
export function BrowserMapPanel(): JSX.Element {
  const { filteredItems } = useBrowserPanelContext();
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--debrief-text-secondary, #999)',
        fontSize: 14,
      }}
      data-testid="map-placeholder"
    >
      Map View ({filteredItems.length} items)
    </div>
  );
}

/**
 * Timeline panel — placeholder until Phase 5 (temporal filtering).
 */
export function BrowserTimelinePanel(): JSX.Element {
  const { filteredItems } = useBrowserPanelContext();
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--debrief-text-secondary, #999)',
        fontSize: 14,
      }}
      data-testid="timeline-placeholder"
    >
      Timeline View ({filteredItems.length} items)
    </div>
  );
}
