import { ComponentContainer, VirtualLayout } from 'golden-layout';
import { PanelRegistry } from './panelRegistry';

/**
 * Creates a bind handler for GoldenLayout that mounts React components
 * from the Panel Registry into panel containers.
 */
export declare function createBindHandler(registry: PanelRegistry, contextWrapper?: (element: React.ReactElement, container: ComponentContainer) => React.ReactElement): VirtualLayout.BindComponentEventHandler;
/**
 * Creates an unbind handler that unmounts React roots from containers.
 */
export declare function createUnbindHandler(): VirtualLayout.UnbindComponentEventHandler;
/**
 * Updates the context wrapper and re-renders all mounted panels.
 * Called by PanelWorkspace when the contextWrapper prop changes.
 */
export declare function updateContextWrapper(contextWrapper?: (element: React.ReactElement, container: ComponentContainer) => React.ReactElement): void;
/**
 * Unmounts all tracked React roots. Call on workspace destroy.
 */
export declare function unmountAll(): void;
//# sourceMappingURL=goldenLayoutBridge.d.ts.map