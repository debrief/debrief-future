import { ReactElement } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { ComponentContainer } from 'golden-layout';
import { PanelRegistry } from './panelRegistry';

export interface PanelWorkspaceProps {
    /** Panel registry containing all available panel definitions */
    registry: PanelRegistry;
    /** localStorage key override for layout persistence (default: uses internal key) */
    storageKey?: string;
    /** Optional context wrapper for panel React elements */
    contextWrapper?: (element: ReactElement, container: ComponentContainer) => ReactElement;
    /** Callback fired when layout is reset to default */
    onLayoutReset?: () => void;
    /** Callback fired when layout save fails */
    onSaveError?: (error: Error) => void;
    /** Additional CSS class name */
    className?: string;
}
/** Ref handle exposed via useImperativeHandle (if needed) */
export interface PanelWorkspaceHandle {
    resetLayout: () => void;
}
export declare function PanelWorkspace({ registry, contextWrapper, onLayoutReset, onSaveError, className, }: PanelWorkspaceProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=PanelWorkspace.d.ts.map