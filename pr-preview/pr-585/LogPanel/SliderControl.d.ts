import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';

export interface SliderControlProps {
    readonly name: string;
    readonly value: number;
    readonly minimum: number;
    readonly maximum: number;
    readonly step: number | null;
    readonly tunable: boolean;
    readonly onChange: (value: number) => void;
}
export declare function SliderControl({ name, value, minimum, maximum, step, tunable, onChange, }: SliderControlProps): React.ReactElement;
//# sourceMappingURL=SliderControl.d.ts.map