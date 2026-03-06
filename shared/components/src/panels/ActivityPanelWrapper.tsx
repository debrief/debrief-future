/**
 * Activity Panel wrapper — renders ActivityPanel in a GoldenLayout panel.
 */

import { usePanelContext } from './PanelContext';

export function ActivityPanelWrapper() {
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
