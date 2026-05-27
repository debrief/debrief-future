/**
 * `@debrief/briefing-export` — host-agnostic briefing-zip packing core.
 *
 * Extracted from `apps/vscode/src/services/briefingZipExport/` (#273, FR-016)
 * so both the VS Code and web-shell hosts share one packing implementation
 * and cannot drift. Every export here is a pure function or an injectable
 * interface — there are no Node `fs`/`path`/`os` imports (C-D1). Each host
 * supplies its own `ExportDeps` (disk + save-dialog for VS Code; IndexedDB
 * reads + browser download for web-shell).
 */

export {
  scopeStoryboard,
  StoryboardNotFoundError,
} from './core/scopeStoryboard';
export type { ScopedFeatureCollection } from './core/scopeStoryboard';

export { buildItemJson } from './core/buildItemJson';
export type { BriefingItemJson, StacItemMinimal } from './core/buildItemJson';

export { computeTileCoverage } from './core/computeTileCoverage';
export type { TileCoord, TileCoverageInput, TileCoverageOutput } from './core/computeTileCoverage';

export { injectInlineData } from './core/injectInlineData';
export type { InjectableInlineData, InjectionResult } from './core/injectInlineData';

export { assembleZip, tileKeyOf } from './core/zipAssembler';
export type { ZipAssemblerInput, ZipAssemblerOutput } from './core/zipAssembler';

export { fetchTiles } from './core/fetchTiles';
export type { FetchTilesInput, FetchTilesOutput } from './core/fetchTiles';

export { exportBriefingZip } from './core/export';
export type {
  ExportBriefingZipInput,
  ExportBriefingZipOutput,
  ExportDeps,
  BriefingConfigForExport,
} from './core/export';
