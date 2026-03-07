import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';

export interface CardFlipProps {
    /** Whether the card is currently flipped to show the back face. */
    readonly isFlipped: boolean;
    /** Content for the front face. */
    readonly front: React.ReactNode;
    /** Content for the back face. */
    readonly back: React.ReactNode;
    /** Optional CSS class name for the container. */
    readonly className?: string;
    /** Optional data-testid for testing. */
    readonly 'data-testid'?: string;
}
export declare function CardFlip({ isFlipped, front, back, className, 'data-testid': testId, }: CardFlipProps): React.ReactElement;
//# sourceMappingURL=CardFlip.d.ts.map