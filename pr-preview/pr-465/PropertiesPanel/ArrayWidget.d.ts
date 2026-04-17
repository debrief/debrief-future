import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { FieldSpec } from './types';

export interface ArrayWidgetProps {
    name: string;
    value: unknown;
    spec: Extract<FieldSpec, {
        kind: 'string-array';
    }>;
    onCommit: (name: string, newValue: unknown) => void;
    onCancel?: () => void;
    disabled?: boolean;
    error?: string | null;
}
export declare function ArrayWidget({ name, value, spec, onCommit, disabled, error, }: ArrayWidgetProps): React.ReactElement;
export default ArrayWidget;
//# sourceMappingURL=ArrayWidget.d.ts.map