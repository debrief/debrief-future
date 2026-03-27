import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { TimeSpan } from '../utils/temporal-types';
import { TemporalFilter } from './types';

export interface TimeBrushProps {
    readonly timeRange: TimeSpan;
    readonly chartWidth: number;
    readonly chartHeight: number;
    readonly onFilterChange: (filter: TemporalFilter | null) => void;
    readonly offsetX?: number;
}
export declare const TimeBrush: React.FC<TimeBrushProps>;
//# sourceMappingURL=TimeBrush.d.ts.map