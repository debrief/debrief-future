import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { PlatformAttributes } from './types';
import { VesselTaxonomyNode } from '../filter-engine';

export interface PlatformValueEditorProps {
    readonly initialAttributes: PlatformAttributes;
    readonly availableValues: Readonly<{
        readonly nationality: readonly string[];
        readonly domain: readonly string[];
        readonly vessel_role: readonly string[];
        readonly vessel_type: readonly string[];
    }>;
    readonly taxonomy: readonly VesselTaxonomyNode[];
    readonly taxonomyCounts?: ReadonlyMap<string, number>;
    readonly onConfirm: (attributes: PlatformAttributes) => void;
    readonly onCancel: () => void;
}
export declare const PlatformValueEditor: React.FC<PlatformValueEditorProps>;
//# sourceMappingURL=PlatformValueEditor.d.ts.map