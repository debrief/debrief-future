import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { FieldSpec } from './types';

export interface PlatformArrayWidgetProps {
    name: string;
    value: unknown;
    spec: Extract<FieldSpec, {
        kind: 'platform-array';
    }>;
    onCommit: (name: string, newValue: unknown) => void;
    onCancel?: () => void;
    disabled?: boolean;
    error?: string | null;
}
export declare function PlatformArrayWidget({ name, value, onCommit, disabled, error, }: PlatformArrayWidgetProps): React.ReactElement;
export default PlatformArrayWidget;
//# sourceMappingURL=PlatformArrayWidget.d.ts.map