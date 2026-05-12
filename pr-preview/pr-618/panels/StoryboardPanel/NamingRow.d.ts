import { default as React } from '../../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { NamingRowViewModel } from './types';

export interface NamingRowProps {
    readonly viewModel: NamingRowViewModel;
    readonly onTextChange: (pendingName: string) => void;
    readonly onConfirm: (name: string) => void;
    readonly onCancel: () => void;
}
export declare const NamingRow: React.FC<NamingRowProps>;
//# sourceMappingURL=NamingRow.d.ts.map