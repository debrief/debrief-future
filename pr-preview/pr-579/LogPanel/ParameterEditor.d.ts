import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';

export interface ParameterEditorProps {
    name: string;
    value: unknown;
    typeInfo: {
        type: 'float' | 'integer' | 'duration' | 'enum' | 'boolean' | 'string';
        min?: number;
        max?: number;
        allowedValues?: string[];
        pattern?: string;
        label: string;
    };
    tunable: boolean;
    onCommit: (name: string, newValue: unknown) => void;
    onCancel: () => void;
}
export declare function ParameterEditor({ name, value, typeInfo, tunable, onCommit, onCancel, }: ParameterEditorProps): React.ReactElement;
//# sourceMappingURL=ParameterEditor.d.ts.map