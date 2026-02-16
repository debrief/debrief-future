/**
 * Navigation Panel wrapper — renders StacFileTree in a GoldenLayout panel.
 */

import { usePanelContext } from './PanelContext';

export function NavigationPanel() {
  const ctx = usePanelContext();

  if (!ctx.stacFileTreeProps) {
    return <div style={{ padding: 16, color: '#969696' }}>No catalog loaded</div>;
  }

  const { StacFileTree } = ctx.components;

  return (
    <div style={{ height: '100%', overflow: 'auto' }} data-testid="panel-navigation">
      <StacFileTree {...ctx.stacFileTreeProps} />
    </div>
  );
}
