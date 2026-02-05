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
 *   onRunTool={(id) => console.log('Run tool:', id)}
 * />
 * ```
 */
export declare function ToolsPanel({ tools, onRunTool, className }: ToolsPanelProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ToolsPanel.d.ts.map