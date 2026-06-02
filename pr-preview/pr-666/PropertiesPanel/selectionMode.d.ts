import { DebriefFeature } from '../../../schemas/src/generated/typescript/index.ts';
import { FeatureSelection } from '../../../../services/session-state/src/browser.ts';

export type EditingMode = {
    kind: 'plot';
} | {
    kind: 'feature';
    featureId: string;
} | {
    kind: 'subfeature';
    featureId: string;
    path: string;
} | {
    kind: 'multi';
    featureIds: string[];
} | {
    kind: 'stale';
};
export type Feature = DebriefFeature;
export declare function resolveEditingMode(selection: FeatureSelection, featuresById: ReadonlyMap<string, Feature>): EditingMode;
//# sourceMappingURL=selectionMode.d.ts.map