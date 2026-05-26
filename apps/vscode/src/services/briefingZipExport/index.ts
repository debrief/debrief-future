/**
 * Public barrel for the briefing-zip export service.
 *
 * All exports here are pure / injectable helpers. The VS Code command
 * orchestrator at `apps/vscode/src/commands/exportStoryboardAsBriefingZip.ts`
 * wires them up against the real VS Code APIs.
 */

export {
  scopeStoryboard,
  StoryboardNotFoundError,
} from './scopeStoryboard';
export type { ScopedFeatureCollection } from './scopeStoryboard';

export { buildItemJson } from './buildItemJson';
export type { BriefingItemJson, StacItemMinimal } from './buildItemJson';

export { computeTileCoverage } from './computeTileCoverage';
export type { TileCoord, TileCoverageInput, TileCoverageOutput } from './computeTileCoverage';

export { injectInlineData } from './injectInlineData';
export type { InjectableInlineData, InjectionResult } from './injectInlineData';

export { assembleZip, tileKeyOf } from './zipAssembler';
export type { ZipAssemblerInput, ZipAssemblerOutput } from './zipAssembler';

export { fetchTiles } from './fetchTiles';
export type { FetchTilesInput, FetchTilesOutput } from './fetchTiles';

export { exportBriefingZip } from './export';
export type { ExportBriefingZipInput, ExportBriefingZipOutput, ExportDeps } from './export';
