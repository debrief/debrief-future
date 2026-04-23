import { default as React } from '../../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { MissingDataReason } from './types';

export interface HardBlockModalProps {
    readonly sceneTitle: string;
    readonly reason: MissingDataReason;
    readonly jumpPastLabel: string;
    readonly openForEditingLabel: string;
    onJumpPast(): void;
    onOpenForEditing(): void;
    onDismiss(): void;
}
export declare function HardBlockModal({ sceneTitle, reason, jumpPastLabel, openForEditingLabel, onJumpPast, onOpenForEditing, onDismiss, }: HardBlockModalProps): React.ReactElement;
//# sourceMappingURL=HardBlockModal.d.ts.map