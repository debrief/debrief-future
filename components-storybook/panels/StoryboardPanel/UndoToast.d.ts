import { default as React } from '../../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';

export interface UndoToastState {
    readonly sceneId: string;
    readonly sceneTitle: string;
    readonly deletedAt: string;
    readonly canUndo: boolean;
}
export interface UndoToastProps {
    readonly state: UndoToastState | null;
    readonly onUndo: () => void;
    readonly onDismiss: () => void;
}
export declare const UndoToast: React.FC<UndoToastProps>;
//# sourceMappingURL=UndoToast.d.ts.map