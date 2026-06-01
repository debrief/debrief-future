import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';

export interface ReadOnlyBannerProps {
    /** Human-readable reason for the read-only state. `null` suppresses the
     *  banner; any non-null string (including the empty string) renders the
     *  banner. The component is the sole authority on rendering — its
     *  dispatcher caller need not gate. */
    reason: string | null;
}
export declare function ReadOnlyBanner({ reason }: ReadOnlyBannerProps): React.ReactElement | null;
export default ReadOnlyBanner;
//# sourceMappingURL=readOnlyBanner.d.ts.map