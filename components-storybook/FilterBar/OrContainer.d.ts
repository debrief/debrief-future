import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { LozengeItem } from './types';
import { FilterType, VesselTaxonomyNode } from '../filter-engine';

export interface OrContainerProps {
    readonly item: {
        readonly kind: 'or-container';
        readonly id: string;
        readonly children: readonly LozengeItem[];
    };
    readonly editingId: string | null;
    readonly onAddChildType: (containerId: string, type: string) => void;
    readonly onRemove: (containerId: string) => void;
    readonly onEditLozenge: (id: string) => void;
    readonly onRemoveLozenge: (id: string) => void;
    readonly onValueChange: (id: string, newValue: string) => void;
    readonly onEditClose: () => void;
    readonly onToggleNegate: (id: string) => void;
    readonly availableValues: Readonly<Record<FilterType, readonly string[]>>;
    readonly taxonomy: readonly VesselTaxonomyNode[];
    readonly labelMap?: ReadonlyMap<string, string>;
    readonly taxonomyCounts?: ReadonlyMap<string, number>;
}
export declare const OrContainer: React.FC<OrContainerProps>;
//# sourceMappingURL=OrContainer.d.ts.map