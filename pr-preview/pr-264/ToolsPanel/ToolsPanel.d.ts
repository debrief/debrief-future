import { ToolsPanelProps } from '../ActivityPanel/types';

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
export declare function ToolsPanel({ tools, hasToolInventory, hasSelection, onRunTool, className }: ToolsPanelProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ToolsPanel.d.ts.map