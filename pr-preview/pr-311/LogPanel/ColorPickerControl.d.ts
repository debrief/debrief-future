import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';

export interface ColorPickerControlProps {
    readonly name: string;
    readonly value: string;
    readonly choices: ReadonlyArray<string>;
    readonly tunable: boolean;
    readonly onChange: (colorName: string) => void;
}
export declare function ColorPickerControl({ name, value, choices, tunable, onChange, }: ColorPickerControlProps): React.ReactElement;
//# sourceMappingURL=ColorPickerControl.d.ts.map