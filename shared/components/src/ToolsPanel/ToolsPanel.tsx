/**
 * ToolsPanel component - displays available analysis tools.
 *
 * Shows a list of tools with active tools (applicable to current selection)
 * shown first with run buttons, and inactive tools shown dimmed with explanations.
 *
 * When a tool has parameters, clicking it opens a ParameterCollector that
 * sequentially collects each parameter value before executing the tool.
 */

import React, { useState, useCallback } from 'react';
import { Button, Icon } from 'vscrui';
import type { ToolsPanelProps, ToolsPanelItem } from '../ActivityPanel/types';
import { ParameterCollector } from './ParameterCollector';
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
 *   onRunTool={(id, params) => console.log('Run tool:', id, params)}
 * />
 * ```
 */
export function ToolsPanel({ tools, hasToolInventory, hasSelection, onRunTool, className }: ToolsPanelProps) {
  const [collectingToolId, setCollectingToolId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null);

  // Active tools first, then inactive
  const activeTools = tools.filter(t => t.applicable);
  const inactiveTools = tools.filter(t => !t.applicable);

  const handleToolClick = useCallback(
    (tool: ToolsPanelItem, event: React.MouseEvent) => {
      if (tool.parameters && tool.parameters.length > 0) {
        // Start parameter collection
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        setCollectingToolId(tool.id);
        setMenuAnchor({ x: rect.right, y: rect.top });
      } else {
        // No parameters, execute immediately
        onRunTool?.(tool.id);
      }
    },
    [onRunTool],
  );

  const handleParameterComplete = useCallback(
    (params: Record<string, unknown>) => {
      if (collectingToolId) {
        onRunTool?.(collectingToolId, params);
      }
      setCollectingToolId(null);
      setMenuAnchor(null);
    },
    [collectingToolId, onRunTool],
  );

  const handleParameterCancel = useCallback(() => {
    setCollectingToolId(null);
    setMenuAnchor(null);
  }, []);

  // Find the tool currently being collected (for its parameters)
  const collectingTool = collectingToolId
    ? tools.find(t => t.id === collectingToolId)
    : null;

  if (tools.length === 0) {
    // Determine the appropriate empty-state message
    // hasToolInventory: undefined = still checking, false = unavailable, true = loaded
    let message: string;
    let icon: 'loading' | 'warning' | 'info';
    let spin = false;
    if (hasToolInventory === undefined) {
      message = 'Loading analysis tools\u2026';
      icon = 'loading';
      spin = true;
    } else if (hasToolInventory === false) {
      message = 'Analysis tools unavailable \u2014 debrief-calc not connected';
      icon = 'warning';
    } else if (hasSelection === false || hasSelection === undefined) {
      message = 'Select features to see available tools';
      icon = 'info';
    } else {
      message = 'No matching tools for current selection';
      icon = 'info';
    }

    return (
      <div className={`debrief-tools-panel debrief-tools-panel--empty ${className ?? ''}`}>
        <div className="debrief-tools-panel__message">
          <Icon name={icon} spin={spin} />
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
            onClick={(e) => handleToolClick(tool, e)}
          >
            <Button appearance="icon" title={`Run ${tool.name}`}>
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

      {/* Parameter collection overlay */}
      {collectingTool?.parameters && menuAnchor && (
        <ParameterCollector
          parameters={collectingTool.parameters}
          anchorPosition={menuAnchor}
          onComplete={handleParameterComplete}
          onCancel={handleParameterCancel}
        />
      )}
    </div>
  );
}
