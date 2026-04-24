import { default as React } from '../../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { StoryboardOptionViewModel } from './types';

export interface StoryboardHeaderProps {
    readonly storyboards: readonly StoryboardOptionViewModel[];
    readonly activeStoryboardId: string | null;
    onActiveStoryboardChange(storyboardId: string): void;
    onCreateStoryboard?(): void;
    onRenameStoryboard?(): void;
    onDeleteStoryboard?(): void;
}
export declare function StoryboardHeader({ storyboards, activeStoryboardId, onActiveStoryboardChange, onCreateStoryboard, onRenameStoryboard, onDeleteStoryboard, }: StoryboardHeaderProps): React.ReactElement | null;
//# sourceMappingURL=StoryboardHeader.d.ts.map