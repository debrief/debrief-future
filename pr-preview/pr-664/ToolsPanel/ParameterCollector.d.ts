import { ToolParameter } from '../ToolMatch/types';

export interface ParameterCollectorProps {
    /** Tool parameters to collect (in order) */
    parameters: ToolParameter[];
    /** Position to anchor the context menu */
    anchorPosition: {
        x: number;
        y: number;
    };
    /** Called when all parameters are collected */
    onComplete: (params: Record<string, unknown>) => void;
    /** Called when collection is cancelled */
    onCancel: () => void;
}
export declare function ParameterCollector({ parameters, anchorPosition, onComplete, onCancel, }: ParameterCollectorProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=ParameterCollector.d.ts.map