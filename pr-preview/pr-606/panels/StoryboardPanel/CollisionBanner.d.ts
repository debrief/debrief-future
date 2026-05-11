import { default as React } from '../../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { CollisionBannerViewModel } from './types';

export interface CollisionBannerProps {
    readonly viewModel: CollisionBannerViewModel;
    readonly onReplace: (conflictingSceneId: string) => void;
    readonly onOffset: () => void;
    readonly onCancel: () => void;
}
export declare const CollisionBanner: React.FC<CollisionBannerProps>;
//# sourceMappingURL=CollisionBanner.d.ts.map