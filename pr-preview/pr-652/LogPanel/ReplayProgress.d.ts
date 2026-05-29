import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';

export interface ReplayProgressProps {
    current: number;
    total: number;
    currentToolId: string;
    phase: 'loading-snapshot' | 'replaying' | 'finalising';
    onCancel: () => void;
}
export declare function ReplayProgress({ current, total, currentToolId, phase, onCancel, }: ReplayProgressProps): React.ReactElement;
//# sourceMappingURL=ReplayProgress.d.ts.map