import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { LozengeItem } from './types';
import { FilterType, VesselTaxonomyNode } from '../filter-engine';

export interface LozengeProps {
    readonly item: LozengeItem;
    readonly isEditing: boolean;
    readonly onEdit: (id: string) => void;
    readonly onRemove: (id: string) => void;
    readonly onValueChange: (id: string, newValue: string) => void;
    readonly onEditClose: () => void;
    readonly availableValues: Readonly<Record<FilterType, readonly string[]>>;
    readonly taxonomy: readonly VesselTaxonomyNode[];
}
export declare const Lozenge: React.FC<LozengeProps>;
//# sourceMappingURL=Lozenge.d.ts.map