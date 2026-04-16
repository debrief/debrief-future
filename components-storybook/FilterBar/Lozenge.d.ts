import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { LozengeItem, PlatformAttributes } from './types';
import { FilterType, VesselTaxonomyNode } from '../filter-engine';

export interface LozengeProps {
    readonly item: LozengeItem;
    readonly isEditing: boolean;
    readonly onEdit: (id: string) => void;
    readonly onRemove: (id: string) => void;
    readonly onValueChange: (id: string, newValue: string) => void;
    readonly onPlatformAttributesChange?: (id: string, attributes: PlatformAttributes) => void;
    readonly onEditClose: () => void;
    readonly onToggleNegate: (id: string) => void;
    readonly availableValues: Readonly<Record<Exclude<FilterType, 'platform'>, readonly string[]>>;
    readonly platformAvailableValues?: Readonly<{
        readonly nationality: readonly string[];
        readonly domain: readonly string[];
        readonly vessel_role: readonly string[];
        readonly vessel_type: readonly string[];
    }>;
    readonly taxonomy: readonly VesselTaxonomyNode[];
    readonly labelMap?: ReadonlyMap<string, string>;
    readonly taxonomyCounts?: ReadonlyMap<string, number>;
}
/** Construct the human-readable label for a platform chip (#186 Decision 5) */
export declare function formatPlatformLabel(attributes: PlatformAttributes, labelMap?: ReadonlyMap<string, string>): string;
export declare const Lozenge: React.FC<LozengeProps>;
//# sourceMappingURL=Lozenge.d.ts.map