import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { FilterType, VesselTaxonomyNode } from '../filter-engine';

export interface ValueEditorProps {
    readonly filterType: FilterType;
    readonly value: string;
    readonly onSelect: (value: string) => void;
    readonly onClose: () => void;
    readonly availableValues: readonly string[];
    readonly taxonomy?: readonly VesselTaxonomyNode[];
    readonly taxonomyCounts?: ReadonlyMap<string, number>;
}
export declare const ValueEditor: React.FC<ValueEditorProps>;
//# sourceMappingURL=ValueEditor.d.ts.map