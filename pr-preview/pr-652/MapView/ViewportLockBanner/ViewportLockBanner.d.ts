
export interface ViewportLockBannerProps {
    /** When `false` the component returns null — no DOM. */
    readonly locked: boolean;
    /** Click handler for the banner's unlock affordance. */
    readonly onUnlock: () => void;
}
export declare function ViewportLockBanner({ locked, onUnlock }: ViewportLockBannerProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=ViewportLockBanner.d.ts.map