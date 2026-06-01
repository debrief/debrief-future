import { default as React } from '../../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { OverlapPartner } from './types';

export interface OverlapBadgeProps {
    readonly sceneId: string;
    /** Non-empty when the badge renders — the caller (`SceneList`) gates this. */
    readonly overlapsWith: readonly OverlapPartner[];
    readonly onDismiss: () => void;
}
export declare const OverlapBadge: React.FC<OverlapBadgeProps>;
//# sourceMappingURL=OverlapBadge.d.ts.map