import { default as React } from '../../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { TransportViewModel } from './types';

export interface TransportRowProps {
    readonly transport: TransportViewModel;
    onForwardClick(): void;
    onBackwardClick(): void;
}
export declare function TransportRow({ transport, onForwardClick, onBackwardClick, }: TransportRowProps): React.ReactElement;
//# sourceMappingURL=TransportRow.d.ts.map