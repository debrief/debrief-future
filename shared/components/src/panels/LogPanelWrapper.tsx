/**
 * Log Panel wrapper — renders LogPanel in a GoldenLayout panel.
 */

import { usePanelContext } from './PanelContext';

export function LogPanelWrapper() {
  const ctx = usePanelContext();

  if (!ctx.logPanelProps) {
    return <div style={{ padding: 16, color: '#969696' }}>No session active</div>;
  }

  const { LogPanel } = ctx.components;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} data-testid="panel-log">
      <LogPanel {...ctx.logPanelProps} />
    </div>
  );
}
