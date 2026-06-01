import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';

export interface JsonEditorControlProps {
    readonly name: string;
    readonly value: unknown;
    readonly tunable: boolean;
    readonly onChange: (value: unknown) => void;
}
export declare function JsonEditorControl({ name, value, tunable, onChange, }: JsonEditorControlProps): React.ReactElement;
//# sourceMappingURL=JsonEditorControl.d.ts.map