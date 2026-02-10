/**
 * ToolsPanel component - displays available analysis tools.
 *
 * Shows a list of tools with active tools (applicable to current selection)
 * shown first with run buttons, and inactive tools shown dimmed with explanations.
 */

import { Button, Icon } from 'vscrui';
import type { ToolsPanelProps } from '../ActivityPanel/types';
import './ToolsPanel.css';

/**
 * Panel displaying available analysis tools.
 *
 * @example
 * ```tsx
 * <ToolsPanel
 *   tools={[
 *     { id: 'range', name: 'Range', description: 'Calculate range', applicable: true },
 *     { id: 'bearing', name: 'Bearing', description: 'Calculate bearing', applicable: false, explanation: 'Requires 2 tracks' }
 *   ]}
 *   onRunTool={(id) => console.log('Run tool:', id)}
 * />
 * ```
 */
export function ToolsPanel({ tools, hasToolInventory, hasSelection, onRunTool, className }: ToolsPanelProps) {
  // Active tools first, then inactive
  const activeTools = tools.filter(t => t.applicable);
  const inactiveTools = tools.filter(t => !t.applicable);

  if (tools.length === 0) {
    // Determine the appropriate empty-state message
    let message: string;
    if (hasToolInventory === false) {
      message = 'Analysis tools unavailable — debrief-calc not connected';
    } else if (hasSelection === false || hasSelection === undefined) {
      message = 'Select features to see available tools';
    } else {
      message = 'No matching tools for current selection';
    }

    return (
      <div className={`debrief-tools-panel debrief-tools-panel--empty ${className ?? ''}`}>
        <div className="debrief-tools-panel__message">
          <Icon name={hasToolInventory === false ? 'warning' : 'info'} />
          <span>{message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`debrief-tools-panel ${className ?? ''}`}>
      <ul className="debrief-tools-panel__list" role="list">
        {activeTools.map(tool => (
          <li
            key={tool.id}
            className="debrief-tools-panel__item debrief-tools-panel__item--active"
            onClick={() => onRunTool?.(tool.id)}
          >
            <Button appearance="icon" onClick={() => onRunTool?.(tool.id)} title={`Run ${tool.name}`}>
              <Icon name="tools" />
            </Button>
            <div className="debrief-tools-panel__item-text">
              <span className="debrief-tools-panel__item-name">{tool.name}</span>
              <span className="debrief-tools-panel__item-desc">{tool.description}</span>
            </div>
          </li>
        ))}
        {inactiveTools.map(tool => (
          <li key={tool.id} className="debrief-tools-panel__item debrief-tools-panel__item--inactive" title={tool.explanation ?? 'Selection does not match requirements'}>
            <span className="debrief-tools-panel__item-icon">
              <Icon name="circle-slash" />
            </span>
            <div className="debrief-tools-panel__item-text">
              <span className="debrief-tools-panel__item-name">{tool.name}</span>
              <span className="debrief-tools-panel__item-desc">{tool.explanation ?? tool.description}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
