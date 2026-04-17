import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { FieldSpec } from './types';

export interface DateTimeWidgetProps {
    name: string;
    value: unknown;
    spec: Extract<FieldSpec, {
        kind: 'datetime';
    }>;
    onCommit: (name: string, newValue: unknown) => void;
    onCancel?: () => void;
    disabled?: boolean;
    error?: string | null;
}
export declare function DateTimeWidget({ name, value, onCommit, onCancel, disabled, error, }: DateTimeWidgetProps): React.ReactElement;
export default DateTimeWidget;
//# sourceMappingURL=DateTimeWidget.d.ts.map