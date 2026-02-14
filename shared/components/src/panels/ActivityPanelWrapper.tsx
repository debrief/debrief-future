/**
 * Activity Panel wrapper — renders ActivityPanel in a GoldenLayout panel.
 */

import type { PanelProps } from '../PanelWorkspace/panelRegistry';
import { usePanelContext } from './PanelContext';

export function ActivityPanelWrapper(_props: PanelProps) {
  const ctx = usePanelContext();

  if (!ctx.activityPanelProps) {
    return <div style={{ padding: 16, color: '#969696' }}>No plot loaded</div>;
  }

  const { ActivityPanel } = ctx.components;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} data-testid="panel-activity">
      <ActivityPanel {...ctx.activityPanelProps} />
    </div>
  );
}
