import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { FieldSpec } from './types';

export interface BboxWidgetProps {
    name: string;
    value: unknown;
    spec: Extract<FieldSpec, {
        kind: 'bbox';
    }>;
    onCommit: (name: string, newValue: unknown) => void;
    onCancel?: () => void;
    disabled?: boolean;
    error?: string | null;
}
export declare function BboxWidget({ name, value, onCommit, disabled, error, }: BboxWidgetProps): React.ReactElement;
export default BboxWidget;
//# sourceMappingURL=BboxWidget.d.ts.map