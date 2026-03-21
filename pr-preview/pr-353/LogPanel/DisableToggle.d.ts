import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';

export interface DisableToggleProps {
    readonly disabled: boolean;
    readonly autoDependency: boolean;
    readonly causeActivityId: string | null;
    readonly onChange: (disabled: boolean) => void;
}
export declare function DisableToggle({ disabled, autoDependency, causeActivityId, onChange, }: DisableToggleProps): React.ReactElement;
//# sourceMappingURL=DisableToggle.d.ts.map