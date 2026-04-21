import { SceneFeature } from './types';

export type MissingDataClassification = {
    kind: "ok";
} | {
    kind: "missing-features";
    missingIds: string[];
} | {
    kind: "out-of-range";
};
export interface PlotTimeRange {
    start: string;
    end: string;
}
export declare function detectMissingDataForScene(scene: SceneFeature, plotFeatures: ReadonlyArray<GeoJSON.Feature>, plotTimeRange: PlotTimeRange): MissingDataClassification;
//# sourceMappingURL=missing-data.d.ts.map